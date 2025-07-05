import traceback
from flask import Blueprint, jsonify, current_app, request
from flask_restx import Api, Resource, fields, reqparse
from werkzeug.exceptions import HTTPException, InternalServerError, Unauthorized, BadRequest, Forbidden, NotFound
from app.models import db, User, Riddle, Answer, UserProgress, calculate_level, now_utc
from sqlalchemy.orm import joinedload
from datetime import datetime
import json
from decimal import Decimal
from werkzeug.security import generate_password_hash, check_password_hash

from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    JWTManager,
    get_jwt_identity
)

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

api_bp = Blueprint('api', __name__)

api = Api(api_bp, version='1.0', title='Japanese Riddles API',
          description='API for Japanese Riddles application', doc='/doc',
          catch_all_404s=True)

# Load environment variables for JWT_SECRET_KEY
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if os.path.exists(os.path.join(BASE_DIR, '.env.local')):
    load_dotenv(os.path.join(BASE_DIR, '.env.local'))
else:
    load_dotenv(os.path.join(BASE_DIR, '.env'))

# Initialize Flask-JWT-Extended
# NOTE: This needs to be initialized with the Flask app, which happens in app/__init__.py
# For now, we'll put the JWTManager instance here and ensure `init_app` is called.
# The app factory structure makes this slightly tricky, but for a simple case,
# we'll assume current_app is available or pass the app object.
# Let's add JWTManager in app/__init__.py for proper initialization.

# Model for User (for API serialization)
user_model = api.model('User', {
    'id': fields.String(readOnly=True, description='The user unique identifier'),
    'username': fields.String(required=True, description='The user username'),
    'email': fields.String(description='The user email address'),
    'xp': fields.Integer(description='User experience points'),
    'level': fields.Integer(description='User level'),
    'created_at': fields.DateTime(dt_format='iso8601', readOnly=True),
    'updated_at': fields.DateTime(dt_format='iso8601', readOnly=True)
})

# Model for Riddle (for API serialization)
riddle_model = api.model('Riddle', {
    'id': fields.String(readOnly=True, description='The riddle unique identifier'),
    'text_kanji': fields.String(required=True, description='The riddle text with kanji'),
    'text_hiragana': fields.String(required=True, description='The hiragana reading of the riddle text'),
    'xp_reward': fields.Integer(description='XP awarded for solving this riddle'),
    'created_at': fields.DateTime(dt_format='iso8601', readOnly=True),
    'updated_at': fields.DateTime(dt_format='iso8601', readOnly=True)
})

# Model for Answer (for API serialization)
answer_model = api.model('Answer', {
    'id': fields.String(readOnly=True, description='The answer unique identifier'),
    'riddle_id': fields.String(required=True, description='The ID of the riddle this answer belongs to'),
    'text': fields.String(required=True, description='The accepted answer text'),
    'is_primary': fields.Boolean(description='Is this the primary answer?'),
    'created_at': fields.DateTime(dt_format='iso8601', readOnly=True)
})

