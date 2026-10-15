"""
services/vegetation_analysis.py
---------------------------------
Reproduces notebook STEP 5 (v4): accurate empty-space detection using
pixel-color vegetation segmentation instead of circle approximation.

How it works: YOLO finds WHERE trees roughly are (bounding boxes), then
for each box we analyze the actual pixel colors inside it to find
exactly which pixels are vegetation (green, via the Excess Green Index)
vs. bare soil - giving a pixel-accurate tree shape instead of an
idealized circle. A distance transform is then used to find candidate
"planting pockets" (local maxima of distance-from-nearest-tree).
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.ndimage import distance_transform_edt, binary_closing, binary_opening
from skimage.feature import peak_local_max

import land_config as config
from utils.image_utils import save_figure, to_float_0_255


def build_vegetation_mask(img, img_w, img_h, boxes_xyxy,
                           box_padding_px=None, excess_green_threshold=None,
                           use_ellipse_constraint=None, ellipse_scale=None):
    """
    Build a pixel-accurate boolean vegetation mask (True = tree pixel),
    restricted to inside (padded) detection boxes only - so we never
    accidentally mask unrelated green elsewhere in the image.
    """
    box_padding_px = config.BOX_PADDING_PX if box_padding_px is None else box_padding_px
    excess_green_threshold = config.EXCESS_GREEN_THRESHOLD if excess_green_threshold is None else excess_green_threshold
    use_ellipse_constraint = config.USE_ELLIPSE_CONSTRAINT if use_ellipse_constraint is None else use_ellipse_constraint
    ellipse_scale = config.ELLIPSE_SCALE if ellipse_scale is None else ellipse_scale

    img_float = to_float_0_255(img)
    R, G, B = img_float[..., 0], img_float[..., 1], img_float[..., 2]
    excess_green = 2 * G - R - B

    tree_mask_full = np.zeros((img_h, img_w), dtype=bool)

    for x1, y1, x2, y2 in boxes_xyxy:
        x1p = max(0, int(x1) - box_padding_px)
        y1p = max(0, int(y1) - box_padding_px)
        x2p = min(img_w, int(x2) + box_padding_px)
        y2p = min(img_h, int(y2) + box_padding_px)

        region_eg = excess_green[y1p:y2p, x1p:x2p]
        veg_mask = region_eg > excess_green_threshold

        if use_ellipse_constraint:
            bh, bw = veg_mask.shape
            ey, ex = np.mgrid[0:bh, 0:bw]
            ecx, ecy = bw / 2, bh / 2
            ellipse_mask = ((ex - ecx) / (bw / 2)) ** 2 + ((ey - ecy) / (bh / 2)) ** 2 <= ellipse_scale ** 2
            veg_mask = veg_mask & ellipse_mask

        tree_mask_full[y1p:y2p, x1p:x2p] |= veg_mask

    # Clean up small noise/holes
    tree_mask_full = binary_closing(tree_mask_full, structure=np.ones((5, 5)))
    tree_mask_full = binary_opening(tree_mask_full, structure=np.ones((3, 3)))

    return tree_mask_full


def find_planting_pockets(tree_mask_full, img_h, img_w,
                           grid_downsample=None, min_distance_between_pockets=None,
                           min_clearance_px=None, top_n_pockets=None):
    """
    Distance-transform + local-maxima search for candidate planting
    pockets (STEP 5 v4, part 2). Returns a DataFrame with x, y, clearance_px.
    """
    grid_downsample = config.GRID_DOWNSAMPLE if grid_downsample is None else grid_downsample
    min_distance_between_pockets = config.MIN_DISTANCE_BETWEEN_POCKETS if min_distance_between_pockets is None else min_distance_between_pockets
    min_clearance_px = config.MIN_CLEARANCE_PX if min_clearance_px is None else min_clearance_px
    top_n_pockets = config.TOP_N_POCKETS if top_n_pockets is None else top_n_pockets

    ds = grid_downsample
    small_mask = ~tree_mask_full[::ds, ::ds] if ds > 1 else ~tree_mask_full
    dist_map_small = distance_transform_edt(small_mask) * ds

    coordinates = peak_local_max(
        dist_map_small, min_distance=min_distance_between_pockets, threshold_abs=min_clearance_px
    )

    pockets = []
    for gy_, gx_ in coordinates:
        px, py = gx_ * ds, gy_ * ds
        score = dist_map_small[gy_, gx_]
        pockets.append({"x": float(px), "y": float(py), "clearance_px": float(score)})

    pockets_df = pd.DataFrame(pockets, columns=["x", "y", "clearance_px"])
    if not pockets_df.empty:
        pockets_df = pockets_df.sort_values("clearance_px", ascending=False).reset_index(drop=True)

    return pockets_df.head(top_n_pockets), pockets_df


def render_empty_space(img, img_w, img_h, tree_mask_full, top_pockets, available_pct, top_n_pockets):
    """Shade empty space + number the top candidate pockets. Returns filename."""
    overlay = np.zeros((img_h, img_w, 4), dtype=np.float32)
    overlay[..., 0] = 1.0
    overlay[..., 1] = 0.55
    overlay[..., 2] = 0.0
    overlay[..., 3] = (~tree_mask_full).astype(np.float32) * 0.45

    fig, ax = plt.subplots(figsize=(14, 10))
    ax.imshow(img, extent=[0, img_w, img_h, 0])
    ax.imshow(overlay, extent=[0, img_w, img_h, 0], interpolation="nearest")

    for i, row in top_pockets.iterrows():
        ax.text(row["x"], row["y"], str(i + 1), color="white", fontsize=12, weight="bold",
                 ha="center", va="center", zorder=6,
                 bbox=dict(boxstyle="circle", facecolor="darkred", edgecolor="white"))

    ax.set_xlim(0, img_w)
    ax.set_ylim(img_h, 0)
    ax.axis("off")
    ax.set_title(f"Available Land - {available_pct:.1f}% empty (pixel-accurate), "
                 f"top {top_n_pockets} planting spots numbered")
    plt.tight_layout()

    return save_figure(fig, config.RESULTS_DIR, "empty_space")


def render_mask_sanity_check(img, tree_mask_full, img_w, img_h, overlay_filename_source=None):
    """Optional 3-panel debug view: original / mask / overlay. Returns filename."""
    overlay = np.zeros((img_h, img_w, 4), dtype=np.float32)
    overlay[..., 0] = 1.0
    overlay[..., 1] = 0.55
    overlay[..., 2] = 0.0
    overlay[..., 3] = (~tree_mask_full).astype(np.float32) * 0.35

    fig, axes = plt.subplots(1, 3, figsize=(20, 7))
    axes[0].imshow(img); axes[0].set_title("Original"); axes[0].axis("off")
    axes[1].imshow(tree_mask_full, cmap="Greens")
    axes[1].set_title("Detected vegetation mask (white=tree)"); axes[1].axis("off")
    axes[2].imshow(img, extent=[0, img_w, img_h, 0])
    axes[2].imshow(overlay, extent=[0, img_w, img_h, 0], interpolation="nearest")
    axes[2].set_title("Empty space overlay"); axes[2].axis("off")
    plt.tight_layout()

    return save_figure(fig, config.RESULTS_DIR, "mask_sanity", dpi=120)


def analyze_vegetation(img, img_w, img_h, boxes_xyxy, top_n_pockets=None, include_sanity_check=False):
    """
    Full pipeline for STEP 5 v4: build mask -> stats -> pockets -> render.
    Returns (stats_dict, empty_space_filename, pockets_df, sanity_filename_or_None)
    """
    top_n_pockets = config.TOP_N_POCKETS if top_n_pockets is None else top_n_pockets

    tree_mask_full = build_vegetation_mask(img, img_w, img_h, boxes_xyxy)

    utilized_pct = 100 * tree_mask_full.sum() / tree_mask_full.size
    available_pct = 100 - utilized_pct

    top_pockets, all_pockets = find_planting_pockets(
        tree_mask_full, img_h, img_w, top_n_pockets=top_n_pockets
    )

    empty_space_filename = render_empty_space(img, img_w, img_h, tree_mask_full, top_pockets, available_pct, top_n_pockets)

    sanity_filename = None
    if include_sanity_check:
        sanity_filename = render_mask_sanity_check(img, tree_mask_full, img_w, img_h)

    stats = {
        "utilized_pct": round(float(utilized_pct), 2),
        "available_pct": round(float(available_pct), 2),
        "pocket_count": int(len(all_pockets)),
    }

    return stats, empty_space_filename, top_pockets, tree_mask_full, sanity_filename
