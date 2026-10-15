export default function PocketsTable({ pockets }) {
  if (!pockets || pockets.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-sm border border-line">
      <table className="w-full border-collapse font-mono text-xs">
        <thead>
          <tr className="bg-surface-raised text-left text-ink-muted">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">x (px)</th>
            <th className="px-3 py-2 font-medium">y (px)</th>
            <th className="px-3 py-2 font-medium">clearance (px)</th>
          </tr>
        </thead>
        <tbody>
          {pockets.map((p, i) => (
            <tr key={`${p.x}-${p.y}-${i}`} className="border-t border-line text-ink/90">
              <td className="px-3 py-2 text-palm">{i + 1}</td>
              <td className="px-3 py-2">{p.x}</td>
              <td className="px-3 py-2">{p.y}</td>
              <td className="px-3 py-2">{p.clearance_px}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
