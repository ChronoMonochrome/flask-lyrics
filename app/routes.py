# app/routes.py
#!/usr/bin/env python
# -*- coding: UTF-8 -*-

from app import app
from flask import send_from_directory, request
import os
from .logger import logger

# Get the absolute path to the static folder directly from the app configuration.
# This ensures consistency with how Flask itself is configured to serve static files.
STATIC_FOLDER = app.static_folder

logger.info(f"app.static_folder is: {STATIC_FOLDER}")
