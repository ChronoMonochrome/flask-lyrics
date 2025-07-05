# initial_migration.sh
docker compose run --rm web python -c "
from app import app, db
with app.app_context():
    db.create_all()
"
