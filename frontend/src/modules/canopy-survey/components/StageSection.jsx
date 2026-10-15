import ViewfinderFrame from "./ViewfinderFrame";

/**
 * One numbered stage of the survey pipeline (detection, utilization,
 * vegetation/empty-space, planting capacity). Numbering is meaningful
 * here — it's the actual order the backend pipeline runs in.
 */
export default function StageSection({ index, title, description, imageUrl, imageAlt, children }) {
  if (!imageUrl) return null;

  return (
    <section className="border-t border-line pt-8">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-sm text-palm">{String(index).padStart(2, "0")}</span>
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {description && <p className="font-mono text-xs text-ink-muted">{description}</p>}
      </div>

      {children && <div className="mb-4">{children}</div>}

      <ViewfinderFrame label={`fig.${index}`}>
        <img src={imageUrl} alt={imageAlt} className="w-full rounded-sm object-contain" />
      </ViewfinderFrame>
    </section>
  );
}
