import { useEffect, useState } from "react";
import { getVariety } from "../data/varieties.js";
import { fetchRecentHistory, ApiError } from "../../../api/varietyApi.js";

function formatWhen(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function HistoryCard({ item }) {
  const variety = getVariety(item.prediction);
  return (
    <div className="flex w-56 shrink-0 items-center gap-3 rounded-lg border border-line bg-surface p-3 shadow-panel">
      <img
        src={item.image_url}
        alt={item.prediction}
        className="h-14 w-14 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: variety.color }}
            aria-hidden="true"
          />
          {item.prediction}
        </p>
        <p className="text-xs text-ink-muted">
          {Math.round(item.confidence * 100)}% · {formatWhen(item.created_at)}
        </p>
      </div>
    </div>
  );
}

export default function PredictionHistoryStrip({ userId, refreshKey, onViewAll }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    fetchRecentHistory(userId, 3, { signal: controller.signal })
      .then((data) => {
        setItems(data);
        setStatus("success");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setStatus("error");
        if (!(err instanceof ApiError)) console.error(err);
      });
    return () => controller.abort();
  }, [userId, refreshKey]);

  if (status === "idle" || status === "loading") return null;
  if (status === "error" || items.length === 0) return null;

  return (
    <section
      aria-label="Recent predictions"
      className="border-t border-line bg-surface-raised px-6 py-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
            Recent predictions
          </p>
          <button
            type="button"
            onClick={onViewAll}
            className="text-sm font-medium text-rust underline decoration-line-strong/60 underline-offset-4 hover:text-rust"
          >
            View all details
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {items.map((item) => (
            <HistoryCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
