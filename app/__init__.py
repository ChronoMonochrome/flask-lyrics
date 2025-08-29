from flask import Flask, request, jsonify, current_app, send_from_directory
from werkzeug.exceptions import HTTPException, NotFound
import traceback
import os
from dotenv import load_dotenv
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
from .models import db # Import db from .models
from .api import api_bp

# Import Migrate
from flask_migrate import Migrate #
from .words_db import FlatFileDatabase # New import

# Determine the absolute path to your React build's *actual static content root*
# This is where Create React App places its JS/CSS/image bundles.
# Inside the container, this is /app/app/static/static
REACT_STATIC_ROOT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'static')

# This is where index.html, favicon.ico, manifest.json are.
# These will be served explicitly via routes below.
FRONTEND_BUILD_ROOT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')


# --- NEW: Initialize the word database globally
# Use a lazy loading pattern to initialize it only when needed
words_db_instance = None
def get_words_db():
    global words_db_instance
    if words_db_instance is None:
        try:
            data_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'words.ljson')
            index_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'words.idx')
            words_db_instance = FlatFileDatabase(data_file, index_file)
            words_db_instance.load_data()
            print("Japanese word database initialized successfully.")
        except Exception as e:
            print(f"Failed to initialize word database: {e}")
            words_db_instance = None # Set to None on failure to retry or handle later
    return words_db_instance

app = Flask(
    __name__,
    static_folder=REACT_STATIC_ROOT_PATH,
    static_url_path='/static'
)

# Configuration for the app (e.g., from .env, or directly)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'a_default_secret_key_if_not_set')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# --- JWT Configuration ---
# IMPORTANT: Use a strong, random, and secret key in your .env file for production!
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'SUPER_SECRET_DEV_KEY_CHANGE_ME_IN_PROD')
app.config['JWT_TOKEN_LOCATION'] = ['headers']
# Set access token expiration to 7 days
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(weeks=1)

# Initialize extensions
db.init_app(app)
cors = CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"], "allow_headers": "*"}})
jwt = JWTManager(app)

# Initialize Flask-Migrate AFTER db.init_app(app)
migrate = Migrate(app, db) #

# Register blueprints
app.register_blueprint(api_bp, url_prefix='/api')

# Register a teardown context to ensure the database object is available
# across all requests without needing to be re-initialized.
@app.before_first_request
def initialize_database():
    get_words_db()

# --- JWT Callbacks (Optional but Recommended for customizing user loading) ---
from .models import User # Make sure to import your User model
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


# --- Static File Serving for React SPA ---

# 1. Serve index.html for the root path
@app.route('/')
def serve_react_app():
    current_app.logger.info(f"Serving index.html for / from host {request.remote_addr}")
    # index.html is in the FRONTEND_BUILD_ROOT_PATH, not REACT_STATIC_ROOT_PATH
    return send_from_directory(FRONTEND_BUILD_ROOT_PATH, 'index.html')

# 2. Serve root-level static assets (favicon.ico, manifest.json)
#    and handle client-side routing fallback.
#    This route specifically handles paths that *do not* start with /static/.
@app.route('/<path:path>')
def serve_root_assets_or_spa_fallback(path):
    current_app.logger.info(f"Request for /{path} (not / or /api/).")

    # If the path actually starts with 'static/', it should be handled by Flask's
    # built-in static file server. If it's hitting this route, it's an issue.
    # We explicitly raise NotFound to avoid serving index.html for what should be a static file.
    if path.startswith('static/'):
        current_app.logger.error(f"Logic error: Static path /{path} caught by SPA fallback. Should be handled by Flask's default static handler.")
        raise NotFound() # This should ideally never be hit if Flask's default static handler works.

    # For other paths (like favicon.ico, manifest.json, or client-side routes like /about)
    try:
        current_app.logger.info(f"Attempting to serve root-level static file: {path} from {FRONTEND_BUILD_ROOT_PATH}")
        return send_from_directory(FRONTEND_BUILD_ROOT_PATH, path)
    except NotFound:
        current_app.logger.info(f"File not found: {path}. Serving index.html for SPA fallback.")
        return send_from_directory(FRONTEND_BUILD_ROOT_PATH, 'index.html')


# --- Error Handlers ---

@app.errorhandler(404)
def not_found_error(error):
    # For API endpoints not found, return JSON error
    if request.path.startswith('/api/'):
        current_app.logger.warning(f"API 404 for path: {request.path}")
        return jsonify(message="API Endpoint Not Found", status=404), 404

    # If the request is for a specific static file (e.g., /static/js/main.js),
    # and it genuinely wasn't found, return a proper 404.
    # This is important for browsers so they don't try to interpret index.html as JS/CSS.
    if request.path.startswith('/static/'):
        current_app.logger.warning(f"Actual static file 404 for path: {request.path}")
        return jsonify(message="Static File Not Found", status=404), 404

    # For all other non-API and non-static 404s, let React Router handle it (serve index.html).
    current_app.logger.info(f"Serving index.html as SPA fallback for path: {request.path} (general 404).")
    return send_from_directory(FRONTEND_BUILD_ROOT_PATH, 'index.html')


@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, HTTPException):
        return e

    current_app.logger.error(f"Internal Server Error: {e}", exc_info=True)
    return jsonify(message="An unexpected error occurred at the application level.", status=500, error_type=type(e).__name__, details=traceback.format_exc()), 500
