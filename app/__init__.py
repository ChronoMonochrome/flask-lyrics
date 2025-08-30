import os
import json
import traceback
from datetime import timedelta

from flask import Flask, request, jsonify, send_from_directory, current_app
from werkzeug.exceptions import HTTPException, NotFound

from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_session import Session

from .models import db, User # Ensure User model is imported for JWT lookup
from .words_db import FlatFileDatabase # Import your FlatFileDatabase class

# Global dictionary to hold lyrics data. This will be populated in create_app.
LYRICS_DATA = {}
# Global variable for the words database instance
WORDS_DB_INSTANCE = None

def create_app():
    """
    Application factory function for creating and configuring the Flask app.
    This centralizes all setup logic.
    """
    # 1. Initialize Flask app
    # Set static_folder relative to this __init__.py file.
    # The 'static' folder for Flask will be where the React build output resides.
    app = Flask(
        __name__,
        static_folder=os.path.join(os.path.abspath(os.path.dirname(__file__)), 'static'),
        static_url_path='/' # Serve static files from root URL
    )

    # Determine the absolute path to your React build's *actual static content root*
    # This is where Create React App places its JS/CSS/image bundles.
    # Inside the container, this is /app/app/static/static
    REACT_STATIC_ROOT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'static')

    # This is where index.html, favicon.ico, manifest.json are.
    # These will be served explicitly via routes below.
    FRONTEND_BUILD_ROOT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')

    # 2. Configuration for the app
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'a_default_secret_key_if_not_set')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # --- JWT Configuration ---
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'SUPER_SECRET_DEV_KEY_CHANGE_ME_IN_PROD')
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(weeks=1)

    # --- Session Configuration (for Flask-Session) ---
    app.config['SESSION_PERMANENT'] = os.getenv("SESSION_PERMANENT", 'True').lower() in ('true', '1', 't')
    app.config['SESSION_TYPE'] = os.getenv("SESSION_TYPE", 'filesystem')
    session_lifetime_seconds = int(os.getenv("PERMANENT_SESSION_LIFETIME_SECONDS", 5*3600))
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(seconds=session_lifetime_seconds)
    app.config['SESSION_FILE_THRESHOLD'] = int(os.getenv("SESSION_FILE_THRESHOLD", 1000000))
    # Note: Flask-Session needs to be initialized with the app
    Session(app)

    # 3. Initialize extensions
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"], "allow_headers": "*"}})
    # Store the JWTManager instance in a variable to avoid the KeyError
    jwt = JWTManager(app)
    Migrate(app, db) # Initializes Flask-Migrate

    # 4. Application-specific Initialization (needs app context for logger, etc.)
    with app.app_context():
        # --- Load lyrics data ---
        lyrics_file_path = os.path.join(FRONTEND_BUILD_ROOT_PATH, 'data', 'lyrics.json')
        try:
            with open(lyrics_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                global LYRICS_DATA
                for song in data.get('songs', []):
                    LYRICS_DATA[song['id']] = song
            app.logger.info(f"Loaded {len(LYRICS_DATA)} songs from {lyrics_file_path}")
        except FileNotFoundError:
            app.logger.error(f"Lyrics file not found: {lyrics_file_path}")
        except json.JSONDecodeError as e:
            app.logger.error(f"Error decoding lyrics JSON from {lyrics_file_path}: {e}")
        except Exception as e:
            app.logger.error(f"An unexpected error occurred loading lyrics data: {e}")

        # --- Initialize words database ---
        # Corrected the variable name here from `FRONTEND_BUILD_ROOT_ROOT_PATH`
        words_data_file = os.path.join(FRONTEND_BUILD_ROOT_PATH, 'data', 'words.ljson')
        words_index_file = os.path.join(FRONTEND_BUILD_ROOT_PATH, 'data', 'words.idx')

        global WORDS_DB_INSTANCE
        try:
            WORDS_DB_INSTANCE = FlatFileDatabase(words_data_file, words_index_file)
            WORDS_DB_INSTANCE.load_data()
            app.logger.info("Japanese word database initialized successfully.")
        except Exception as e:
            app.logger.error(f"Failed to initialize word database: {e}", exc_info=True)
            WORDS_DB_INSTANCE = None # Set to None on failure

    # 5. Register blueprints
    # --- Register blueprints ---
    # Move the import inside the function, just before registration.
    # This ensures that the `app` module is fully initialized first.
    from .api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    # 6. JWT Callbacks (using the `jwt` variable)
    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        return User.query.filter_by(id=identity).one_or_none()

    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({"msg": "Missing or invalid token"}), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({"msg": "Signature verification failed"}), 401

    # 7. Static File Serving for React SPA
    # Serve index.html for the root path
    @app.route('/')
    def serve_react_app():
        app.logger.info(f"Serving index.html for / from host {request.remote_addr}")
        return send_from_directory(FRONTEND_BUILD_ROOT_PATH, 'index.html')

    # Serve root-level static assets (favicon.ico, manifest.json) and handle client-side routing fallback.
    @app.route('/<path:path>')
    def serve_root_assets_or_spa_fallback(path):
        app.logger.info(f"Request for /{path} (not / or /api/).")

        if path.startswith('static/'):
            app.logger.error(f"Logic error: Static path /{path} caught by SPA fallback. Should be handled by Flask's default static handler.")
            raise NotFound()

        try:
            app.logger.info(f"Attempting to serve root-level static file: {path} from {FRONTEND_BUILD_ROOT_PATH}")
            return send_from_directory(FRONTEND_BUILD_ROOT_PATH, path)
        except NotFound:
            app.logger.info(f"File not found: {path}. Serving index.html for SPA fallback.")
            return send_from_directory(FRONTEND_BUILD_ROOT_PATH, 'index.html')

    # 8. Error Handlers
    @app.errorhandler(404)
    def not_found_error(error):
        if request.path.startswith('/api/'):
            app.logger.warning(f"API 404 for path: {request.path}")
            return jsonify(message="API Endpoint Not Found", status=404), 404

        if request.path.startswith('/static/'):
            app.logger.warning(f"Actual static file 404 for path: {request.path}")
            return jsonify(message="Static File Not Found", status=404), 404

        app.logger.info(f"Serving index.html as SPA fallback for path: {request.path} (general 404).")
        return send_from_directory(FRONTEND_BUILD_ROOT_PATH, 'index.html')

    @app.errorhandler(Exception)
    def handle_exception(e):
        if isinstance(e, HTTPException):
            return e

        app.logger.error(f"Internal Server Error: {e}", exc_info=True)
        return jsonify(message="An unexpected error occurred at the application level.", status=500, error_type=type(e).__name__, details=traceback.format_exc()), 500

    return app

# Helper function to get the words database instance
def get_words_db():
    return WORDS_DB_INSTANCE
