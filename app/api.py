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
import random

from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    JWTManager,
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

# Model for Answer (for API serialization) - Define this before riddle_model if it's nested
answer_model = api.model('Answer', {
    'id': fields.String(readOnly=True, description='The answer unique identifier'),
    'riddle_id': fields.String(required=True, description='The ID of the riddle this answer belongs to'),
    'answer_text': fields.String(required=True, description='The accepted answer text'),
    'is_correct': fields.Boolean(description='Is this one of the correct answers?'),
    'created_at': fields.DateTime(dt_format='iso8601', readOnly=True)
})

# Model for Riddle (for API serialization) - Updated to remove correct_answers from default marshal
riddle_model = api.model('Riddle', {
    'id': fields.String(readOnly=True, description='The riddle unique identifier'),
    'text_kanji': fields.String(required=True, description='The riddle text with kanji'),
    'text_hiragana': fields.String(required=True, description='The hiragana reading of the riddle text'),
    'english_text': fields.String(required=True, description='The English translation of the riddle text'),
    'category': fields.String(required=True, description='The category of the riddle'),
    'difficulty': fields.String(required=True, description='The difficulty of the riddle'),
    'xp_reward': fields.Integer(description='XP awarded for solving this riddle'),
    'created_at': fields.DateTime(dt_format='iso8601', readOnly=True),
    'updated_at': fields.DateTime(dt_format='iso8601', readOnly=True),
    # 'correct_answers': fields.List(fields.String, description='List of correct answer texts for the riddle')
    # ^^^ REMOVE THIS FROM THE MODEL if you're manually adding it to output
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

# Namespace for Riddles
riddles_ns = api.namespace('riddles', description='Riddle operations')

@riddles_ns.route('/')
class RiddleList(Resource):
    @api.doc()
    @api.response(200, 'Success', [riddle_model])
    def get(self):
        riddles = Riddle.query.options(joinedload(Riddle.answers)).all()

        marshaled_riddles = []
        for riddle in riddles:
            riddle_data = api.marshal(riddle, riddle_model)
            # Only include correct_answers if it's explicitly needed and controlled (e.g., for admin)
            # For a general /riddles list, you probably don't want to expose answers.
            # If you need them for client-side comparison after an answer attempt,
            # consider a separate endpoint or only include it on submission.
            # However, based on your original code, you are including them.
            riddle_data['correct_answers'] = [
                ans.answer_text for ans in riddle.answers if ans.is_correct
            ]
            marshaled_riddles.append(riddle_data)

        return marshaled_riddles

@riddles_ns.route('/random')
class RandomRiddle(Resource):
    @api.doc('get_random_riddle')
    @api.marshal_with(riddle_model)
    # @jwt_required(optional=True) # Add if you want to protect or track for logged-in users
    def get(self):
        """
        Get a random riddle.
        """
        # Fetch all riddle IDs to select one randomly efficiently
        all_riddle_ids = [r.id for r in Riddle.query.with_entities(Riddle.id).all()]

        if not all_riddle_ids:
            current_app.logger.warning("No riddles found in the database for random selection.")
            api.abort(404, "No riddles available.") # This will trigger Flask-RestX's 404 handler

        random_riddle_id = random.choice(all_riddle_ids)

        random_riddle = Riddle.query.get(random_riddle_id)

        if not random_riddle:
            current_app.logger.error(f"Riddle with ID {random_riddle_id} chosen but not found. Database inconsistency?")
            api.abort(404, "Riddle not found (internal error).")

        # Marshal the riddle and add correct_answers for this specific endpoint if desired
        riddle_data = api.marshal(random_riddle, riddle_model)
        riddle_data['correct_answers'] = [ans.answer_text for ans in random_riddle.answers if ans.is_correct]
        return riddle_data

@riddles_ns.route('/<string:riddle_id>')
class RiddleResource(Resource):
    @api.doc()
    @api.response(200, 'Success', riddle_model)
    @api.response(404, 'Riddle not found')
    def get(self, riddle_id):
        riddle = Riddle.query.get(riddle_id)
        if not riddle:
            api.abort(404, "Riddle not found")
        riddle_data = api.marshal(riddle, riddle_model)
        riddle_data['correct_answers'] = [ans.answer_text for ans in riddle.answers if ans.is_correct]
        return riddle_data

# NEW ENDPOINT: To explicitly get correct answers for a specific riddle
@riddles_ns.route('/<string:riddle_id>/answer', methods=['GET'])
class RiddleAnswerOnly(Resource):
    @api.doc('get_riddle_answer_only', security='Bearer')
    @jwt_required(optional=True) # Allow optional JWT for guest users
    @api.response(200, 'Success', api.model('CorrectAnswers', {'correct_answers': fields.List(fields.String)}))
    @api.response(404, 'Riddle not found')
    def get(self, riddle_id):
        """
        Get the correct answers for a specific riddle ID.
        """
        riddle = Riddle.query.get(riddle_id)
        if not riddle:
            api.abort(404, "Riddle not found")

        # You can add authorization logic here if needed, e.g.,
        # only allow if the user is logged in or if they have already solved the riddle.
        # current_user_id = get_jwt_identity()
        # user = User.query.get(current_user_id) if current_user_id else None

        correct_answers = [ans.answer_text for ans in riddle.answers if ans.is_correct]

        return correct_answers, 200

# Request Parser for Answer Submission
answer_submit_parser = reqparse.RequestParser()
answer_submit_parser.add_argument('answer_text', type=str, required=True, help='Answer text cannot be blank!')

@riddles_ns.route('/<string:riddle_id>/submit_answer')
class RiddleAnswer(Resource):
    @api.doc(security='Bearer')
    @jwt_required(optional=True)
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
            correct_canonical_answer = next((ans.answer_text for ans in riddle.answers if ans.is_correct), None)
            return {'message': 'Riddle already solved by this user.', 'solved': True, 'actual_answer': correct_canonical_answer}, 200

        # If user_progress does not exist, create it
        if not user_progress:
            user_progress = UserProgress(user_id=user.id, riddle_id=riddle.id)
            db.session.add(user_progress)
            db.session.flush() # Ensure defaults are applied here

        if user_progress.attempts is None:
            user_progress.attempts = 0 # Explicitly set to 0 if it's somehow None

        user_progress.attempts += 1 # Increment attempts
        user_progress.last_attempt_at = now_utc() # Update last attempt time
        user_progress.last_attempt_answer = submitted_answer_text # Store the last submitted answer


        # Check if the submitted answer is correct
        correct_answers_objects = [ans for ans in riddle.answers if ans.is_correct]
        correct_answers_texts = [ans.answer_text.lower() for ans in correct_answers_objects]
        is_correct = submitted_answer_text in correct_answers_texts

        actual_correct_answer_text = None
        if is_correct:
            actual_correct_answer_text = correct_answers_objects[0].answer_text if correct_answers_objects else None
        else:
            pass


        if is_correct:
            user_progress.solved = True
            user_progress.solved_at = now_utc()
            user_progress.manually_corrected = False # Reset if solved automatically

            user.xp += riddle.xp_reward
            user.level = calculate_level(user.xp)
            db.session.add(user)

            db.session.commit()
            return {
                'message': 'Correct answer! XP gained.',
                'solved': True,
                'xp_gained': riddle.xp_reward,
                'new_xp': user.xp,
                'new_level': user.level,
                'actual_answer': actual_correct_answer_text
            }, 200
        else:
            db.session.commit()
            return {'message': 'Incorrect answer. Try again!', 'solved': False, 'actual_answer': actual_correct_answer_text}, 200

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
            api.abort(409, 'Riddle already solved by this user (or manually corrected).')

        if not user_progress:
            user_progress = UserProgress(user_id=user.id, riddle_id=riddle.id)
            db.session.add(user_progress)
            db.session.flush()

        xp_awarded_now = 0
        if not user_progress.solved:
            user.xp += riddle.xp_reward
            user.level = calculate_level(user.xp)
            db.session.add(user)
            xp_awarded_now = riddle.xp_reward

        user_progress.solved = True
        user_progress.solved_at = now_utc()
        user_progress.manually_corrected = True
        if not user_progress.last_attempt_answer:
            user_progress.last_attempt_answer = "[Manually Corrected]"
            
        if user_progress.attempts is None:
            user_progress.attempts = 0
        user_progress.attempts += 1
        user_progress.last_attempt_at = now_utc()

        try:
            db.session.commit()
            return {'message': 'Riddle marked as correct!', 'xp_gained': xp_awarded_now, 'new_xp': user.xp, 'new_level': user.level}, 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error marking riddle correct: {e}")
            api.abort(500, "Internal Server Error")


# Namespace for Admin operations
admin_ns = api.namespace('admin', description='Admin operations')

# Request Parser for adding/updating a riddle
# Reusing riddle_add_parser for update, but it's okay as PUT will target specific ID
riddle_add_parser = reqparse.RequestParser()
riddle_add_parser.add_argument('text_kanji', type=str, required=True, help='Riddle text with kanji cannot be blank!')
riddle_add_parser.add_argument('text_hiragana', type=str, required=True, help='Riddle text with hiragana cannot be blank!')
riddle_add_parser.add_argument('english_text', type=str, required=True, help='English translation of the riddle text cannot be blank!')
riddle_add_parser.add_argument('category', type=str, default="General", help='Category of the riddle (default: General)')
riddle_add_parser.add_argument('difficulty', type=str, default="Easy", help='Difficulty of the riddle (default: Easy)')
riddle_add_parser.add_argument('xp_reward', type=int, default=10, help='XP reward for solving this riddle (default 10)')
riddle_add_parser.add_argument('answers', type=list, location='json', required=True, help='List of accepted answers for the riddle (e.g., ["くだもの", "果物"])')


@admin_ns.route('/riddles') # A general endpoint for getting all riddles for admin view
class AdminRiddleList(Resource):
    @api.doc(security='Bearer')
    @jwt_required()
    @api.response(200, 'Success', [riddle_model])
    @api.response(403, 'Forbidden - Admin access required')
    def get(self):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or user.role != "admin": # Use role check
            api.abort(403, "Admin access required")

        riddles = Riddle.query.options(joinedload(Riddle.answers)).all()
        marshaled_riddles = []
        for riddle in riddles:
            riddle_data = api.marshal(riddle, riddle_model)
            # For admin, we likely want all correct answers
            riddle_data['correct_answers'] = [ans.answer_text for ans in riddle.answers if ans.is_correct]
            marshaled_riddles.append(riddle_data)
        return marshaled_riddles


@admin_ns.route('/riddles/<string:riddle_id>') # Specific endpoint for individual riddle operations
class AdminRiddleResource(Resource):
    @api.doc(security='Bearer')
    @jwt_required()
    @api.response(403, 'Forbidden - Admin access required')
    @api.response(404, 'Riddle not found')
    def authorize_admin(self):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or user.role != "admin":
            api.abort(403, "Admin access required")
        return user # Return user if authorized

    @api.marshal_with(riddle_model)
    def get(self, riddle_id):
        """Get a single riddle with all its correct answers."""
        self.authorize_admin()
        riddle = Riddle.query.options(joinedload(Riddle.answers)).get(riddle_id)
        if not riddle:
            api.abort(404, "Riddle not found")
        riddle_data = api.marshal(riddle, riddle_model)
        riddle_data['correct_answers'] = [ans.answer_text for ans in riddle.answers if ans.is_correct]
        return riddle_data


    @api.expect(riddle_add_parser) # Reuse the add parser
    @api.response(200, 'Riddle updated successfully', riddle_model)
    def put(self, riddle_id):
        """Update an existing riddle and its answers."""
        self.authorize_admin()
        riddle = Riddle.query.get(riddle_id)
        if not riddle:
            api.abort(404, "Riddle not found")

        data = riddle_add_parser.parse_args()

        # Update riddle fields
        riddle.text_kanji = data['text_kanji']
        riddle.text_hiragana = data['text_hiragana']
        riddle.english_text = data['english_text']
        riddle.category = data['category']
        riddle.difficulty = data['difficulty']
        riddle.xp_reward = data['xp_reward']
        riddle.updated_at = now_utc() # Update timestamp

        # Update answers: Simplest approach is to delete old ones and add new ones.
        # This prevents issues with updating specific answer texts or is_correct flags.
        Answer.query.filter_by(riddle_id=riddle.id).delete()
        db.session.flush() # Commit deletions before adding new ones

        if not data['answers']:
            api.abort(400, 'At least one answer is required for the riddle.')

        for ans_text in data['answers']:
            new_answer = Answer(riddle_id=riddle.id, answer_text=ans_text, is_correct=True)
            db.session.add(new_answer)

        try:
            db.session.commit()
            marshaled_riddle = api.marshal(riddle, riddle_model)
            marshaled_riddle['correct_answers'] = [ans.answer_text for ans in riddle.answers if ans.is_correct]
            return {'message': 'Riddle updated successfully', 'riddle': marshaled_riddle}, 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating riddle {riddle_id}: {e}")
            api.abort(500, "Internal Server Error during riddle update")

    @api.response(204, 'Riddle deleted successfully')
    def delete(self, riddle_id):
        """Delete a riddle and all its associated answers and user progress."""
        self.authorize_admin()
        riddle = Riddle.query.get(riddle_id)
        if not riddle:
            api.abort(404, "Riddle not found")

        try:
            # Delete associated answers first (due to foreign key constraints if not CASCADE)
            Answer.query.filter_by(riddle_id=riddle.id).delete()
            # Delete associated user progress
            UserProgress.query.filter_by(riddle_id=riddle.id).delete()
            # Then delete the riddle itself
            db.session.delete(riddle)
            db.session.commit()
            return {'message': 'Riddle deleted successfully'}, 204 # 204 No Content for successful deletion
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting riddle {riddle_id}: {e}")
            api.abort(500, "Internal Server Error during riddle deletion")

# This endpoint remains for adding new riddles
@admin_ns.route('/add_riddle')
class AddRiddle(Resource):
    @api.doc(security='Bearer')
    @jwt_required()
    @api.expect(riddle_add_parser)
    @api.response(201, 'Riddle added successfully', riddle_model)
    @api.response(400, 'Bad Request')
    @api.response(403, 'Forbidden - Admin access required')
    def post(self):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or user.role != "admin": # Use role check
            api.abort(403, "Admin access required")

        data = riddle_add_parser.parse_args()
        text_kanji = data['text_kanji']
        text_hiragana = data['text_hiragana']
        english_text = data['english_text']
        category = data['category']
        difficulty = data['difficulty']
        xp_reward = data['xp_reward']
        answers_data = data['answers']

        if not answers_data:
            api.abort(400, 'At least one answer is required for the riddle.')

        new_riddle = Riddle(
            text_kanji=text_kanji,
            text_hiragana=text_hiragana,
            english_text=english_text,
            category=category,
            difficulty=difficulty,
            xp_reward=xp_reward
        )
        db.session.add(new_riddle)
        db.session.flush()

        for ans_text in answers_data:
            new_answer = Answer(riddle_id=new_riddle.id, answer_text=ans_text, is_correct=True)
            db.session.add(new_answer)

        try:
            db.session.commit()
            marshaled_new_riddle = api.marshal(new_riddle, riddle_model)
            marshaled_new_riddle['correct_answers'] = [
                ans.answer_text for ans in new_riddle.answers if ans.is_correct
            ]
            return {'message': 'Riddle added successfully', 'riddle': marshaled_new_riddle}, 201
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error adding riddle: {e}")
            api.abort(500, "Internal Server Error during riddle addition")

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

# Register namespaces with the API
api.add_namespace(auth_ns)
api.add_namespace(riddles_ns)
api.add_namespace(admin_ns)