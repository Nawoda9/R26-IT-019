import StageLabel from "./StageLabel";
import SeverityBadge from "./SeverityBadge";
import DsiGauge from "./DsiGauge";
import ProbabilityBars from "./ProbabilityBars";
import ImagePanel from "./ImagePanel";
import AbcdTable from "./AbcdTable";
import { severityKey } from "../../../lib/severity";

export default function ResultReport({ result, onReset }) {
  const key = severityKey(result.severity);

  const hasLesionData = Boolean(
    result.images?.gradcam || result.images?.mask
  );

  const isOOD = Boolean(result.is_ood);

  return (
    <div className="animate-fade-up space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-ink-muted tracking-wide">
            SPECIMEN WCLWD-{result.request_id?.slice(0, 6).toUpperCase()}
          </p>

          <h2 className="font-display text-2xl text-ink mt-1">
            {isOOD
              ? "Out-of-Distribution Image"
              : result.predicted_class.replaceAll("_", " ")}
          </h2>
        </div>

        <button
          onClick={onReset}
          className="text-sm text-ink-muted hover:text-ink underline underline-offset-2 whitespace-nowrap"
        >
          New specimen
        </button>
      </div>

      {/* ============================================================
          OOD RESULT
          ============================================================ */}
      {isOOD ? (
        <section className="space-y-6">
          {/* OOD Status */}
          <div className="border border-severity-critical/30 bg-[#F7E2DE] text-severity-critical rounded-sm px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-severity-critical" />

              <div>
                <p className="font-display text-lg font-medium">
                  OOD Detected
                </p>

                <p className="text-sm mt-1 opacity-90">
                  The submitted image is outside the distribution of images
                  supported by this diagnostic model.
                </p>
              </div>
            </div>
          </div>

          {/* Original Image Only */}
          {result.images?.original && (
            <div>
              <StageLabel
                index={1}
                title="Original Image"
                note="Image flagged as out-of-distribution"
              />

              <div className="mt-4 overflow-hidden rounded-sm border border-ink/10 bg-white">
                <img
                  src={result.images.original}
                  alt="Original image - OOD detected"
                  className="w-full max-h-[600px] object-contain"
                />
              </div>
            </div>
          )}

          {/* OOD Explanation */}
          <div className="border border-ink/10 bg-ink/[0.03] rounded-sm px-5 py-4">
            <p className="text-sm text-ink-muted">
              This image cannot be reliably classified by the current
              diagnostic model. Please provide a suitable coconut leaf image
              captured under normal diagnostic conditions.
            </p>
          </div>
        </section>
      ) : (
        /* ============================================================
           NORMAL RESULT
           ============================================================ */
        <>
          <section>
            <StageLabel
              index={1}
              title="Detection"
              note={
                result.ood_enabled
                  ? "OOD check enabled"
                  : "OOD check disabled"
              }
            />

            <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <SeverityBadge
                    severity={result.severity}
                    size="lg"
                  />

                  <span className="font-mono text-sm text-ink-muted">
                    {(result.confidence * 100).toFixed(1)}% confidence
                  </span>
                </div>

                <ProbabilityBars
                  probabilities={result.class_probabilities}
                  predictedClass={result.predicted_class}
                />
              </div>

              {hasLesionData && (
                <DsiGauge
                  value={result.dsi}
                  severityKey={key}
                />
              )}
            </div>
          </section>

          {/* WSSS Explainability */}
          {hasLesionData && (
            <section>
              <StageLabel
                index={2}
                title="WSSS Explainability"
                note="Grad-CAM → GrabCut"
              />

              <ImagePanel images={result.images} />
            </section>
          )}

          {/* ABCD Severity */}
          {hasLesionData && (
            <section>
              <StageLabel
                index={3}
                title="ABCD Severity"
                note={`Elapsed ${result.elapsed_ms} ms`}
              />

              <AbcdTable result={result} />
            </section>
          )}

          {/* Healthy Result */}
          {!hasLesionData && (
            <p className="text-ink-muted text-sm">
              No lesion segmentation is run for healthy predictions —
              nothing to score.
            </p>
          )}
        </>
      )}
    </div>
  );
}