// The item page, ?item=<name> (hansenexus/design#59): one registry item's demo, what it uses, and
// its blast radius, every item that uses it directly or transitively, each as a preview card in
// the current toolbar combination. "Replay all" remounts every card at once, so a change to an
// atom can be watched in every molecule and organism it reaches. The graph comes from
// scripts/graph.ts at build time (`virtual:graph`); nothing is parsed here.

import { GRAPH } from "virtual:graph";
import { useContext, useState } from "react";
import registry from "../registry.json";
import { Badge, Button } from "../src";
import { Demo } from "./demos";
import { Restart } from "./icons";
import { ITEM_SCENES, levelOf } from "./levels";
import { PreviewCard, ViewContext } from "./preview";
import { itemHref, sceneHref } from "./view";

type Meta = { title: string; description: string };

const META: Record<string, Meta> = Object.fromEntries(
  registry.items.map((i) => [
    i.name,
    { title: i.title ?? i.name, description: i.description ?? "" },
  ])
);

const titleOf = (name: string) => META[name]?.title ?? name;

/** True when `name` is a registry item, so ?item= can fall back to the scenes otherwise. */
export function isItem(name: string | null): name is string {
  return name !== null && name in GRAPH;
}

function ItemLink({ name }: { name: string }) {
  const view = useContext(ViewContext);
  return (
    <a href={itemHref(name, view)} className="text-hn-ink-primary" title={name}>
      {titleOf(name)}
    </a>
  );
}

/** "Card, via Skeleton" for a dependent two hops up; the direct ones get no via. */
function cardTitle(path: string[]): string {
  const [name = "", ...rest] = path;
  const via = rest.slice(0, -1).map(titleOf);
  return via.length ? `${titleOf(name)}, via ${via.join(" → ")}` : titleOf(name);
}

export function ItemPage({ name }: { name: string }) {
  const view = useContext(ViewContext);
  const [runAll, setRunAll] = useState(0);
  const node = GRAPH[name] ?? { uses: [], usedBy: [] };
  const meta = META[name];
  const scene = ITEM_SCENES[name] ?? "kit";
  const level = levelOf(name);
  const direct = node.usedBy.filter((d) => d.path.length === 2).length;
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-hn-ink-muted">
          @hansenexus/ui
          {level ? <Badge>{level}</Badge> : null}
        </span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          {titleOf(name)}
        </h1>
        {meta?.description ? (
          <p className="m-0 max-w-[65ch] text-hn-ink-body">{meta.description}</p>
        ) : null}
        <a href={sceneHref(scene, view)} className="text-sm text-hn-ink-primary">
          All its states in the {scene} scene
        </a>
      </header>

      <PreviewCard title={titleOf(name)} item={name}>
        <Demo item={name} />
      </PreviewCard>

      <section aria-labelledby="uses" className="flex flex-col gap-2 text-sm">
        <h2 id="uses" className="m-0 font-hn-mono text-[13px] font-medium text-hn-ink-muted">
          Uses ({node.uses.length})
        </h2>
        {node.uses.length ? (
          <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
            {node.uses.map((u) => (
              <li key={u}>
                <ItemLink name={u} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-hn-ink-muted">No other registry item.</p>
        )}
      </section>

      <section aria-labelledby="used-by" className="flex flex-col gap-4" data-used-by={name}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="used-by" className="m-0 font-hn-mono text-[13px] font-medium text-hn-ink-muted">
            Used by ({node.usedBy.length}: {direct} direct, {node.usedBy.length - direct}{" "}
            transitive)
          </h2>
          {node.usedBy.length ? (
            <Button variant="ghost" className="ml-auto" onClick={() => setRunAll((n) => n + 1)}>
              <Restart />
              Replay all
            </Button>
          ) : null}
        </div>
        {node.usedBy.length ? (
          <>
            <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-sm">
              {node.usedBy.map((d) => (
                <li key={d.name}>
                  <ItemLink name={d.name} />
                </li>
              ))}
            </ul>
            <div key={runAll} className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
              {node.usedBy.map((d) => (
                <PreviewCard key={d.name} title={cardTitle(d.path)} item={d.name}>
                  <Demo item={d.name} />
                </PreviewCard>
              ))}
            </div>
          </>
        ) : (
          <p className="m-0 text-sm text-hn-ink-muted">
            Nothing uses {titleOf(name)}: a change to it reaches no other item.
          </p>
        )}
      </section>
    </main>
  );
}
