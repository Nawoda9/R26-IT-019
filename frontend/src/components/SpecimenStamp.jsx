const LABEL_MAP = {
  CCI_Caterpillars: "Coconut Caterpillar Infestation",
  "Gray Leaf Spot": "Coconut Gray Leaf Spot",
  Healthy_Leaves: "Healthy",
  "Leaf Rot": "Coconut Leaf Rot",
};

export function friendlyLabel(rawClass) {
  return LABEL_MAP[rawClass] || rawClass;
}

/**
 * The page's signature element: a rotated ink-stamp badge overlaying the
 * specimen photo once a diagnosis returns. Only rendered for in-distribution
 * results - out-of-distribution images get a plain notice instead (see
 * DiagnosticCard), since there's no real class to stamp in that case.
 */
export default function SpecimenStamp({ result }) {
  if (!result) return null;
  const { predicted_class: predictedClass, confidence, is_healthy: isHealthy } = result;
  const ringColor = isHealthy ? "border-sap-light" : "border-husk-light";
  const textColor = isHealthy ? "text-sap-light" : "text-husk";

  return (
    <div
      className={`absolute -bottom-5 -right-5 h-32 w-32 -rotate-[9deg] rounded-full border-[3px] ${ringColor} bg-parchment/95 shadow-[0_6px_18px_rgba(0,0,0,0.35)] flex flex-col items-center justify-center text-center p-2 opacity-95`}
    >
      <div className={`h-[calc(100%-8px)] w-[calc(100%-8px)] rounded-full border border-dashed ${ringColor} flex flex-col items-center justify-center gap-0.5`}>
        <p className="font-mono text-[8px] tracking-[0.2em] text-ink/60 uppercase">Specimen Read</p>
        <p className="font-display text-[11px] leading-tight font-medium text-ink px-2">
          {friendlyLabel(predictedClass)}
        </p>
        <p className={`font-mono text-lg font-semibold ${textColor}`}>{Math.round(confidence * 100)}%</p>
        <p className={`font-mono text-[7px] tracking-[0.15em] uppercase ${textColor}`}>confidence</p>
      </div>
    </div>
  );
}

