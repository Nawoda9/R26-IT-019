"""
Coconut Treatment Advisor - Retrieval Augmented Generation (RAG) chatbot.

Ports the logic from the ``coconut-treatment-advisor-chatbot`` Kaggle
notebook into reusable, importable functions/classes:

  - PDF ingestion + chunking + embedding + Pinecone upsert
  - Vector retrieval
  - Session/chat-memory management
  - Sinhala detection + translation
  - The main ``ask()`` RAG function

The heavy clients (OpenAI-compatible LLM client, Pinecone index,
SentenceTransformer embedder) are created lazily on first use so the app can
still start (and serve the disease classifier) even if chatbot credentials
are not configured yet.
"""
from __future__ import annotations

import glob
import logging
import os
import re
import threading
import uuid

from config import config

logger = logging.getLogger(__name__)

SINHALA_RANGE = re.compile(r"[\u0D80-\u0DFF]")


class ChatbotNotConfiguredError(RuntimeError):
    """Raised when the chatbot is used but API keys / index host are missing."""


# ---------------------------------------------------------------------------
# Lazy client singletons
# ---------------------------------------------------------------------------
_lock = threading.Lock()
_llm_client = None
_pc_index = None
_embedder = None


def _require_config():
    missing = []
    if not config.OPENROUTER_API_KEY:
        missing.append("OPENROUTER_API_KEY")
    if not config.PINECONE_API_KEY:
        missing.append("PINECONE_API_KEY")
    if not config.PINECONE_HOST:
        missing.append("PINECONE_HOST")
    if missing:
        raise ChatbotNotConfiguredError(
            "Chatbot is not configured. Missing environment variable(s): " + ", ".join(missing)
        )


def get_llm_client():
    global _llm_client
    if _llm_client is None:
        with _lock:
            if _llm_client is None:
                _require_config()
                from openai import OpenAI

                _llm_client = OpenAI(base_url=config.OPENROUTER_BASE_URL, api_key=config.OPENROUTER_API_KEY)
    return _llm_client


def get_index():
    global _pc_index
    if _pc_index is None:
        with _lock:
            if _pc_index is None:
                _require_config()
                from pinecone import Pinecone

                pc = Pinecone(api_key=config.PINECONE_API_KEY)
                _pc_index = pc.Index(host=config.PINECONE_HOST)
    return _pc_index


def get_embedder():
    global _embedder
    if _embedder is None:
        with _lock:
            if _embedder is None:
                from sentence_transformers import SentenceTransformer

                _embedder = SentenceTransformer(config.EMBED_MODEL_NAME, device=config.EMBED_DEVICE)
    return _embedder


# ---------------------------------------------------------------------------
# Ingestion (PDFs -> chunks -> embeddings -> Pinecone)
# ---------------------------------------------------------------------------
def chunk_text(text: str, size: int = None, overlap: int = None) -> list[str]:
    size = size or config.CHUNK_SIZE
    overlap = overlap or config.CHUNK_OVERLAP
    text = re.sub(r"\s+", " ", text).strip()
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start += size - overlap
    return [c for c in chunks if len(c.strip()) > 40]


def load_pdfs(kb_path: str) -> list[dict]:
    from pypdf import PdfReader

    docs = []
    for fp in glob.glob(os.path.join(kb_path, "**/*.pdf"), recursive=True):
        try:
            # strict=False lets pypdf recover from minor structural issues
            # (like a bad startxref pointer) instead of raising.
            reader = PdfReader(fp, strict=False)
            full_text = ""
            for page in reader.pages:
                full_text += (page.extract_text() or "") + "\n"
            if full_text.strip():
                docs.append({"source": os.path.basename(fp), "text": full_text})
            else:
                logger.warning("No extractable text in %s - skipping.", fp)
        except Exception as e:  # noqa: BLE001
            logger.warning("Failed to read %s (%s) - skipping this file.", fp, e)
    return docs


def ingest_knowledge_base(kb_path: str = None, force_reindex: bool = False) -> dict:
    """Embed every PDF under ``kb_path`` and upsert into the Pinecone index.

    Skips ingestion if the index already has vectors, unless
    ``force_reindex`` is True. Returns a small summary dict.
    """
    kb_path = kb_path or config.KB_PATH
    index = get_index()
    embedder = get_embedder()

    stats = index.describe_index_stats()
    already_indexed = stats.get("total_vector_count", 0) > 0

    if not force_reindex and already_indexed:
        logger.info("Pinecone index already has vectors - skipping ingestion.")
        return {"status": "skipped", "reason": "already indexed", "stats": stats}

    if force_reindex and already_indexed:
        index.delete(delete_all=True)

    documents = load_pdfs(kb_path)

    chunk_records = []  # list of (source, chunk_text)
    for doc in documents:
        for chunk in chunk_text(doc["text"]):
            chunk_records.append((doc["source"], chunk))

    logger.info("Encoding %d chunks in batches of %d...", len(chunk_records), config.EMBED_BATCH_SIZE)
    all_texts = [c for _, c in chunk_records]
    embeddings = embedder.encode(
        all_texts,
        batch_size=config.EMBED_BATCH_SIZE,
        show_progress_bar=True,
        convert_to_numpy=True,
    )

    vectors = []
    for (source, chunk), emb in zip(chunk_records, embeddings):
        vectors.append(
            {
                "id": f"{source}-{uuid.uuid4().hex[:8]}",
                "values": emb.tolist(),
                "metadata": {"text": chunk, "source": source},
            }
        )

    upsert_batch = 100
    for i in range(0, len(vectors), upsert_batch):
        index.upsert(vectors=vectors[i : i + upsert_batch])

    logger.info("Indexed %d chunks from %d PDFs.", len(vectors), len(documents))
    return {"status": "indexed", "chunks": len(vectors), "documents": len(documents)}


