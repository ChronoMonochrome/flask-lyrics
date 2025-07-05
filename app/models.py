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
    password_hash = Column(String(128), nullable=False)
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

# Helper for XP and Level calculation
XP_PER_LEVEL = 100 # Example: 100 XP to gain a level

def calculate_level(xp):
    return 1 + (xp // XP_PER_LEVEL)

class Riddle(db.Model):
    __tablename__ = 'riddles'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    text_kanji = Column(Text, nullable=False)
    text_hiragana = Column(Text, nullable=False)
    english_text = Column(Text, nullable=False) # <--- ADDED
    category = Column(String(50), nullable=False, default="General") # <--- ADDED
    difficulty = Column(String(20), nullable=False, default="Easy") # <--- ADDED
    xp_reward = Column(Integer, default=10, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    answers = relationship('Answer', back_populates='riddle', lazy=True, cascade="all, delete-orphan")
    user_progress = relationship('UserProgress', back_populates='riddle', lazy=True)

    def __repr__(self):
        return f'<Riddle {self.id}>'

class Answer(db.Model):
    __tablename__ = 'answers'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    riddle_id = Column(String(36), ForeignKey('riddles.id'), nullable=False)
    answer_text = Column(String(255), nullable=False)
    is_correct = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    riddle = relationship('Riddle', back_populates='answers')

    def __repr__(self):
        return f'<Answer {self.answer_text} for Riddle {self.riddle_id}>'

class UserProgress(db.Model):
    __tablename__ = 'user_progress'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    riddle_id = Column(String(36), ForeignKey('riddles.id'), nullable=False)
    solved = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    last_attempt_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    __table_args__ = (UniqueConstraint('user_id', 'riddle_id', name='_user_riddle_uc'),)

    user = relationship('User', back_populates='user_progress')
    riddle = relationship('Riddle', back_populates='user_progress')

    def __repr__(self):
        return f'<UserProgress User:{self.user_id} Riddle:{self.riddle_id} Solved:{self.solved}>'
