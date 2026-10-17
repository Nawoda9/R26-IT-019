"""
core/wsss.py
=============
Stage 2b from the notebook: refine a Grad-CAM heatmap into a pixel-level
pseudo-segmentation mask of the diseased region, with no manual annotation:

    1. Per-image Otsu threshold on the normalized CAM picks a data-driven
       cutoff (instead of a fixed percentile that ignores how strong/weak
       the real activation is).
    2. That cutoff seeds GrabCut's "sure FGD / probable FGD / probable BGD /
       sure BGD" mask, with a configurable margin on each side.
    3. GrabCut refines the seed against the image's real colour/texture
       boundaries (its role is analogous to a CRF refinement step in a
       typical WSSS pipeline).
    4. Morphological opening/closing + small-component removal cleans up
       noise in the final binary mask.
"""
import cv2
import numpy as np

# Same defaults as CFG in the notebook.
CAM_FGD_MARGIN = 0.15
CAM_BGD_MARGIN = 0.15
GRABCUT_ITERS = 5
MIN_COMPONENT_AREA_RATIO = 0.01
MAX_MASK_AREA_RATIO = 0.85
RNG_SEED = 42


def cam_to_pseudo_mask(rgb_img_float, grayscale_cam,
                        cam_fgd_margin=CAM_FGD_MARGIN, cam_bgd_margin=CAM_BGD_MARGIN,
                        grabcut_iters=GRABCUT_ITERS,
                        min_component_area_ratio=MIN_COMPONENT_AREA_RATIO,
                        max_mask_area_ratio=MAX_MASK_AREA_RATIO):
    """
    rgb_img_float: HxWx3 float array in [0, 1]
    grayscale_cam: HxW float array (raw Grad-CAM output)
    Returns: binary mask, uint8, values {0, 255}, same HxW as input.
    """
    h, w = grayscale_cam.shape
    img_uint8_bgr = cv2.cvtColor((rgb_img_float * 255).astype(np.uint8), cv2.COLOR_RGB2BGR)

    # --- Robust per-image min-max normalization ---
    cam = grayscale_cam.astype(np.float32)
    cam_min, cam_max = float(cam.min()), float(cam.max())
    if cam_max - cam_min < 1e-6:
        return np.zeros((h, w), dtype=np.uint8)
    cam_norm = (cam - cam_min) / (cam_max - cam_min)

    # --- Data-driven (Otsu) cutoff on this image's own CAM histogram ---
    cam_uint8 = (cam_norm * 255).astype(np.uint8)
    otsu_val, _ = cv2.threshold(cam_uint8, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    otsu_thresh = otsu_val / 255.0

    pr_fgd_thresh = float(np.clip(otsu_thresh, 0.05, 0.95))
    fgd_thresh = float(np.clip(pr_fgd_thresh + cam_fgd_margin, pr_fgd_thresh + 0.01, 0.98))
    bgd_thresh = float(np.clip(pr_fgd_thresh - cam_bgd_margin, 0.02, pr_fgd_thresh - 0.01))

    grabcut_mask = np.full((h, w), cv2.GC_PR_BGD, dtype=np.uint8)
    grabcut_mask[cam_norm >= fgd_thresh] = cv2.GC_FGD
    grabcut_mask[(cam_norm >= pr_fgd_thresh) & (cam_norm < fgd_thresh)] = cv2.GC_PR_FGD
    grabcut_mask[cam_norm < bgd_thresh] = cv2.GC_BGD

    if not (np.any(grabcut_mask == cv2.GC_FGD) and np.any(grabcut_mask == cv2.GC_BGD)):
        refined = (cam_norm >= pr_fgd_thresh).astype(np.uint8) * 255
    else:
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)
        try:
            # Re-seed OpenCV's RNG before every call so GrabCut's internal k-means
            # GMM init is deterministic across runs/images.
            cv2.setRNGSeed(RNG_SEED)
            cv2.grabCut(img_uint8_bgr, grabcut_mask, None, bgd_model, fgd_model,
                        grabcut_iters, cv2.GC_INIT_WITH_MASK)
            refined = np.where((grabcut_mask == cv2.GC_FGD) | (grabcut_mask == cv2.GC_PR_FGD),
                                255, 0).astype(np.uint8)
        except cv2.error:
            refined = (cam_norm >= pr_fgd_thresh).astype(np.uint8) * 255

    # Distrust GrabCut if it over-grew to nearly the whole frame (a known failure
    # mode on visually uniform leaves) and fall back to the tighter CAM threshold.
    if refined.sum() / 255.0 > max_mask_area_ratio * h * w:
        refined = (cam_norm >= fgd_thresh).astype(np.uint8) * 255

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    refined = cv2.morphologyEx(refined, cv2.MORPH_OPEN, kernel)
    refined = cv2.morphologyEx(refined, cv2.MORPH_CLOSE, kernel)

    n_labels, labels, stats, _ = cv2.connectedComponentsWithStats(refined, connectivity=8)
    min_area = min_component_area_ratio * h * w
    cleaned = np.zeros_like(refined)
    for i in range(1, n_labels):
        if stats[i, cv2.CC_STAT_AREA] >= min_area:
            cleaned[labels == i] = 255

    return cleaned
