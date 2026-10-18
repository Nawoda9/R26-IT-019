"""
core/abcd.py
=============
Stage 3 from the notebook: ABCD-rule feature extraction from the WSSS mask,
combined into a Disease Severity Index (DSI, 0-100) and a severity category.

- A - Asymmetry: PCA-align the diseased mask, split along its principal axis,
  measure the pixel-count imbalance between the two halves.
- B - Border irregularity: 1 - solidity (contour area / convex-hull area).
- C - Colour variation: std of Lab-space colour within the diseased pixels.
- D - Distribution: 0.5 * (spatial spread of disease pixels, normalized by
  the image diagonal) + 0.5 * (fraction of the 4 quadrants touched).
- Affected area: disease-mask pixels / heuristic leaf-mask pixels, as a %.

Raw components are normalized to 0-100 using per-dataset calibration bounds
(abcd_calibration.json, the 5th-95th percentile of raw values observed on
the notebook's own test set) before being combined with abcd_config.json's
weights into the DSI, which is then bucketed into a severity label using
abcd_config.json's thresholds.
"""
import cv2
import numpy as np

DEFAULT_ABCD_BOUNDS = {
    "asymmetry_raw": (0.0, 1.0),
    "border_raw": (0.0, 1.0),
    "colour_std": (0.0, 55.0),
    "distribution_raw": (0.0, 1.0),
}


