from app import app, db # Import your app and db instances
from flask.cli import FlaskGroup #
# Make sure your models are imported or discoverable by Flask-Migrate
# e.g., from app.models import User, Riddle, UserProgress # Import all your models
import app.models # A simple import of the module is usually enough for discovery

cli = FlaskGroup(app) #

# You can add custom commands here if needed, but for migrations, it's usually not necessary.

if __name__ == '__main__':
    cli()