# Model for User Progress (for API serialization)
user_progress_model = api.model('UserProgress', {
    'riddle_id': fields.String(required=True, description='The ID of the riddle'),
    'solved': fields.Boolean(description='Whether the riddle was solved by the user'),
    'last_attempt_answer': fields.String(description='The last answer attempted by the user'),
    'solved_at': fields.DateTime(dt_format='iso8601', description='Timestamp when the riddle was solved'),
    'manually_corrected': fields.Boolean(description='Whether the riddle was manually marked as correct')
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
            return {'message': 'User with that username already exists'}, 409
        if email and User.query.filter_by(email=email).first():
            return {'message': 'User with that email already exists'}, 409

        hashed_password = generate_password_hash(password, method='scrypt') # Use scrypt for stronger hashing
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
            return {'message': 'Invalid username or password'}, 401

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

# Namespace for Riddles
riddles_ns = api.namespace('riddles', description='Riddle operations')

@riddles_ns.route('/')
class RiddleList(Resource):
    @api.doc(security='Bearer')
    @jwt_required()
    @api.response(200, 'Success', [riddle_model])
    def get(self):
        # Fetch all riddles for simplicity, can add pagination/filters later
        riddles = Riddle.query.all()
        return api.marshal(riddles, riddle_model)

@riddles_ns.route('/<string:riddle_id>')
class RiddleResource(Resource):
    @api.doc(security='Bearer')
    @jwt_required()
    @api.response(200, 'Success', riddle_model)
    @api.response(404, 'Riddle not found')
    def get(self, riddle_id):
        riddle = Riddle.query.get(riddle_id)
        if not riddle:
            api.abort(404, "Riddle not found")
        return api.marshal(riddle, riddle_model)

# Request Parser for Answer Submission
answer_submit_parser = reqparse.RequestParser()
answer_submit_parser.add_argument('answer_text', type=str, required=True, help='Answer text cannot be blank!')

@riddles_ns.route('/<string:riddle_id>/submit_answer')
class RiddleAnswer(Resource):
    @api.doc(security='Bearer')
    @jwt_required()
    @api.expect(answer_submit_parser)
    @api.response(200, 'Answer processed')
    @api.response(404, 'Riddle not found')
    @api.response(400, 'Bad Request')
    def post(self, riddle_id):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        riddle = Riddle.query.get(riddle_id)

        if not user:
            api.abort(404, "User not found")
        if not riddle:
            api.abort(404, "Riddle not found")

        data = answer_submit_parser.parse_args()
        submitted_answer_text = data['answer_text'].strip().lower() # Normalize answer

        # Check if user has already solved this riddle
        user_progress = UserProgress.query.filter_by(user_id=user.id, riddle_id=riddle.id).first()

        if user_progress and user_progress.solved:
            return {'message': 'Riddle already solved by this user.', 'solved': True}, 200

        # Check if the submitted answer is correct
        correct_answers = [ans.text.lower() for ans in riddle.answers]
        is_correct = submitted_answer_text in correct_answers

        if not user_progress:
            user_progress = UserProgress(user_id=user.id, riddle_id=riddle.id)
            db.session.add(user_progress)

        user_progress.last_attempt_answer = submitted_answer_text
        user_progress.attempted_at = now_utc()

        if is_correct:
            user_progress.solved = True
            user_progress.solved_at = now_utc()
            user_progress.manually_corrected = False # Reset if solved automatically

            # Award XP and level up
            user.xp += riddle.xp_reward
            user.level = calculate_level(user.xp)
            db.session.add(user) # Update user XP/level

            db.session.commit()
            return {'message': 'Correct answer! XP gained.', 'solved': True, 'xp_gained': riddle.xp_reward, 'new_xp': user.xp, 'new_level': user.level}, 200
        else:
            db.session.commit()
            return {'message': 'Incorrect answer. Try again!', 'solved': False}, 200

@riddles_ns.route('/<string:riddle_id>/mark_correct')
class RiddleMarkCorrect(Resource):
    @api.doc(security='Bearer')
    @jwt_required()
    @api.response(200, 'Riddle marked as correct')
    @api.response(404, 'Riddle or User not found')
    @api.response(409, 'Riddle already marked as correct')
    def post(self, riddle_id):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        riddle = Riddle.query.get(riddle_id)

        if not user:
            api.abort(404, "User not found")
        if not riddle:
            api.abort(404, "Riddle not found")

        user_progress = UserProgress.query.filter_by(user_id=user.id, riddle_id=riddle.id).first()

        if user_progress and user_progress.solved:
            return {'message': 'Riddle already solved by this user (or manually corrected).'}, 409

        if not user_progress:
            user_progress = UserProgress(user_id=user.id, riddle_id=riddle.id)
            db.session.add(user_progress)

        user_progress.solved = True
        user_progress.solved_at = now_utc()
        user_progress.manually_corrected = True
        # If user submitted something before, keep it, otherwise set to a default marker
        if not user_progress.last_attempt_answer:
            user_progress.last_attempt_answer = "[Manually Corrected]"

        # Award XP and level up (only if not previously solved)
        # Check if XP was already awarded for this riddle and user before awarding again
        # This simple check relies on 'solved' status to avoid double awarding.
        # If the 'solved' status was False and is now True, award XP.
        # This is important for "I was correct" button, ensuring XP is given once.
        if not user_progress.solved_at or user_progress.solved_at.date() != now_utc().date(): # Example: only award once per day if they manually correct again
             user.xp += riddle.xp_reward
             user.level = calculate_level(user.xp)
             db.session.add(user) # Update user XP/level

        try:
            db.session.commit()
            return {'message': 'Riddle marked as correct!', 'xp_gained': riddle.xp_reward, 'new_xp': user.xp, 'new_level': user.level}, 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error marking riddle correct: {e}")
            api.abort(500, "Internal Server Error")


# Namespace for Admin operations
admin_ns = api.namespace('admin', description='Admin operations')

# Request Parser for adding a riddle
riddle_add_parser = reqparse.RequestParser()
riddle_add_parser.add_argument('text_kanji', type=str, required=True, help='Riddle text with kanji cannot be blank!')
riddle_add_parser.add_argument('text_hiragana', type=str, required=True, help='Riddle text with hiragana cannot be blank!')
riddle_add_parser.add_argument('xp_reward', type=int, default=10, help='XP reward for solving this riddle (default 10)')
riddle_add_parser.add_argument('answers', type=list, location='json', required=True, help='List of accepted answers for the riddle (e.g., ["くだもの", "果物"])')

@admin_ns.route('/add_riddle')
class AddRiddle(Resource):
    @api.doc(security='Bearer')
    @jwt_required()
    @api.expect(riddle_add_parser)
    @api.response(201, 'Riddle added successfully', riddle_model)
    @api.response(400, 'Bad Request')
    @api.response(403, 'Forbidden - Admin access required')
    def post(self):
        # In a real app, you'd check user roles here (e.g., if get_jwt_identity() is an admin user)
        # For this template, we'll assume any logged-in user can add a riddle for demonstration.
        # Or you could hardcode an admin user ID for simplicity.
        current_user_id = get_jwt_identity()
        # For simplicity, let's say user 'admin_user' is an admin.
        # In a real app, retrieve user object and check a role attribute.
        user = User.query.get(current_user_id)
        if not user or user.username != "admin_user": # Replace with actual admin role check
             api.abort(403, "Admin access required")


        data = riddle_add_parser.parse_args()
        text_kanji = data['text_kanji']
        text_hiragana = data['text_hiragana']
        xp_reward = data['xp_reward']
        answers_data = data['answers']

        if not answers_data:
            api.abort(400, 'At least one answer is required for the riddle.')

        new_riddle = Riddle(
            text_kanji=text_kanji,
            text_hiragana=text_hiragana,
            xp_reward=xp_reward
        )
        db.session.add(new_riddle)
        db.session.flush() # To get the ID for related answers

        for ans_text in answers_data:
            new_answer = Answer(riddle_id=new_riddle.id, text=ans_text, is_primary=False)
            db.session.add(new_answer)
        if answers_data:
            # Mark the first answer as primary, or handle this more robustly if needed
            first_answer = Answer.query.filter_by(riddle_id=new_riddle.id, text=answers_data[0]).first()
            if first_answer:
                first_answer.is_primary = True

        try:
            db.session.commit()
            return {'message': 'Riddle added successfully', 'riddle': api.marshal(new_riddle, riddle_model)}, 201
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error adding riddle: {e}")
            api.abort(500, "Internal Server Error during riddle addition")

# Error Handlers for Flask-RESTx
@api.errorhandler(BadRequest)
@api.errorhandler(NotFound)
@api.errorhandler(Unauthorized)
@api.errorhandler(Forbidden)
def handle_restx_http_exception(error):
    # This handler ensures Flask-RESTx HTTP exceptions are caught and formatted
    current_app.logger.error(f"RESTX HTTP Error: {error.code} - {error.description}")
    return jsonify({
        'message': error.description,
        'status': error.code,
        'error_type': error.__class__.__name__
    }), error.code

@api.errorhandler(NoAuthorizationError)
@api.errorhandler(InvalidHeaderError)
@api.errorhandler(JWTDecodeError)
@api.errorhandler(WrongTokenError)
@api.errorhandler(RevokedTokenError)
@api.errorhandler(FreshTokenRequired)
@api.errorhandler(UserClaimsVerificationError)
def handle_jwt_exceptions(error):
    current_app.logger.error(f"JWT Error: {type(error).__name__} - {error.args[0]}")
    return jsonify({
        "message": str(error),
        "status": 401,
        "error_type": type(error).__name__
    }), 401

@api.errorhandler(Exception)
def handle_api_exception(e):
    # Fallback for any other unhandled exceptions within API namespace
    if isinstance(e, HTTPException):
        # Let Flask-RESTx's default HTTPException handler take over if it hasn't already.
        # This should ideally not be reached if the above HTTP error handler is working.
        return jsonify({
            'message': e.description,
            'status': e.code,
            'error_type': e.__class__.__name__
        }), e.code

    current_app.logger.error(f"API Unhandled Exception: {e}\n{traceback.format_exc()}")
    is_debug_mode = current_app.debug
    response = {
        'message': 'An unhandled server error occurred in the API.',
        'status': 500,
        'error_type': type(e).__name__,
        'details': traceback.format_exc() if is_debug_mode else 'Please contact support.'
    }
    return jsonify(response), 500

# Import RequestParser after Flask-RESTx is initialized
from flask_restx import reqparse

# Register namespaces with the API
api.add_namespace(auth_ns)
api.add_namespace(riddles_ns)
api.add_namespace(admin_ns)
