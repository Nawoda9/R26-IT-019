export default function Header({ chatbotEnabled }) {
  return (
    <header className="border-b border-line">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-[0.2em] text-rust">
            TREATMENT ADVISOR — FIELD CONSULT
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                chatbotEnabled ? "bg-palm animate-blink" : "bg-severity-critical"
              }`}
              aria-hidden="true"
            />
            {chatbotEnabled === null
              ? "CHECKING…"
              : chatbotEnabled
              ? "ADVISOR ONLINE"
              : "ADVISOR OFFLINE"}
          </span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-ink mt-2 leading-tight">
          Ask about a diagnosis.
        </h1>
        <p className="text-ink-muted max-w-xl mt-1">
          Chat with the retrieval-augmented advisor about caterpillar infestation,
          gray leaf spot, or leaf rot — in English or Sinhala. Conversations are
          saved so you can pick a past one back up.
        </p>
      </div>
    </header>
  );
}