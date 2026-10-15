"""
core/ood.py
============
Out-of-distribution (OOD) detection, reproducing the notebook's Section 6
"Deep Mahalanobis OOD" (Lee et al., 2018): for a feature vector x, the OOD
score is min over classes of (x - class_mean)^T * shared_cov_inv * (x - class_mean).
An image is flagged OOD if that score exceeds a threshold fit on the
validation set (98th percentile of in-distribution scores).

IMPORTANT -- this requires `ood_mahalanobis_stats.npz`, which holds the
fitted class means and shared inverse-covariance matrix. That .npz file is
NOT among the files that were uploaded (only the human-readable
ood_config.json was). Without it there are no numbers to score against, so
OOD detection is automatically disabled and every prediction is treated as
in-distribution.

To enable it: re-run the notebook's Section 11 export cell (7b) and copy the
resulting `wclwd_deployment/ood_mahalanobis_stats.npz` into this project's
`models/` folder. No code changes are needed -- it's picked up automatically
on the next app restart.
"""
import logging
import os

import numpy as np

logger = logging.getLogger(__name__)


class MahalanobisOOD:
    def __init__(self, stats_npz_path, fallback_threshold=None):
        self.enabled = False
        self.class_means = None
        self.shared_cov_inv = None
        self.threshold = fallback_threshold

        if not os.path.exists(stats_npz_path):
            logger.warning(
                "OOD stats file not found at %s -- OOD detection is DISABLED. "
                "See core/ood.py docstring for how to enable it.",
                stats_npz_path,
            )
            return

        data = np.load(stats_npz_path)
        self.class_means = {
            int(idx): data["class_means"][n] for n, idx in enumerate(data["class_mean_indices"])
        }
        self.shared_cov_inv = data["shared_cov_inv"]
        self.threshold = float(data["ood_threshold"])
        self.enabled = True
        logger.info(
            "Loaded OOD stats: %d classes, feature_dim=%d, threshold=%.2f",
            len(self.class_means), self.shared_cov_inv.shape[0], self.threshold,
        )

    def score(self, features):
        """
        features: (1, feature_dim) numpy array.
        Returns: (min_dist: float | None, nearest_class_idx: int | None, is_ood: bool)
        """
        if not self.enabled:
            return None, None, False

        n_classes = len(self.class_means)
        dists = np.zeros((features.shape[0], n_classes), dtype=np.float32)
        for c_idx, mean_vec in self.class_means.items():
            diff = features - mean_vec
            dists[:, c_idx] = np.einsum("ij,jk,ik->i", diff, self.shared_cov_inv, diff)

        nearest_class = int(dists.argmin(axis=1)[0])
        min_dist = float(dists.min(axis=1)[0])
        is_ood = bool(min_dist > self.threshold)
        return min_dist, nearest_class, is_ood
