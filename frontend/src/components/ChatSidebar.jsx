import { Clock3, MessageCircle, Plus, RefreshCw } from "lucide-react";

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);

  if (date >= startToday) {
    return `Today · ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  if (date >= startYesterday) {
    return `Yesterday · ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  loading,
  onSelect,
  onNewChat,
  onRefresh,
}) {
  return (
    <aside className="w-full lg:w-72 shrink-0 bg-parchment-dim/70 border border-ink/10 rounded-lg overflow-hidden flex flex-col lg:min-h-[620px]">
      <div className="p-4 border-b border-ink/10">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-husk">
              Conversation archive
            </p>
            <p className="text-sm font-medium text-ink mt-1">Previous chats</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-md text-ink/40 hover:text-canopy hover:bg-canopy/5 disabled:opacity-40"
            title="Refresh chat history"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-canopy text-parchment px-3 py-2 text-sm font-medium hover:bg-canopy-light transition-colors"
        >
          <Plus size={15} />
          New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && sessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-ink/40 font-mono">
            Loading history…
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-ink/40 leading-relaxed">
            No previous conversations yet.
            <br />
            Start a chat or scan a new leaf.
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => {
              const active = Number(activeSessionId) === Number(session.id);
              const title = session.title?.trim() || "New conversation";

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => onSelect(session.id)}
                  className={`w-full text-left rounded-md px-3 py-3 transition-colors border ${
                    active
                      ? "bg-canopy text-parchment border-canopy"
                      : "bg-transparent text-ink border-transparent hover:bg-white/60 hover:border-ink/10"
                  }`}
                >
                  <div className="flex gap-2.5">
                    <MessageCircle
                      size={15}
                      className={`mt-0.5 shrink-0 ${active ? "text-husk-light" : "text-husk"}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{title}</p>
                      <p
                        className={`mt-1 inline-flex items-center gap-1 text-[10px] font-mono ${
                          active ? "text-parchment/55" : "text-ink/40"
                        }`}
                      >
                        <Clock3 size={10} />
                        {formatDate(session.updated_at || session.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
