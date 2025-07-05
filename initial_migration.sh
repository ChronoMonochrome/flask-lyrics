# initial_migration.sh
docker compose run --rm web python -c "
from app import app, db
with app.app_context():
    db.drop_all()
    db.create_all()
"
docker compose run --rm web python /app/seed_db.py
