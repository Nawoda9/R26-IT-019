from flask import Blueprint, jsonify, request
from flask_login import login_required

from config import config
from services.disease_classifier import get_classifier

predict_bp = Blueprint("predict", __name__, url_prefix="/api")


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in config.ALLOWED_IMAGE_EXTENSIONS


@predict_bp.route("/predict", methods=["POST"])
@login_required
def predict():
    # Note: the prediction result is returned directly to the caller and is
    # never written to the database - nothing about an uploaded image or its
    # diagnosis is persisted anywhere.
    if "image" not in request.files:
        return jsonify({"error": "No file part named 'image' in the request."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not _allowed_file(file.filename):
        return jsonify({"error": f"Unsupported file type. Allowed: {sorted(config.ALLOWED_IMAGE_EXTENSIONS)}"}), 400

    try:
        classifier = get_classifier()
        result = classifier.predict(file.stream)
    except FileNotFoundError as e:
        return jsonify({"error": f"Model assets not found on server: {e}"}), 500
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": f"Inference failed: {e}"}), 500

    return jsonify(result), 200


@predict_bp.route("/health", methods=["GET"])
def health():
    try:
        get_classifier()
        model_ok = True
    except Exception:  # noqa: BLE001
        model_ok = False
    return jsonify({"status": "ok", "model_loaded": model_ok, "chatbot_enabled": config.CHATBOT_ENABLED})
