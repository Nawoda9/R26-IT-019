"""
Main coconut-classification backend API.

Receives the image, user and location, calls the EfficientNet
prototype model, generates Grad-CAM, stores the result and
provides prediction-history endpoints for the frontend.
"""

import io
import json
import logging

import cv2
from flask import Blueprint, jsonify, render_template, request, send_file
from PIL import Image, UnidentifiedImageError

from variety import config
from variety.extensions import db
from variety.history import PredictionHistory
from variety.model import get_predictor

logger = logging.getLogger(__name__)

bp = Blueprint("main", __name__)


def _allowed_file(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in config.ALLOWED_EXTENSIONS
    )


def _parse_coordinate(raw_value, min_value, max_value):
    """Parses+range-checks a lat/lng form field. Returns float or None if invalid/missing."""
    if raw_value is None or str(raw_value).strip() == "":
        return None
    try:
        value = float(raw_value)
    except (TypeError, ValueError):
        return None
    if not (min_value <= value <= max_value):
        return None
    return value


def _parse_user_id(raw_value):
    """Parses the trusted-from-frontend user id. Returns int or None if invalid/missing."""
    if raw_value is None or str(raw_value).strip() == "":
        return None
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


@bp.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@bp.route("/health", methods=["GET"])
def health():
    """Simple liveness/readiness probe."""
    try:
        predictor = get_predictor() #loads the model
        return jsonify({
            "status": "ok",
            "device": str(predictor.device),
            "classes": predictor.class_names,
        })
    except Exception as exc:  # noqa: BLE001
        logger.exception("Health check failed")
        return jsonify({"status": "error", "detail": str(exc)}), 500


