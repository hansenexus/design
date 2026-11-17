// The illustrations scene (design#17, by set since design#220): the eight state motifs of the
// active illustration set, the theme pack's default (pack.json "illustrations") until the view's
// ?illustrations=<set> overrides it, at 128 and 48 px in ink.muted as the EmptyState/ErrorState
// slot draws them. With compare on, every set follows side by side, a column each.
import { motifPath, SETS, type SetId, STATE_MOTIFS, setFor } from "@hansenexus/illustrations/sets";
import { STATE_ILLUSTRATIONS, useIllustrationSet } from "@hansenexus/illustrations/state";
import { useContext } from "react";
import { ViewContext } from "./preview";

/** One set's eight states, each at two sizes, as the school scene's grid draws its motifs. */
function StateGrid({ set }: { set: SetId }) {
  const def = setFor(set);
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {STATE_MOTIFS.map((state) => {
        const Motif = STATE_ILLUSTRATIONS[set][state];
        const id = motifPath(def, state);
        return (
          <figure
            key={id}
            data-motif={id}
            className="m-0 flex flex-col items-center gap-3 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-4 text-hn-ink-muted"
          >
            <Motif width={128} height={96} />
            <Motif width={48} height={36} />
            <figcaption className="font-hn-mono text-[13px] text-hn-ink-body">{id}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

/** Every set side by side: a row per state, a column per set. */
function SetCompare() {
  return (
    <section aria-label="Every set side by side" className="flex flex-col gap-4">
      <h2 className="m-0 text-base font-semibold text-hn-ink-body">Every set side by side</h2>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-2 text-hn-ink-muted">
          <thead>
            <tr>
              <th
                scope="col"
                className="text-left font-hn-mono text-[13px] font-normal text-hn-ink-muted"
              >
                state
              </th>
              {SETS.map((s) => (
                <th
                  key={s.id}
                  scope="col"
                  className="font-hn-mono text-[13px] font-normal text-hn-ink-body"
                >
                  {s.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STATE_MOTIFS.map((state) => (
              <tr key={state}>
                <th
                  scope="row"
                  className="pr-2 text-left font-hn-mono text-[13px] font-normal text-hn-ink-body"
                >
                  {state}
                </th>
                {SETS.map((s) => {
                  const Motif = STATE_ILLUSTRATIONS[s.id][state];
                  return (
                    <td
                      key={s.id}
                      data-set-motif={motifPath(s, state)}
                      className="rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-3"
                    >
                      <Motif width={96} height={72} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function Illustrations() {
  const view = useContext(ViewContext);
  const set = useIllustrationSet();
  const def = setFor(set);
  return (
    <main
      data-illustration-set={set}
      className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10"
    >
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/illustrations</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          State illustrations
        </h1>
        <p className="m-0 max-w-[64ch] text-sm text-hn-ink-body">
          <span className="font-semibold">{def.label}</span> ({def.id}){" "}
          {view.illustrations === "auto" ? "· the pack's default" : "· picked in the view"}
        </p>
      </header>
      <StateGrid set={set} />
      {view.compare === "off" ? null : <SetCompare />}
    </main>
  );
}
