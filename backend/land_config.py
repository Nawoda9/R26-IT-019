"""
config.py
---------
Central configuration for the Coconut/Palm Tree Detection & Land
Utilization web application.

All the "magic numbers" that were scattered across the original
notebook cells (STEP 4 / STEP 5 v4 / STEP 5 v5) are collected here so
they can be tuned from one place, overridden with environment
variables, or overridden per-request from the web form.
"""

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
MODEL_PATH = os.environ.get("MODEL_PATH", os.path.join(BASE_DIR, "models", "land", "best.pt"))

UPLOAD_DIR = os.path.join(BASE_DIR, "static_land", "uploads")
RESULTS_DIR = os.path.join(BASE_DIR, "static_land", "results")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "tif", "tiff", "bmp"}
MAX_CONTENT_LENGTH_MB = 25

# ---------------------------------------------------------------------------
# Detection defaults (notebook STEP 4)
# ---------------------------------------------------------------------------
DEFAULT_CONFIDENCE_THRESHOLD = 0.35
DEFAULT_IMG_SIZE = 640

# ---------------------------------------------------------------------------
# Vegetation / empty-space segmentation defaults (notebook STEP 5 v4)
# ---------------------------------------------------------------------------
BOX_PADDING_PX = 15
EXCESS_GREEN_THRESHOLD = 15
USE_ELLIPSE_CONSTRAINT = True
ELLIPSE_SCALE = 1.0

GRID_DOWNSAMPLE = 2
MIN_DISTANCE_BETWEEN_POCKETS = 15
MIN_CLEARANCE_PX = 20
TOP_N_POCKETS = 10

# ---------------------------------------------------------------------------
# Real planting-capacity defaults (notebook STEP 5 v5)
# ---------------------------------------------------------------------------
REQUIRED_SPACING_PX = None  # None -> auto (average detected canopy radius)
MAX_NEW_TREES_TO_FIND = 500

# ---------------------------------------------------------------------------
# Flask
# ---------------------------------------------------------------------------
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-key-change-me")
DEBUG = os.environ.get("FLASK_DEBUG", "1") == "1"
