/**
 * The signature visual element of this module: a stylized coconut cross-section
 * (husk / shell / flesh, as concentric rings) used to display prediction
 * confidence — the outer colored arc fills in proportion to the model's
 * confidence, echoing what a real cut coconut looks like. The arc color is
 * the predicted variety's real husk color (data-driven, not a theme token).
 */
export default function HuskRing({ percentage = 0, color = "#2F5233", size = 168 }) {
  const strokeWidth = 10;
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Confidence: ${Math.round(clamped)}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* husk — outer track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#DCE3D6"
          strokeWidth={strokeWidth}
        />
        {/* progress arc, colored per predicted variety's real husk color */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{
            "--ring-circumference": circumference,
            "--ring-offset": offset,
          }}
          className="animate-ring-draw"
        />
        {/* shell */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - strokeWidth - 8}
          fill="none"
          stroke="#182417"
          strokeOpacity="0.12"
          strokeWidth={3}
        />
      </svg>
      {/* flesh — center readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-medium text-ink tabular-nums">
          {Math.round(clamped)}%
        </span>
        <span className="text-[11px] uppercase tracking-wider text-ink-muted">
          confidence
        </span>
      </div>
    </div>
  );
}
