const MODULES = [
  { key: "leaf", label: "Leaf Wilt Diagnostic" },
  { key: "canopy", label: "Canopy & Land Survey" },
  { key: "variety", label: "Variety Classifier" },
  { key: "advisor", label: "Treatment Advisor" },
];

export default function Footer({ onNavigate }) {
  return (
    <footer className="border-t border-line bg-bg">
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1.2fr] lg:gap-10">
          {/* Project */}
          <div>
            <button
              type="button"
              onClick={() => onNavigate("home")}
              className="flex items-center gap-3 text-left rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palm"
              aria-label="Coconut Diagnostics Suite home"
            >
              <img
                src="/Coconut_Logo.png"
                alt=""
                className="h-20 w-20 shrink-0 object-contain"
              />

              <span className="font-display text-lg font-semibold leading-tight text-ink">
                Coconut Diagnostics Suite
              </span>
            </button>

            <p className="mt-4 max-w-md text-sm leading-7 text-ink-muted">
              AI-Enabled Coconut Land Utilization, WCLWD Severity
              Assessment, Germplasm Identification and Community
              Intelligence Advisory System
            </p>

            <span className="mt-4 inline-flex rounded-sm border border-line bg-palm-light px-3 py-1.5 font-mono text-[11px] tracking-wide text-palm">
              Research Group · R26-IT-019
            </span>
          </div>

          {/* Tools */}
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              Explore our tools
            </h2>

            <nav
              className="mt-4 flex flex-col items-start gap-3"
              aria-label="Footer tools"
            >
              {MODULES.map((module) => (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => onNavigate(module.key)}
                  className="rounded-sm text-left text-sm text-ink-muted transition-colors hover:text-palm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palm"
                >
                  {module.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Research team and contact */}
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              Research team & contact
            </h2>

            <address className="mt-4 space-y-4 text-sm leading-6 not-italic text-ink-muted">
              <div>
                <p className="font-medium text-ink">
                  Faculty of Computing
                </p>
                <p>
                  Sri Lanka Institute of Information Technology
                </p>
              </div>

              <p>
                New Kandy Road, Malabe,
                <br />
                Sri Lanka
              </p>

              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wide">
                  Research enquiries
                </p>
                <a
                  href="mailto:hasunwijerathne1999@gmail.com"
                  className="break-words rounded-sm text-palm underline underline-offset-4 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palm"
                >
                  hasunwijerathne1999@gmail.com
                </a>
              </div>
            </address>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-line pt-5">
          <p className="text-center text-xs leading-6 text-ink-muted">
            © 2026 Coconut Diagnostics Suite · A final-year university
            research project.
          </p>
        </div>
      </div>
    </footer>
  );
}