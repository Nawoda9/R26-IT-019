"""
utils/image_utils.py
---------------------
Small shared helpers used by every analysis service: loading an image
as a float array, and saving a matplotlib figure to disk without ever
trying to pop up a GUI window (the notebook's `plt.show()` calls are
replaced with `plt.savefig()` everywhere in this project since a web
server has no display).
"""

import os
import uuid

import matplotlib
matplotlib.use("Agg")  # headless backend - MUST be set before pyplot is imported
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import numpy as np


def load_image(image_path):
    """Load an image file and return (float_array[0-255], height, width)."""
    img = mpimg.imread(image_path)

    # Some formats (png) load as RGBA - drop the alpha channel
    if img.ndim == 3 and img.shape[2] == 4:
        img = img[..., :3]

    img_h, img_w = img.shape[0], img.shape[1]
    return img, img_h, img_w


def to_float_0_255(img):
    """Match the notebook's normalization: some readers return 0-1 floats."""
    img_float = img.astype(float)
    if img_float.max() <= 1.0:
        img_float = img_float * 255
    return img_float


def unique_filename(prefix, ext="png"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}.{ext}"


def save_figure(fig, results_dir, prefix, dpi=150):
    """Save a matplotlib figure into RESULTS_DIR and return just the filename."""
    filename = unique_filename(prefix)
    out_path = os.path.join(results_dir, filename)
    fig.savefig(out_path, dpi=dpi, bbox_inches="tight")
    plt.close(fig)
    return filename


def allowed_file(filename, allowed_extensions):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions
