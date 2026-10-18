"""
services/planting_capacity.py
--------------------------------
Reproduces notebook STEP 5 (v5): REAL planting capacity, not just raw
empty-space percentage.

Raw "available %" overstates how many new trees can actually be
planted, because most of the empty area is scattered in small gaps too
narrow for even one new tree once minimum spacing is respected.

This uses a greedy algorithm: repeatedly find the single most-open
remaining spot (via a distance transform); if it has enough clearance,
"plant" a new tree there and block the area around it too, so the next
iteration respects spacing from this new tree as well as the existing
ones. Stops when no spot has enough clearance left.
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.ndimage import distance_transform_edt

import land_config as config
from utils.image_utils import save_figure


def estimate_planting_capacity(tree_mask_full, img_h, img_w, boxes_xyxy,
                                required_spacing_px=None, grid_downsample=None,
                                max_new_trees_to_find=None):
    """
    Greedy capacity search. Returns (new_trees_df, required_spacing_px_used).
    """
    grid_downsample = config.GRID_DOWNSAMPLE if grid_downsample is None else grid_downsample
    max_new_trees_to_find = config.MAX_NEW_TREES_TO_FIND if max_new_trees_to_find is None else max_new_trees_to_find

    if required_spacing_px is None:
        required_spacing_px = config.REQUIRED_SPACING_PX

    if required_spacing_px is None:
        widths = boxes_xyxy[:, 2] - boxes_xyxy[:, 0]
        heights = boxes_xyxy[:, 3] - boxes_xyxy[:, 1]
        avg_canopy_radius = float(((widths.mean() + heights.mean()) / 2) / 2)
        required_spacing_px = avg_canopy_radius

    ds = grid_downsample
    grid_h = int(np.ceil(img_h / ds))
    grid_w = int(np.ceil(img_w / ds))
    blocked = tree_mask_full[::ds, ::ds].copy()  # True = blocked (existing trees)

    gy, gx = np.mgrid[0:grid_h, 0:grid_w]
    real_x, real_y = gx * ds, gy * ds

    new_tree_positions = []
    for _ in range(max_new_trees_to_find):
        dist_map = distance_transform_edt(~blocked) * ds
        max_dist = dist_map.max()
        if max_dist < required_spacing_px:
            break
        gy_best, gx_best = np.unravel_index(dist_map.argmax(), dist_map.shape)
        px, py = gx_best * ds, gy_best * ds
        new_tree_positions.append({"x": float(px), "y": float(py), "clearance_px": float(max_dist)})

        dist2_new = (real_x - px) ** 2 + (real_y - py) ** 2
        blocked[dist2_new <= required_spacing_px ** 2] = True

    new_trees_df = pd.DataFrame(new_tree_positions, columns=["x", "y", "clearance_px"])
    return new_trees_df, required_spacing_px


def render_planting_capacity(img, img_w, img_h, tree_mask_full, new_trees_df,
                              required_spacing_px, available_pct):
    """Shade empty space + draw the actual new tree positions. Returns filename."""
    overlay = np.zeros((img_h, img_w, 4), dtype=np.float32)
    overlay[..., 0] = 1.0
    overlay[..., 1] = 0.55
    overlay[..., 2] = 0.0
    overlay[..., 3] = (~tree_mask_full).astype(np.float32) * 0.35

    fig, ax = plt.subplots(figsize=(14, 10))
    ax.imshow(img, extent=[0, img_w, img_h, 0])
    ax.imshow(overlay, extent=[0, img_w, img_h, 0], interpolation="nearest")

    for i, row in new_trees_df.iterrows():
        circle = plt.Circle((row["x"], row["y"]), required_spacing_px * 0.6,
                             color="red", alpha=0.55, ec="darkred", linewidth=1, zorder=4)
        ax.add_patch(circle)
        ax.text(row["x"], row["y"], str(i + 1), color="white", fontsize=8, weight="bold",
                 ha="center", va="center", zorder=6)

    ax.set_xlim(0, img_w)
    ax.set_ylim(img_h, 0)
    ax.axis("off")
    ax.set_title(
        f"Real planting capacity: {len(new_trees_df)} new trees can fit "
        f"(spacing >= {required_spacing_px:.0f}px) - vs {available_pct:.1f}% raw empty space"
    )
    plt.tight_layout()

    return save_figure(fig, config.RESULTS_DIR, "planting_capacity")


def analyze_planting_capacity(img, img_w, img_h, tree_mask_full, boxes_xyxy,
                               available_pct, required_spacing_px=None):
    """
    Full pipeline for STEP 5 v5. Returns (stats_dict, filename, new_trees_df).
    """
    new_trees_df, spacing_used = estimate_planting_capacity(
        tree_mask_full, img_h, img_w, boxes_xyxy, required_spacing_px=required_spacing_px
    )

    filename = render_planting_capacity(img, img_w, img_h, tree_mask_full, new_trees_df, spacing_used, available_pct)

    stats = {
        "existing_trees": int(len(boxes_xyxy)),
        "new_trees_that_fit": int(len(new_trees_df)),
        "required_spacing_px": round(float(spacing_used), 1),
    }

    return stats, filename, new_trees_df
