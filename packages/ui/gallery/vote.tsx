// The vote scene: one category's variants side by side, each drawn in the same fixtures.
// ?scene=vote&category=<id>; the categories come from gallery/variants/ (scripts/variants.ts).
// At 1280 px the variants are columns; at 390 px each fixture is a swipe row with the next
// variant peeking in, so every comparison stays one gesture away.

import { CATEGORIES } from "virtual:variants";
import { type CSSProperties, useState } from "react";
import { Button, StatusBadge } from "../src";

export function Vote() {
  const [run, setRun] = useState(0);
  const id = new URLSearchParams(location.search).get("category");
  const current = CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
  if (!current) {
    return <main className="p-10 text-hn-ink-muted">No categories under gallery/variants.</main>;
  }
  const { spec, variants, decision } = current;
  const columns = { "--vote-columns": variants.length } as CSSProperties;
  const row =
    "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-[repeat(var(--vote-columns),minmax(0,1fr))] lg:overflow-visible lg:px-0";
  const cell = "flex w-[85%] shrink-0 snap-start flex-col gap-2 lg:w-auto";

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      {variants.map((v) => v.css && <style key={v.id}>{v.css}</style>)}
      <header className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/ui vote</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          {spec.title}
        </h1>
        <p className="m-0 max-w-[68ch] text-hn-ink-body">{spec.question}</p>
        {decision ? (
          <p className="m-0 flex flex-wrap items-center gap-2 text-sm" data-vote="decided">
            <StatusBadge status="ok">Decided</StatusBadge>
            <span>
              <span className="font-hn-mono">{decision.winner}</span> on {decision.date}:{" "}
              {decision.rationale}
            </span>
          </p>
        ) : (
          <p className="m-0 flex flex-wrap items-center gap-2 text-sm" data-vote="open">
            <StatusBadge status="busy">Awaiting decision</StatusBadge>
            <span className="text-hn-ink-muted">
              Record it with{" "}
              <code className="font-hn-mono text-hn-ink-primary">
                bun run decide {current.id} &lt;variant&gt; --rationale "…"
              </code>
            </span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {CATEGORIES.length > 1 &&
            CATEGORIES.map((c) => (
              <a
                key={c.id}
                href={`?scene=vote&category=${c.id}`}
                aria-current={c.id === current.id ? "page" : undefined}
                className="font-hn-mono text-sm text-hn-ink-muted aria-[current=page]:text-hn-ink-primary"
              >
                {c.id}
              </a>
            ))}
          <Button variant="secondary" onClick={() => setRun((r) => r + 1)}>
            Replay loading
          </Button>
        </div>
      </header>

      <section aria-label="Variants" className={row} style={columns}>
        {variants.map((v) => (
          <div
            key={v.id}
            className={`${cell} rounded-hn-lg bg-hn-surface-band p-4`}
            data-vote-variant={v.id}
          >
            <h2 className="m-0 text-base font-semibold">{v.label}</h2>
            <p className="m-0 text-sm text-hn-ink-muted">{v.summary}</p>
            <span className="font-hn-mono text-xs text-hn-ink-muted">{v.id}</span>
          </div>
        ))}
      </section>

      <div key={run} className="flex flex-col gap-10">
        {spec.fixtures.map((f) => (
          <section key={f.id} className="flex flex-col gap-3.5" data-fixture={f.id}>
            <div className="flex flex-col gap-1">
              <h2 className="m-0 font-hn-mono text-[13px] font-medium text-hn-ink-muted">
                {f.label}
              </h2>
              {f.note && <p className="m-0 text-xs text-hn-ink-muted">{f.note}</p>}
            </div>
            <div className={row} style={columns}>
              {variants.map((v) => (
                <div key={v.id} className={cell} data-vote-variant={v.id}>
                  <span className="font-hn-mono text-xs text-hn-ink-muted lg:sr-only">
                    {v.label}
                  </span>
                  {f.render(v)}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
