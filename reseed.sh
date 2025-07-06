source .env
python -c "
from app import app, db
with app.app_context():
    db.drop_all()
    db.create_all()
"
python seed_db.py
