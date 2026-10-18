"""
core/gradcam_utils.py
=======================
Stage 2a from the notebook: Grad-CAM localization on the trained EfficientNet-B0.

Target layer: model.blocks[5] (the notebook's comment about ViT/[CLS] tokens
is a leftover from an earlier model choice -- the exported model is actually
EfficientNet-B0, whose timm implementation exposes `.blocks` as a Sequential
of its 7 MBConv stages, so `blocks[5]` is a valid, reasonably late feature
map and is kept as-is for fidelity with the trained/validated pipeline).
"""
import torch
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget


def build_gradcam(model):
    target_layers = [model.blocks[5]]
    return GradCAM(model=model, target_layers=target_layers)


def get_gradcam(model, cam, image_tensor, device, target_class=None):
    """
    image_tensor: (3, H, W) preprocessed (normalized) tensor.
    Returns: grayscale_cam, an HxW float32 array in [0, 1].
    """
    input_tensor = image_tensor.unsqueeze(0).to(device)
    targets = [ClassifierOutputTarget(target_class)] if target_class is not None else None

    # Grad-CAM needs gradients even if the caller is inside a no_grad() context.
    with torch.enable_grad():
        grayscale_cam = cam(input_tensor=input_tensor, targets=targets)[0]

    return grayscale_cam