def get_leaf_mask(rgb_img_float):
    """Heuristic leaf-vs-background segmentation, used only to normalize
    'affected area'. Falls back to the whole frame if the heuristic looks
    degenerate (too small / too large)."""
    h, w = rgb_img_float.shape[:2]
    gray = cv2.cvtColor((rgb_img_float * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
    _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    otsu = cv2.morphologyEx(otsu, cv2.MORPH_CLOSE, kernel)
    otsu = cv2.morphologyEx(otsu, cv2.MORPH_OPEN, kernel)

    area_ratio = otsu.sum() / 255 / (h * w)
    if area_ratio < 0.10 or area_ratio > 0.95:
        return np.full((h, w), 255, dtype=np.uint8)
    return otsu


def _normalize(value, v_min, v_max):
    if v_max <= v_min:
        return 0.0
    return float(np.clip((value - v_min) / (v_max - v_min) * 100.0, 0, 100))


def compute_abcd_raw(rgb_img_float, disease_mask):
    """Extract RAW (un-normalized) ABCD components + affected-area % from a
    WSSS mask. Returns None if the mask is empty (no lesion detected)."""
    h, w = disease_mask.shape
    ys, xs = np.where(disease_mask == 255)
    if len(xs) == 0:
        return None

    # --- Affected area (relative to heuristic leaf mask) ---
    leaf_mask = get_leaf_mask(rgb_img_float)
    leaf_area = max(int((leaf_mask == 255).sum()), 1)
    disease_area = len(xs)
    affected_area_pct = float(np.clip(disease_area / leaf_area * 100.0, 0, 100))

    # --- Asymmetry (A) ---
    coords = np.column_stack([xs, ys]).astype(np.float32)
    mean = coords.mean(axis=0)
    centered = coords - mean
    if len(xs) >= 3:
        cov = np.cov(centered.T)
        eigvals, eigvecs = np.linalg.eigh(cov)
        principal_axis = eigvecs[:, np.argmax(eigvals)]
        normal_axis = np.array([-principal_axis[1], principal_axis[0]])
        signed_dist = centered @ normal_axis
        side_a = np.sum(signed_dist >= 0)
        side_b = np.sum(signed_dist < 0)
        asymmetry_raw = abs(side_a - side_b) / max(side_a + side_b, 1)
    else:
        asymmetry_raw = 0.0

    # --- Border irregularity (B) ---
    contours, _ = cv2.findContours(disease_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if len(contours) > 0:
        largest = max(contours, key=cv2.contourArea)
        contour_area = cv2.contourArea(largest)
        hull = cv2.convexHull(largest)
        hull_area = cv2.contourArea(hull)
        solidity = contour_area / hull_area if hull_area > 0 else 1.0
        border_raw = 1.0 - np.clip(solidity, 0, 1)
    else:
        border_raw = 0.0

    # --- Colour variation (C) ---
    img_uint8 = (rgb_img_float * 255).astype(np.uint8)
    lab = cv2.cvtColor(img_uint8, cv2.COLOR_RGB2LAB)
    diseased_pixels_lab = lab[ys, xs].astype(np.float32)
    colour_std = float(diseased_pixels_lab.std(axis=0).mean())

    # --- Distribution (D) ---
    cx, cy = mean
    diag = np.sqrt(h ** 2 + w ** 2)
    dists = np.sqrt(((xs - cx) ** 2 + (ys - cy) ** 2))
    spread_raw = float(dists.std() / diag)

    mid_x, mid_y = w / 2, h / 2
    quadrants_hit = len({(int(x < mid_x), int(y < mid_y)) for x, y in zip(xs, ys)})
    quadrant_frac = quadrants_hit / 4.0
    distribution_raw = 0.5 * spread_raw + 0.5 * quadrant_frac

    return {
        "asymmetry_raw": float(asymmetry_raw),
        "border_raw": float(border_raw),
        "colour_std": colour_std,
        "distribution_raw": float(distribution_raw),
        "affected_area_pct": affected_area_pct,
    }


def score_abcd_from_raw(raw, calibration, weights, severity_thresholds):
    """Turn raw ABCD components into calibrated 0-100 scores + DSI + severity."""
    bounds = calibration or DEFAULT_ABCD_BOUNDS

    asymmetry_score = _normalize(raw["asymmetry_raw"], *bounds.get("asymmetry_raw", DEFAULT_ABCD_BOUNDS["asymmetry_raw"]))
    border_score = _normalize(raw["border_raw"], *bounds.get("border_raw", DEFAULT_ABCD_BOUNDS["border_raw"]))
    colour_score = _normalize(raw["colour_std"], *bounds.get("colour_std", DEFAULT_ABCD_BOUNDS["colour_std"]))
    distribution_score = _normalize(raw["distribution_raw"], *bounds.get("distribution_raw", DEFAULT_ABCD_BOUNDS["distribution_raw"]))
    affected_area_pct = raw["affected_area_pct"]

    dsi = (
        weights["asymmetry"] * asymmetry_score +
        weights["border"] * border_score +
        weights["colour"] * colour_score +
        weights["distribution"] * distribution_score +
        weights["area"] * affected_area_pct
    )
    dsi = float(np.clip(dsi, 0, 100))

    if dsi <= severity_thresholds["Mild"]:
        severity = "Mild"
    elif dsi <= severity_thresholds["Moderate"]:
        severity = "Moderate"
    elif dsi <= severity_thresholds["Severe"]:
        severity = "Severe"
    else:
        severity = "Critical"

    return {
        "asymmetry": round(asymmetry_score, 2),
        "border": round(border_score, 2),
        "colour": round(colour_score, 2),
        "distribution": round(distribution_score, 2),
        "affected_area_pct": round(affected_area_pct, 2),
        "dsi": round(dsi, 2),
        "severity": severity,
    }


def compute_abcd_features(rgb_img_float, disease_mask, calibration, weights, severity_thresholds):
    """Single-image convenience wrapper used by the inference pipeline."""
    raw = compute_abcd_raw(rgb_img_float, disease_mask)
    if raw is None:
        return {
            "asymmetry": 0.0, "border": 0.0, "colour": 0.0, "distribution": 0.0,
            "affected_area_pct": 0.0, "dsi": 0.0, "severity": "None (no lesion detected)",
        }
    return score_abcd_from_raw(raw, calibration, weights, severity_thresholds)
