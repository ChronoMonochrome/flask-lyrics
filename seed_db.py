# seed_db.py
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))

from app import app, db
from app.models import Riddle, User, Answer # Ensure Answer is imported if you define it
from werkzeug.security import generate_password_hash

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
print(BASE_DIR)

from app.logger import logger

# Load environment variables
if os.path.exists(os.path.join(BASE_DIR, '.env.local')):
    load_dotenv(os.path.join(BASE_DIR, '.env.local'))
    logger.info(f"Loaded env from .env.local")
else:
    load_dotenv(os.path.join(BASE_DIR, '.env'))
    logger.info(f"Loaded env from .env")


def seed_database():
    with app.app_context():
        print("Checking if database tables exist...")
        db.create_all() # Ensure tables are created if not already

        # --- Add Default User (Optional) ---
        print("Checking for default user...")
        if not User.query.filter_by(username='admin').first():
            print("Creating default admin user...")
            hashed_password = generate_password_hash('admin_password', method='pbkdf2:sha256')
            admin_user = User(username='admin', email='admin@example.com', password_hash=hashed_password, role='admin')
            db.session.add(admin_user)
            db.session.commit()
            print("Default admin user created: username='admin', password='admin_password'")
        else:
            print("Default admin user already exists.")

        print("Database seeding complete.")

if __name__ == "__main__":
    seed_database()
