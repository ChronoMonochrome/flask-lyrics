import traceback
from flask import Blueprint, jsonify, current_app, request, make_response
from flask_restx import Api, Resource, fields, reqparse
from werkzeug.exceptions import HTTPException, InternalServerError, Unauthorized, BadRequest, Forbidden, NotFound
from app.models import db, User # Removed Riddle, Answer, UserProgress for brevity, add back if needed
from sqlalchemy.orm import joinedload # Not used if Riddle/Answer are removed
from datetime import datetime
import json
from decimal import Decimal
from werkzeug.security import generate_password_hash, check_password_hash
import random

from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    JWTManager, # You already have this
    get_jwt_identity
)

import jwt.exceptions as jwt_py_exceptions

from flask_jwt_extended.exceptions import (
    NoAuthorizationError,
    InvalidHeaderError,
    JWTDecodeError,
    WrongTokenError,
    RevokedTokenError,
    FreshTokenRequired,
    UserClaimsVerificationError
)

import os
from dotenv import load_dotenv

from .lyrics_utils import generate_lyrics_page_html

from . import LYRICS_DATA, VOCABULARY_DATA, get_words_db

api_bp = Blueprint('api', __name__)

api = Api(api_bp, version='1.0', title='Japanese Riddles API',
             description='API for Japanese Riddles application', doc='/doc',
             catch_all_404s=True)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if os.path.exists(os.path.join(BASE_DIR, '.env.local')):
    load_dotenv(os.path.join(BASE_DIR, '.env.local'))
else:
    load_dotenv(os.path.join(BASE_DIR, '.env'))

# Model for User (for API serialization)
user_model = api.model('User', {
    'id': fields.String(readOnly=True, description='The user unique identifier'),
    'username': fields.String(required=True, description='The user username'),
    'email': fields.String(description='The user email address'),
    'xp': fields.Integer(description='User experience points'),
    'level': fields.Integer(description='User level'),
    'role': fields.String(description='User role (e.g., "user", "admin")'),
    'created_at': fields.DateTime(dt_format='iso8601', readOnly=True),
    'updated_at': fields.DateTime(dt_format='iso8601', readOnly=True)
})

# Namespace for Authentication
auth_ns = api.namespace('auth', description='Authentication operations')

# Request Parser for User Registration
registration_parser = reqparse.RequestParser()
registration_parser.add_argument('username', type=str, required=True, help='Username cannot be blank!')
registration_parser.add_argument('password', type=str, required=True, help='Password cannot be blank!')
registration_parser.add_argument('email', type=str, required=False, help='Email address')

# Request Parser for User Login
login_parser = reqparse.RequestParser()
login_parser.add_argument('username', type=str, required=True, help='Username cannot be blank!')
login_parser.add_argument('password', type=str, required=True, help='Password cannot be blank!')

@auth_ns.route('/register')
class UserRegister(Resource):
    @api.expect(registration_parser)
    @api.response(201, 'User created successfully', user_model)
    @api.response(400, 'Bad Request')
    @api.response(409, 'Conflict - Username or Email already exists')
    def post(self):
        data = registration_parser.parse_args()
        username = data['username']
        password = data['password']
        email = data.get('email')

        if User.query.filter_by(username=username).first():
            api.abort(409, 'User with that username already exists')
        if email and User.query.filter_by(email=email).first():
            api.abort(409, 'User with that email already exists')

        hashed_password = generate_password_hash(password, method='scrypt')
        new_user = User(username=username, password_hash=hashed_password, email=email)
        db.session.add(new_user)
        try:
            db.session.commit()
            return {'message': 'User created successfully', 'user': api.marshal(new_user, user_model)}, 201
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error registering user: {e}")
            api.abort(500, "Internal Server Error during registration")

@auth_ns.route('/login')
class UserLogin(Resource):
    @api.expect(login_parser)
    @api.response(200, 'Login successful', api.model('LoginSuccess', {'access_token': fields.String, 'user': fields.Nested(user_model)}))
    @api.response(401, 'Invalid credentials')
    def post(self):
        data = login_parser.parse_args()
        username = data['username']
        password = data['password']

        user = User.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password_hash, password):
            api.abort(401, 'Invalid username or password')

        access_token = create_access_token(identity=user.id)
        return {'access_token': access_token, 'user': api.marshal(user, user_model)}, 200

@auth_ns.route('/user_profile')
class UserProfile(Resource):
    @api.doc(security='Bearer')
    @jwt_required()
    @api.response(200, 'Success', user_model)
    @api.response(401, 'Unauthorized')
    @api.response(404, 'User not found')
    def get(self):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user:
            api.abort(404, "User not found")
        return api.marshal(user, user_model)

# Error Handlers for Flask-RESTx

# Specifically catch ExpiredSignatureError from PyJWT and similar JWT errors
@api.errorhandler(jwt_py_exceptions.ExpiredSignatureError)
@api.errorhandler(jwt_py_exceptions.InvalidTokenError) # Catch general invalid token errors from PyJWT
def handle_pyjwt_exceptions(error):
    current_app.logger.warning(f"PyJWT Error: {type(error).__name__} - {error.args[0]}")
    response_data = {
        "message": "Authentication required. Your session has expired or is invalid.",
        "status": 401,
        "error_type": type(error).__name__,
        "redirect_to_home": True # Signal to the frontend to redirect
    }
    # Return a dictionary and status code; Flask-RestX will jsonify it.
    return response_data, 401


@api.errorhandler(BadRequest)
@api.errorhandler(NotFound)
@api.errorhandler(Unauthorized)
@api.errorhandler(Forbidden)
def handle_restx_http_exception(error):
    current_app.logger.error(f"RESTX HTTP Error: {error.code} - {error.description}")
    # Return a dictionary and status code; Flask-RestX will jsonify it.
    return {
        'message': error.description,
        'status': error.code,
        'error_type': error.__class__.__name__
    }, error.code

