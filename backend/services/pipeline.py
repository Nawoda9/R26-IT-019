"""
services/pipeline.py
----------------------
Orchestrates the full end-to-end analysis that used to be five
separate, copy-pasted notebook cells (STEP 4, STEP 5, STEP 5 v4,
STEP 5 v5) into one function the Flask routes can call.

analyze_image() runs:
  1. detection.py            - YOLO inference + boxes drawn on image
  2. land_utilization.py     - circle-buffer utilized/available % + KDE heatmap
  3. vegetation_analysis.py  - pixel-accurate empty-space mask + candidate pockets
  4. planting_capacity.py    - greedy "how many NEW trees actually fit" count
"""

from utils.image_utils import load_image
from services import detection, land_utilization, vegetation_analysis, planting_capacity


def analyze_image(image_path, confidence_threshold=None, top_n_pockets=None,
                   required_spacing_px=None, include_sanity_check=False):
    """
    Run the complete pipeline on a single uploaded image.

    Returns a dict shaped for direct use in the JSON API / Jinja template:
        {
          "detected_trees": int,
          "class_breakdown": {name: count, ...},
          "images": {
              "detections": "<filename>",
              "heatmap": "<filename> or None",
              "empty_space": "<filename>",
              "planting_capacity": "<filename>",
              "mask_sanity": "<filename> or None",
          },
          "land_utilization": {...} or None,
          "vegetation": {...},
          "planting_capacity": {...},
        }
    """
    img, img_h, img_w = load_image(image_path)

    # 1) Detection
    detection_result = detection.run_detection(image_path, confidence_threshold=confidence_threshold)
    boxes_xyxy = detection_result["boxes_xyxy"]
    detections_filename = detection.render_detections(img, img_w, img_h, detection_result, confidence_threshold or 0.35)

    class_counts = {}
    for cid in detection_result["class_ids"]:
        name = detection_result["class_names"].get(int(cid), str(cid))
        class_counts[name] = class_counts.get(name, 0) + 1

    result = {
        "detected_trees": int(len(boxes_xyxy)),
        "class_breakdown": class_counts,
        "images": {
            "detections": detections_filename,
            "heatmap": None,
            "empty_space": None,
            "planting_capacity": None,
            "mask_sanity": None,
        },
        "land_utilization": None,
        "vegetation": None,
        "planting_capacity": None,
    }

    if len(boxes_xyxy) == 0:
        result["warning"] = "No trees detected - try lowering the confidence threshold."
        return result

    # 2) Land utilization (circle-buffer approximation + KDE heatmap)
    lu_stats, heatmap_filename = land_utilization.analyze_land_utilization(img, img_w, img_h, boxes_xyxy)
    result["land_utilization"] = lu_stats
    result["images"]["heatmap"] = heatmap_filename

    # 3) Pixel-accurate vegetation mask + candidate planting pockets
    veg_stats, empty_space_filename, top_pockets, tree_mask_full, sanity_filename = (
        vegetation_analysis.analyze_vegetation(
            img, img_w, img_h, boxes_xyxy,
            top_n_pockets=top_n_pockets, include_sanity_check=include_sanity_check
        )
    )
    result["vegetation"] = veg_stats
    result["vegetation"]["top_pockets"] = top_pockets[["x", "y", "clearance_px"]].round(1).to_dict(orient="records")
    result["images"]["empty_space"] = empty_space_filename
    result["images"]["mask_sanity"] = sanity_filename

    # 4) Real planting capacity (greedy, spacing-aware)
    cap_stats, capacity_filename, new_trees_df = planting_capacity.analyze_planting_capacity(
        img, img_w, img_h, tree_mask_full, boxes_xyxy,
        available_pct=veg_stats["available_pct"], required_spacing_px=required_spacing_px
    )
    result["planting_capacity"] = cap_stats
    result["images"]["planting_capacity"] = capacity_filename

    return result
