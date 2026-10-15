"""
Shared Flask extension instances.

Kept in their own module (rather than created inside app.py) so that
models.py and services/*.py can import ``db`` without circular imports.
"""
from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.session_protection = "strong"