# ---------------------------------------------------------------------------
# Sinhala detection + translation
# ---------------------------------------------------------------------------
def is_sinhala(text: str) -> bool:
    letters = re.findall(r"\w", text, re.UNICODE)
    if not letters:
        return False
    sinhala_chars = len(SINHALA_RANGE.findall(text))
    return sinhala_chars / max(len(letters), 1) > 0.25


def llm_translate(text: str, target: str) -> str:
    """``target``: 'english' or 'sinhala'. Keeps scientific/chemical/
    biological names in English and produces natural, fluent phrasing
    (not a literal word-for-word translation).
    """
    if target == "sinhala":
        instruction = (
            "Translate the following English text into natural, fluent, "
            "everyday Sinhala that a Sri Lankan reader would find easy to "
            "understand. Do NOT translate word-for-word. Keep all "
            "scientific, biological, chemical or pesticide/fungicide names "
            "(e.g. species names, chemical compounds, product names) in "
            "English exactly as given. Preserve any formatting such as "
            "bullet points, numbered lists or tables. Output only the "
            "translated text, nothing else."
        )
    else:
        instruction = (
            "Translate the following Sinhala text into clear, natural "
            "English. Preserve any formatting such as bullet points, "
            "numbered lists or tables. Output only the translated text, "
            "nothing else."
        )
    client = get_llm_client()
    resp = client.chat.completions.create(
        model=config.LLM_MODEL,
        temperature=0.2,
        messages=[
            {"role": "system", "content": instruction},
            {"role": "user", "content": text},
        ],
    )
    return resp.choices[0].message.content.strip()


# ---------------------------------------------------------------------------
# Retrieval + system prompt
# ---------------------------------------------------------------------------
def _build_system_prompt() -> str:
    diseases = "\n".join(f"{i + 1}. {d}" for i, d in enumerate(config.ALLOWED_DISEASES))
    return f"""You are "Coconut Disease Advisor", a specialist assistant.

You may ONLY answer questions about these three coconut diseases, including
their symptoms, causes, identification, prevention, treatment, chemicals,
biological control, and management:
{diseases}

Rules:
- Treat these common model/user labels as aliases of the allowed diseases:
  * "Caterpillar Infestation" / "CCI_Caterpillars" = "Coconut Caterpillar Infestation"
  * "Leaf Rot" = "Coconut Leaf Rot"
  * "Gray Leaf Spot" = "Coconut Gray Leaf Spot"
  These aliases are allowed and must NOT trigger the out-of-scope refusal.
- If the user's question is not about one of these three diseases (or a
  direct follow-up about them), politely decline and explain that you can
  only help with these three coconut diseases. Do not answer the unrelated
  question, even partially.
- Prioritize the KNOWLEDGE BASE CONTEXT given below over your own general
  knowledge. Only fall back on your own knowledge about these three
  diseases when the provided context is insufficient.
- Never invent facts that contradict the provided context.
- Always format the final answer as clean Markdown.
- Use clear Markdown headings when they improve readability.
- Use bullet points or numbered lists for treatment, prevention, and
  management procedures.
- Use **bold** for important disease names, chemicals, warnings, and key
  actions when appropriate.
- Use tables only when they genuinely improve clarity.
- Preserve Markdown formatting during English/Sinhala translation.
- Do not output raw HTML.
- Do not wrap the entire answer inside a Markdown code block.
- If the user explicitly requests a different format, follow that request
  while still keeping the response valid Markdown.
- Keep scientific, chemical, and biological names precise and correctly
  spelled.
"""


SYSTEM_PROMPT = _build_system_prompt()


def retrieve_context(query_en: str, top_k: int = None):
    """Fetch relevant knowledge-base chunks for ``query_en``.

    Retrieval failures (Pinecone unreachable, rate-limited, misconfigured
    host, etc.) are logged and treated as "no context found" rather than
    raised, so a transient vector-DB problem doesn't take down the whole
    chat turn - the LLM can still answer from its own knowledge of the
    three covered diseases, per the system prompt.
    """
    top_k = top_k or config.TOP_K
    try:
        embedder = get_embedder()
        index = get_index()
        query_vec = embedder.encode(query_en).tolist()
        results = index.query(vector=query_vec, top_k=top_k, include_metadata=True)
    except Exception as e:  # noqa: BLE001
        logger.warning("Knowledge-base retrieval failed, continuing without context: %s", e)
        return "", []

    matches = results.get("matches", [])
    context_blocks = []
    for m in matches:
        meta = m.get("metadata", {})
        context_blocks.append(f"[Source: {meta.get('source', 'KB')}]\n{meta.get('text', '')}")
    return "\n\n---\n\n".join(context_blocks), matches


