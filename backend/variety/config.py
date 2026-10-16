import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---- Paths ----
MODELS_DIR = os.path.join(BASE_DIR, "models", "variety")

MODEL_WEIGHTS_PATH = os.path.join(MODELS_DIR, "model_weights.pth")   # state_dict + log_scale + embedding_dim
PROTOTYPES_PATH = os.path.join(MODELS_DIR, "prototypes.pt")          # class prototype embeddings [n_classes, embedding_dim]
LABEL_MAP_PATH = os.path.join(MODELS_DIR, "label.json")              # {"0": "Dwarf", ...}
PREPROCESS_CONFIG_PATH = os.path.join(MODELS_DIR, "preprocessing_config.json")

# ---- Upload constraints ----
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "bmp"}
# Images are stored directly in the DB (see history.py) rather than on disk,
# so cap how large a single upload can be to keep row/DB size sane.
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB
MAX_IMAGE_BYTES = MAX_CONTENT_LENGTH

# ---- Grad-CAM ----
GRADCAM_ALPHA = 0.45  # heatmap/original blend weight, matches the training notebook

# ---- Prediction history (self-contained SQLite DB for this module) ----
HISTORY_DB_PATH = os.path.join(BASE_DIR, "variety", "history.db")
SQLALCHEMY_DATABASE_URI = os.environ.get(
    "VARIETY_DATABASE_URL", f"sqlite:///{HISTORY_DB_PATH}"
)
SQLALCHEMY_TRACK_MODIFICATIONS = False
HISTORY_RECENT_LIMIT = 3
HISTORY_PAGE_SIZE = 12

# ---- Flask ----
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
