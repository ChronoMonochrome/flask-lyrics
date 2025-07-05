# app/api.py

import traceback
from flask import Blueprint, jsonify, current_app # Keep current_app for debug checks if needed
from flask_restx import Api, Resource, fields
from werkzeug.exceptions import HTTPException, InternalServerError
from app.models import db
from sqlalchemy.orm import joinedload
from datetime import datetime
import json
from decimal import Decimal

api_bp = Blueprint('api', __name__)

api = Api(api_bp, version='1.0', title='...',
          description='...', doc='/doc',
          catch_all_404s=True)
