# app/__init__.py

from flask import Flask, request, jsonify, current_app, send_from_directory
from werkzeug.exceptions import HTTPException, NotFound # Import NotFound explicitly
import traceback
import os

from .models import db # Assuming db is initialized there
from .api import api_bp # Assuming api_bp is defined in app/api.py

# Determine the absolute path to your React build directory
# The Flask app's root is /app, and your static files are in /app/app/static
STATIC_FOLDER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')

app = Flask(
    __name__,
    static_folder=STATIC_FOLDER_PATH, # Set the absolute path here
    # static_url_path='/static' # Set a specific prefix for automatically served static files
                                # If left as None (default), it defaults to '/static'
                                # If you want your React app's 'static' subfolder to be served under /static,
                                # then leave this as None or explicitly set to '/static'.
                                # For favicon/manifest, we'll use a catch-all route.
    static_url_path=None # Keep default /static prefix for auto-served files (e.g. static/js/main.js)
                         # This implies /app/app/static/js/main.js will be served as /static/js/main.js
                         # We will handle root-level files like index.html, favicon.ico explicitly.
)

# Configuration for the app (e.g., from .env, or directly)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'a_default_secret_key_if_not_set')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(app)

# Register blueprints
app.register_blueprint(api_bp, url_prefix='/api')

# Serve React app's index.html for the root path
@app.route('/')
def serve_react_app():
    return send_from_directory(app.static_folder, 'index.html')

# Catch-all for other root-level static assets (like favicon.ico, manifest.json)
# AND for client-side routing for React
@app.route('/<path:filename>')
def serve_all_static_and_react(filename):
    # Try to serve the requested file if it exists in the static folder root
    try:
        return send_from_directory(app.static_folder, filename)
    except NotFound:
        # If the file is not found (e.g., it's a client-side route like /about)
        # then serve index.html for React Router to handle
        return send_from_directory(app.static_folder, 'index.html')


# Custom error handler for 404s (ONLY for API routes not handled by serve_all_static_and_react)
@app.errorhandler(404)
def not_found_error(error):
    if request.path.startswith('/api/'):
        return jsonify(message="API Endpoint Not Found", status=404), 404
    # All non-API 404s should ideally be caught by serve_all_static_and_react and serve index.html
    # This block might not be hit for static files if serve_all_static_and_react works correctly.
    current_app.logger.warning(f"Unexpected 404 for path: {request.path}")
    return jsonify(message="Resource Not Found", status=404), 404


# For general application-level errors
@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, HTTPException):
        return e

    current_app.logger.error(f"Internal Server Error: {e}", exc_info=True) # exc_info for full traceback
    return jsonify(message="An unexpected error occurred at the application level.", status=500, error_type=type(e).__name__, details=traceback.format_exc()), 500
