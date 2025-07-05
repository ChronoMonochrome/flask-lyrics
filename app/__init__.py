# app/__init__.py

import json
import traceback

from datetime import datetime
from os.path import join, realpath, dirname
from flask import Flask, jsonify
from flask_cors import CORS
from flask_session import Session
from datetime import timedelta
import os
from dotenv import load_dotenv
from werkzeug.exceptions import HTTPException, NotFound
from flask_jwt_extended import JWTManager # Import JWTManager

from .factory import create_app
from .models import db # Import db from models

app = create_app()

# Initialize SQLAlchemy with the app
db.init_app(app)

# Initialize Flask-JWT-Extended
app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY", "development_secret_key_fallback") # Use the same SECRET_KEY for JWT
jwt = JWTManager(app) # Initialize JWTManager with your app instance

# Initialize CORS
cors = CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"], "allow_headers": "*"}})

# Now import logger, models, and routes as app is fully initialized
from app.logger import logger
from app import models
from app.models import db # Re-import db after models are defined if needed, but usually redundant
from app import routes
from app.api import api_bp # Import the API blueprint

# UTF-8 encoding in API
# Set this configuration BEFORE your Blueprints are registered or initialized
app.json.ensure_ascii = False
app.json.charset = "utf-8" # Ensure charset is explicitly set (though usually default for jsonify)

# --- Add a global Flask error handler as a fallback ---
# This catches errors that might happen before Flask-RESTx takes over,
# or if Flask-RESTx's handlers somehow aren't registered/triggered.
# This should go AFTER blueprint registration.
@app.errorhandler(500)
def handle_500_error(e):
    import traceback
    print(f"Flask Global 500 Error: {e}\n{traceback.format_exc()}")
    # Check debug mode to decide whether to expose traceback
    is_debug_mode = app.debug # Use app.debug directly here
    response = {
        'message': 'An unhandled server error occurred.',
        'status': 500,
        'error_type': 'InternalServerError',
        'details': traceback.format_exc() if is_debug_mode else 'Please contact support with the error timestamp.'
    }
    return jsonify(response), 500

@app.errorhandler(Exception) # Catch-all for any unhandled exception at the Flask app level
def handle_uncaught_exception_app_level(e):
    import traceback
    print(f"Flask Global Uncaught Exception: {e}\n{traceback.format_exc()}")
    is_debug_mode = app.debug
    response = {
        'message': 'An unexpected error occurred at the application level.',
        'status': 500,
        'error_type': type(e).__name__,
        'details': traceback.format_exc() if is_debug_mode else 'Please contact support.'
    }
    return jsonify(response), 500

app.register_blueprint(api_bp, url_prefix='/api') # Register the API blueprint
