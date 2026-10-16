"""
app.py
=======
WCLWD (Weligama Coconut Leaf Wilt Disease) detection & severity assessment
web app. Wraps the full 3-stage notebook pipeline (classify -> OOD check ->
Grad-CAM -> WSSS mask -> ABCD/DSI severity) behind a simple upload UI and a
JSON API.

Run with:
    python app.py
then open http://127.0.0.1:5000
"""
import logging
import os
import uuid

from flask import Flask, jsonify, render_template, request, url_for
from flask_cors import CORS
from werkzeug.utils import secure_filename

import wclwd_config as app_config
from core.pipeline import build_pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__, template_folder="templates_wclwd", static_folder="static_wclwd")
app.config["MAX_CONTENT_LENGTH"] = app_config.MAX_CONTENT_LENGTH_MB * 1024 * 1024

# The React (Vite) frontend runs on a different origin (e.g. http://localhost:5173)
# than this API (http://localhost:5000), so /api/* and /static_wclwd/* need CORS enabled.
# Restrict origins via the FRONTEND_ORIGIN env var in production.
CORS(app, resources={
    r"/api/*": {"origins": app_config.FRONTEND_ORIGINS},
    r"/static_wclwd/*": {"origins": app_config.FRONTEND_ORIGINS},
    r"/health": {"origins": app_config.FRONTEND_ORIGINS},
})

# --- Load config + model + Grad-CAM + OOD stats ONCE at startup ---
_cfg = app_config.load_all_config()
pipeline = build_pipeline(_cfg)
logger.info("Pipeline ready. OOD detection enabled: %s", pipeline.ood_scorer.enabled)


def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in app_config.ALLOWED_EXTENSIONS


@app.route("/")
def index():
    return render_template("index.html", labels=pipeline.labels, ood_enabled=pipeline.ood_scorer.enabled)


@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return render_template("index.html", labels=pipeline.labels,
                                ood_enabled=pipeline.ood_scorer.enabled,
                                error="No file was uploaded."), 400

    file = request.files["image"]
    if file.filename == "":
        return render_template("index.html", labels=pipeline.labels,
                                ood_enabled=pipeline.ood_scorer.enabled,
                                error="No file was selected."), 400

    if not _allowed_file(file.filename):
        return render_template("index.html", labels=pipeline.labels,
                                ood_enabled=pipeline.ood_scorer.enabled,
                                error="Unsupported file type. Use JPG, PNG, or BMP."), 400

    safe_name = f"{uuid.uuid4().hex[:12]}_{secure_filename(file.filename)}"
    save_path = os.path.join(app_config.UPLOAD_DIR, safe_name)
    file.save(save_path)

    try:
        result = pipeline.run(save_path)
    except Exception:
        logger.exception("Pipeline failed for %s", save_path)
        return render_template("index.html", labels=pipeline.labels,
                                ood_enabled=pipeline.ood_scorer.enabled,
                                error="Something went wrong while analyzing this image. "
                                      "Check the server logs for details."), 500

    image_urls = {
        key: (url_for("static", filename=f"results/{fname}") if fname else None)
        for key, fname in result["images"].items()
    }

    return render_template("result.html", result=result, image_urls=image_urls,
                            uploaded_filename=file.filename)


@app.route("/api/predict", methods=["POST"])
def api_predict():
    """JSON API: POST multipart/form-data with an 'image' field.
    Returns the full result dict (minus local disk paths -> public URLs)."""
    if "image" not in request.files:
        return jsonify({"error": "No file was uploaded (expected form field 'image')."}), 400

    file = request.files["image"]
    if file.filename == "" or not _allowed_file(file.filename):
        return jsonify({"error": "No file selected or unsupported file type."}), 400

    safe_name = f"{uuid.uuid4().hex[:12]}_{secure_filename(file.filename)}"
    save_path = os.path.join(app_config.UPLOAD_DIR, safe_name)
    file.save(save_path)

    try:
        result = pipeline.run(save_path)
    except Exception as e:
        logger.exception("Pipeline failed for %s", save_path)
        return jsonify({"error": str(e)}), 500

    result["images"] = {
        key: (url_for("static", filename=f"results/{fname}", _external=True) if fname else None)
        for key, fname in result["images"].items()
    }
    return jsonify(result)


@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "device": str(pipeline.device),
        "classes": pipeline.labels,
        "ood_enabled": pipeline.ood_scorer.enabled,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
