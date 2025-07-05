#!/usr/bin/env python3
import os
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

from app import app

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8012)
