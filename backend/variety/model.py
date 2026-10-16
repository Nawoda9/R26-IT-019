"""
Coconut type classifier — Prototypical Network (EfficientNet-B0 embedding + cosine
similarity against class prototypes), exactly mirroring the training notebook
(coconut-type-classify.ipynb).

This module:
  1. Rebuilds the EmbeddingNet architecture.
  2. Loads weights from model_weights.pth (state_dict, NOT TorchScript — as requested).
  3. Loads the precomputed class prototypes (prototypes.pt).
  4. Loads label.json + preprocessing_config.json so preprocessing/scale always
     matches what the model was trained/exported with.
  5. Exposes a singleton `predictor` with `.predict()` / `.predict_with_gradcam()`
     methods used by the Flask routes.
"""

import json
import logging
import threading

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms, models

from variety import config
from variety.gradcam import GradCAM, overlay_gradcam

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Model architecture (must match training code exactly so state_dict loads)
# --------------------------------------------------------------------------- #
class EmbeddingNet(nn.Module):
    """EfficientNet-B0 backbone, classifier head stripped -> feature embeddings."""

    def __init__(self, embedding_dim: int = 512):
        super().__init__()
        # weights=None: we are loading our own fine-tuned weights right after this,
        # no need to re-download ImageNet weights.
        base = models.efficientnet_b0(weights=None)
        self.features = base.features
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Sequential(
            nn.Linear(1280, embedding_dim),
            nn.BatchNorm1d(embedding_dim),
        )

    def forward(self, x):
        x = self.features(x)
        x = self.pool(x).flatten(1)
        x = self.fc(x)
        return x


def proto_logits(query_emb: torch.Tensor, prototypes: torch.Tensor, scale: float) -> torch.Tensor:
    """Cosine-similarity logits between query embeddings and class prototypes."""
    q_norm = F.normalize(query_emb, dim=1)
    p_norm = F.normalize(prototypes, dim=1)
    sims = q_norm @ p_norm.t()
    return scale * sims


# --------------------------------------------------------------------------- #
# Predictor: loads all artifacts once, then serves predictions
# --------------------------------------------------------------------------- #
class CoconutPredictor:
    _lock = threading.Lock()

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # ---- preprocessing config (single source of truth) ----
        with open(config.PREPROCESS_CONFIG_PATH, "r") as f:
            self.preprocess_cfg = json.load(f)

        img_size = self.preprocess_cfg["img_size"]
        norm_mean = self.preprocess_cfg["normalize_mean"]
        norm_std = self.preprocess_cfg["normalize_std"]
        embedding_dim = self.preprocess_cfg.get("embedding_dim", 512)
        self.img_size = img_size

        # ---- label map ----
        with open(config.LABEL_MAP_PATH, "r") as f:
            raw_labels = json.load(f)
        # keys come in as strings ("0","1","2") -> sort numerically for stable order
        self.label_map = {int(k): v for k, v in raw_labels.items()}
        self.class_names = [self.label_map[i] for i in range(len(self.label_map))]

        # ---- image transform (identical to notebook's test_transform) ----
        self.transform = transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=norm_mean, std=norm_std),
        ])

        # ---- model ----
        self.model = EmbeddingNet(embedding_dim=embedding_dim).to(self.device)
        checkpoint = torch.load(config.MODEL_WEIGHTS_PATH, map_location=self.device)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()

        # ---- scale: prefer the value baked into the checkpoint, fall back to config ----
        log_scale_value = checkpoint.get("log_scale", self.preprocess_cfg.get("log_scale", 10.0))
        if torch.is_tensor(log_scale_value):
            log_scale_value = log_scale_value.item()
        self.log_scale = float(log_scale_value)

        # ---- class prototypes ----
        self.prototypes = torch.load(config.PROTOTYPES_PATH, map_location=self.device).to(self.device)

        # Last conv block of EfficientNet-B0 — the Grad-CAM target layer, same
        # as `model.features[-1]` in the training notebook.
        self.gradcam_target_layer = self.model.features[-1]

        logger.info(
            "CoconutPredictor ready | device=%s | classes=%s | embedding_dim=%s | scale=%.4f",
            self.device, self.class_names, embedding_dim, self.log_scale,
        )

    @torch.no_grad()
    def predict(self, pil_image):
        """
        Run inference on a single PIL image (RGB).
        Returns: (predicted_label: str, probs: dict[str, float])
        """
        pil_image = pil_image.convert("RGB")
        img_tensor = self.transform(pil_image).unsqueeze(0).to(self.device)

        with self._lock:  # simple safety net for concurrent requests under a dev server
            embedding = self.model(img_tensor)
            logits = proto_logits(embedding, self.prototypes, self.log_scale)
            probs = F.softmax(logits, dim=1).cpu().numpy()[0]

        pred_idx = int(probs.argmax())
        pred_label = self.label_map[pred_idx]
        prob_dict = {self.label_map[i]: float(probs[i]) for i in range(len(probs))}
        return pred_label, prob_dict

    def predict_with_gradcam(self, pil_image, alpha=None):
        """
        Run inference AND compute a Grad-CAM overlay for the predicted class,
        exactly mirroring `predict_with_gradcam` in the training notebook.

        Returns: (predicted_label: str, probs: dict[str, float], overlay: np.ndarray RGB uint8)
        """
        if alpha is None:
            alpha = config.GRADCAM_ALPHA

        pil_image = pil_image.convert("RGB")
        img_tensor = self.transform(pil_image).unsqueeze(0).to(self.device)

        with self._lock:  # same lock as predict(): model isn't safe for concurrent fwd/bwd
            cam_engine = GradCAM(self.model, self.gradcam_target_layer)
            try:
                # Grad-CAM needs gradients, so explicitly re-enable them even if
                # a caller elsewhere is inside a `torch.no_grad()` context.
                with torch.enable_grad():
                    cam, pred_idx, probs = cam_engine.generate(
                        img_tensor, self.prototypes, self.log_scale
                    )
            finally:
                cam_engine.remove_hooks()

        pred_label = self.label_map[pred_idx]
        prob_dict = {self.label_map[i]: float(probs[i]) for i in range(len(probs))}
        overlay = overlay_gradcam(pil_image, cam, self.img_size, alpha=alpha)
        return pred_label, prob_dict, overlay


# --------------------------------------------------------------------------- #
# Lazy singleton — loaded once on first use / app startup
# --------------------------------------------------------------------------- #
_predictor_instance = None
_init_lock = threading.Lock()


def get_predictor() -> "CoconutPredictor":
    global _predictor_instance
    if _predictor_instance is None:
        with _init_lock:
            if _predictor_instance is None:
                _predictor_instance = CoconutPredictor()
    return _predictor_instance
