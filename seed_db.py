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

        # --- Add Riddles ---
        print("Checking for existing riddles...")
        if Riddle.query.count() == 0:
            print("No riddles found. Adding initial riddles...")

            riddle1 = Riddle(
                text_kanji="私の名前はひらがなです。私はよく学校で見られます。私は何かを数えるときに使われます。私は何でしょう？", # Changed from japanese_text
                text_hiragana="わたしのなまえはひらがなです。わたしはよくがっこうでみられます。わたしはなにかをかぞえるときに使われます。わたしはなんでしょう？", # Changed from furigana
                english_text="My name is in hiragana. I am often seen in schools. I am used when counting something. What am I?", # Added
                category="General", # Added
                difficulty="Easy" # Added
            )
            riddle2 = Riddle(
                text_kanji="朝には四本の足、昼には二本の足、夜には三本の足。これは何？",
                text_hiragana="あさにはよんほんのあし、ひるにはにほんのあし、よるにはさんぼんのあし。これはなに？",
                english_text="What has four feet in the morning, two feet at noon, and three feet in the evening?",
                category="Classic",
                difficulty="Medium"
            )
            riddle3 = Riddle(
                text_kanji="高い塔から生まれたが、自分は何も食べないで、人々を食べさせる。これは何？",
                text_hiragana="たかいとうからうまれたが、じぶんはなにもたべないで、ひとびとをたべさせる。これはなに？",
                english_text="Born from a tall tower, I eat nothing myself, yet I feed many people. What am I?",
                category="Objects",
                difficulty="Hard"
            )

            db.session.add_all([riddle1, riddle2, riddle3])
            db.session.commit()
            print(f"Added {Riddle.query.count()} riddles.")

            # --- Add Canonical Answers (Crucial for riddle apps) ---
            # You need to define the correct answers somewhere!
            # If your `Answer` model is for canonical answers, this is how you'd link them.
            # Otherwise, if `Answer` is for user submissions, you'll need to store the correct
            # answer directly in the Riddle model itself, or fetch it separately.
            # For simplicity, let's add canonical answers directly here, assuming `Answer` means "correct answer".

            # Ensure your Answer model can accept `answer_text` and `is_correct`
            # and that `Riddle` has `answers` relationship.
            answer1_r1 = Answer(riddle=riddle1, answer_text="鉛筆", is_correct=True)
            answer2_r1 = Answer(riddle=riddle1, answer_text="えんぴつ", is_correct=True) # Example: multiple correct forms

            answer1_r2 = Answer(riddle=riddle2, answer_text="人間", is_correct=True)
            answer2_r2 = Answer(riddle=riddle2, answer_text="にんげん", is_correct=True)

            answer1_r3 = Answer(riddle=riddle3, answer_text="お米", is_correct=True)
            answer2_r3 = Answer(riddle=riddle3, answer_text="こめ", is_correct=True)
            answer3_r3 = Answer(riddle=riddle3, answer_text="米", is_correct=True)


            db.session.add_all([answer1_r1, answer2_r1, answer1_r2, answer2_r2, answer1_r3, answer2_r3, answer3_r3])
            db.session.commit()
            print(f"Added {Answer.query.count()} answers.")


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
