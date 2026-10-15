"""
Coconut Disease Advisor - Flask web application.

Combines two pieces of ML work into one app:
  1. An EfficientNet-B0 image classifier (+ Mahalanobis OOD check) that
     identifies coconut leaf diseases from an uploaded photo.
  2. A Pinecone + OpenRouter RAG chatbot that answers treatment/management
     questions about those diseases, with Sinhala <-> English translation.

Run locally:
    pip install -r requirements.txt
    cp .env.example .env   # then fill in your API keys
    python app.py

Run in production:
    gunicorn -w 2 -b 0.0.0.0:8000 "app:create_app()"
"""
import logging
import os
from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from config import config
from extensions import db, login_manager
from routes.auth import auth_bp
from routes.chat import chat_bp
from routes.predict import predict_bp

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# The built React (Vite + Tailwind) frontend lands here after `npm run build`
# (see frontend/vite.config.js -> build.outDir). In dev, run the Vite dev
# server separately (npm run dev) instead - it proxies /api to this Flask app.
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


def create_app() -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config["SECRET_KEY"] = config.SECRET_KEY
    app.config["MAX_CONTENT_LENGTH"] = config.MAX_CONTENT_LENGTH
    app.config["SQLALCHEMY_DATABASE_URI"] = config.SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = config.SQLALCHEMY_TRACK_MODIFICATIONS
    app.config["SESSION_COOKIE_SAMESITE"] = config.SESSION_COOKIE_SAMESITE
    app.config["SESSION_COOKIE_SECURE"] = config.SESSION_COOKIE_SECURE

    # Allow the Vite dev server (default http://localhost:5173) to call the
    # API during local development, sending the login session cookie along
    # with each request. Harmless / ignored once the frontend is served from
    # this same Flask app in production.
    CORS(
        app,
        supports_credentials=True,
        resources={r"/api/*": {"origins": os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")}},
    )

    db.init_app(app)
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        from models import User

        return User.query.get(int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        # JSON API, not a browser-redirect login page.
        return jsonify({"error": "Login required."}), 401

    os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)

    app.register_blueprint(auth_bp)
    app.register_blueprint(predict_bp)
    app.register_blueprint(chat_bp)

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        """Serve the built React SPA, falling back to index.html for
        client-side routes. If the frontend hasn't been built yet, show a
        helpful message instead of a raw 404.
        """
        if not FRONTEND_DIST.exists():
            return (
                jsonify(
                    {
                        "error": (
                            "Frontend build not found. Run `npm install && npm run build` "
                            "inside frontend/, or run `npm run dev` for local development."
                        )
                    }
                ),
                200,
            )
        target = FRONTEND_DIST / path
        if path and target.exists() and target.is_file():
            return send_from_directory(FRONTEND_DIST, path)
        return send_from_directory(FRONTEND_DIST, "index.html")

    @app.errorhandler(413)
    def too_large(_e):
        return {"error": "File too large. Max upload size is 8 MB."}, 413

    # Create DB tables if they don't exist yet. Fine for a demo/small
    # deployment; for anything more serious, switch to Alembic migrations
    # so schema changes are tracked and reversible.
    with app.app_context():
        try:
            db.create_all()
            logger.info("Database tables ready (%s).", config.SQLALCHEMY_DATABASE_URI.split("://")[0])
        except Exception as e:  # noqa: BLE001
            logger.warning("Could not initialize the database: %s", e)

    # Warm up the vision model at startup (not the chatbot - that stays
    # lazy since it needs external API keys that may not be set yet).
    with app.app_context():
        try:
            from services.disease_classifier import get_classifier

            get_classifier()
            logger.info("Vision model loaded and ready.")
        except Exception as e:  # noqa: BLE001
            logger.warning("Vision model failed to load at startup: %s", e)

    # Warm up the chatbot's heavier dependencies at startup too, if
    # configured. Without this, the sentence-transformer embedding model
    # (~1.3 GB, downloaded on first use) loads lazily on a user's very
    # first chat message - on Flask's single-threaded dev server that
    # blocks ALL requests (even /api/health) for several minutes and looks
    # exactly like "the chatbot is broken". Loading it now, once, at
    # startup avoids that.
    if config.CHATBOT_ENABLED:
        with app.app_context():
            try:
                from services.rag_chatbot import get_embedder, get_index, get_llm_client

                logger.info(
                    "Loading chatbot dependencies (embedding model is ~1.3GB and "
                    "may take several minutes to download on first run)..."
                )
                get_embedder()
                get_index()
                get_llm_client()
                logger.info("Chatbot dependencies loaded and ready.")
            except Exception as e:  # noqa: BLE001
                logger.warning(
                    "Chatbot dependencies failed to load at startup (chat requests "
                    "will retry lazily, but check OPENROUTER_API_KEY / "
                    "PINECONE_API_KEY / PINECONE_HOST): %s",
                    e,
                )

    return app


app = create_app()

if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "false").strip().lower() in ("1", "true", "yes", "on")
    # threaded=True so a slow request (e.g. a chat call waiting on the LLM
    # or Pinecone) doesn't block other requests like /api/health or a
    # second browser tab - Flask's dev server is single-threaded otherwise.
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=debug_mode, threaded=True)
