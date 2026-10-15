import { getVariety } from "../data/varieties.js";

export default function ProbabilityRow({ name, probability, isTop }) {
  const variety = getVariety(name);
  const pct = probability * 100;

  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-baseline justify-between">
        <span
          className={`text-sm ${isTop ? "font-semibold text-ink" : "text-ink-muted"}`}
        >
          {name}
        </span>
        <span className="font-mono text-xs tabular-nums text-ink-muted">
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: variety.color }}
        />
      </div>
    </div>
  );
}
