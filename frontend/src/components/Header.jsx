import { LogOut } from "lucide-react";

const NAV_ITEMS = [
  { key: "home", label: "Home" },
  { key: "leaf", label: "Leaf Wilt Diagnostic" },
  { key: "canopy", label: "Canopy & Land Survey" },
  { key: "variety", label: "Variety Classifier" },
  { key: "advisor", label: "Treatment Advisor" },
];

export default function Header({ active, onChange, user, onLogout }) {
  return (
    <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onChange("home")}
          className="flex items-center gap-2 font-display text-base font-semibold text-ink"
        >
          <img
  src="/Coconut_Logo.png"
  alt=""
  className="h-20 w-20 shrink-0 object-contain"
/>
          Coconut Diagnostics Suite..
        </button>

        <nav className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Sections">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === active;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(item.key)}
                className={`px-3 py-1.5 rounded-sm font-mono text-[11px] uppercase tracking-wide transition-colors ${
                  isActive
                    ? "bg-palm text-bg"
                    : "text-ink-muted hover:text-ink hover:bg-palm-light"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {user && (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-muted hover:text-rust transition-colors"
          >
            <LogOut size={13} /> {user.username} · sign out
          </button>
        )}
      </div>
    </header>
  );
}