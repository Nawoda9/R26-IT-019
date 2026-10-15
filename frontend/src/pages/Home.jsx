import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Leaf,
  ScanLine,
  Sprout,
  MessagesSquare,
  Upload,
  Search,
  GraduationCap,
  MapPin,
  Pause,
  Play,
} from "lucide-react";
const MODULES = [
  {
    key: "leaf",
    number: "01",
    icon: Leaf,
    title: "Understand leaf health",
    label: "Leaf Wilt Diagnostic",
    description:
      "Explore leaf wilt assessment, identify affected regions, and review image-based severity estimates.",
    tags: ["Leaf analysis", "Severity assessment"],
  },
  {
    key: "canopy",
    number: "02",
    icon: ScanLine,
    title: "See your land’s potential",
    label: "Canopy & Land Survey",
    description:
      "Survey coconut palms from aerial imagery and explore land utilization and potential planting space.",
    tags: ["Palm detection", "Land utilization"],
  },
  {
    key: "variety",
    number: "03",
    icon: Sprout,
    title: "Explore coconut diversity",
    label: "Variety Classifier",
    description:
      "Use coconut imagery to explore variety identification and support germplasm research.",
    tags: ["Variety identification", "Germplasm"],
  },
  {
    key: "advisor",
    number: "04",
    icon: MessagesSquare,
    title: "Find your next step",
    label: "Treatment Advisor",
    description:
      "Explore treatment guidance and community intelligence to support informed plantation decisions.",
    tags: ["Treatment guidance", "Community insights"],
  },
];

const STEPS = [
  {
    icon: Search,
    title: "Choose your tool",
    text: "Start with leaf health, land surveying, variety identification, or advisory support.",
  },
  {
    icon: Upload,
    title: "Provide your input",
    text: "Follow the selected tool’s instructions to upload imagery or describe your question.",
  },
  {
    icon: ArrowUpRight,
    title: "Explore the findings",
    text: "Review the output alongside field observations to inform your next decision.",
  },
];

