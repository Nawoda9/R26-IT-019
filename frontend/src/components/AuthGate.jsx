import { useState } from "react";
import { LogIn, UserPlus, Leaf } from "lucide-react";

export default function AuthGate({ onLogin, onRegister }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await onLogin(username, password);
      } else {
        await onRegister(username, password, email);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-canopy-deep field-texture flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-canopy-light border border-husk/40 mb-4">
            <Leaf size={22} className="text-sap-light" strokeWidth={1.75} />
          </div>
          <p className="font-mono text-xs tracking-[0.25em] text-husk-light uppercase mb-2">
            Field Diagnostic Log — Cocos nucifera
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-parchment tracking-tight">
            Coconut Disease Advisor
          </h1>
          <p className="mt-3 text-parchment/60 text-sm leading-relaxed">
            Sign in to diagnose leaf photos and consult the treatment advisor.
          </p>
        </div>

        <div className="bg-parchment text-ink rounded-lg shadow-[0_12px_30px_rgba(0,0,0,0.35)] p-6 sm:p-8">
          <div className="flex gap-1 mb-6 bg-ink/5 rounded-md p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`flex-1 px-3 py-2 rounded text-xs font-mono uppercase tracking-wide transition-colors ${
                mode === "login" ? "bg-canopy text-parchment" : "text-ink/50 hover:text-ink"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`flex-1 px-3 py-2 rounded text-xs font-mono uppercase tracking-wide transition-colors ${
                mode === "register" ? "bg-canopy text-parchment" : "text-ink/50 hover:text-ink"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wide text-ink/50 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                autoFocus
                className="w-full rounded-md border border-ink/15 bg-white/60 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-husk/50"
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wide text-ink/50 mb-1.5">
                  Email <span className="normal-case text-ink/30">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-ink/15 bg-white/60 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-husk/50"
                />
              </div>
            )}

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wide text-ink/50 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-md border border-ink/15 bg-white/60 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-husk/50"
              />
              {mode === "register" && (
                <p className="mt-1.5 text-xs text-ink/40">At least 8 characters.</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-rust bg-rust/10 border border-rust/30 rounded-md px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-canopy text-parchment px-4 py-2.5 text-sm font-medium hover:bg-canopy-light disabled:opacity-50 transition-colors"
            >
              {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
