/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // --- Design tokens: "field diagnostic" palette ---
        // This is the single theme shared by every module (leaf diagnostic +
        // canopy survey). Do not introduce a second palette per module —
        // add new semantic tokens here instead.
        bg: "#F6F7F1",          // pale green-white background, not cream/terracotta
        surface: "#FFFFFF",
        "surface-raised": "#EFF2E9",
        ink: "#182417",          // near-black green, primary text
        "ink-muted": "#5C6B57",
        line: "#DCE3D6",
        "line-strong": "#B9C4AF",
        palm: {
          DEFAULT: "#2F5233",
          dark: "#1C3620",
          light: "#EAF0E7",
        },
        rust: {
          DEFAULT: "#B85C2E",
          light: "#F5E5D8",
        },
        severity: {
          healthy: "#2F5233",
          mild: "#7A9A2E",
          moderate: "#C98A1E",
          severe: "#C4632B",
          critical: "#9E2B1F",
          unknown: "#6B6F63",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        lg: "14px",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(24, 36, 23, 0.04), 0 8px 24px -12px rgba(24, 36, 23, 0.12)",
      },
      keyframes: {
        "scan-line": {
          "0%": { transform: "translateY(0%)", opacity: "0.9" },
          "100%": { transform: "translateY(100%)", opacity: "0.2" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Used by the canopy-survey module's ViewfinderFrame while scanning
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        // Used by module status dots (backend online/offline pulse)
        blink: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.3 },
        },
        // Used by the variety-classifier module's HuskRing confidence meter
        "ring-draw": {
          "0%": { strokeDashoffset: "var(--ring-circumference)" },
          "100%": { strokeDashoffset: "var(--ring-offset)" },
        },
      },
      animation: {
        "scan-line": "scan-line 1.6s ease-in-out infinite alternate",
        "fade-up": "fade-up 0.35s ease-out both",
        scan: "scan 2.2s linear infinite",
        blink: "blink 1.6s ease-in-out infinite",
        "ring-draw": "ring-draw 1s cubic-bezier(0.4, 0, 0.2, 1) forwards",
      },
    },
  },
  plugins: [],
};
