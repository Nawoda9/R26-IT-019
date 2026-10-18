export default function LocationField({ location, onOpenMap, disabled }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-raised px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Location</p>
        {location ? (
          <p className="truncate text-sm text-ink" title={location.label}>
            {location.label || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
          </p>
        ) : (
          <p className="text-sm text-ink-muted">Not selected yet — required before classifying</p>
        )}
      </div>
      <button
        type="button"
        onClick={onOpenMap}
        disabled={disabled}
        className="shrink-0 rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium text-ink hover:border-rust hover:text-rust disabled:cursor-not-allowed disabled:opacity-50"
      >
        {location ? "Change on map" : "Select on map"}
      </button>
    </div>
  );
}
