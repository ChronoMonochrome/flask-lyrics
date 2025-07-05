# app/__init__.py

from flask import Flask, request, jsonify, current_app, send_from_directory
from werkzeug.exceptions import HTTPException, NotFound
import traceback
import os

from .models import db
from .api import api_bp # Assuming api_bp is defined in app/api.py

# Determine the absolute path to your React build directory
# This assumes your Flask app's module is 'app' within the /app WORKDIR,
# and static assets are in /app/app/static
STATIC_FOLDER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')

app = Flask(
    __name__,
    # The static_folder parameter tells Flask where to find static files physically.
    static_folder=STATIC_FOLDER_PATH,
    # The static_url_path parameter tells Flask what URL prefix to use for
    # automatically serving files from static_folder.
    # If set to None (or omitted), it defaults to '/static'.
    # This is PERFECT for Create React App's 'static' subfolder (e.g., build/static/js/main.js
    # becomes accessible at /static/js/main.js).
    static_url_path='/static' # Explicitly set to '/static' for clarity. Flask handles this automatically.
)

# Configuration for the app (e.g., from .env, or directly)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'a_default_secret_key_if_not_set')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(app)

# Register blueprints
app.register_blueprint(api_bp, url_prefix='/api')

# --- Static File Serving for React SPA ---

# 1. Serve index.html for the root path
@app.route('/')
def serve_react_app():
    current_app.logger.info(f"Serving index.html for / from host {request.remote_addr}")
    # Flask's send_static_file will automatically look in the static_folder.
    return app.send_static_file('index.html')

# 2. Serve root-level static assets like favicon.ico and manifest.json,
#    and handle client-side routing for React Router.
#    This route should *NOT* handle paths starting with /static/.
#    Flask's built-in static handler for static_url_path='/static' handles those.
@app.route('/<path:path>')
def serve_root_assets_or_spa_fallback(path):
    # Log the request path to debug
    current_app.logger.info(f"Request for /{path} (not / or /api/).")

    # If the path starts with 'static/', it should be handled by Flask's
    # internal static file server based on static_url_path.
    # If it's hitting this route, it means the internal handler wasn't triggered.
    # This might indicate a routing order issue or a slight misconfiguration.
    # However, let's make sure this route doesn't interfere with standard static assets.
    if path.startswith('static/'):
        # This case should ideally NOT be hit if static_url_path is working correctly.
        # If it *is* hit, it means Flask's default static handler didn't catch it.
        # We can try to send it again from here, or raise a NotFound to let Flask handle it if possible.
        # For robustness, try to serve it explicitly *again* from the static folder.
        # The `send_from_directory` function correctly handles subdirectories
        # by searching within the `static_folder` for the full `path` (e.g., 'static/js/main.js').
        try:
            return send_from_directory(app.static_folder, path)
        except NotFound:
            # If it's still not found, then it's a real 404 for a static asset.
            # Don't fallback to index.html for specific static asset paths,
            # as that breaks the browser's loading.
            current_app.logger.warning(f"Static asset not found: /{path}")
            raise NotFound() # Re-raise to trigger Flask's 404 handler.

    # For other paths (like favicon.ico, manifest.json, or client-side routes like /about)
    try:
        current_app.logger.info(f"Attempting to serve root-level static file: {path} from {app.static_folder}")
        return send_from_directory(app.static_folder, path)
    except NotFound:
        current_app.logger.info(f"File not found: {path}. Serving index.html for SPA fallback.")
        return app.send_static_file('index.html')


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
    # This should catch /some/client/route that wasn't matched by any other Flask route.
    current_app.logger.info(f"Serving index.html as SPA fallback for path: {request.path}")
    return app.send_static_file('index.html')


@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, HTTPException):
        return e

    current_app.logger.error(f"Internal Server Error: {e}", exc_info=True)
    return jsonify(message="An unexpected error occurred at the application level.", status=500, error_type=type(e).__name__, details=traceback.format_exc()), 500
