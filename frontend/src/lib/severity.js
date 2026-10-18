/**
 * The backend returns free-text severity strings (e.g. "Critical", "Healthy",
 * "None (no lesion detected)", "Unknown (input looks out-of-distribution...)").
 * This maps them down to a fixed set of keys for consistent styling.
 */
export function severityKey(severity) {
  if (!severity) return "unknown";
  const s = severity.toLowerCase();
  if (s.startsWith("healthy")) return "healthy";
  if (s.startsWith("mild")) return "mild";
  if (s.startsWith("moderate")) return "moderate";
  if (s.startsWith("severe")) return "severe";
  if (s.startsWith("critical")) return "critical";
  return "unknown";
}

export const SEVERITY_META = {
  healthy: { label: "Healthy", text: "text-severity-healthy", bg: "bg-palm-light", ring: "ring-severity-healthy/30" },
  mild: { label: "Mild", text: "text-severity-mild", bg: "bg-[#F2F6E4]", ring: "ring-severity-mild/30" },
  moderate: { label: "Moderate", text: "text-severity-moderate", bg: "bg-[#FBF0DC]", ring: "ring-severity-moderate/30" },
  severe: { label: "Severe", text: "text-severity-severe", bg: "bg-rust-light", ring: "ring-severity-severe/30" },
  critical: { label: "Critical", text: "text-severity-critical", bg: "bg-[#F7E2DE]", ring: "ring-severity-critical/30" },
  unknown: { label: "Unclear", text: "text-ink-muted", bg: "bg-[#EEF0EA]", ring: "ring-ink-muted/20" },
};

export const SEVERITY_STROKE = {
  healthy: "#2F5233",
  mild: "#7A9A2E",
  moderate: "#C98A1E",
  severe: "#C4632B",
  critical: "#9E2B1F",
  unknown: "#6B6F63",
};
