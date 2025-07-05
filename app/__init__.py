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
    # This is PERFECT for Create React App's 'static' subfolder,
    # as CRA-generated paths for JS/CSS bundles are typically like '/static/js/main.js'.
    static_url_path='/static' # Explicitly set to '/static' for clarity
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
    return send_from_directory(app.static_folder, 'index.html')

# 2. Catch-all for other root-level static assets (like favicon.ico, manifest.json)
#    AND for client-side routing for React Router
@app.route('/<path:filename>')
def serve_root_level_static_and_spa_fallback(filename):
    # Flask's default static handler at /static will handle files under static/static/
    # This route is for files directly in the static_folder root (like favicon.ico, manifest.json)
    # or for client-side routing.

    # First, check if the requested filename is a known root-level static asset.
    # If not, assume it's a client-side route and serve index.html.

    # IMPORTANT: Ensure favicon.ico and manifest.json are actually in /app/app/static/
    # This was the prior issue. Assuming you've fixed that by adding them to front/public and rebuilding.

    # Try to serve the file directly from the static_folder root
    try:
        current_app.logger.info(f"Attempting to serve root-level static file: {filename} from {app.static_folder}")
        return send_from_directory(app.static_folder, filename)
    except NotFound:
        # If the file is not found (e.g., it's a client-side route like /about),
        # then serve index.html for React Router to handle
        current_app.logger.info(f"File not found: {filename}. Serving index.html for SPA fallback.")
        return send_from_directory(app.static_folder, 'index.html')


# --- Error Handlers ---

@app.errorhandler(404)
def not_found_error(error):
    # For API endpoints not found, return JSON error
    if request.path.startswith('/api/'):
        current_app.logger.warning(f"API 404 for path: {request.path}")
        return jsonify(message="API Endpoint Not Found", status=404), 404
    
    # For non-API routes, let the serve_root_level_static_and_spa_fallback handle it
    # This handler should ideally not be hit for client-side routes or missing static files
    # if the above route correctly falls back to index.html.
    current_app.logger.warning(f"Unexpected 404 for non-API path: {request.path}. This should ideally be handled by SPA fallback.")
    return jsonify(message="Resource Not Found", status=404), 404


@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, HTTPException):
        return e

    current_app.logger.error(f"Internal Server Error: {e}", exc_info=True)
    return jsonify(message="An unexpected error occurred at the application level.", status=500, error_type=type(e).__name__, details=traceback.format_exc()), 500
