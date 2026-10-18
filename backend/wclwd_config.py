"""
config.py
=========
Central configuration for the WCLWD (Weligama Coconut Leaf Wilt Disease)
detection web app. Loads every artifact exported from the training notebook
(wclwd-final-nb.ipynb, Section 11 "Save Final Artifacts") and exposes them
as plain Python objects the rest of the app can import.

Nothing in here does heavy computation -- it only resolves paths and parses
the small JSON config files. The model itself is loaded lazily in
core/model_loader.py.
"""
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models", "wclwd")

# --- Exported artifact paths (must match the filenames the notebook writes) ---
PTH_MODEL_PATH = os.path.join(MODELS_DIR, "wclwd_efficientnet_b0_best.pth")
LABEL_JSON_PATH = os.path.join(MODELS_DIR, "label.json")
CLASS_TO_IDX_PATH = os.path.join(MODELS_DIR, "class_to_idx.json")
MODEL_METADATA_PATH = os.path.join(MODELS_DIR, "model_metadata.json")
FEATURE_EXTRACTOR_META_PATH = os.path.join(MODELS_DIR, "feature_extractor.json")
OOD_CONFIG_PATH = os.path.join(MODELS_DIR, "ood_config.json")
OOD_STATS_NPZ_PATH = os.path.join(MODELS_DIR, "ood_mahalanobis_stats.npz")  # optional, see README
ABCD_CONFIG_PATH = os.path.join(MODELS_DIR, "abcd_config.json")
ABCD_CALIBRATION_PATH = os.path.join(MODELS_DIR, "abcd_calibration.json")

# --- Runtime folders (created if missing) ---
UPLOAD_DIR = os.path.join(BASE_DIR, "static_wclwd", "uploads")
RESULTS_DIR = os.path.join(BASE_DIR, "static_wclwd", "results")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "bmp"}
MAX_CONTENT_LENGTH_MB = 15

# Origins allowed to call /api/*, /health, and /static/* (CORS). The React+Vite
# dev server defaults to http://localhost:5173. Override with a comma-separated
# list via the FRONTEND_ORIGINS env var when deploying (e.g. your production
# frontend domain), or set it to "*" for quick local testing across devices.
FRONTEND_ORIGINS = os.environ.get(
    "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")


def _load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_all_config():
    """Loads every JSON artifact once. Raises a clear error naming the missing
    file if the models/ folder isn't fully populated (the .pth and every
    .json below are required; the .npz OOD stats file is optional)."""
    required = {
        "PyTorch model weights": PTH_MODEL_PATH,
        "label.json": LABEL_JSON_PATH,
        "class_to_idx.json": CLASS_TO_IDX_PATH,
        "model_metadata.json": MODEL_METADATA_PATH,
        "abcd_config.json": ABCD_CONFIG_PATH,
        "abcd_calibration.json": ABCD_CALIBRATION_PATH,
    }
    missing = [name for name, path in required.items() if not os.path.exists(path)]
    if missing:
        raise FileNotFoundError(
            "Missing required deployment artifact(s) in models/: "
            + ", ".join(missing)
            + ". Copy them from the notebook's EXPORT_DIR (wclwd_deployment/)."
        )

    return {
        "labels": _load_json(LABEL_JSON_PATH),
        "class_to_idx": _load_json(CLASS_TO_IDX_PATH),
        "model_metadata": _load_json(MODEL_METADATA_PATH),
        "feature_extractor_meta": (
            _load_json(FEATURE_EXTRACTOR_META_PATH) if os.path.exists(FEATURE_EXTRACTOR_META_PATH) else {}
        ),
        "ood_config": _load_json(OOD_CONFIG_PATH) if os.path.exists(OOD_CONFIG_PATH) else {},
        "abcd_config": _load_json(ABCD_CONFIG_PATH),
        "abcd_calibration": {k: tuple(v) for k, v in _load_json(ABCD_CALIBRATION_PATH).items()},
    }
