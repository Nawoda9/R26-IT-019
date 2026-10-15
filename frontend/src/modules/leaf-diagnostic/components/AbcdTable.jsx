const ROWS = [
  { key: "asymmetry", label: "A \u2014 Asymmetry", unit: "/ 100" },
  { key: "border", label: "B \u2014 Border irregularity", unit: "/ 100" },
  { key: "colour", label: "C \u2014 Colour variation", unit: "/ 100" },
  { key: "distribution", label: "D \u2014 Distribution", unit: "/ 100" },
  { key: "affected_area_pct", label: "Affected leaf area", unit: "%" },
];

export default function AbcdTable({ result }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {ROWS.map((r) => (
          <tr key={r.key} className="border-b border-line">
            <td className="py-2.5 text-ink-muted">{r.label}</td>
            <td className="py-2.5 text-right font-mono text-ink">
              {result[r.key]} <span className="text-ink-muted">{r.unit}</span>
            </td>
          </tr>
        ))}
        <tr>
          <td className="py-3 font-display text-base text-ink">
            Disease Severity Index
          </td>
          <td className="py-3 text-right font-mono text-base font-semibold text-ink">
            {result.dsi} / 100
          </td>
        </tr>
      </tbody>
    </table>
  );
}
