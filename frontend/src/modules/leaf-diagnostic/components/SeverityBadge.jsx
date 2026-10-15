import { severityKey, SEVERITY_META } from "../../../lib/severity";

export default function SeverityBadge({ severity, size = "md" }) {
  const key = severityKey(severity);
  const meta = SEVERITY_META[key];
  const sizeClasses = size === "lg" ? "text-sm px-3.5 py-1.5" : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 ${meta.bg} ${meta.text} ${meta.ring} ${sizeClasses} font-mono uppercase tracking-wide`}
      title={severity}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}
