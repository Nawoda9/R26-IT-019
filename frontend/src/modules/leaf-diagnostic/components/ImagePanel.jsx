function Frame({ src, label }) {
  if (!src) return null;
  return (
    <div>
      <div className="corner-frame text-palm border border-line rounded-sm overflow-hidden bg-palm-light/30">
        <img src={src} alt={label} className="w-full h-auto block" />
      </div>
      <p className="font-mono text-[11px] text-ink-muted mt-2 tracking-wide">
        {label}
      </p>
    </div>
  );
}

export default function ImagePanel({ images }) {
  const entries = [
    { key: "original", label: "PREPROCESSED INPUT" },
    { key: "gradcam", label: "GRAD-CAM ACTIVATION" },
    { key: "mask", label: "WSSS LESION MASK" },
  ].filter((e) => images?.[e.key]);

  if (entries.length === 0) return null;

  return (
    <div
      className={`grid gap-5 ${
        entries.length === 1 ? "grid-cols-1 max-w-xs" : "grid-cols-2 md:grid-cols-3"
      }`}
    >
      {entries.map((e) => (
        <Frame key={e.key} src={images[e.key]} label={e.label} />
      ))}
    </div>
  );
}
