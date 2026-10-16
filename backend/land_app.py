"""
app.py
------
Flask web application for the Coconut / Palm Tree Detection & Land
Utilization project. Wraps the trained YOLO11 model (models/best.pt)
and every analysis step from the original notebook:

    STEP 4    - detect trees, draw boxes
    STEP 4b   - circle-buffer land utilization % + KDE heatmap
    STEP 5 v4 - pixel-accurate empty-space mask (Excess Green Index) + planting pockets
    STEP 5 v5 - greedy "real" new-planting-capacity count

Routes
------
GET  /                 - upload form
POST /analyze           - handle the uploaded image, render results.html
GET  /api               - simple API docs page
POST /api/analyze       - same pipeline, JSON in / JSON out (for other apps to call)
GET  /healthz            - liveness/readiness probe
"""

import os
import traceback

from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

import land_config as config
from services.pipeline import analyze_image
from services import detection as detection_service
from utils.image_utils import allowed_file, unique_filename


def create_app():
    app = Flask(__name__, template_folder="templates_land", static_folder="static_land")
    app.config["SECRET_KEY"] = config.SECRET_KEY
    app.config["MAX_CONTENT_LENGTH"] = config.MAX_CONTENT_LENGTH_MB * 1024 * 1024

    # Allow the separately-hosted React (Vite) frontend to call /api/* and
    # load images from /static/* during development and in production.
    CORS(app, resources={
        r"/api/*": {"origins": "*"},
        r"/static/*": {"origins": "*"},
        r"/healthz": {"origins": "*"},
    })

    # -----------------------------------------------------------------
    # Web UI routes
    # -----------------------------------------------------------------
    @app.route("/", methods=["GET"])
    def index():
        return render_template("index.html", default_conf=config.DEFAULT_CONFIDENCE_THRESHOLD)

    @app.route("/analyze", methods=["POST"])
    def analyze():
        file = request.files.get("image")
        if file is None or file.filename == "":
            flash("Please choose an image to upload.")
            return redirect(url_for("index"))

        if not allowed_file(file.filename, config.ALLOWED_EXTENSIONS):
            flash(f"Unsupported file type. Allowed: {', '.join(sorted(config.ALLOWED_EXTENSIONS))}")
            return redirect(url_for("index"))

        # Save the upload under a safe, unique name
        original_name = secure_filename(file.filename)
        ext = original_name.rsplit(".", 1)[1].lower()
        saved_name = unique_filename("upload", ext)
        saved_path = os.path.join(config.UPLOAD_DIR, saved_name)
        file.save(saved_path)

        confidence_threshold = _parse_float(request.form.get("confidence"), config.DEFAULT_CONFIDENCE_THRESHOLD)
        top_n_pockets = _parse_int(request.form.get("top_n_pockets"), config.TOP_N_POCKETS)
        spacing_raw = request.form.get("required_spacing_px")
        required_spacing_px = _parse_float(spacing_raw, None) if spacing_raw else None
        include_sanity_check = request.form.get("include_sanity_check") == "on"

        try:
            result = analyze_image(
                saved_path,
                confidence_threshold=confidence_threshold,
                top_n_pockets=top_n_pockets,
                required_spacing_px=required_spacing_px,
                include_sanity_check=include_sanity_check,
            )
        except Exception as exc:  # pragma: no cover - surfaced to the user
            app.logger.error("Analysis failed: %s\n%s", exc, traceback.format_exc())
            flash(f"Analysis failed: {exc}")
            return redirect(url_for("index"))

        return render_template(
            "result.html",
            result=result,
            uploaded_image=f"uploads/{saved_name}",
            confidence_threshold=confidence_threshold,
        )

    # -----------------------------------------------------------------
    # JSON API (so other apps / a JS frontend / mobile app can call this
    # backend directly instead of using the server-rendered HTML pages)
    # -----------------------------------------------------------------
    @app.route("/api", methods=["GET"])
    def api_docs():
        return jsonify({
            "endpoints": {
                "POST /api/analyze": {
                    "description": "Upload an image (multipart/form-data, field name 'image') and get back detection + land-utilization JSON.",
                    "optional_form_fields": {
                        "confidence": "float, default 0.35",
                        "top_n_pockets": "int, default 10",
                        "required_spacing_px": "float, default None (auto)",
                        "include_sanity_check": "'on' to also render the debug mask panel",
                    },
                },
                "GET /api/classes": "Returns the class names the loaded model can detect.",
                "GET /healthz": "Liveness probe.",
            }
        })

    @app.route("/api/classes", methods=["GET"])
    def api_classes():
        return jsonify({"classes": detection_service.class_names()})

    @app.route("/api/analyze", methods=["POST"])
    def api_analyze():
        file = request.files.get("image")
        if file is None or file.filename == "":
            return jsonify({"error": "No image file provided (field name should be 'image')."}), 400

        if not allowed_file(file.filename, config.ALLOWED_EXTENSIONS):
            return jsonify({"error": f"Unsupported file type. Allowed: {sorted(config.ALLOWED_EXTENSIONS)}"}), 400

        original_name = secure_filename(file.filename)
        ext = original_name.rsplit(".", 1)[1].lower()
        saved_name = unique_filename("upload", ext)
        saved_path = os.path.join(config.UPLOAD_DIR, saved_name)
        file.save(saved_path)

        confidence_threshold = _parse_float(request.form.get("confidence"), config.DEFAULT_CONFIDENCE_THRESHOLD)
        top_n_pockets = _parse_int(request.form.get("top_n_pockets"), config.TOP_N_POCKETS)
        spacing_raw = request.form.get("required_spacing_px")
        required_spacing_px = _parse_float(spacing_raw, None) if spacing_raw else None
        include_sanity_check = request.form.get("include_sanity_check") == "on"

        try:
            result = analyze_image(
                saved_path,
                confidence_threshold=confidence_threshold,
                top_n_pockets=top_n_pockets,
                required_spacing_px=required_spacing_px,
                include_sanity_check=include_sanity_check,
            )
        except Exception as exc:  # pragma: no cover
            app.logger.error("API analysis failed: %s\n%s", exc, traceback.format_exc())
            return jsonify({"error": str(exc)}), 500

        # Turn saved image filenames into fetchable URLs
        image_urls = {
            key: (url_for("static", filename=f"results/{fname}") if fname else None)
            for key, fname in result["images"].items()
        }
        result["images"] = image_urls
        result["uploaded_image_url"] = url_for("static", filename=f"uploads/{saved_name}")

        return jsonify(result)

    @app.route("/healthz", methods=["GET"])
    def healthz():
        return jsonify({"status": "ok"})

    # Convenience: serve results/uploads even if static routing is customized
    @app.route("/static/results/<path:filename>")
    def serve_result(filename):
        return send_from_directory(config.RESULTS_DIR, filename)

    @app.route("/static/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(config.UPLOAD_DIR, filename)

    return app


def _parse_float(value, default):
    try:
        return float(value) if value not in (None, "") else default
    except (TypeError, ValueError):
        return default


def _parse_int(value, default):
    try:
        return int(value) if value not in (None, "") else default
    except (TypeError, ValueError):
        return default


app = create_app()

if __name__ == "__main__":
    # Warm up the model once at startup so the first web request isn't slow
    detection_service.get_model()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5001)), debug=config.DEBUG)
