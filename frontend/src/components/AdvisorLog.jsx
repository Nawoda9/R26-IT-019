import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Languages,
  RefreshCw,
  Send,
  Plus,
  Sparkles,
} from "lucide-react";

import {
  fetchChatSessions,
  fetchSessionHistory,
  sendChatMessage,
  toggleTranslation,
} from "../lib/api";

import ChatMessage from "./ChatMessage.jsx";
import ChatSidebar from "./ChatSidebar.jsx";

const now = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const WELCOME = {
  role: "system",
  text: "Ask about caterpillar infestation, gray leaf spot, or leaf rot — in English or Sinhala.",
};

function mapHistory(messages = []) {
  return messages.map((message) => ({
    id: message.id,
    role: message.role === "assistant" ? "bot" : message.role,
    text: message.text,
    timestamp: message.created_at
      ? new Date(message.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
  }));
}

export default function AdvisorLog({
  chatbotEnabled,
  pendingQuestion,
  activeSessionId,
  onSessionChange,
  onNewSession,
  refreshNonce,
}) {
  const [sessions, setSessions] = useState([]);
  const [entries, setEntries] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sidebarLoading, setSidebarLoading] = useState(false);

  const logRef = useRef(null);
  const lastHandledNonce = useRef(null);

  // ============================================================
  // LOAD SESSIONS
  // ============================================================

  const loadSessions = useCallback(
    async (selectLatest = false) => {
      if (!chatbotEnabled) return [];

      setSidebarLoading(true);

      try {
        const data = await fetchChatSessions();
        const nextSessions = data.sessions || [];

        setSessions(nextSessions);

        if (
          selectLatest &&
          !activeSessionId &&
          nextSessions.length > 0
        ) {
          onSessionChange(nextSessions[0].id);
        }

        return nextSessions;
      } catch (err) {
        console.error("Failed to load chat sessions:", err);
        return [];
      } finally {
        setSidebarLoading(false);
      }
    },
    [chatbotEnabled, activeSessionId, onSessionChange]
  );

  // ============================================================
  // LOAD HISTORY
  // ============================================================

  const loadHistory = useCallback(
    async (sessionId) => {
      if (!chatbotEnabled || !sessionId) return;

      setHistoryLoading(true);

      try {
        const data = await fetchSessionHistory(sessionId);
        const history = mapHistory(data.messages || []);

        setEntries(
          history.length ? [WELCOME, ...history] : [WELCOME]
        );
      } catch (err) {
        console.error("Failed to load chat history:", err);

        setEntries([
          WELCOME,
          {
            role: "system",
            text: `Unable to load this conversation: ${err.message}`,
          },
        ]);
      } finally {
        setHistoryLoading(false);
      }
    },
    [chatbotEnabled]
  );

  // ============================================================
  // INITIAL SESSION LOAD
  // ============================================================

  useEffect(() => {
    if (!chatbotEnabled) return;

    loadSessions(true);
  }, [chatbotEnabled, refreshNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // SESSION CHANGE
  // ============================================================

  useEffect(() => {
    if (!chatbotEnabled) {
      setEntries([WELCOME]);
      return;
    }

    if (activeSessionId) {
      loadHistory(activeSessionId);
    } else {
      setEntries([WELCOME]);
    }
  }, [activeSessionId, chatbotEnabled, loadHistory]);

  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [entries]);

  // ============================================================
  // APPEND MESSAGE
  // ============================================================

  const append = useCallback((entry) => {
    setEntries((prev) => [...prev, entry]);
  }, []);

  // ============================================================
  // ENSURE ACTIVE SESSION
  // ============================================================

  const ensureActiveSession = useCallback(async () => {
    if (activeSessionId) return activeSessionId;

    return onNewSession("New conversation", "chat");
  }, [activeSessionId, onNewSession]);

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const sendMessage = useCallback(
    async (message, targetSessionId = null) => {
      const sessionId =
        targetSessionId || (await ensureActiveSession());

      // Explicit target prevents stale React state when a new
      // image scan starts a new conversation.
      if (Number(sessionId) !== Number(activeSessionId)) {
        onSessionChange(Number(sessionId));
      }

      append({
        role: "user",
        text: message,
        timestamp: now(),
      });

      setSending(true);

      try {
        const data = await sendChatMessage(sessionId, message);

        append({
          role: "bot",
          text: data.answer,
          timestamp: now(),
        });

        await loadSessions(false);
      } catch (err) {
        append({
          role: "system",
          text: `Error: ${err.message}`,
        });
      } finally {
        setSending(false);
      }
    },
    [
      ensureActiveSession,
      append,
      loadSessions,
      activeSessionId,
      onSessionChange,
    ]
  );

  // ============================================================
  // HANDLE PENDING QUESTION
  // ============================================================

  useEffect(() => {
    if (!pendingQuestion || !chatbotEnabled) return;

    if (lastHandledNonce.current === pendingQuestion.nonce) {
      return;
    }

    lastHandledNonce.current = pendingQuestion.nonce;

    sendMessage(
      pendingQuestion.text,
      pendingQuestion.sessionId || null
    );
  }, [pendingQuestion, chatbotEnabled, sendMessage]);

  // ============================================================
  // HANDLE SEND
  // ============================================================

  const handleSend = async (e) => {
    e.preventDefault();

    const message = input.trim();

    if (!message || sending) return;

    setInput("");

    await sendMessage(message);
  };

  // ============================================================
  // TRANSLATION
  // ============================================================

  const handleTranslate = async () => {
    if (!activeSessionId || sending) return;

    try {
      const data = await toggleTranslation(activeSessionId);

      append({
        role: "bot",
        text: data.answer,
        timestamp: now(),
      });

      await loadHistory(activeSessionId);
      await loadSessions(false);
    } catch (err) {
      append({
        role: "system",
        text: `Error: ${err.message}`,
      });
    }
  };

  // ============================================================
  // NEW CHAT
  // ============================================================

  const handleNewChat = async () => {
    try {
      const newId = await onNewSession(
        "New conversation",
        "chat"
      );

      setEntries([WELCOME]);

      await loadSessions(false);

      onSessionChange(newId);
    } catch (err) {
      append({
        role: "system",
        text: `Error: ${err.message}`,
      });
    }
  };

  // ============================================================
  // SELECT SESSION
  // ============================================================

  const handleSelectSession = async (sessionId) => {
    if (Number(sessionId) === Number(activeSessionId)) return;

    onSessionChange(Number(sessionId));
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <section
      className="
        relative
        bg-transparent
        text-slate-900
        rounded-2xl
        border border-slate-200
        shadow-[0_10px_40px_rgba(15,23,42,0.06)]
        p-5 sm:p-6 lg:p-7
        flex flex-col
        lg:col-span-2
        overflow-hidden
      "
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center gap-2 mb-2">
        <div
          className="
            flex items-center justify-center
            h-8 w-8
            rounded-lg
            bg-emerald-50
            border border-emerald-100
          "
        >
          <BookOpen
            size={16}
            className="text-emerald-700"
            strokeWidth={2}
          />
        </div>

        <p
          className="
            text-[10px]
            font-semibold
            tracking-[0.2em]
            text-emerald-700
            uppercase
          "
        >
          Entry 02 · Treatment Advisor
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2
            className="
              text-2xl
              sm:text-[26px]
              font-semibold
              tracking-tight
              text-slate-900
            "
          >
            Consult the advisor
          </h2>

          <p className="text-sm text-slate-500 mt-1.5">
            Conversations are saved to your account. A new image
            scan starts a new conversation.
          </p>
        </div>

        {activeSessionId && (
          <span
            className="
              hidden sm:inline-flex
              items-center
              rounded-full
              border border-slate-200
              bg-white/70
              px-3 py-1
              text-[10px]
              font-medium
              text-slate-500
              uppercase
              tracking-wide
            "
          >
            Session #{activeSessionId}
          </span>
        )}
      </div>

      {/* ======================================================
          DISABLED NOTICE
      ====================================================== */}

      {!chatbotEnabled && (
        <div
          className="
            mb-5
            rounded-xl
            border border-amber-200
            bg-amber-50/80
            px-4 py-3
            text-sm
            text-amber-800
          "
        >
          <div className="font-semibold mb-1">
            Advisor unavailable
          </div>

          <p className="text-xs text-amber-700">
            The advisor isn't configured on this server yet. Set
            the OpenRouter and Pinecone API keys in the backend,
            then restart it.
          </p>
        </div>
      )}

      {/* ======================================================
          CHAT LAYOUT
      ====================================================== */}

      <div className="flex flex-col lg:flex-row gap-5 min-h-[620px]">
        {/* SIDEBAR */}

        <div
          className="
            lg:w-[270px]
            shrink-0
            rounded-2xl
            border border-slate-200
            bg-white/60
            backdrop-blur-sm
            overflow-hidden
          "
        >
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            loading={sidebarLoading}
            onSelect={handleSelectSession}
            onNewChat={handleNewChat}
            onRefresh={() => loadSessions(false)}
          />
        </div>

        {/* ==================================================
            MAIN CHAT
        ================================================== */}

        <div
          className="
            flex-1
            min-w-0
            flex
            flex-col
            rounded-2xl
            border border-slate-200
            bg-transparent
            overflow-hidden
          "
        >
          {/* CHAT HEADER */}

          <div
            className="
              flex
              items-center
              justify-between
              px-5
              py-4
              border-b
              border-slate-200
              bg-transparent
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  relative
                  flex items-center justify-center
                  w-9 h-9
                  rounded-xl
                  bg-emerald-50
                  border border-emerald-100
                "
              >
                <Sparkles
                  size={17}
                  className="text-emerald-700"
                />

                <span
                  className="
                    absolute
                    -right-0.5
                    -top-0.5
                    w-2.5
                    h-2.5
                    rounded-full
                    bg-emerald-500
                    border-2
                    border-white
                  "
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Coconut Disease Advisor
                </p>

                <p className="text-[11px] text-slate-400">
                  AI-assisted treatment guidance
                </p>
              </div>
            </div>

            {sending && (
              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-[11px]
                  text-slate-400
                "
              >
                <span
                  className="
                    w-1.5 h-1.5
                    rounded-full
                    bg-emerald-500
                    animate-pulse
                  "
                />

                Thinking…
              </div>
            )}
          </div>

          {/* ==================================================
              MESSAGE LOG
          ================================================== */}

          <div
            ref={logRef}
            className="
              flex-1
              min-h-[320px]
              max-h-[520px]
              overflow-y-auto
              space-y-4
              px-5
              py-5
              bg-transparent
              scrollbar-thin
              scrollbar-thumb-slate-200
              scrollbar-track-transparent
            "
          >
            {historyLoading ? (
              <div
                className="
                  h-full
                  min-h-[260px]
                  flex
                  items-center
                  justify-center
                "
              >
                <div
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-slate-200
                    bg-white/80
                    backdrop-blur-sm
                    px-4
                    py-3
                    text-xs
                    text-slate-500
                    shadow-sm
                  "
                >
                  <RefreshCw
                    size={14}
                    className="animate-spin text-emerald-600"
                  />

                  Loading conversation…
                </div>
              </div>
            ) : (
              entries.map((entry, i) => (
                <ChatMessage
                  key={entry.id || `${entry.role}-${i}`}
                  index={i}
                  role={entry.role}
                  text={entry.text}
                  timestamp={entry.timestamp}
                />
              ))
            )}
          </div>

          {/* ==================================================
              INPUT AREA
          ================================================== */}

          <div
            className="
              border-t
              border-slate-200
              bg-transparent
              p-4
            "
          >
            <form
              onSubmit={handleSend}
              className="flex gap-2.5"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about treatment, prevention, or disease management…"
                disabled={
                  !chatbotEnabled ||
                  historyLoading ||
                  sending
                }
                className="
                  flex-1
                  h-12
                  rounded-xl
                  border border-slate-200
                  bg-white
                  px-4
                  text-sm
                  text-slate-900
                  placeholder:text-slate-400
                  shadow-sm
                  transition-all
                  duration-200
                  focus:border-emerald-500
                  focus:ring-4
                  focus:ring-emerald-500/10
                  focus:outline-none
                  disabled:opacity-50
                "
              />

              <button
                type="submit"
                disabled={
                  !chatbotEnabled ||
                  historyLoading ||
                  sending ||
                  !input.trim()
                }
                className="
                  h-12
                  w-12
                  shrink-0
                  rounded-xl
                  bg-emerald-700
                  text-white
                  shadow-sm
                  flex
                  items-center
                  justify-center
                  transition-all
                  duration-200
                  hover:bg-emerald-800
                  hover:shadow-md
                  active:scale-95
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                "
                aria-label="Send message"
              >
                <Send size={17} />
              </button>
            </form>

            {/* ACTIONS */}

            <div className="flex items-center gap-5 mt-3 px-1">
              <button
                type="button"
                onClick={handleTranslate}
                disabled={
                  !chatbotEnabled ||
                  !activeSessionId ||
                  sending ||
                  historyLoading
                }
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  text-[11px]
                  font-medium
                  text-slate-500
                  hover:text-emerald-700
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                  transition-colors
                "
              >
                <Languages size={13} />

                English / Sinhala
              </button>

              <button
                type="button"
                onClick={handleNewChat}
                disabled={!chatbotEnabled || sending}
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  text-[11px]
                  font-medium
                  text-slate-500
                  hover:text-emerald-700
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                  transition-colors
                "
              >
                <Plus size={14} />

                New conversation
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}