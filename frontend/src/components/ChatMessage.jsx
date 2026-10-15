import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ROLE_META = {
  user: {
    label: "You",
    color: "text-canopy",
    align: "items-end",
    bubble: "bg-canopy text-parchment",
  },
  bot: {
    label: "Advisor",
    color: "text-husk",
    align: "items-start",
    bubble: "bg-parchment-dim text-ink",
  },
  system: {
    label: "Log",
    color: "text-ink/40",
    align: "items-center",
    bubble: "bg-transparent text-ink/50 italic",
  },
};

export default function ChatMessage({ index, role, text, timestamp }) {
  const meta = ROLE_META[role] || ROLE_META.system;

  if (role === "system") {
    return (
      <p className="font-mono text-[11px] text-center text-ink/40 py-1">
        {text}
      </p>
    );
  }

  return (
    <div className={`flex flex-col ${meta.align} gap-1`}>
      <div className="flex items-baseline gap-2 font-mono text-[10px] tracking-wide">
        <span className="text-ink/30">#{String(index).padStart(3, "0")}</span>
        <span className={`uppercase ${meta.color}`}>{meta.label}</span>
        {timestamp && <span className="text-ink/30">{timestamp}</span>}
      </div>

      <div
        className={`max-w-[90%] rounded-md px-3.5 py-2.5 text-sm leading-relaxed ${meta.bubble}`}
      >
        {role === "bot" ? (
          <div className="chat-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {text || ""}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{text}</div>
        )}
      </div>
    </div>
  );
}
