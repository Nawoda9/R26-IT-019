"""
services/land_utilization.py
------------------------------
Reproduces notebook STEP 4's second half ("Full land utilization
analysis"): approximates each detected tree's canopy as a circle
(radius = average detected box size / 2), unions those circles, and
reports utilized vs. available percentage of the image. Also renders
a kernel-density heatmap of tree locations.

This is the fast/approximate method. For a pixel-accurate version see
services/vegetation_analysis.py, which segments actual canopy pixels
instead of assuming circles.
"""

import numpy as np
import matplotlib.pyplot as plt
from shapely.geometry import Point, box
from shapely.ops import unary_union
from sklearn.neighbors import KernelDensity

import land_config as config
from utils.image_utils import save_figure


def analyze_land_utilization(img, img_w, img_h, boxes_xyxy):
    """
    Returns:
        stats: dict with buffer_px, utilized_pct, available_pct
        heatmap_filename: str or None (None if fewer than 2 trees)
    """
    if len(boxes_xyxy) == 0:
        return None, None

    centers = [((x1 + x2) / 2, (y1 + y2) / 2) for x1, y1, x2, y2 in boxes_xyxy]
    widths = boxes_xyxy[:, 2] - boxes_xyxy[:, 0]
    heights = boxes_xyxy[:, 3] - boxes_xyxy[:, 1]
    buffer_px = float(((widths.mean() + heights.mean()) / 2) / 2)

    boundary_geom = box(0, 0, img_w, img_h)
    tree_points = [Point(x, y) for x, y in centers]
    utilized_area = unary_union([p.buffer(buffer_px) for p in tree_points]).intersection(boundary_geom)
    available_area = boundary_geom.difference(utilized_area)

    total_px2 = boundary_geom.area
    utilized_pct = 100 * utilized_area.area / total_px2
    available_pct = 100 * available_area.area / total_px2

    stats = {
        "buffer_px": round(buffer_px, 1),
        "utilized_pct": round(utilized_pct, 2),
        "available_pct": round(available_pct, 2),
        "tree_count": len(centers),
    }

    heatmap_filename = None
    if len(centers) >= 2:
        fig, ax = plt.subplots(figsize=(10, 8))
        ax.imshow(img, extent=[0, img_w, img_h, 0])

        coords = np.array(centers)
        bandwidth = max(img_w, img_h) * 0.02
        kde = KernelDensity(bandwidth=bandwidth, kernel="gaussian")
        kde.fit(coords)
        grid_x, grid_y = np.meshgrid(np.linspace(0, img_w, 150), np.linspace(0, img_h, 150))
        grid_coords = np.vstack([grid_x.ravel(), grid_y.ravel()]).T
        density = np.exp(kde.score_samples(grid_coords)).reshape(grid_x.shape)
        ax.contourf(grid_x, grid_y, density, levels=15, cmap="YlOrRd", alpha=0.55)

        xs, ys = zip(*centers)
        ax.scatter(xs, ys, s=10, color="blue", label="Detected trees")
        bx, by = boundary_geom.exterior.xy
        ax.plot(bx, by, color="black", linewidth=1.5, label="Image boundary")
        ax.set_title(f"Land Utilization Heatmap - {utilized_pct:.1f}% utilized")
        ax.legend(loc="upper right")
        ax.axis("off")
        plt.tight_layout()

        heatmap_filename = save_figure(fig, config.RESULTS_DIR, "heatmap")

    return stats, heatmap_filename
