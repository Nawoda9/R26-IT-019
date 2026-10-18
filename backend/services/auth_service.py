"""
Small helper layer between the auth routes and the User model.
"""
from __future__ import annotations

import re

from extensions import db
from models import User

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,50}$")


class AuthError(ValueError):
    """Raised for invalid credentials / registration input."""


def register_user(username: str, password: str, email: str | None = None) -> User:
    username = (username or "").strip()
    password = password or ""
    email = (email or "").strip() or None

    if not USERNAME_RE.match(username):
        raise AuthError("Username must be 3-50 characters: letters, numbers, '.', '_' or '-' only.")
    if len(password) < 8:
        raise AuthError("Password must be at least 8 characters long.")
    if User.query.filter_by(username=username).first():
        raise AuthError("That username is already taken.")
    if email and User.query.filter_by(email=email).first():
        raise AuthError("That email is already registered.")

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


def authenticate_user(username: str, password: str) -> User:
    username = (username or "").strip()
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password or ""):
        raise AuthError("Invalid username or password.")
    return user
