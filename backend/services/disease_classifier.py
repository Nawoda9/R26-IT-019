"""
Coconut leaf disease classifier.

Rebuilds the exact EfficientNet-B0 architecture used for training, loads the
exported ``.pth`` state dict, and reproduces the Mahalanobis-distance
out-of-distribution (OOD) check from the training notebook so that images
which are not coconut leaves (or show an unseen condition) get flagged
instead of being force-fit into one of the four known classes.

This module is framework-agnostic w.r.t. Flask: it exposes a single
``DiseaseClassifier`` class with a ``predict(image)`` method, and a
module-level ``get_classifier()`` accessor that lazily builds a singleton.
"""
from __future__ import annotations

import json
import logging
import threading
from io import BytesIO
from typing import Union

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

from config import config

logger = logging.getLogger(__name__)


def build_model(num_classes: int) -> nn.Module:
    """Recreate the EfficientNet-B0 architecture used at training time.

    ``weights=None`` because we are about to load our own fine-tuned
    weights - no need to fetch the ImageNet checkpoint.
    """
    base_model = models.efficientnet_b0(weights=None)
    in_features = base_model.classifier[1].in_features
    base_model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_features, 256),
        nn.BatchNorm1d(256),
        nn.ReLU(),
        nn.Dropout(p=0.3),
        nn.Linear(256, num_classes),
    )
    return base_model


class FeatureExtractor(nn.Module):
    """Exposes the 256-d embedding right before the final classification
    layer (Dropout -> Linear -> BatchNorm -> ReLU), used for the
    Mahalanobis-distance OOD check.
    """

    def __init__(self, trained_model: nn.Module):
        super().__init__()
        self.features = trained_model.features
        self.avgpool = trained_model.avgpool
        self.embedding_head = nn.Sequential(*list(trained_model.classifier.children())[:4])

    def forward(self, x):
        x = self.features(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        return self.embedding_head(x)


def mahalanobis_min_distance(embedding: np.ndarray, class_means: np.ndarray, precision: np.ndarray):
    """Minimum Mahalanobis distance from ``embedding`` to any class mean,
    plus which class that was, and the full per-class distance vector.
    """
    diff = embedding - class_means  # [num_classes, embed_dim]
    dists = np.einsum("ij,jk,ik->i", diff, precision, diff)
    return float(dists.min()), int(dists.argmin()), dists


class DiseaseClassifier:
    """Loads the trained model + OOD config once and serves predictions."""

    def __init__(
        self,
        weights_path=None,
        labels_path=None,
        ood_config_path=None,
        device: str = "cpu",
    ):
        weights_path = weights_path or config.MODEL_WEIGHTS_PATH
        labels_path = labels_path or config.LABELS_PATH
        ood_config_path = ood_config_path or config.OOD_CONFIG_PATH

        self.device = torch.device(device if (device == "cpu" or torch.cuda.is_available()) else "cpu")

        with open(labels_path, "r") as f:
            labels_dict = json.load(f)
        self.class_names = [labels_dict[str(i)] for i in range(len(labels_dict))]

        with open(ood_config_path, "r") as f:
            ood_cfg = json.load(f)

        self.class_means = np.array(ood_cfg["class_means"], dtype=np.float64)
        self.precision = np.array(ood_cfg["precision_matrix"], dtype=np.float64)
        self.ood_threshold = float(ood_cfg["ood_threshold"])
        self.img_size = tuple(ood_cfg["image_size"])
        self.num_classes = int(ood_cfg["num_classes"])
        normalize_mean = ood_cfg.get("normalize_mean", [0.485, 0.456, 0.406])
        normalize_std = ood_cfg.get("normalize_std", [0.229, 0.224, 0.225])

        self.model = build_model(self.num_classes)
        state_dict = torch.load(weights_path, map_location=self.device)
        self.model.load_state_dict(state_dict)
        self.model.to(self.device)
        self.model.eval()

        self.extractor = FeatureExtractor(self.model).to(self.device)
        self.extractor.eval()

        self.transform = transforms.Compose(
            [
                transforms.Resize(self.img_size),
                transforms.ToTensor(),
                transforms.Normalize(normalize_mean, normalize_std),
            ]
        )

        logger.info(
            "DiseaseClassifier ready | classes=%s | device=%s | ood_threshold=%.2f",
            self.class_names,
            self.device,
            self.ood_threshold,
        )

    def predict(self, image: Union[str, bytes, Image.Image]) -> dict:
        """Run inference on a single image.

        ``image`` may be a filesystem path, raw bytes, or a PIL Image.
        Returns a JSON-serialisable dict.
        """
        img = self._load_image(image)
        input_tensor = self.transform(img).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(input_tensor)
            probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
            embedding = self.extractor(input_tensor).cpu().numpy()[0].astype(np.float64)

        pred_idx = int(np.argmax(probs))
        pred_class = self.class_names[pred_idx]
        pred_conf = float(probs[pred_idx])

        min_dist, closest_class_idx, _ = mahalanobis_min_distance(embedding, self.class_means, self.precision)
        is_ood = bool(min_dist > self.ood_threshold)

        return {
            "predicted_class": pred_class,
            "confidence": pred_conf,
            "is_healthy": pred_class == config.HEALTHY_CLASS_NAME,
            "class_probabilities": {
                self.class_names[i]: float(probs[i]) for i in range(len(self.class_names))
            },
            "mahalanobis_distance": min_dist,
            "ood_threshold": self.ood_threshold,
            "is_ood": is_ood,
            "warning": (
                "This image does not look like one of the known coconut leaf "
                "conditions the model was trained on. Treat this prediction "
                "with caution."
                if is_ood
                else None
            ),
        }

    @staticmethod
    def _load_image(image: Union[str, bytes, Image.Image]) -> Image.Image:
        if isinstance(image, Image.Image):
            return image.convert("RGB")
        if isinstance(image, (bytes, bytearray)):
            return Image.open(BytesIO(image)).convert("RGB")
        # assume filesystem path / file-like object
        return Image.open(image).convert("RGB")


_classifier_lock = threading.Lock()
_classifier: DiseaseClassifier | None = None


def get_classifier() -> DiseaseClassifier:
    """Thread-safe lazy singleton so the (fairly large) model is only
    loaded once per process, on first use.
    """
    global _classifier
    if _classifier is None:
        with _classifier_lock:
            if _classifier is None:
                _classifier = DiseaseClassifier(device=config.INFERENCE_DEVICE)
    return _classifier
