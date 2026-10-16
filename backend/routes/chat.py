from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from config import config
from services import rag_chatbot

chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")


def _unavailable_response():
    return (
        jsonify(
            {
                "error": (
                    "The treatment advisor chatbot is not configured on this "
                    "server. Set OPENROUTER_API_KEY, PINECONE_API_KEY and "
                    "PINECONE_HOST (see .env.example) and restart the app."
                )
            }
        ),
        503,
    )


@chat_bp.route("/sessions", methods=["GET"])
@login_required
def sessions():
    """Return the signed-in user's chat sessions, newest first."""
    if not config.CHATBOT_ENABLED:
        return _unavailable_response()

    return jsonify({"sessions": rag_chatbot.list_sessions(current_user.id)}), 200


@chat_bp.route("/session", methods=["POST"])
@login_required
def create_session():
    """Create a completely independent chat session.

    ``source`` is currently metadata for the API/UI contract. The important
    behavior is that every call creates a new ChatSession row, so a new image
    scan never reuses the previous conversation's memory.
    """
    if not config.CHATBOT_ENABLED:
        return _unavailable_response()

    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip() or None
    source = (data.get("source") or "chat").strip() or "chat"

    # Keep the source available for logging/debugging without changing the
    # existing database schema. The session itself is the isolation boundary.
    logger = getattr(rag_chatbot, "logger", None)
    if logger:
        logger.debug(
            "Creating chat session for user=%s source=%s title=%r",
            current_user.id,
            source,
            title,
        )

    session_id = rag_chatbot.new_session(current_user.id, title=title)
    return jsonify({"session_id": session_id, "source": source}), 201


@chat_bp.route("/session/<int:session_id>/history", methods=["GET"])
@login_required
def session_history(session_id):
    if not config.CHATBOT_ENABLED:
        return _unavailable_response()

    try:
        history = rag_chatbot.get_history(session_id, current_user.id)
    except rag_chatbot.SessionAccessError as e:
        return jsonify({"error": str(e)}), 404

    return jsonify({"session_id": session_id, "messages": history}), 200


@chat_bp.route("/message", methods=["POST"])
@login_required
def send_message():
    if not config.CHATBOT_ENABLED:
        return _unavailable_response()

    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    message = (data.get("message") or "").strip()

    if not session_id:
        return jsonify(
            {"error": "'session_id' is required. Call POST /api/chat/session first."}
        ), 400

    if not message:
        return jsonify({"error": "'message' must not be empty."}), 400

    try:
        result = rag_chatbot.ask(int(session_id), current_user.id, message)
    except rag_chatbot.SessionAccessError as e:
        return jsonify({"error": str(e)}), 404
    except rag_chatbot.ChatbotNotConfiguredError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": f"Chat request failed: {e}"}), 500

    return jsonify(result), 200


@chat_bp.route("/translate", methods=["POST"])
@login_required
def translate():
    if not config.CHATBOT_ENABLED:
        return _unavailable_response()

    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")

    if not session_id:
        return jsonify({"error": "'session_id' is required."}), 400

    try:
        result = rag_chatbot.toggle_translation(int(session_id), current_user.id)
    except rag_chatbot.SessionAccessError as e:
        return jsonify({"error": str(e)}), 404
    except rag_chatbot.ChatbotNotConfiguredError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": f"Translation failed: {e}"}), 500

    return jsonify(result), 200
