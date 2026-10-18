export default function Header({ healthStatus }) {
  return (
    <header className="border-b border-line">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-[0.2em] text-rust">
            WCLWD FIELD DIAGNOSTIC
          </span>
          {healthStatus && (
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  healthStatus.ok ? "bg-palm" : "bg-severity-critical"
                }`}
              />
              {healthStatus.ok
                ? `MODEL READY \u2022 ${healthStatus.classes} CLASSES`
                : "MODEL OFFLINE"}
            </span>
          )}
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-ink mt-2 leading-tight">
          Weligama Coconut Leaf Wilt
          <br className="hidden md:block" /> Disease Assessment
        </h1>
        <p className="text-ink-muted max-w-xl mt-1">
          Upload a leaf photo to run detection, weakly-supervised lesion
          segmentation, & ABCD severity scoring in one pass.
        </p>
      </div>
    </header>
  );
}
