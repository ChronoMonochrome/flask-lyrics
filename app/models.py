import uuid
import pymysql
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON, Boolean, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from decimal import Decimal

# Install PyMySQL as MySQLdb for compatibility
pymysql.install_as_MySQLdb()

# Initialize SQLAlchemy outside of create_app to avoid circular imports if app is also imported by models
db = SQLAlchemy()