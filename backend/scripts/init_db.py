"""
Explicitly create all database tables (users, chat_sessions, chat_messages).

The Flask app also calls ``db.create_all()`` automatically at startup, so
this script is mainly useful for CI/ops scripts or to sanity-check your
MySQL connection before starting the server.

Usage:
    python -m scripts.init_db
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app  # noqa: E402
from extensions import db  # noqa: E402


def main():
    app = create_app()
    with app.app_context():
        db.create_all()
        print(f"Database tables created/verified at: {app.config['SQLALCHEMY_DATABASE_URI']}")


if __name__ == "__main__":
    main()
