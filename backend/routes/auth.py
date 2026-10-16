from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user

from services.auth_service import AuthError, authenticate_user, register_user

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    try:
        user = register_user(
            username=data.get("username"),
            password=data.get("password"),
            email=data.get("email"),
        )
    except AuthError as e:
        return jsonify({"error": str(e)}), 400

    login_user(user)
    return jsonify({"user": user.to_public_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    try:
        user = authenticate_user(data.get("username"), data.get("password"))
    except AuthError as e:
        return jsonify({"error": str(e)}), 401

    login_user(user, remember=True)
    return jsonify({"user": user.to_public_dict()}), 200


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"status": "logged out"}), 200


@auth_bp.route("/me", methods=["GET"])
def me():
    if not current_user.is_authenticated:
        return jsonify({"user": None}), 200
    return jsonify({"user": current_user.to_public_dict()}), 200