@bp.route("/api/predict", methods=["POST"])
def predict():
    """
    Accepts a multipart/form-data POST with:
      - 'image'      : the photo file (required)
      - 'user_id'    : id of the logged-in user this prediction belongs to (required)
      - 'latitude'   : map-picked latitude,  -90..90   (required)
      - 'longitude'  : map-picked longitude, -180..180 (required)
      - 'location_label' : human-readable place name (optional)

    A location is required — the frontend must not let the user request a
    prediction before picking a point on the map. The photo and its Grad-CAM
    overlay are stored directly in the database (not on disk), tagged with
    'user_id' so each user only ever sees their own prediction history.

    Returns JSON: { id, user_id, prediction, confidence, probabilities,
                     image_url, gradcam_url, location, created_at }
    """
    user_id = _parse_user_id(request.form.get("user_id"))
    if user_id is None:
        return jsonify({"error": "Missing or invalid 'user_id'. You must be logged in to classify a photo."}), 401

    if "image" not in request.files:
        return jsonify({"error": "No 'image' file field found in the request."}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not _allowed_file(file.filename):
        return jsonify({
            "error": f"Unsupported file type. Allowed: {', '.join(sorted(config.ALLOWED_EXTENSIONS))}"
        }), 400

    latitude = _parse_coordinate(request.form.get("latitude"), -90, 90)
    longitude = _parse_coordinate(request.form.get("longitude"), -180, 180)
    if latitude is None or longitude is None:
        return jsonify({
            "error": "Please select the coconut's location on the map before requesting a prediction."
        }), 400
    location_label = (request.form.get("location_label") or "").strip()[:255] or None

    image_bytes = file.read()
    if len(image_bytes) == 0:
        return jsonify({"error": "The uploaded file is empty."}), 400
    if len(image_bytes) > config.MAX_IMAGE_BYTES:
        limit_mb = config.MAX_IMAGE_BYTES // (1024 * 1024)
        return jsonify({"error": f"Image is too large. Please upload a photo under {limit_mb} MB."}), 400

    image_mimetype = file.mimetype or "image/jpeg"

    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()  # force-read to catch corrupt files early
    except UnidentifiedImageError:
        return jsonify({"error": "The uploaded file is not a valid image."}), 400
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to read uploaded image")
        return jsonify({"error": f"Could not process image: {exc}"}), 500

    try:
        predictor = get_predictor()
        pred_label, probs, overlay_rgb = predictor.predict_with_gradcam(image)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Inference failed")
        return jsonify({"error": f"Inference failed: {exc}"}), 500

    # Encode the Grad-CAM overlay to JPEG bytes in memory (no disk write).
    gradcam_data = None
    gradcam_mimetype = None
    try:
        overlay_bgr = cv2.cvtColor(overlay_rgb, cv2.COLOR_RGB2BGR)
        ok, buf = cv2.imencode(".jpg", overlay_bgr)
        if ok:
            gradcam_data = buf.tobytes()
            gradcam_mimetype = "image/jpeg"
    except Exception:  # noqa: BLE001
        logger.exception("Failed to encode Grad-CAM overlay; continuing without it")

    sorted_probs = dict(sorted(probs.items(), key=lambda kv: kv[1], reverse=True))

    history_row = PredictionHistory(
        user_id=user_id,
        prediction=pred_label,
        confidence=sorted_probs[pred_label],
        probabilities_json=json.dumps(sorted_probs),
        image_data=image_bytes,
        image_mimetype=image_mimetype,
        gradcam_data=gradcam_data,
        gradcam_mimetype=gradcam_mimetype,
        latitude=latitude,
        longitude=longitude,
        location_label=location_label,
    )
    db.session.add(history_row)
    db.session.commit()

    return jsonify(history_row.to_dict())


@bp.route("/api/history", methods=["GET"])
def recent_history():
    """Most recent predictions for one user, newest first. Powers the bottom-of-page strip."""
    user_id = _parse_user_id(request.args.get("user_id"))
    if user_id is None:
        return jsonify({"error": "Missing or invalid 'user_id'."}), 401

    limit = request.args.get("limit", default=config.HISTORY_RECENT_LIMIT, type=int) or config.HISTORY_RECENT_LIMIT
    limit = max(1, min(limit, 50))
    rows = (
        PredictionHistory.query.filter_by(user_id=user_id)
        .order_by(PredictionHistory.created_at.desc())
        .limit(limit)
        .all()
    )
    return jsonify({"items": [row.to_dict() for row in rows]})


@bp.route("/api/history/all", methods=["GET"])
def all_history():
    """Paginated full history for one user, used by the 'view all' details modal."""
    user_id = _parse_user_id(request.args.get("user_id"))
    if user_id is None:
        return jsonify({"error": "Missing or invalid 'user_id'."}), 401

    page = request.args.get("page", default=1, type=int) or 1
    page_size = request.args.get("page_size", default=config.HISTORY_PAGE_SIZE, type=int) or config.HISTORY_PAGE_SIZE
    page = max(1, page)
    page_size = max(1, min(page_size, 50))

    pagination = (
        PredictionHistory.query.filter_by(user_id=user_id)
        .order_by(PredictionHistory.created_at.desc())
        .paginate(page=page, per_page=page_size, error_out=False)
    )
    return jsonify({
        "items": [row.to_dict() for row in pagination.items],
        "page": pagination.page,
        "pages": pagination.pages,
        "total": pagination.total,
        "has_next": pagination.has_next,
    })

"""get the details of a specific prediction history entry by its ID, 
including the original image and Grad-CAM overlay if available. The user_id is required"""
def history_detail(history_id):
    user_id = _parse_user_id(request.args.get("user_id"))
    if user_id is None:
        return jsonify({"error": "Missing or invalid 'user_id'."}), 401

    row = PredictionHistory.query.filter_by(id=history_id, user_id=user_id).first_or_404()
    return jsonify(row.to_dict())


@bp.route("/api/history/<int:history_id>/image", methods=["GET"])
def history_image(history_id):
    """Streams the original photo stored for this prediction."""
    user_id = _parse_user_id(request.args.get("user_id"))
    if user_id is None:
        return jsonify({"error": "Missing or invalid 'user_id'."}), 401

    row = PredictionHistory.query.filter_by(id=history_id, user_id=user_id).first_or_404()
    return send_file(
        io.BytesIO(row.image_data),
        mimetype=row.image_mimetype or "image/jpeg",
        max_age=86400,
    )


@bp.route("/api/history/<int:history_id>/gradcam", methods=["GET"])
def history_gradcam(history_id):
    """Streams the Grad-CAM overlay stored for this prediction, if any."""
    user_id = _parse_user_id(request.args.get("user_id"))
    if user_id is None:
        return jsonify({"error": "Missing or invalid 'user_id'."}), 401

    row = PredictionHistory.query.filter_by(id=history_id, user_id=user_id).first_or_404()
    if not row.gradcam_data:
        return jsonify({"error": "No Grad-CAM overlay stored for this prediction."}), 404
    return send_file(
        io.BytesIO(row.gradcam_data),
        mimetype=row.gradcam_mimetype or "image/jpeg",
        max_age=86400,
    )
