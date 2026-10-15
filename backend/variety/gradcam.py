"""
Grad-CAM for the Coconut Variety prototypical network.

Ported directly from the training notebook (coconut-species-with-gradcam.ipynb,
the `GradCAM` class + `overlay_gradcam`), adapted only to:
  - work against `variety.model.CoconutPredictor`'s already-loaded model /
    prototypes / log_scale instead of notebook globals, and
  - return an in-memory RGB overlay array instead of a matplotlib figure.

Because the classifier is a Prototypical Network (not a softmax classifier),
Grad-CAM here backprops from the cosine-similarity logit of the predicted
class (query embedding vs. class prototype) rather than a normal classifier
logit — exactly as in the notebook.
"""

import cv2
import numpy as np
import torch
import torch.nn.functional as F


class GradCAM:
    """Hooks a target conv layer and computes a class-activation map."""

    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.activations = None
        self.gradients = None
        self.hook_handles = []
        self.hook_handles.append(target_layer.register_forward_hook(self._save_activation))
        self.hook_handles.append(target_layer.register_full_backward_hook(self._save_gradient))

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def remove_hooks(self):
        for h in self.hook_handles:
            h.remove()

    def generate(self, input_tensor, prototypes, log_scale, target_class_idx=None):
        """
        Runs a forward + backward pass and returns:
            cam            -- normalized [H, W] activation map (numpy, 0..1)
            target_class_idx -- the class index the CAM was computed for
            probs          -- softmax probabilities over all classes (numpy)
        """
        self.model.eval()
        input_tensor = input_tensor.clone().requires_grad_(True)

        emb = self.model(input_tensor)
        q_norm = F.normalize(emb, dim=1)
        p_norm = F.normalize(prototypes, dim=1)
        logits = log_scale * (q_norm @ p_norm.t())

        if target_class_idx is None:
            target_class_idx = int(logits.argmax(dim=1).item())

        score = logits[0, target_class_idx]

        self.model.zero_grad()
        score.backward()

        gradients = self.gradients[0]      # [C, H, W]
        activations = self.activations[0]  # [C, H, W]

        # Global-average-pool gradients -> per-channel importance weights
        weights = gradients.mean(dim=(1, 2))  # [C]

        cam = torch.zeros(activations.shape[1:], dtype=torch.float32, device=activations.device)
        for i, w in enumerate(weights):
            cam += w * activations[i]

        cam = F.relu(cam)
        cam = cam - cam.min()
        cam = cam / (cam.max() + 1e-8)
        cam = cam.cpu().numpy()

        probs = F.softmax(logits, dim=1).detach().cpu().numpy()[0]
        return cam, target_class_idx, probs


def overlay_gradcam(pil_img, cam, img_size, alpha=0.45):
    """
    Resize the CAM to img_size, apply the JET colormap, and blend it with the
    (resized) original image. Returns an RGB uint8 numpy array of the overlay.
    """
    img_resized = np.array(pil_img.resize((img_size, img_size))).astype(np.uint8)
    heatmap = cv2.resize(cam, (img_size, img_size))
    heatmap_uint8 = np.uint8(255 * heatmap)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    heatmap_color = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)
    overlay = cv2.addWeighted(img_resized, 1 - alpha, heatmap_color, alpha, 0)
    return overlay
