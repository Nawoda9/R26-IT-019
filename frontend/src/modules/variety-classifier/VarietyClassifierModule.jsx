/**
 * Main coconut-classification page.
 * Manages image upload, map location, backend prediction,
 * result display, error handling and prediction history.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import UploadPanel from "./components/UploadPanel.jsx";
import ResultPanel from "./components/ResultPanel.jsx";
import LocationField from "./components/LocationField.jsx";
import LocationPicker from "./components/LocationPicker.jsx";
import PredictionHistoryStrip from "./components/PredictionHistoryStrip.jsx";
import HistoryModal from "./components/HistoryModal.jsx";
import { predictImage, ApiError } from "../../api/varietyApi.js";

export default function VarietyClassifierModule({ user }) {
  const userId = user?.id;

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const abortRef = useRef(null);

  // Map-picked location. Required before a prediction can be requested.
  const [location, setLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);

  // Bumped after every successful prediction so the history strip refetches.
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelected = useCallback(
    (selectedFile) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setStatus("idle");
      setResult(null);
      setError("");
    },
    [previewUrl]
  );

  const handleClassify = useCallback(async () => {
    if (!file || !location || !userId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError("");

    try {
      const data = await predictImage(file, location, userId, { signal: controller.signal });
      setResult(data);
      setStatus("success");
      setHistoryRefreshKey((k) => k + 1);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }, [file, location, userId]);

  const canClassify = Boolean(file) && Boolean(location) && Boolean(userId) && status !== "loading";

  return (
    <div className="flex-1 flex flex-col">
      <Header />

      <main className="mx-auto max-w-5xl w-full px-6 py-10 flex-1">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section
            aria-label="Upload photo"
            className="rounded-lg bg-surface p-5 shadow-panel ring-1 ring-line sm:p-6"
          >
            <UploadPanel
              onFileSelected={handleFileSelected}
              previewUrl={previewUrl}
              disabled={status === "loading"}
            />

            <LocationField
              location={location}
              onOpenMap={() => setShowMap(true)}
              disabled={status === "loading"}
            />

            <button
              type="button"
              onClick={handleClassify}
              disabled={!canClassify}
              className="mt-5 w-full rounded-lg bg-palm px-6 py-3.5 text-base font-semibold text-bg shadow-panel transition-colors hover:bg-palm-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {status === "loading" ? "Classifying…" : "Classify Coconut"}
            </button>
            {!location && (
              <p className="mt-2 text-xs text-ink-muted">
                Select the coconut's location on the map to enable classification.
              </p>
            )}
          </section>

          <section
            aria-label="Classification result"
            aria-live="polite"
            className="rounded-lg bg-surface p-5 shadow-panel ring-1 ring-line sm:p-6"
          >
            <ResultPanel status={status} error={error} result={result} />
          </section>
        </div>
      </main>

      <PredictionHistoryStrip
        userId={userId}
        refreshKey={historyRefreshKey}
        onViewAll={() => setShowHistoryModal(true)}
      />

      {showMap && (
        <LocationPicker
          initialLocation={location}
          onClose={() => setShowMap(false)}
          onConfirm={(loc) => {
            setLocation(loc);
            setShowMap(false);
          }}
        />
      )}

      {showHistoryModal && (
        <HistoryModal userId={userId} onClose={() => setShowHistoryModal(false)} />
      )}
    </div>
  );
}
