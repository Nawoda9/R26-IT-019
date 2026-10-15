"""
scripts/check_setup.py
========================
Run this before starting the Flask app to sanity-check that every artifact
in models/ is present and loads correctly, and that the model produces a
reasonable output shape.

Usage (from the project root):
    python scripts/check_setup.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import torch

import wclwd_config as app_config
from core import model_loader
from core.ood import MahalanobisOOD


def main():
    print("=" * 60)
    print("WCLWD web app - setup check")
    print("=" * 60)

    cfg = app_config.load_all_config()
    print(f"✓ Config loaded. Classes: {cfg['labels']}")
    print(f"  Model: {cfg['model_metadata']['model_name']}, "
          f"image_size={cfg['model_metadata']['image_size']}, "
          f"num_classes={cfg['model_metadata']['num_classes']}")

    model, device = model_loader.load_model(
        app_config.PTH_MODEL_PATH,
        model_name=cfg["model_metadata"]["model_name"],
        num_classes=cfg["model_metadata"]["num_classes"],
    )
    print(f"✓ Model loaded onto {device}")

    img_size = cfg["model_metadata"]["image_size"]
    dummy = torch.randn(1, 3, img_size, img_size, device=device)
    with torch.no_grad():
        feats_map = model.forward_features(dummy)
        pooled = model.forward_head(feats_map, pre_logits=True)
        logits = model.forward_head(feats_map, pre_logits=False)
    print(f"✓ Forward pass OK. Feature dim: {pooled.shape[1]}, logits shape: {tuple(logits.shape)}")

    expected_feat_dim = cfg["feature_extractor_meta"].get("feature_dim")
    if expected_feat_dim and pooled.shape[1] != expected_feat_dim:
        print(f"✗ WARNING: feature dim {pooled.shape[1]} != expected {expected_feat_dim} "
              f"from feature_extractor.json")

    ood_scorer = MahalanobisOOD(app_config.OOD_STATS_NPZ_PATH)
    if ood_scorer.enabled:
        print(f"✓ OOD stats loaded. Threshold: {ood_scorer.threshold:.2f}, "
              f"feature_dim: {ood_scorer.shared_cov_inv.shape[0]}")
    else:
        print("! OOD detection DISABLED -- ood_mahalanobis_stats.npz not found in models/.")
        print("  The app will still run; every prediction is treated as in-distribution.")
        print("  To enable: copy that file from the notebook's wclwd_deployment/ export folder.")

    print("=" * 60)
    print("Setup check complete.")
    print("=" * 60)


if __name__ == "__main__":
    main()
