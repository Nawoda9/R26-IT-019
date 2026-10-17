"""
core/model_loader.py
=====================
Builds the exact architecture used in training (timm efficientnet_b0) and
loads the exported `wclwd_efficientnet_b0_best.pth` state_dict into it.

We deliberately use the .pth (state_dict) file rather than a TorchScript
.pt file, per the requirement to use the .pth model. The state_dict alone
has no attached architecture, so `timm.create_model(..., pretrained=False)`
must be called first with the exact same model_name/num_classes used when
the notebook trained it (see model_metadata.json).
"""
import logging

import timm
import torch

logger = logging.getLogger(__name__)


def get_device():
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def load_model(pth_path, model_name, num_classes, device=None):
    """
    Returns (model, device). The returned model is in eval() mode.
    """
    device = device or get_device()

    model = timm.create_model(model_name, pretrained=False, num_classes=num_classes)
    state_dict = torch.load(pth_path, map_location=device)

    # torch.save(model.state_dict(), ...) in the notebook saves a raw state_dict
    # (no "model" / "state_dict" wrapper key), but we defensively unwrap common
    # checkpoint formats in case a different export ever wraps it.
    if isinstance(state_dict, dict) and "state_dict" in state_dict and not any(
        k.startswith(("conv_stem", "blocks", "classifier")) for k in state_dict.keys()
    ):
        state_dict = state_dict["state_dict"]

    missing, unexpected = model.load_state_dict(state_dict, strict=True)
    if missing or unexpected:  # pragma: no cover - defensive logging only
        logger.warning("Missing keys: %s | Unexpected keys: %s", missing, unexpected)

    model = model.to(device)
    model.eval()
    logger.info("Loaded %s from %s onto %s", model_name, pth_path, device)
    return model, device


@torch.no_grad()
def extract_features(model, image_tensor, device):
    """
    Penultimate-layer feature vector for a single preprocessed image tensor
    (3, H, W). Uses timm's forward_features -> forward_head(pre_logits=True),
    identical to the notebook's extract_features_batch / predict_with_ood.

    Returns a (1, feature_dim) numpy array.
    """
    model.eval()
    input_tensor = image_tensor.unsqueeze(0).to(device)
    feats_map = model.forward_features(input_tensor)
    pooled = model.forward_head(feats_map, pre_logits=True)
    return pooled.float().cpu().numpy()


@torch.no_grad()
def predict_logits(model, image_tensor, device):
    """Returns (logits, features) for a single preprocessed image tensor, in
    one forward pass -- mirrors predict_with_ood() in the notebook."""
    model.eval()
    input_tensor = image_tensor.unsqueeze(0).to(device)
    feats_map = model.forward_features(input_tensor)
    features = model.forward_head(feats_map, pre_logits=True)
    logits = model.forward_head(feats_map, pre_logits=False)
    return logits, features
