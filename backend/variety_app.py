"""
variety_app.py — entrypoint for the Coconut Variety Classifier
(Prototypical Network: EfficientNet-B0 embeddings + cosine similarity
against class prototypes for Dwarf / King Coconut / Tall).

Dev usage:
    python variety_app.py          (reads PORT env var, default 5002)

Production usage:
    gunicorn -w 1 -b 0.0.0.0:5002 "variety_app:app"

NOTE ON WORKERS: keep worker count to 1 (or use --preload) since each worker
loads its own copy of the EfficientNet-B0 model into memory.
"""

import os

from variety import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
