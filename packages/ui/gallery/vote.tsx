// The vote scene: one category's variants side by side, each drawn in the same fixtures.
// ?scene=vote&category=<id>; the categories come from gallery/variants/ (scripts/variants.ts).
// At 1280 px the variants are columns (a fixture may cap them per row, so a whole app screen
// keeps room); at 390 px each fixture is a swipe row with the next variant peeking in, so every
// comparison stays one gesture away. &variant=<id>&fixture=<id> opens one cell alone.
// An open category carries a Decide control per variant (#76, gallery/decide.ts): on the local
// server it records the decision through POST /api/decide, on the hosted site it opens a
// prefilled issue. Only the owner presses it; agents prepare the board and stop.

import { CATEGORIES } from "virtual:variants";
import { type CSSProperties, type FormEvent, useState } from "react";
import { Badge, Button, Field, FormAlert, StatusBadge, Textarea } from "../src";
import {
  DECIDE_PATH,
  type DecideBody,
  type DecideReply,
  decideProblem,
  decideTarget,
  issueUrl,
} from "./decide";

const params = () => new URLSearchParams(location.search);

/** The Decide form in one variant's header card: a rationale, then record or open the issue. */
function Decide({
  category,
  variant,
  considered,
  onCancel,
}: {
  category: string;
  variant: { id: string; label: string };
  considered: readonly string[];
  onCancel: () => void;
}) {
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const target = decideTarget(location.hostname);
  const body: DecideBody = { category, winner: variant.id, rationale };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (target === "issue") {
      const problem = decideProblem(body);
      if (problem) {
        setError(problem);
        return;
      }
      window.open(issueUrl(body, considered), "_blank", "noopener");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(DECIDE_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const reply = (await res.json()) as DecideReply;
      if (!res.ok || "error" in reply) {
        setError("error" in reply ? reply.error : `${res.status} ${res.statusText}`);
        setPending(false);
        return;
      }
      // decisions/<category>.json is written and the bundle rebuilt: the board reloads decided.
      location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      data-decide={variant.id}
      className="mt-2 flex flex-col gap-3 border-t border-hn-line-subtle pt-3"
    >
      <fieldset disabled={pending} className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <Field
          label={`Why ${variant.label}?`}
          required
          help={
            target === "server"
              ? `Owner only. Writes decisions/${category}.json in this checkout and deletes the other variants; commit and open the PR.`
              : `Owner only. Opens a prefilled issue in hansenexus/design; an agent runs decide and opens the PR.`
          }
        >
          <Textarea
            rows={3}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="The rationale that goes into the decision file"
          />
        </Field>
        {error ? (
          <FormAlert
            kind={target === "server" ? "server-error" : "invalid"}
            title="Not decided"
            data-decide-error=""
          >
            {error}
          </FormAlert>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            {target === "server"
              ? pending
                ? "Recording…"
                : "Record the decision"
              : "Open the decide issue"}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

/** The link that opens one variant in one fixture alone, keeping the view. */
function cellHref(variant: string, fixture: string): string {
  const q = params();
  q.set("variant", variant);
  q.set("fixture", fixture);
  return `?${q}`;
}

export function Vote() {
  const [run, setRun] = useState(0);
  /** The variant whose Decide form is open, one at a time. */
  const [pick, setPick] = useState<string | null>(null);
  const query = params();
  const id = query.get("category");
  const current = CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
  if (!current) {
    return <main className="p-10 text-hn-ink-muted">No categories under gallery/variants.</main>;
  }
  const { spec, variants, decision } = current;
  const row =
    "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-[repeat(var(--vote-columns),minmax(0,1fr))] lg:overflow-visible lg:px-0";
  const cell = "flex w-[85%] shrink-0 snap-start flex-col gap-2 lg:w-auto";
  const columnsOf = (cap = variants.length) => Math.max(1, Math.min(cap, variants.length));
  const style = (columns: number) => ({ "--vote-columns": columns }) as CSSProperties;

  const alone = {
    variant: variants.find((v) => v.id === query.get("variant")),
    fixture: spec.fixtures.find((f) => f.id === query.get("fixture")),
  };
  if (alone.variant && alone.fixture) {
    const back = params();
    back.delete("variant");
    back.delete("fixture");
    return (
      <main className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-6 sm:px-10">
        {alone.variant.css && <style>{alone.variant.css}</style>}
        <p className="m-0 flex flex-wrap items-center gap-3 text-sm">
          <a href={`?${back}`} className="text-hn-ink-primary">
            Back to the {spec.title.toLowerCase()} board
          </a>
          <span className="font-hn-mono text-hn-ink-muted">
            {alone.variant.label} · {alone.fixture.label}
          </span>
          {alone.variant.Controls && <alone.variant.Controls />}
        </p>
        <div data-vote-variant={alone.variant.id} data-fixture={alone.fixture.id}>
          {alone.fixture.render(alone.variant)}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      {variants.map((v) => v.css && <style key={v.id}>{v.css}</style>)}
      <header className="flex flex-col gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-hn-ink-muted">
          @hansenexus/ui vote
          {spec.level ? <Badge data-level={spec.level}>{spec.level}</Badge> : null}
        </span>
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
              Owner: press Decide on the winning variant below, or run{" "}
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

      <section aria-label="Variants" className={row} style={style(columnsOf())}>
        {variants.map((v) => (
          <div
            key={v.id}
            className={`${cell} rounded-hn-lg bg-hn-surface-band p-4`}
            data-vote-variant={v.id}
          >
            <h2 className="m-0 text-base font-semibold">{v.label}</h2>
            <p className="m-0 text-sm text-hn-ink-muted">{v.summary}</p>
            <span className="font-hn-mono text-xs text-hn-ink-muted">{v.id}</span>
            {v.Controls && <v.Controls />}
            {/* Decided categories carry no control: the vote is over. */}
            {decision ? null : pick === v.id ? (
              <Decide
                category={current.id}
                variant={v}
                considered={variants.map((x) => x.id)}
                onCancel={() => setPick(null)}
              />
            ) : (
              <Button
                variant="secondary"
                className="mt-2 self-start"
                data-decide-open={v.id}
                aria-label={`Decide for ${v.label}`}
                onClick={() => setPick(v.id)}
              >
                Decide
              </Button>
            )}
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
            <div
              className={row}
              style={style(columnsOf(f.columns))}
              data-vote-columns={columnsOf(f.columns)}
            >
              {variants.map((v) => (
                <div key={v.id} className={cell} data-vote-variant={v.id}>
                  <span className="flex items-baseline gap-3 font-hn-mono text-xs text-hn-ink-muted">
                    {/* In one row the header cards name the columns; in a capped row they don't. */}
                    <span className={f.columns ? undefined : "lg:sr-only"}>{v.label}</span>
                    <a
                      href={cellHref(v.id, f.id)}
                      className="ml-auto whitespace-nowrap text-hn-ink-muted"
                    >
                      Open alone
                    </a>
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
