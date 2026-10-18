"""
services/detection.py
----------------------
Wraps the trained YOLO11 (.pt) model and reproduces notebook STEP 4:
load the model once, run inference on an uploaded image, and draw the
detection boxes/confidence scores on top of the image.

The model is loaded exactly once per process (singleton) since loading
a .pt checkpoint is relatively expensive and a web server will handle
many requests.
"""

import threading

import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
from ultralytics import YOLO

import land_config as config
from utils.image_utils import save_figure

_model = None
_model_lock = threading.Lock()

# The checkpoint's own class names (e.g. "Palm") don't match the product's
# language ("Coconut"). Rather than retraining/relabeling the model, we
# rewrite the display names here so every label drawn on images and every
# class_breakdown key returned by the API says "Coconut".
_NAME_OVERRIDES = {
    "palm": "Coconut",
}


def _display_name(raw_name):
    return _NAME_OVERRIDES.get(str(raw_name).strip().lower(), raw_name)


def _display_names(names_dict):
    """Apply _display_name to every value in a {class_id: name} dict."""
    return {cid: _display_name(name) for cid, name in names_dict.items()}


def get_model():
    """Lazily load and cache the YOLO model (thread-safe singleton)."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:  # re-check inside the lock
                _model = YOLO(config.MODEL_PATH)
    return _model


def class_names():
    """Return {class_id: class_name} as reported by the loaded checkpoint,
    with display-name overrides applied (see _NAME_OVERRIDES)."""
    return _display_names(get_model().names)


def run_detection(image_path, confidence_threshold=None, imgsz=None):
    """
    Run YOLO inference on a single image.

    Returns a dict:
        boxes_xyxy   : (N, 4) numpy array of [x1, y1, x2, y2]
        confidences  : (N,)   numpy array
        class_ids    : (N,)   numpy array (int)
        class_names  : {id: name}
    """
    confidence_threshold = confidence_threshold or config.DEFAULT_CONFIDENCE_THRESHOLD
    imgsz = imgsz or config.DEFAULT_IMG_SIZE

    model = get_model()
    results = model.predict(image_path, conf=confidence_threshold, imgsz=imgsz, verbose=False)
    result = results[0]

    if len(result.boxes) > 0:
        boxes_xyxy = result.boxes.xyxy.cpu().numpy()
        confidences = result.boxes.conf.cpu().numpy()
        class_ids = result.boxes.cls.cpu().numpy().astype(int)
    else:
        boxes_xyxy = np.empty((0, 4))
        confidences = np.empty((0,))
        class_ids = np.empty((0,), dtype=int)

    return {
        "boxes_xyxy": boxes_xyxy,
        "confidences": confidences,
        "class_ids": class_ids,
        "class_names": _display_names(model.names),
    }


def render_detections(img, img_w, img_h, detection, confidence_threshold):
    """
    Draw bounding boxes + confidence + center dot on the image
    (notebook STEP 4 visualization) and save it to RESULTS_DIR.
    Returns the saved filename.
    """
    boxes_xyxy = detection["boxes_xyxy"]
    confidences = detection["confidences"]
    class_ids = detection["class_ids"]
    names = detection["class_names"]

    fig, ax = plt.subplots(figsize=(10, 8))
    ax.imshow(img)

    for (x1, y1, x2, y2), conf, cls_id in zip(boxes_xyxy, confidences, class_ids):
        w, h = x2 - x1, y2 - y1
        rect = patches.Rectangle((x1, y1), w, h, linewidth=1.5, edgecolor="lime", facecolor="none")
        ax.add_patch(rect)
        label = f"{names.get(int(cls_id), cls_id)} {conf:.2f}"
        ax.text(x1, y1 - 5, label, color="lime", fontsize=8, weight="bold")
        cx, cy = x1 + w / 2, y1 + h / 2
        ax.plot(cx, cy, "r.", markersize=6)

    ax.set_title(f"Model predictions - {len(boxes_xyxy)} trees detected (conf >= {confidence_threshold})")
    ax.axis("off")
    plt.tight_layout()

    return save_figure(fig, config.RESULTS_DIR, "detections")