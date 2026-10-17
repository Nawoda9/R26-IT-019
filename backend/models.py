"""
Database models for user accounts and persisted chat session/history.

Backed by MySQL in production (see config.py / .env.example), but works
against any SQLAlchemy-supported database - the app falls back to a local
SQLite file automatically if no MySQL connection is configured, so it's
still easy to try out without standing up a MySQL server first.
"""
from datetime import datetime, timezone

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db


def _utcnow():
    return datetime.now(timezone.utc)


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow, nullable=False)

    sessions = db.relationship(
        "ChatSession", backref="user", lazy=True, cascade="all, delete-orphan"
    )

    def set_password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)

    def to_public_dict(self) -> dict:
        return {"id": self.id, "username": self.username, "email": self.email}


class ChatSession(db.Model):
    __tablename__ = "chat_sessions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)

    messages = db.relationship(
        "ChatMessage",
        backref="session",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )

    def to_public_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class ChatMessage(db.Model):
    __tablename__ = "chat_messages"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role = db.Column(db.String(16), nullable=False)  # 'user' | 'assistant'

    # Canonical English text - always populated, used to build LLM context
    # memory regardless of which language the user is chatting in.
    content_en = db.Column(db.Text, nullable=False)
    # Lazily-computed/cached Sinhala counterpart, filled in on first need.
    content_si = db.Column(db.Text, nullable=True)
    # Which of the two columns above is currently "shown" to the user.
    shown_language = db.Column(db.String(2), nullable=False, default="en")

    created_at = db.Column(db.DateTime, default=_utcnow, nullable=False)

    def displayed_text(self) -> str:
        return self.content_si if self.shown_language == "si" else self.content_en

    def to_public_dict(self) -> dict:
        return {
            "id": self.id,
            "role": self.role,
            "text": self.displayed_text(),
            "language": self.shown_language,
            "created_at": self.created_at.isoformat(),
        }
