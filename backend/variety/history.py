"""
Persisted prediction history for the Coconut Variety Classifier.

Every successful /api/predict call is stored as a row here, scoped to the
user who made it (`user_id`, matching the `users.id` primary key from the
main app's auth database). The original photo and the Grad-CAM overlay are
stored directly as binary columns in this table — nothing is written to
disk — so history/images travel with the DB (backups, migrations, etc.)
with no separate file-storage step to keep in sync.

Instead of saving images to disk and dealing with file orphan issues,
both the original uploaded photo (image_data) and the Grad-CAM overlay (gradcam_data) 
are stored directly inside the SQLite row as binary blobs 
"""

import json
from datetime import datetime, timezone

from variety.extensions import db


def _utcnow():
    return datetime.now(timezone.utc)


class PredictionHistory(db.Model):
    __tablename__ = "variety_prediction_history"

    id = db.Column(db.Integer, primary_key=True)

    # Matches the logged-in user's id from the main app's `users` table.
    # Not a cross-database FK constraint (this module keeps its own DB),
    # but every query is scoped by it so one user never sees another's data.
    user_id = db.Column(db.Integer, nullable=False, index=True)

    prediction = db.Column(db.String(64), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    probabilities_json = db.Column(db.Text, nullable=False)

    # Original photo, stored directly in the DB.
    image_data = db.Column(db.LargeBinary, nullable=False)
    image_mimetype = db.Column(db.String(64), nullable=False)

    # Grad-CAM overlay, stored directly in the DB (always encoded as JPEG).
    gradcam_data = db.Column(db.LargeBinary, nullable=True)
    gradcam_mimetype = db.Column(db.String(64), nullable=True)

    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    location_label = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=_utcnow, nullable=False, index=True)

    @property
    def probabilities(self) -> dict:
        return json.loads(self.probabilities_json)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "prediction": self.prediction,
            "confidence": self.confidence,
            "probabilities": self.probabilities,
            "image_url": f"/api/history/{self.id}/image?user_id={self.user_id}",
            "gradcam_url": (
                f"/api/history/{self.id}/gradcam?user_id={self.user_id}"
                if self.gradcam_data
                else None
            ),
            "location": {
                "latitude": self.latitude,
                "longitude": self.longitude,
                "label": self.location_label,
            },
            "created_at": self.created_at.replace(tzinfo=timezone.utc).isoformat(),
        }
