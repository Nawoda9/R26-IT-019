export default function Header({ backendOnline }) {
  return (
    <header className="border-b border-line">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-[0.2em] text-rust">
            CANOPY SURVEY — FLIGHT REVIEW.
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                backendOnline ? "bg-palm animate-blink" : "bg-severity-critical"
              }`}
              aria-hidden="true"
            />
            {backendOnline ? "BACKEND ONLINE" : "BACKEND UNREACHABLE"}
          </span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-ink mt-2 leading-tight">
          Read every canopy in the frame.
        </h1>
        <p className="text-ink-muted max-w-xl mt-1">
          Upload an aerial plantation image. The model detects each coconut canopy,
          measures how much ground they occupy, segments the actual bare soil
          pixel-by-pixel, and estimates how many new trees can realistically be
          planted with proper spacing..
        </p>
      </div>
    </header>
  );
}