function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`home-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* Decorative illustration, not an actual analysis result. */
function PlantationIllustration() {
  const [activeScene, setActiveScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const scenes = [
    {
      label: "Leaf health",
      title: "Leaf wilt & severity assessment",
      description: "Explore affected regions and leaf health.",
    },
    {
      label: "Land insights",
      title: "Canopy & land utilization",
      description: "Explore palm distribution and planting space.",
    },
    {
      label: "Variety",
      title: "Germplasm identification",
      description: "Compare visual characteristics of coconut varieties.",
    },
    {
      label: "Advisory",
      title: "Community intelligence & guidance",
      description: "Connect questions with advisory support.",
    },
  ];

  useEffect(() => {
    const preference = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const updatePreference = () => {
      setReducedMotion(preference.matches);
    };

    updatePreference();
    preference.addEventListener("change", updatePreference);

    return () => {
      preference.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    if (paused || interacting || reducedMotion) return;

    const timer = window.setInterval(() => {
      setActiveScene((current) => (current + 1) % 4);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [paused, interacting, reducedMotion, activeScene]);

  const palms = [
    [120, 105],
    [225, 85],
    [340, 110],
    [445, 90],
    [155, 205],
    [275, 190],
    [400, 215],
    [115, 310],
    [230, 305],
    [350, 325],
    [460, 295],
  ];

  return (
    <div
      className="mx-auto w-full max-w-[540px]"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocus={() => setInteracting(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setInteracting(false);
        }
      }}
    >
      <style>{`
        .suite-scene {
          animation: suite-scene-enter 550ms ease both;
        }

        .suite-scan {
          animation: suite-scan-travel 4s ease-in-out infinite;
        }

        .suite-ring {
          transform-box: fill-box;
          transform-origin: center;
          animation: suite-ring-pulse 3s ease-in-out infinite;
        }

        .suite-guidance {
          animation: suite-guidance-enter 700ms ease both;
        }

        .suite-motion-paused * {
          animation-play-state: paused !important;
        }

        @keyframes suite-scene-enter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes suite-scan-travel {
          0%, 100% { transform: translateY(0); opacity: 0; }
          15% { opacity: .8; }
          85% { opacity: .8; }
          95% { transform: translateY(285px); opacity: 0; }
        }

        @keyframes suite-ring-pulse {
          0%, 100% { opacity: .35; transform: scale(1); }
          50% { opacity: .8; transform: scale(1.08); }
        }

        @keyframes suite-guidance-enter {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .suite-scene,
          .suite-scan,
          .suite-ring,
          .suite-guidance {
            animation: none;
          }

          .suite-scan { display: none; }
        }
      `}</style>

      <div
        className={`relative overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.05] p-5 sm:p-6 ${
          paused || interacting || reducedMotion
            ? "suite-motion-paused"
            : ""
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-medium uppercase leading-5 tracking-[0.2em] text-[#d2e5bc]">
            Four tools. One connected plantation.
          </p>

          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            disabled={reducedMotion}
            aria-label={
              paused ? "Resume animation" : "Pause animation"
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-[#d2e5bc] transition-colors hover:bg-white/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d2e5bc]"
          >
            {paused || reducedMotion ? (
              <Play size={14} />
            ) : (
              <Pause size={14} />
            )}
          </button>
        </div>

        <div className="mt-5">
          <h3 className="font-display text-lg font-semibold text-white">
            {scenes[activeScene].title}
          </h3>
          <p className="mt-1 min-h-[40px] text-xs leading-5 text-[#c0d1c2]">
            {scenes[activeScene].description}
          </p>
        </div>

        <div key={activeScene} className="suite-scene">
          <svg
            viewBox="0 0 560 400"
            className="my-3 w-full"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="suite-grid"
                width="35"
                height="35"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M35 0H0V35"
                  fill="none"
                  stroke="#d2e5bc"
                  strokeOpacity="0.07"
                />
              </pattern>
              <clipPath id="suite-scan-clip">
                <rect x="35" y="45" width="490" height="310" rx="20" />
              </clipPath>
            </defs>

            <rect
              x="20"
              y="20"
              width="520"
              height="360"
              rx="20"
              fill="url(#suite-grid)"
            />

            {/* 01 — Leaf health */}
            {activeScene === 0 && (
              <g>
                <path
                  d="M145 310C115 165 230 70 425 65C430 245 315 345 145 310Z"
                  fill="#8eb765"
                  fillOpacity="0.3"
                  stroke="#c5de9c"
                  strokeWidth="2"
                />
                <path
                  d="M140 320L405 85"
                  stroke="#d5e8b7"
                  strokeWidth="3"
                />
                <path
                  d="M205 260L180 185M250 220L240 130M295 180L315 110M210 260L295 280M255 220L355 235M300 180L390 180"
                  stroke="#c5de9c"
                  strokeOpacity="0.55"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M275 145C300 125 335 140 337 167C345 193 319 220 289 206C267 198 257 168 275 145Z"
                  fill="#d7ae6c"
                  fillOpacity="0.65"
                  stroke="#efd0a0"
                  strokeDasharray="5 5"
                />
                <path
                  d="M340 165H435"
                  stroke="#efd0a0"
                  strokeOpacity="0.7"
                />
                <text
                  x="365"
                  y="150"
                  fill="#efd0a0"
                  fontSize="11"
                  fontFamily="sans-serif"
                >
                  Affected region
                </text>

                <g clipPath="url(#suite-scan-clip)">
                  <path
                    className="suite-scan"
                    d="M65 55H495"
                    stroke="#d5ecab"
                    strokeWidth="2"
                  />
                </g>
              </g>
            )}

            {/* 02 — Canopy and land */}
            {activeScene === 1 && (
              <g>
                <path
                  d="M70 65L465 45L520 300L420 355L75 350L40 200Z"
                  fill="#b6d78b"
                  fillOpacity="0.1"
                  stroke="#bed799"
                  strokeOpacity="0.5"
                  strokeDasharray="7 7"
                />

                {palms.map(([x, y], index) => (
                  <g key={index} transform={`translate(${x} ${y})`}>
                    <rect
                      x="-29"
                      y="-29"
                      width="58"
                      height="58"
                      rx="9"
                      fill="none"
                      stroke="#c5de9c"
                      strokeOpacity="0.5"
                    />
                    {[0, 60, 120, 180, 240, 300].map((angle) => (
                      <path
                        key={angle}
                        d="M0 0C-14 -8 -14 -21 0 -25C8 -16 8 -7 0 0"
                        transform={`rotate(${angle})`}
                        fill="#a9cb7f"
                        fillOpacity="0.85"
                      />
                    ))}
                    <circle r="4" fill="#e0ebc3" />
                  </g>
                ))}

                <g clipPath="url(#suite-scan-clip)">
                  <path
                    className="suite-scan"
                    d="M45 55H515"
                    stroke="#d5ecab"
                    strokeWidth="2"
                  />
                </g>
              </g>
            )}

            {/* 03 — Variety comparison */}
            {activeScene === 2 && (
              <g>
                <path
                  d="M130 225L280 295L430 225"
                  fill="none"
                  stroke="#c5de9c"
                  strokeOpacity="0.4"
                  strokeDasharray="5 6"
                />

                {[
                  { x: 130, color: "#96b965", label: "Dwarf", ry: 57 },
                  { x: 280, color: "#d8ad62", label: "King Coconut", ry: 68 },
                  { x: 430, color: "#a8936f", label: "Tall", ry: 62 },
                ].map((coconut, index) => (
                  <g
                    key={coconut.label}
                    transform={`translate(${coconut.x} 175)`}
                  >
                    <circle
                      className="suite-ring"
                      r="78"
                      fill="none"
                      stroke="#c5de9c"
                      strokeDasharray="4 7"
                      style={{ animationDelay: `${index * 350}ms` }}
                    />
                    <ellipse
                      rx="44"
                      ry={coconut.ry}
                      fill={coconut.color}
                      fillOpacity="0.8"
                    />
                    <path
                      d="M-10 -40C-25 -10 -22 20 -10 40"
                      fill="none"
                      stroke="#ffffff"
                      strokeOpacity="0.2"
                      strokeWidth="3"
                    />
                    <path
                      d={`M0 ${-coconut.ry}L6 ${-coconut.ry - 12}`}
                      stroke="#c5de9c"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <text
                      y="105"
                      textAnchor="middle"
                      fill="#d2e5bc"
                      fontSize="12"
                      fontFamily="sans-serif"
                    >
                      {coconut.label}
                    </text>
                  </g>
                ))}

                <rect
                  x="195"
                  y="315"
                  width="170"
                  height="32"
                  rx="16"
                  fill="#c5de9c"
                  fillOpacity="0.1"
                  stroke="#c5de9c"
                  strokeOpacity="0.3"
                />
                <text
                  x="280"
                  y="335"
                  textAnchor="middle"
                  fill="#d2e5bc"
                  fontSize="11"
                  fontFamily="sans-serif"
                >
                  Compare visual features
                </text>
              </g>
            )}

            {/* 04 — Community and advisory */}
            {activeScene === 3 && (
              <g>
                <circle
                  className="suite-ring"
                  cx="125"
                  cy="200"
                  r="65"
                  fill="#c5de9c"
                  fillOpacity="0.06"
                  stroke="#c5de9c"
                  strokeOpacity="0.4"
                />
                <path
                  d="M90 170H160V215H125L108 230V215H90Z"
                  fill="#c5de9c"
                  fillOpacity="0.15"
                  stroke="#c5de9c"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <text
                  x="125"
                  y="201"
                  textAnchor="middle"
                  fill="#d2e5bc"
                  fontSize="24"
                  fontFamily="sans-serif"
                >
                  ?
                </text>

                <path
                  d="M190 200H240M240 105V295M240 105H280M240 200H280M240 295H280"
                  fill="none"
                  stroke="#c5de9c"
                  strokeOpacity="0.5"
                  strokeDasharray="5 5"
                />

                {[
                  ["Field observations", 75],
                  ["Community insights", 170],
                  ["Treatment guidance", 265],
                ].map(([label, y], index) => (
                  <g
                    key={label}
                    className="suite-guidance"
                    style={{ animationDelay: `${index * 180}ms` }}
                  >
                    <rect
                      x="280"
                      y={y}
                      width="225"
                      height="60"
                      rx="14"
                      fill="#c5de9c"
                      fillOpacity="0.08"
                      stroke="#c5de9c"
                      strokeOpacity="0.3"
                    />
                    <circle
                      cx="305"
                      cy={y + 30}
                      r="5"
                      fill="#c5de9c"
                    />
                    <text
                      x="322"
                      y={y + 35}
                      fill="#d2e5bc"
                      fontSize="12"
                      fontFamily="sans-serif"
                    >
                      {label}
                    </text>
                  </g>
                ))}
              </g>
            )}
          </svg>
        </div>

        <div
          className="flex flex-wrap gap-2 border-t border-white/10 pt-4"
          role="group"
          aria-label="Choose a research illustration"
        >
          {scenes.map((scene, index) => (
            <button
              key={scene.label}
              type="button"
              onClick={() => setActiveScene(index)}
              aria-pressed={activeScene === index}
              className={`rounded-full border px-3 py-2 text-[11px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d2e5bc] ${
                activeScene === index
                  ? "border-[#c5de9c] bg-[#c5de9c] text-[#143b2c]"
                  : "border-white/15 text-[#d2e5bc] hover:bg-white/10"
              }`}
            >
              {scene.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-[10px] leading-5 text-white/40">
          Conceptual research illustrations · Not analysis results
        </p>
      </div>
    </div>
  );
}

export default function Home({ onNavigate }) {
  function browseTools() {
    document.getElementById("research-tools")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }

  return (
    <main className="bg-[#f7f8f2] text-[#183328]">
      <style>{`
        .home-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition:
            opacity 700ms ease,
            transform 700ms cubic-bezier(.2,.7,.2,1);
          transition-delay: var(--reveal-delay, 0ms);
        }

        .home-reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .home-palm {
          transform-box: fill-box;
          transform-origin: center;
          animation: home-palm-enter 900ms ease both;
        }

        .home-scan {
          animation: home-scan-move 7s ease-in-out infinite;
        }

        @keyframes home-palm-enter {
          from { opacity: 0; transform: scale(.7); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes home-scan-move {
          0%, 100% { transform: translateY(0); opacity: 0; }
          15% { opacity: .65; }
          85% { opacity: .65; }
          95% { transform: translateY(385px); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .home-reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
          .home-palm, .home-scan {
            animation: none;
          }
          .home-scan { display: none; }
        }
      `}</style>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#143b2c] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-[#b9d98a]/10 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-24">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c8dfa6]/25 bg-[#c8dfa6]/5 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#d2e5bc]">
              <Sprout size={14} />
              AI-assisted coconut research
            </span>

            <h1 className="mt-7 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Healthier palms.
              <br />
              Smarter land.
              <br />
              <span className="text-[#c5de9c]">
                Better-informed decisions.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-8 text-[#d4dfd5]">
              Explore leaf health, plantation land use, coconut varieties,
              and advisory support through one connected research platform.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={browseTools}
                className="inline-flex items-center gap-3 rounded-xl bg-[#c5de9c] px-6 py-3.5 text-sm font-semibold text-[#143b2c] transition-colors hover:bg-[#d7e9ba] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Explore the tools
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("leaf")}
                className="inline-flex items-center gap-3 rounded-xl border border-white/25 px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Start leaf assessment
                <Leaf size={17} />
              </button>
            </div>

            <div className="mt-10 flex items-center gap-3 border-t border-white/15 pt-6">
              <GraduationCap
                size={24}
                className="shrink-0 text-[#c5de9c]"
              />
              <div>
                <p className="text-xs font-medium text-[#e5edde]">
                  Built through university research
                </p>
                <p className="mt-1 text-xs text-[#b6c8bb]">
                  SLIIT · Faculty of Computing · R26-IT-019
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <PlantationIllustration />
          </Reveal>
        </div>
      </section>

      {/* Research scope */}
      <section className="border-b border-[#dce3d7] bg-[#edf1e7]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-7 md:grid-cols-4">
          {[
            ["01", "Leaf health & severity"],
            ["02", "Canopy & land utilization"],
            ["03", "Germplasm identification"],
            ["04", "Community advisory"],
          ].map(([number, title]) => (
            <div key={number} className="flex items-start gap-3">
              <span className="font-mono text-xs text-[#718469]">
                {number}
              </span>
              <p className="text-sm font-medium leading-5">{title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section
        id="research-tools"
        className="scroll-mt-40 mx-auto max-w-6xl px-6 py-16 lg:py-20"
        aria-labelledby="tools-heading"
      >
        <Reveal className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6d805d]">
            The research toolkit
          </p>
          <h2
            id="tools-heading"
            className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Four tools. One plantation perspective.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#657465]">
            Choose the area you want to explore. Each module addresses a
            different part of coconut plantation research and management.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {MODULES.map((module, index) => {
            const Icon = module.icon;

            return (
              <Reveal key={module.key} delay={index * 70}>
                <button
                  type="button"
                  onClick={() => onNavigate(module.key)}
                  className="group flex h-full w-full flex-col rounded-2xl border border-[#dce3d7] bg-white p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-[#96b280] hover:shadow-lg motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315d3b] sm:p-8"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf3e7] text-[#315d3b]">
                      <Icon size={23} strokeWidth={1.6} />
                    </span>
                    <span className="font-mono text-xs text-[#899583]">
                      / {module.number}
                    </span>
                  </div>

                  <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#718469]">
                    {module.label}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold">
                    {module.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#657465]">
                    {module.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {module.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#f3f5ef] px-3 py-1 text-[10px] text-[#657465]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex w-full items-center justify-between pt-7 text-sm font-semibold text-[#315d3b]">
                    <span>Open tool</span>
                    <ArrowUpRight
                      size={19}
                      className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
                    />
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section
        className="border-y border-[#dce3d7] bg-[#edf1e7]"
        aria-labelledby="workflow-heading"
      >
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6d805d]">
              Getting started
            </p>
            <h2
              id="workflow-heading"
              className="mt-3 font-display text-3xl font-semibold"
            >
              From input to insight.
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;

              return (
                <Reveal key={step.title} delay={index * 100}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#cad6bf] text-[#315d3b]">
                      <Icon size={18} />
                    </span>
                    <span className="font-mono text-xs text-[#718469]">
                      STEP 0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-7 text-[#657465]">
                    {step.text}
                  </p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Research identity */}
      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <Reveal>
          <div className="grid gap-8 rounded-3xl border border-[#dce3d7] bg-white p-6 sm:p-10 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6d805d]">
                About the research
              </p>
              <h2 className="mt-4 font-display text-2xl font-semibold leading-snug sm:text-3xl">
                AI-Enabled Coconut Land Utilization, WCLWD Severity
                Assessment, Germplasm Identification and Community
                Intelligence Advisory System
              </h2>
              <p className="mt-5 text-sm leading-7 text-[#657465]">
                A final-year university research project bringing together
                complementary AI-assisted tools for coconut plantation
                assessment and advisory support.
              </p>
            </div>

            <div className="flex flex-col justify-center rounded-2xl bg-[#f3f5ef] p-6">
              <GraduationCap
                size={28}
                strokeWidth={1.5}
                className="text-[#315d3b]"
              />
              <p className="mt-4 font-mono text-xs text-[#6d805d]">
                RESEARCH GROUP R26-IT-019
              </p>
              <p className="mt-3 text-base font-semibold">
                Faculty of Computing
              </p>
              <p className="mt-2 text-sm leading-6 text-[#657465]">
                Sri Lanka Institute of Information Technology
              </p>
              <div className="mt-5 flex items-start gap-2 text-xs leading-6 text-[#657465]">
                <MapPin size={15} className="mt-1 shrink-0" />
                <span>New Kandy Road, Malabe, Sri Lanka</span>
              </div>
            </div>
          </div>
        </Reveal>

        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-6 text-[#718469]">
          This platform provides research-based decision support.
          AI-assisted findings should be checked against field observations.
          Seek qualified agricultural advice before selecting treatments.
        </p>
      </section>
    </main>
  );
}