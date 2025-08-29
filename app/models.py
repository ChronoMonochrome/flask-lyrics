import uuid
import pymysql
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON, Boolean, Numeric, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from decimal import Decimal
import pytz # For timezone-aware datetimes

# Install PyMySQL as MySQLdb for compatibility
pymysql.install_as_MySQLdb()

# Initialize SQLAlchemy outside of create_app to avoid circular imports if app is also imported by models
db = SQLAlchemy()

# Helper function for current UTC time
def now_utc():
    return datetime.now(timezone.utc)

class User(db.Model):
    __tablename__ = 'users'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(80), unique=True, nullable=False)
    password_hash = Column(String(512), nullable=False)
    email = Column(String(120), unique=True, nullable=True)
    xp = Column(Integer, default=0, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    role = Column(String(50), default='user', nullable=False) # 'user', 'admin', etc.
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    user_progress = relationship('UserProgress', back_populates='user', lazy=True)

    def __repr__(self):
        return f'<User {self.username}>'
