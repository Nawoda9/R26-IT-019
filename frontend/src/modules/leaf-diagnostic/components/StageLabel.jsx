export default function StageLabel({ index, title, note }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-rust tracking-[0.18em]">
          STAGE {String(index).padStart(2, "0")}
        </span>
        {note && (
          <span className="font-mono text-[11px] text-ink-muted">{note}</span>
        )}
      </div>
      <h3 className="font-display text-xl text-ink mt-1">{title}</h3>
      <div className="h-px bg-line mt-3" />
    </div>
  );
}
