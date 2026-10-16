"""
core/pipeline.py
==================
Ties together every stage from the notebook (Section 10, run_full_pipeline)
into one call the Flask route can use, and additionally renders the
Grad-CAM heatmap and WSSS mask overlay to PNG files on disk so the web UI
can display them.

Pipeline for one image:
    1. Preprocess (denoise + CLAHE + resize + normalize)
    2. Classify + extract penultimate-layer features in one forward pass
    3. OOD check (Mahalanobis distance vs. fitted class stats, if available)
    4. If OOD or predicted Healthy -> skip Grad-CAM/WSSS/ABCD, return early
    5. Otherwise: Grad-CAM -> WSSS pseudo-mask -> ABCD features -> DSI -> severity
"""
import logging
import os
import time
import uuid

import cv2
import numpy as np
import torch
from pytorch_grad_cam.utils.image import show_cam_on_image

from core import abcd as abcd_mod
from core import gradcam_utils
from core import model_loader
from core import preprocessing
from core import wsss as wsss_mod

logger = logging.getLogger(__name__)


class WCLWDPipeline:
    def __init__(self, model, cam, device, cfg):
        """
        cfg: dict produced by config.load_all_config(), plus:
            - "ood_scorer": core.ood.MahalanobisOOD instance
            - "results_dir": folder to write visualization PNGs into
        """
        self.model = model
        self.cam = cam
        self.device = device
        self.cfg = cfg

        self.labels = cfg["labels"]  # index-ordered class names
        self.class_to_idx = cfg["model_metadata"]["class_to_idx"]
        self.healthy_idx = cfg["model_metadata"]["healthy_idx"]
        self.img_size = cfg["model_metadata"]["image_size"]
        self.abcd_weights = cfg["abcd_config"]["weights"]
        self.severity_thresholds = cfg["abcd_config"]["severity_thresholds"]
        self.abcd_calibration = cfg["abcd_calibration"]
        self.ood_scorer = cfg["ood_scorer"]
        self.results_dir = cfg["results_dir"]

    # ------------------------------------------------------------------ #
    def _save_visualizations(self, request_id, rgb01, grayscale_cam, mask):
        """Writes original / Grad-CAM overlay / mask overlay PNGs to
        static/results/<request_id>_*.png and returns their filenames."""
        rgb_uint8 = (np.clip(rgb01, 0, 1) * 255).astype(np.uint8)

        original_name = f"{request_id}_original.png"
        cv2.imwrite(os.path.join(self.results_dir, original_name),
                    cv2.cvtColor(rgb_uint8, cv2.COLOR_RGB2BGR))

        filenames = {"original": original_name, "gradcam": None, "mask": None}

        if grayscale_cam is not None:
            cam_overlay = show_cam_on_image(rgb01.astype(np.float32), grayscale_cam, use_rgb=True)
            gradcam_name = f"{request_id}_gradcam.png"
            cv2.imwrite(os.path.join(self.results_dir, gradcam_name),
                        cv2.cvtColor(cam_overlay, cv2.COLOR_RGB2BGR))
            filenames["gradcam"] = gradcam_name

        if mask is not None:
            mask_overlay = rgb01.copy()
            mask_overlay[mask == 255] = [1.0, 0.0, 0.0]
            blended = np.clip(0.6 * rgb01 + 0.4 * mask_overlay, 0, 1)
            blended_uint8 = (blended * 255).astype(np.uint8)
            mask_name = f"{request_id}_mask.png"
            cv2.imwrite(os.path.join(self.results_dir, mask_name),
                        cv2.cvtColor(blended_uint8, cv2.COLOR_RGB2BGR))
            filenames["mask"] = mask_name

        return filenames

    # ------------------------------------------------------------------ #
    def run(self, image_path):
        """
        Runs the full 3-stage pipeline on an image on disk.
        Returns a JSON-serializable dict with the prediction, OOD status,
        ABCD/DSI/severity results, and filenames of the saved visualization
        images (relative to static/results/).
        """
        t0 = time.time()
        request_id = uuid.uuid4().hex[:12]

        tensor, rgb01 = preprocessing.preprocess_image(image_path, img_size=self.img_size)

        with torch.no_grad():
            logits, features = model_loader.predict_logits(self.model, tensor, self.device)
            probs = torch.softmax(logits, dim=1)[0].float().cpu().numpy()
            pred_idx = int(probs.argmax())
        features_np = features.float().cpu().numpy()

        ood_dist, nearest_class_idx, is_ood = self.ood_scorer.score(features_np)

        result = {
            "request_id": request_id,
            "predicted_class": self.labels[pred_idx],
            "confidence": float(probs[pred_idx]),
            "class_probabilities": {self.labels[i]: float(p) for i, p in enumerate(probs)},
            "ood_enabled": self.ood_scorer.enabled,
            "ood_distance": ood_dist,
            "ood_threshold": self.ood_scorer.threshold,
            "is_ood": is_ood,
            "asymmetry": 0.0, "border": 0.0, "colour": 0.0, "distribution": 0.0,
            "affected_area_pct": 0.0, "dsi": 0.0,
            "elapsed_ms": None,
        }

        if is_ood:
            result["severity"] = (
                "Unknown (input looks out-of-distribution -- "
                "classification/severity below is unreliable)"
            )
            result["images"] = self._save_visualizations(request_id, rgb01, None, None)
            result["elapsed_ms"] = round((time.time() - t0) * 1000, 1)
            return result

        if pred_idx == self.healthy_idx:
            result["severity"] = "Healthy"
            result["images"] = self._save_visualizations(request_id, rgb01, None, None)
            result["elapsed_ms"] = round((time.time() - t0) * 1000, 1)
            return result

        grayscale_cam = gradcam_utils.get_gradcam(self.model, self.cam, tensor, self.device, target_class=pred_idx)
        mask = wsss_mod.cam_to_pseudo_mask(rgb01, grayscale_cam)
        abcd_result = abcd_mod.compute_abcd_features(
            rgb01, mask, self.abcd_calibration, self.abcd_weights, self.severity_thresholds
        )

        result.update(abcd_result)
        result["images"] = self._save_visualizations(request_id, rgb01, grayscale_cam, mask)
        result["elapsed_ms"] = round((time.time() - t0) * 1000, 1)
        return result


def build_pipeline(cfg):
    """Loads the model + Grad-CAM + OOD scorer once and returns a ready
    WCLWDPipeline. Call this once at app startup, not per-request."""
    from core.ood import MahalanobisOOD
    import wclwd_config as app_config

    model, device = model_loader.load_model(
        app_config.PTH_MODEL_PATH,
        model_name=cfg["model_metadata"]["model_name"],
        num_classes=cfg["model_metadata"]["num_classes"],
    )
    cam = gradcam_utils.build_gradcam(model)
    ood_scorer = MahalanobisOOD(app_config.OOD_STATS_NPZ_PATH)

    cfg = dict(cfg)
    cfg["ood_scorer"] = ood_scorer
    cfg["results_dir"] = app_config.RESULTS_DIR

    return WCLWDPipeline(model, cam, device, cfg)