# ---------------------------------------------------------------------------
# Session / chat-memory manager (persisted in the database)
# ---------------------------------------------------------------------------
class SessionAccessError(PermissionError):
    """Raised when a session_id doesn't exist or doesn't belong to the user."""


def _get_owned_session(session_id: int, user_id: int):
    """Fetch a ChatSession row, raising if it doesn't belong to ``user_id``."""
    from models import ChatSession as ChatSessionModel

    session_row = ChatSessionModel.query.get(session_id)
    if session_row is None or session_row.user_id != user_id:
        raise SessionAccessError("Chat session not found for this user.")
    return session_row


def new_session(user_id: int, title: str | None = None) -> int:
    from extensions import db as _db
    from models import ChatSession as ChatSessionModel

    session_row = ChatSessionModel(user_id=user_id, title=title)
    _db.session.add(session_row)
    _db.session.commit()
    return session_row.id


def list_sessions(user_id: int) -> list[dict]:
    from models import ChatSession as ChatSessionModel

    rows = (
        ChatSessionModel.query.filter_by(user_id=user_id)
        .order_by(ChatSessionModel.updated_at.desc())
        .all()
    )
    # Do not clutter the sidebar with sessions that have never received a
    # message. An image-scan session may briefly be empty between prediction
    # and the user's first advisor question. It remains valid and is still
    # accessible by its exact session ID.
    return [r.to_public_dict() for r in rows if r.messages]


def get_history(session_id: int, user_id: int) -> list[dict]:
    session_row = _get_owned_session(session_id, user_id)
    return [m.to_public_dict() for m in session_row.messages]


def _history_for_llm(session_row) -> list[dict]:
    """English-only history for LLM context, regardless of display language."""
    return [{"role": m.role, "content": m.content_en} for m in session_row.messages]


# ---------------------------------------------------------------------------
# Main RAG chat function
# ---------------------------------------------------------------------------
def ask(session_id: int, user_id: int, user_message: str) -> dict:
    from extensions import db as _db
    from models import ChatMessage as ChatMessageModel

    _require_config()
    session_row = _get_owned_session(session_id, user_id)
    user_is_sinhala = is_sinhala(user_message)

    # 1. Normalize query to English for retrieval + reasoning
    query_en = llm_translate(user_message, "english") if user_is_sinhala else user_message

    # 2. Retrieve relevant knowledge base chunks
    context, matches = retrieve_context(query_en)

    # 3. Build messages for the LLM (English-only memory, same as the notebook)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(_history_for_llm(session_row))
    user_content = (
        f"KNOWLEDGE BASE CONTEXT:\n{context if context else '(no relevant context found)'}"
        f"\n\nUSER QUESTION:\n{query_en}"
    )
    messages.append({"role": "user", "content": user_content})

    # 4. Call the LLM
    client = get_llm_client()
    resp = client.chat.completions.create(
        model=config.LLM_MODEL,
        temperature=0.3,
        messages=messages,
    )
    answer_en = resp.choices[0].message.content.strip()

    # 5. Persist the turn
    user_row = ChatMessageModel(
        session_id=session_row.id,
        role="user",
        content_en=query_en,
        content_si=user_message if user_is_sinhala else None,
        shown_language="si" if user_is_sinhala else "en",
    )
    _db.session.add(user_row)

    if user_is_sinhala:
        answer_out = llm_translate(answer_en, "sinhala")
        assistant_row = ChatMessageModel(
            session_id=session_row.id,
            role="assistant",
            content_en=answer_en,
            content_si=answer_out,
            shown_language="si",
        )
        toggle_hint = "Tap the translate button to see this response in English."
    else:
        answer_out = answer_en
        assistant_row = ChatMessageModel(
            session_id=session_row.id,
            role="assistant",
            content_en=answer_en,
            content_si=None,
            shown_language="en",
        )
        toggle_hint = "Tap the translate button to see this response in Sinhala."

    _db.session.add(assistant_row)

    # Give the session a human-readable title from its first message, if unset
    if not session_row.title:
        session_row.title = (query_en[:60] + "…") if len(query_en) > 60 else query_en

    _db.session.commit()

    return {
        "session_id": session_row.id,
        "answer": answer_out,
        "toggle_hint": toggle_hint,
        "matches_found": len(matches),
        "was_sinhala": user_is_sinhala,
    }


def toggle_translation(session_id: int, user_id: int) -> dict:
    from extensions import db as _db

    _require_config()
    session_row = _get_owned_session(session_id, user_id)

    if not session_row.messages:
        return {"session_id": session_id, "answer": "No response yet to translate."}

    last = session_row.messages[-1]

    if last.shown_language == "si":
        last.shown_language = "en"
    else:
        if last.content_si is None:
            last.content_si = llm_translate(last.content_en, "sinhala")
        last.shown_language = "si"

    _db.session.commit()
    return {"session_id": session_id, "answer": last.displayed_text()}

