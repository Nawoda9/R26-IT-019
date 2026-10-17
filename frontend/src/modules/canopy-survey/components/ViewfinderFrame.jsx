/**
 * The module's signature element: a drone-viewfinder reticle frame.
 * Wrap any content (dropzone, result image) in this to tie it back to
 * "captured through an aerial camera". Corner brackets + optional
 * coordinate readout labels in the top corners.
 */
export default function ViewfinderFrame({
  children,
  className = "",
  label,
  coords,
  scanning = false,
}) {
  return (
    <div className={`viewfinder vf-ticks relative rounded-sm bg-surface ${className}`}>
      <span className="vf-corner-tl" aria-hidden="true" />
      <span className="vf-corner-tr" aria-hidden="true" />
      <span className="vf-corner-bl" aria-hidden="true" />
      <span className="vf-corner-br" aria-hidden="true" />

      {label && (
        <div className="absolute -top-3 left-4 bg-bg px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-palm">
          {label}
        </div>
      )}

      {coords && (
        <div className="absolute -top-3 right-4 bg-bg px-2 font-mono text-[10px] tracking-wider text-ink-muted">
          {coords}
        </div>
      )}

      {scanning && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-sm">
          <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-palm/10 to-transparent animate-scan" />
        </div>
      )}

      {children}
    </div>
  );
}
