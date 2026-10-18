"""
core/preprocessing.py
======================
Reproduces, pixel-for-pixel, the preprocessing used in the training notebook
(WCLWDDataset._opencv_preprocess / preprocess_manual_image, Sections 5 & 10):

    1. Read as BGR, convert to RGB
    2. cv2.fastNlMeansDenoisingColored
    3. CLAHE contrast enhancement on the L channel (Lab colour space)
    4. Resize to IMG_SIZE x IMG_SIZE (INTER_AREA)
    5. Scale to [0, 1] and normalize with ImageNet mean/std

Using different preprocessing than training would silently degrade accuracy
and desync the OOD/ABCD statistics, so nothing here should be changed without
re-running the corresponding notebook cells and re-exporting the artifacts.
"""
import cv2
import numpy as np
import torch

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def opencv_preprocess(filepath, img_size):
    """Denoise + CLAHE + resize. Returns an HxWx3 uint8 RGB array."""
    #Reading the image
    img = cv2.imread(filepath, cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"Could not read image: {filepath}")
    
    #converting the image
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    #Denoising
    img = cv2.fastNlMeansDenoisingColored(img, None, 3, 3, 7, 21)

    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    #CLAHE (Contrast Limited Adaptive Histogram Equalization) contrast enhancement
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    lab = cv2.merge((l, a, b))
    img = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)

    #Resizing
    img = cv2.resize(img, (img_size, img_size), interpolation=cv2.INTER_AREA)
    return img


def preprocess_image(filepath, img_size=224):
    """
    Full preprocessing pipeline for a single image on disk.

    Returns:
        tensor:  torch.FloatTensor, shape (3, H, W), ImageNet-normalized --
                 exactly what the model's forward() expects.
        rgb01:   np.float32 array, shape (H, W, 3), values in [0, 1] --
                 the denoise+CLAHE+resized image *before* normalization.
                 This is what Grad-CAM, the WSSS mask, and the ABCD feature
                 extractors all operate on (equivalent to the notebook's
                 `denorm_for_display(image_tensor)` output, computed directly
                 here instead of via a normalize/denormalize round trip).
    """
    img_uint8 = opencv_preprocess(filepath, img_size)
    rgb01 = img_uint8.astype(np.float32) / 255.0

    #image normalization: The code scales pixel values to \([0,1]\) and then normalizes the RGB channels using ImageNet means and standard deviations.
    img_norm = (rgb01 - IMAGENET_MEAN) / IMAGENET_STD #Preprocessed RGB image in the range 0–1, used for visualization, WSSS and ABCD analysis
    img_norm = np.transpose(img_norm, (2, 0, 1))
    tensor = torch.from_numpy(img_norm).float() #Normalized image used by EfficientNet-B0

    return tensor, rgb01