@api.errorhandler(NoAuthorizationError)
@api.errorhandler(InvalidHeaderError)
@api.errorhandler(JWTDecodeError) # Keeping this to catch other general decode errors
@api.errorhandler(WrongTokenError)
@api.errorhandler(RevokedTokenError)
@api.errorhandler(FreshTokenRequired)
@api.errorhandler(UserClaimsVerificationError)
def handle_flask_jwt_extended_exceptions(error): # Renamed for clarity
    current_app.logger.error(f"Flask-JWT-Extended Error: {type(error).__name__} - {error.args[0]}")
    # If a specific JWT error implies session invalidation, signal redirect
    redirect_needed = isinstance(error, (RevokedTokenError, NoAuthorizationError, InvalidHeaderError, WrongTokenError))
    # Return a dictionary and status code; Flask-RestX will jsonify it.
    return {
        "message": str(error),
        "status": 401,
        "error_type": type(error).__name__,
        "redirect_to_home": redirect_needed # Signal to the frontend
    }, 401

@api.errorhandler(Exception)
def handle_api_exception(e):
    # If the exception is an HTTPException (like those from api.abort),
    # let the more specific HTTP error handlers (like handle_restx_http_exception)
    # or Flask-RestX's default for HTTPExceptions take over.
    # CRITICAL FIX: DO NOT return jsonify directly here for HTTPExceptions.
    # Flask-RestX's internal `error_router` expects the exception object itself
    # or a tuple (response_data, status_code) where response_data is a dict.
    # If you return a `Response` object here, it disrupts the flow.
    if isinstance(e, HTTPException):
        # Allow Flask-RESTx to handle its own HTTPExceptions
        # Flask-RestX will catch this and pass it to its specific error handlers
        # or render its default error page/JSON.
        # This line effectively stops the current handler from processing it
        # and allows the exception to propagate to Flask-RestX's error_router.
        current_app.logger.debug(f"API Unhandled Exception: Caught HTTPException {type(e).__name__} for general handler, letting specific handler or default take over.")
        raise e # Re-raise the exception for Flask-RESTX's internal handling

    current_app.logger.error(f"API Unhandled Exception: {e}\n{traceback.format_exc()}")
    is_debug_mode = current_app.debug
    response = {
        'message': 'An unhandled server error occurred in the API.',
        'status': 500,
        'error_type': type(e).__name__,
        'details': traceback.format_exc() if is_debug_mode else 'Please contact support.'
    }
    # Return a dictionary and status code; Flask-RestX will jsonify it.
    return response, 500

# Namespace for Word Lookup
words_ns = api.namespace('words', description='Word lookup operations')

# Request parser for the search endpoint
word_search_parser = reqparse.RequestParser()
word_search_parser.add_argument('q', type=str, required=True, help='Search query (word or phrase)')

@words_ns.route('/search')
class WordSearch(Resource):
    @api.doc(params={'q': 'The Japanese word or phrase to search for'})
    @api.expect(word_search_parser)
    @api.response(200, 'Success', [fields.Raw(description='The JSON data for the word entry')])
    @api.response(400, 'Bad Request')
    def get(self):
        args = word_search_parser.parse_args()
        query = args['q']

        words_db = get_words_db()
        if not words_db:
            current_app.logger.error("Word database is not initialized.")
            return jsonify({"error": "Word database not available."}), 503

        results = words_db.get_words(query)

        return jsonify(results)

# --- NEW: Namespace and Endpoints for Lyrics ---
lyrics_ns = api.namespace('lyrics', description='Song lyrics operations')

lyrics_list_model = api.model('LyricsListItem', {
    'id': fields.String(description='Unique ID of the song'),
    'title': fields.String(description='Title of the song'),
    'artist': fields.String(description='Artist of the song')
})

@lyrics_ns.route('/list')
class LyricsList(Resource):
    @api.response(200, 'Success', fields.List(fields.Nested(lyrics_list_model)))
    def get(self):
        """Returns a list of available songs with their titles and artists."""
        song_list = [{'id': s_id, 'title': LYRICS_DATA[s_id]['title'], 'artist': LYRICS_DATA[s_id]['artist']}
                        for s_id in LYRICS_DATA.keys()]
        return jsonify(song_list)

@lyrics_ns.route('/<string:song_id>/html')
class LyricsHtml(Resource):
    @api.doc(params={'song_id': 'The ID of the song to retrieve lyrics for'})
    @api.response(200, 'Success', fields.String(description='HTML content of the song lyrics with vocabulary'))
    @api.response(404, 'Song not found')
    def get(self, song_id):
        """Returns the HTML content for a specific song, including linked words and vocabulary."""
        song_data = LYRICS_DATA.get(song_id)
        if not song_data:
            api.abort(404, f"Song with ID '{song_id}' not found.")

        try:
            # Generate the HTML using the utility function
            lyrics_html = generate_lyrics_page_html(song_data, VOCABULARY_DATA)

            # CRITICAL FIX: Use make_response to create a proper response object
            # and set its content_type. This bypasses Flask-RESTx's serialization
            # and ensures the string is returned as raw HTML.
            resp = make_response(lyrics_html)
            resp.content_type = 'text/html; charset=utf-8'
            return resp
        except Exception as e:
            current_app.logger.error(f"Error generating HTML for song {song_id}: {e}", exc_info=True)
            api.abort(500, "Internal Server Error generating lyrics HTML.")

# Register namespaces with the API
api.add_namespace(auth_ns)
api.add_namespace(words_ns) # New namespace registration
api.add_namespace(lyrics_ns) # NEW namespace registration
