import { useEffect, useState } from "react";
import { getVariety } from "../data/varieties.js";
import ProbabilityRow from "./ProbabilityRow.jsx";
import { fetchHistoryPage, ApiError } from "../../../api/varietyApi.js";

function formatWhen(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ListRow({ item, onSelect }) {
  const variety = getVariety(item.prediction);
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-raised"
    >
      <img src={item.image_url} alt={item.prediction} className="h-12 w-12 shrink-0 rounded-md object-cover" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: variety.color }} />
          {item.prediction}
          <span className="font-mono text-xs font-normal text-ink-muted">
            {Math.round(item.confidence * 100)}%
          </span>
        </p>
        <p className="truncate text-xs text-ink-muted">
          {formatWhen(item.created_at)}
          {item.location?.label ? ` · ${item.location.label}` : ""}
        </p>
      </div>
    </button>
  );
}

function DetailView({ item, onBack }) {
  const [showGradcam, setShowGradcam] = useState(true);
  const variety = getVariety(item.prediction);
  const entries = Object.entries(item.probabilities || {});
  const imgSrc = showGradcam && item.gradcam_url ? item.gradcam_url : item.image_url;

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm font-medium text-ink-muted hover:text-ink"
      >
        ← Back to list
      </button>

      <img src={imgSrc} alt={item.prediction} className="max-h-64 w-full rounded-lg object-contain" />

      {item.gradcam_url && (
        <button
          type="button"
          onClick={() => setShowGradcam((v) => !v)}
          className="self-start rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-ink hover:border-rust hover:text-rust"
        >
          {showGradcam ? "Show original" : "Show Grad-CAM"}
        </button>
      )}

      <div>
        <p className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: variety.color }} />
          {item.prediction}
        </p>
        <p className="text-sm text-ink-muted">{formatWhen(item.created_at)}</p>
        {item.location && (
          <p className="mt-1 text-sm text-ink-muted">
            📍 {item.location.label || `${item.location.latitude.toFixed(5)}, ${item.location.longitude.toFixed(5)}`}
          </p>
        )}
      </div>

      <div className="border-t border-line pt-3">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-muted">Full breakdown</p>
        {entries.map(([name, p]) => (
          <ProbabilityRow key={name} name={name} probability={p} isTop={name === item.prediction} />
        ))}
      </div>
    </div>
  );
}

export default function HistoryModal({ userId, onClose }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    fetchHistoryPage(userId, page, 12, { signal: controller.signal })
      .then((data) => {
        setItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
        setHasNext(Boolean(data.has_next));
        setStatus("success");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Could not load history.");
        setStatus("error");
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="All prediction history"
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-surface shadow-panel ring-1 ring-line">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg text-ink">
            {selected ? "Prediction details" : "All predictions"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-muted hover:bg-surface-raised hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto">
          {selected ? (
            <DetailView item={selected} onBack={() => setSelected(null)} />
          ) : (
            <div className="flex flex-col gap-1 px-3 py-3">
              {items.map((item) => (
                <ListRow key={item.id} item={item} onSelect={setSelected} />
              ))}

              {status === "loading" && (
                <p className="px-2 py-4 text-center text-sm text-ink-muted">Loading…</p>
              )}
              {status === "error" && (
                <p className="px-2 py-4 text-center text-sm text-severity-critical">{error}</p>
              )}
              {status === "success" && items.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-ink-muted">No predictions yet.</p>
              )}

              {hasNext && status !== "loading" && (
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className="mx-2 mb-1 mt-2 rounded-lg border border-line-strong py-2 text-sm font-medium text-ink hover:border-rust hover:text-rust"
                >
                  Load more
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
