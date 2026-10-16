"""
Central configuration for the Coconut Disease Advisor web app.

All values can be overridden with environment variables (see .env.example).
"""

import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _bool(value, default=False):
    if value is None:
        return default
    return str(value).strip().lower() in ("1", "true", "yes", "on")


class Config:
    # ---- Flask ----
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
    MAX_CONTENT_LENGTH = 8 * 1024 * 1024  # 8 MB max upload size
    UPLOAD_FOLDER = str(BASE_DIR / "uploads")
    ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg"}

    # ---- Session cookies (used for login) ----
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = _bool(
        os.getenv("SESSION_COOKIE_SECURE"),
        default=False
    )

    # ---- Database (users + persisted chat sessions/history) ----
    MYSQL_HOST = os.getenv("MYSQL_HOST", "")
    MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
    MYSQL_USER = os.getenv("MYSQL_USER", "")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DB = os.getenv("MYSQL_DB", "coconut_disease_advisor")

    if MYSQL_HOST:
        # URL-encode credentials so special characters such as @, :, /, etc.
        # in the username/password do not break the SQLAlchemy connection URL.
        encoded_user = quote_plus(MYSQL_USER)
        encoded_password = quote_plus(MYSQL_PASSWORD)

        SQLALCHEMY_DATABASE_URI = (
            f"mysql+pymysql://"
            f"{encoded_user}:{encoded_password}"
            f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
            f"?charset=utf8mb4"
        )
    else:
        # No MySQL configured - fall back to a local SQLite file so the app
        # (and its login/chat-history features) still runs out of the box.
        # Set MYSQL_HOST (+ user/password/db) in .env to use real MySQL.
        SQLALCHEMY_DATABASE_URI = (
            f"sqlite:///{BASE_DIR / 'dev.db'}"
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ---- Vision model (EfficientNet-B0 classifier + Mahalanobis OOD) ----
    MODEL_DIR = Path(
        os.getenv("MODEL_DIR", BASE_DIR / "models")
    )

    MODEL_WEIGHTS_PATH = Path(
        os.getenv(
            "MODEL_WEIGHTS_PATH",
            MODEL_DIR / "coconut_disease_efficientnetb0_final.pth"
        )
    )

    LABELS_PATH = Path(
        os.getenv(
            "LABELS_PATH",
            MODEL_DIR / "labels.json"
        )
    )

    OOD_CONFIG_PATH = Path(
        os.getenv(
            "OOD_CONFIG_PATH",
            MODEL_DIR / "ood_config.json"
        )
    )

    INFERENCE_DEVICE = os.getenv(
        "INFERENCE_DEVICE",
        "cpu"
    )  # "cpu" or "cuda"

    # Raw class name (as it appears in labels.json) that means "no disease".
    # Used to hide the "ask advisor for treatment" prompt on healthy leaves.
    HEALTHY_CLASS_NAME = os.getenv(
        "HEALTHY_CLASS_NAME",
        "Healthy_Leaves"
    )

    # ---- RAG chatbot ----
    OPENROUTER_API_KEY = os.getenv(
        "OPENROUTER_API_KEY",
        ""
    )

    OPENROUTER_BASE_URL = os.getenv(
        "OPENROUTER_BASE_URL",
        "https://openrouter.ai/api/v1"
    )

    LLM_MODEL = os.getenv(
        "LLM_MODEL",
        "openai/gpt-4o-mini"
    )

    PINECONE_API_KEY = os.getenv(
        "PINECONE_API_KEY",
        ""
    )

    PINECONE_HOST = os.getenv(
        "PINECONE_HOST",
        ""
    )

    PINECONE_INDEX_NAME = os.getenv(
        "PINECONE_INDEX_NAME",
        "coconut-disease-data"
    )

    EMBED_MODEL_NAME = os.getenv(
        "EMBED_MODEL_NAME",
        "BAAI/bge-large-en-v1.5"
    )

    EMBED_DEVICE = os.getenv(
        "EMBED_DEVICE",
        "cpu"
    )

    EMBED_BATCH_SIZE = int(
        os.getenv(
            "EMBED_BATCH_SIZE",
            "64"
        )
    )

    TOP_K = int(
        os.getenv(
            "TOP_K",
            "5"
        )
    )

    CHUNK_SIZE = int(
        os.getenv(
            "CHUNK_SIZE",
            "900"
        )
    )

    CHUNK_OVERLAP = int(
        os.getenv(
            "CHUNK_OVERLAP",
            "150"
        )
    )

    KB_PATH = str(
        os.getenv(
            "KB_PATH",
            BASE_DIR / "knowledgebase"
        )
    )

    ALLOWED_DISEASES = [
        "Coconut Caterpillar Infestation",
        "Coconut Leaf Rot",
        "Coconut Gray Leaf Spot",
    ]

    # Enables /api/chat routes. Automatically becomes True once the two API
    # keys are present, but can be forced off for an "image only" deployment.
    CHATBOT_ENABLED = _bool(
        os.getenv("CHATBOT_ENABLED"),
        default=bool(
            OPENROUTER_API_KEY and PINECONE_API_KEY
        )
    )


config = Config()