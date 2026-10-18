import { SEVERITY_STROKE } from "../../../lib/severity";

function pointAt(cx, cy, r, thetaDeg) {
  const t = (thetaDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(t), y: cy - r * Math.sin(t) };
}

// Semicircle gauge: value=0 sits at the left (180deg), value=100 at the
// right (0deg), sweeping clockwise over the top. Sweep angle never exceeds
// 180deg, so the SVG large-arc-flag is always 0.
function arcPath(cx, cy, r, fromVal, toVal) {
  const thetaFrom = 180 - (fromVal / 100) * 180;
  const thetaTo = 180 - (toVal / 100) * 180;
  const p1 = pointAt(cx, cy, r, thetaFrom);
  const p2 = pointAt(cx, cy, r, thetaTo);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`;
}

export default function DsiGauge({ value = 0, severityKey = "unknown", size = 200 }) {
  const cx = size / 2;
  const cy = size / 2 + 6;
  const r = size / 2 - 20;
  const stroke = SEVERITY_STROKE[severityKey] || SEVERITY_STROKE.unknown;
  const ticks = [0, 25, 50, 75, 100];
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 34} viewBox={`0 0 ${size} ${size / 2 + 34}`}>
        <path
          d={arcPath(cx, cy, r, 0, 100)}
          fill="none"
          stroke="#E4E7DC"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={arcPath(cx, cy, r, 0, clamped)}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
        />
        {ticks.map((t) => {
          const p1 = pointAt(cx, cy, r + 9, 180 - (t / 100) * 180);
          const p2 = pointAt(cx, cy, r + 15, 180 - (t / 100) * 180);
          return (
            <line
              key={t}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#B9C4AF"
              strokeWidth="1.5"
            />
          );
        })}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-ink font-mono font-semibold"
          style={{ fontSize: size * 0.16 }}
        >
          {clamped.toFixed(0)}
        </text>
        <text
          x={cx}
          y={cy + 17}
          textAnchor="middle"
          className="fill-ink-muted font-mono"
          style={{ fontSize: size * 0.055, letterSpacing: "0.08em" }}
        >
          DSI / 100
        </text>
      </svg>
    </div>
  );
}
