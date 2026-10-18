import { useState } from "react";
import HuskRing from "./HuskRing.jsx";
import ProbabilityRow from "./ProbabilityRow.jsx";
import { getVariety } from "../data/varieties.js";

function EmptyState() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center">
      <span className="text-3xl opacity-40" aria-hidden="true">
        🥥
      </span>
      <p className="font-display text-base text-ink-muted">
        Your identification will appear here
      </p>
      <p className="max-w-[26ch] text-sm text-ink-muted/80">
        See the full breakdown.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3">
      <div
        className="h-10 w-10 animate-spin rounded-full border-[3px] border-line-strong/50 border-t-palm"
        aria-hidden="true"
      />
      <p className="text-sm text-ink-muted">Reading the husk pattern…</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center">
      <span className="text-3xl" aria-hidden="true">
        ⚠️
      </span>
      <p className="font-display text-base font-medium text-severity-critical">Couldn't classify that image</p>
      <p className="max-w-[30ch] text-sm text-ink-muted">{message}</p>
    </div>
  );
}

function GradCamViewer({ imageUrl, gradcamUrl }) {
  const [showGradcam, setShowGradcam] = useState(true);

  if (!gradcamUrl) {
    return imageUrl ? (
      <img src={imageUrl} alt="Classified coconut" className="w-full rounded-lg object-cover" />
    ) : null;
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg">
        <img
          src={showGradcam ? gradcamUrl : imageUrl}
          alt={showGradcam ? "Grad-CAM heatmap over the coconut" : "Classified coconut"}
          className="w-full object-cover"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-ink-muted">
          {showGradcam ? "Grad-CAM — highlights what the model looked at" : "Original photo"}
        </p>
        <button
          type="button"
          onClick={() => setShowGradcam((v) => !v)}
          className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-ink hover:border-rust hover:text-rust"
        >
          {showGradcam ? "Show original" : "Show Grad-CAM"}
        </button>
      </div>
    </div>
  );
}

export default function ResultPanel({ status, error, result }) {
  if (status === "error") return <ErrorState message={error} />;
  if (status === "loading") return <LoadingState />;
  if (status !== "success" || !result) return <EmptyState />;

  const { prediction, confidence, probabilities, image_url, gradcam_url, location } = result;
  const variety = getVariety(prediction);
  const entries = Object.entries(probabilities);

  return (
    <div className="animate-fade-up flex h-full flex-col">
      <GradCamViewer imageUrl={image_url} gradcamUrl={gradcam_url} />

      <div className="mt-5 flex items-center gap-5">
        <HuskRing percentage={confidence * 100} color={variety.color} />
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
            Predicted variety
          </p>
          <h3 className="font-display text-2xl font-semibold text-ink">
            {prediction}
          </h3>
          <p className="mt-0.5 text-sm text-ink-muted">{variety.tagline}</p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-ink-muted">{variety.blurb}</p>

      {location && (
        <p className="mt-3 text-xs text-ink-muted">
          📍 {location.label || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
        </p>
      )}

      <div className="mt-6 border-t border-line pt-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-muted">
          Full breakdown
        </p>
        {entries.map(([name, p]) => (
          <ProbabilityRow key={name} name={name} probability={p} isTop={name === prediction} />
        ))}
      </div>
    </div>
  );
}
