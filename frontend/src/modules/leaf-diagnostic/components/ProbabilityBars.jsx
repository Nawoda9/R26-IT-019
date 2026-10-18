export default function ProbabilityBars({ probabilities, predictedClass }) {
  const entries = Object.entries(probabilities || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-2.5">
      {entries.map(([cls, p]) => {
        const isTop = cls === predictedClass;
        return (
          <div key={cls} className="flex items-center gap-3">
            <span
              className={`w-44 shrink-0 text-sm ${
                isTop ? "text-ink font-medium" : "text-ink-muted"
              }`}
            >
              {cls.replaceAll("_", " ")}
            </span>
            <div className="flex-1 h-2 bg-palm-light rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isTop ? "bg-palm" : "bg-line-strong"
                }`}
                style={{ width: `${Math.max(p * 100, 1)}%` }}
              />
            </div>
            <span className="w-14 text-right font-mono text-xs text-ink-muted">
              {(p * 100).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
