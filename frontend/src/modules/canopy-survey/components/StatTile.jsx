const ACCENTS = {
  canopy: "text-palm",
  soil: "text-rust",
  flare: "text-severity-moderate",
  ink: "text-ink",
};

export default function StatTile({ value, label, accent = "ink", unit = "" }) {
  return (
    <div className="rounded-sm border border-line bg-surface-raised px-4 py-3">
      <div className={`font-mono text-2xl font-semibold tabular-nums ${ACCENTS[accent] || ACCENTS.ink}`}>
        {value}
        {unit && <span className="ml-0.5 text-base">{unit}</span>}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">{label}</div>
    </div>
  );
}
