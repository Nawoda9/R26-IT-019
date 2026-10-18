import { VARIETIES } from "../data/varieties.js";

export default function Header() {
  return (
    <header className="border-b border-line px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-1">
        <span className="font-mono text-[11px] tracking-[0.2em] text-rust">
          VARIETY CLASSIFIER
        </span>
        <h1 className="font-display text-3xl md:text-4xl text-ink mt-2 leading-tight">
          What kind of coconut is that?
        </h1>
        <p className="text-ink-muted max-w-xl mt-1">
          Upload a photo of a coconut and this classifier will tell you whether
          it's a Dwarf, King Coconut (Thambili), or Tall variety — with a
          confidence breakdown for each.
        </p>
        <ul className="mt-4 flex flex-wrap items-center gap-4">
          {Object.entries(VARIETIES).map(([name, v]) => (
            <li key={name} className="flex items-center gap-2 text-sm text-ink-muted">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: v.color }}
                aria-hidden="true"
              />
              {name}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
