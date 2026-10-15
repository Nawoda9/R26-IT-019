"""
One-off / re-runnable CLI to embed the coconut-disease PDF knowledge base
and upsert it into Pinecone. Mirrors "CELL 3: Ingest PDFs" from the
coconut-treatment-advisor-chatbot notebook.

Usage:
    python -m scripts.ingest_knowledge_base
    python -m scripts.ingest_knowledge_base --kb-path /path/to/pdfs
    python -m scripts.ingest_knowledge_base --force        # wipe + rebuild index
"""
import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.rag_chatbot import ingest_knowledge_base  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def main():
    parser = argparse.ArgumentParser(description="Ingest the coconut-disease PDF knowledge base into Pinecone.")
    parser.add_argument("--kb-path", default=None, help="Folder containing the PDFs (defaults to KB_PATH env var).")
    parser.add_argument("--force", action="store_true", help="Delete existing vectors and rebuild the index.")
    args = parser.parse_args()

    summary = ingest_knowledge_base(kb_path=args.kb_path, force_reindex=args.force)
    print(summary)


if __name__ == "__main__":
    main()
