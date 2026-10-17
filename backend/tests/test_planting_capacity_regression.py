import numpy as np

from services.planting_capacity import estimate_planting_capacity


def test_estimate_planting_capacity_handles_non_multiple_image_size():
    img_h = 200
    img_w = 201
    tree_mask_full = np.zeros((img_h, img_w), dtype=bool)
    boxes_xyxy = np.empty((0, 4), dtype=float)

    new_trees_df, spacing_used = estimate_planting_capacity(
        tree_mask_full,
        img_h=img_h,
        img_w=img_w,
        boxes_xyxy=boxes_xyxy,
        required_spacing_px=10,
        grid_downsample=2,
        max_new_trees_to_find=5,
    )

    assert spacing_used == 10
    assert len(new_trees_df) > 0
    assert "x" in new_trees_df.columns and "y" in new_trees_df.columns
