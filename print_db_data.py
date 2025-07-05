# print_db_data.py
import os
import sys
import argparse
from dotenv import load_dotenv

# Ensure the application root is in the Python path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

load_dotenv() # Load environment variables from .env file

from app import app
from app.models import db, User, UserProgress, Riddle, Answer
from app.logger import logger

def print_entries(print_all=True):
    with app.app_context():
        logger.info(f"Attempting to print {'all' if print_all else 'one'} entry from each model...")

        models_to_check = [
            (User, "User"),
            (UserProgress, "UserProgress"),
            (Riddle, "Riddle"),
            (Answer, "Answer")
        ]

        for model_class, model_name in models_to_check:
            try:
                if print_all:
                    entries = model_class.query.all()
                else:
                    entries = [model_class.query.first()] if model_class.query.first() else []

                if entries:
                    logger.info(f"--- {model_name} ({'all' if print_all else 'first'} entries) ---")
                    for entry in entries:
                        if model_name == "User":
                            logger.info(f"  ID: {entry.id}")
                            logger.info(f"  Username: {entry.username}")
                            logger.info(f"  Email: {entry.email}")
                            logger.info(f"  XP: {entry.xp}")
                            logger.info(f"  Level: {entry.level}")
                            logger.info(f"  Role: {entry.role}")
                            logger.info(f"  Created At: {entry.created_at}")
                            logger.info(f"  Updated At: {entry.updated_at}")
                        elif model_name == "Riddle":
                            logger.info(f"  ID: {entry.id}")
                            logger.info(f"  Text (Kanji): {entry.text_kanji}")
                            logger.info(f"  Text (Hiragana): {entry.text_hiragana}")
                            logger.info(f"  English Text: {entry.english_text}")
                            logger.info(f"  Category: {entry.category}")
                            logger.info(f"  Difficulty: {entry.difficulty}")
                            logger.info(f"  XP Reward: {entry.xp_reward}")
                            logger.info(f"  Created At: {entry.created_at}")
                            logger.info(f"  Updated At: {entry.updated_at}")
                        elif model_name == "Answer":
                            logger.info(f"  ID: {entry.id}")
                            logger.info(f"  Riddle ID: {entry.riddle_id}")
                            logger.info(f"  Answer Text: {entry.answer_text}")
                            logger.info(f"  Is Correct: {entry.is_correct}")
                            logger.info(f"  Created At: {entry.created_at}")
                        elif model_name == "UserProgress":
                            logger.info(f"  ID: {entry.id}")
                            logger.info(f"  User ID: {entry.user_id}")
                            logger.info(f"  Riddle ID: {entry.riddle_id}")
                            logger.info(f"  Solved: {entry.solved}")
                            logger.info(f"  Attempts: {entry.attempts}")
                            logger.info(f"  Last Attempt At: {entry.last_attempt_at}")
                        else:
                            logger.info(repr(entry))
                        logger.info("-" * 30) # Separator for multiple entries
                else:
                    logger.info(f"--- {model_name} ---")
                    logger.info(f"No entries found for {model_name}.")
            except Exception as e:
                logger.error(f"Error fetching {model_name} entry: {e}", exc_info=True)
                db.session.rollback() # Rollback if a query fails

        logger.info("Finished printing database entries.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Print database entries.")
    parser.add_argument(
        '--one',
        action='store_true',
        help="Print only one entry per model instead of all entries."
    )
    args = parser.parse_args()

    print_entries(print_all=not args.one)
