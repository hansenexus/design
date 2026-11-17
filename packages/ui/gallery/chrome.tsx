// The gallery's own chrome, the workbench (hansenexus/design#162, decisions/gallery-layout.json):
// three panes. On the left a tree from the scene groups to the scenes to each scene's registry
// items (ITEM_SCENES), with a filter over both. In the middle the canvas, with its own toolbar
// for the viewport, the inspector toggle and opening the scene alone. On the right the inspector:
// every view setting (ViewToolbar) and the facts of the open scene or item. Below 768 px the
// three panes become tabs at the bottom of the screen.
// The panes sit above the overlay scenes' z-50 and take pointer events back from the body, so a
// modal dialog or an open select can still be left by a click, as the old scene bar could.
import { CATEGORIES } from "virtual:variants";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import pkg from "../package.json";
import { Badge, Button, cx, HansenexusMark, Kbd, ToggleGroup, ToggleGroupItem } from "../src";
import { Check } from "./icons";
import { ITEM_SCENES, itemsByLevel, type LevelItem, registryLevels } from "./levels";
import { InspectorHeading, ViewToolbar } from "./preview";
import { ProjectPicker } from "./projects-scene";
import {
  frameQuery,
  groupOf,
  installCommand,
  itemHref,
  SCENE_GROUPS,
  SCENE_LABELS,
  type Scene,
  sceneHref,
  VIEW_OPTIONS,
  type View,
  writeView,
} from "./view";

// ── Icons (Lucide paths, as gallery/icons.tsx) ──────────────────────────────────────────────

function Icon({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const SearchIcon = () => (
  <Icon size={14}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
const PanelIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M15 4v16" />
  </Icon>
);
const ExternalIcon = () => (
  <Icon>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Icon>
);
const TreeIcon = () => (
  <Icon>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </Icon>
);
const CanvasIcon = () => (
  <Icon>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M10 18h4" />
  </Icon>
);
const SlidersIcon = () => (
  <Icon>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Icon>
);
const ChevronIcon = ({ open }: { open: boolean }) => (
  <span className={cx("inline-flex transition-transform", open ? "rotate-90" : null)}>
    <Icon size={12}>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  </span>
);

// ── Data ────────────────────────────────────────────────────────────────────────────────────

const LEVEL_ABBR: Record<string, string> = {
  atom: "A",
  molecule: "M",
  organism: "O",
  template: "T",
};

/** Each scene's registry items, sorted by title. */
function itemsByScene(): Map<Scene, LevelItem[]> {
  const map = new Map<Scene, LevelItem[]>();
  for (const item of registryLevels()) {
    const scene = ITEM_SCENES[item.name];
    if (!scene) continue;
    const list = map.get(scene) ?? [];
    list.push(item);
    map.set(scene, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.title.localeCompare(b.title));
  return map;
}

const openVotes = () => CATEGORIES.filter((c) => !c.decision);

const has = (text: string, q: string) => text.toLowerCase().includes(q);

// ── Tree ────────────────────────────────────────────────────────────────────────────────────

function Brand() {
  return (
    <span className="flex items-center gap-2">
      <HansenexusMark size={22} />
      <span className="text-[14px] font-semibold tracking-[-0.01em] text-hn-ink-primary">
        ui kit
      </span>
      <span className="font-hn-mono text-[11px] text-hn-ink-muted">{pkg.version}</span>
    </span>
  );
}

const ROW =
  "flex min-h-7 items-center gap-2 rounded-hn-md pr-2 text-[13px] no-underline hover:bg-hn-surface-raised hover:text-hn-ink-primary aria-[current=page]:bg-hn-nav-active aria-[current=page]:font-medium aria-[current=page]:text-hn-nav-active-ink";

function Tree({ view, scene, item }: { view: View; scene: Scene | null; item: string | null }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const byScene = useMemo(itemsByScene, []);
  const votes = openVotes();
  const openScene = item ? (ITEM_SCENES[item] ?? null) : scene;

  const groups = SCENE_GROUPS.map((g) => ({
    ...g,
    scenes: g.scenes
      .map((s) => {
        const items = byScene.get(s) ?? [];
        const sceneHit = !q || has(SCENE_LABELS[s], q) || has(s, q);
        const itemHits = q ? items.filter((i) => has(i.title, q) || has(i.name, q)) : items;
        return {
          id: s,
          items,
          shown: sceneHit ? items : itemHits,
          visible: sceneHit || itemHits.length > 0,
        };
      })
      .filter((s) => s.visible),
  })).filter((g) => g.scenes.length > 0);

  return (
    <>
      <label className="flex h-8 items-center gap-2 rounded-hn-md border border-hn-line-subtle bg-hn-surface-card px-2.5 text-hn-ink-muted focus-within:border-hn-line-strong">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter scenes and items"
          aria-label="Filter scenes and items"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-hn-ink-primary outline-none placeholder:text-hn-ink-muted"
        />
      </label>
      <nav aria-label="Gallery scenes" className="flex flex-col gap-3">
        {groups.map((g) => (
          <div key={g.id} className="flex flex-col gap-px">
            <span className="px-2 pb-1 font-hn-mono text-[10.5px] tracking-[0.08em] text-hn-ink-muted uppercase">
              {g.label}
            </span>
            {g.scenes.map((s) => {
              // Filtering opens the scenes whose items match; otherwise only the open scene is open.
              const expanded = q ? s.shown !== s.items && s.shown.length > 0 : s.id === openScene;
              const children = q ? s.shown : s.items;
              return (
                <div key={s.id} className="flex flex-col gap-px">
                  <a
                    href={sceneHref(s.id, view)}
                    data-scene={s.id}
                    aria-current={!item && s.id === scene ? "page" : undefined}
                    className={cx(ROW, "pl-2 text-hn-ink-body")}
                  >
                    <span className="text-hn-ink-muted">
                      <ChevronIcon open={expanded} />
                    </span>
                    <span className="flex-1 truncate">{SCENE_LABELS[s.id]}</span>
                    {s.id === "vote" && votes.length ? (
                      <Badge tone="accent">{votes.length} open</Badge>
                    ) : s.items.length ? (
                      <span className="font-hn-mono text-[11px] text-hn-ink-muted">
                        {s.items.length}
                      </span>
                    ) : null}
                  </a>
                  {expanded && children.length ? (
                    <ul className="m-0 flex list-none flex-col gap-px p-0">
                      {children.map((i) => (
                        <li key={i.name}>
                          <a
                            href={itemHref(i.name, view)}
                            data-item={i.name}
                            aria-current={i.name === item ? "page" : undefined}
                            title={`${i.name}: what it uses and what uses it`}
                            className={cx(ROW, "pl-8 text-hn-ink-muted")}
                          >
                            <span className="flex-1 truncate">{i.title}</span>
                            {i.level ? (
                              <span
                                title={i.level}
                                className="font-hn-mono text-[10px] text-hn-ink-muted"
                              >
                                {LEVEL_ABBR[i.level]}
                              </span>
                            ) : null}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {s.id === "vote" && s.id === openScene && !q && votes.length ? (
                    <ul className="m-0 flex list-none flex-col gap-px p-0">
                      {votes.map((c) => (
                        <li key={c.id}>
                          <a
                            href={`?${writeView(new URLSearchParams({ scene: "vote", category: c.id }), view)}`}
                            className={cx(ROW, "pl-8 text-hn-ink-muted")}
                          >
                            <span className="flex-1 truncate">{c.spec.title}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
        {groups.length === 0 ? (
          <p className="m-0 px-2 text-[13px] text-hn-ink-muted">Nothing matches “{query}”.</p>
        ) : null}
      </nav>
      <LevelSummary view={view} item={item} />
    </>
  );
}

/** The registry by atomic level (#58), folded at the foot of the tree. */
function LevelSummary({ view, item }: { view: View; item: string | null }) {
  const groups = itemsByLevel();
  return (
    <nav aria-label="Items by level" className="mt-auto border-t border-hn-line-subtle pt-3">
      <details>
        <summary className="cursor-pointer px-2 text-[12px] text-hn-ink-muted">
          {groups.map(([level, items]) => `${items.length} ${LEVEL_ABBR[level]}`).join(" · ")} by
          level
        </summary>
        <dl className="m-0 mt-2 flex flex-col gap-2 px-2 text-[12.5px]">
          {groups.map(([level, items]) => (
            <div key={level} className="flex flex-col gap-1">
              <dt className="font-hn-mono text-[11px] text-hn-ink-muted">{level}s</dt>
              <dd className="m-0 flex flex-wrap gap-x-2.5 gap-y-1">
                {items.length ? (
                  items.map((i) => (
                    <a
                      key={i.name}
                      href={itemHref(i.name, view)}
                      aria-current={i.name === item ? "page" : undefined}
                      className="text-hn-ink-primary aria-[current=page]:font-semibold"
                    >
                      {i.title}
                    </a>
                  ))
                ) : (
                  <span className="text-hn-ink-muted">none yet</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </nav>
  );
}

// ── Canvas toolbar ──────────────────────────────────────────────────────────────────────────

/** The canvas width: auto (the page itself), or an iframe of 390 or 1280 px. */
function ViewportSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      aria-label="Viewport"
      value={view.viewport}
      onValueChange={(v) => {
        const next = VIEW_OPTIONS.viewport.find((o) => o === v);
        if (next) onChange({ ...view, viewport: next });
      }}
    >
      {VIEW_OPTIONS.viewport.map((v) => (
        <ToggleGroupItem key={v} value={v} className="font-hn-mono text-[12px]">
          {v}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function CanvasToolbar({
  view,
  onChange,
  scene,
  item,
  title,
  inspector,
  onInspector,
}: {
  view: View;
  onChange: (view: View) => void;
  scene: Scene | null;
  item: string | null;
  title: string;
  inspector: boolean;
  onInspector: () => void;
}) {
  const group = scene ? groupOf(scene) : null;
  const alone = `?${frameQuery(new URLSearchParams(location.search), view)}`;
  return (
    <div className="pointer-events-auto sticky top-0 z-[60] flex h-12 items-center gap-3 border-b border-hn-line-subtle bg-hn-surface-band px-4 max-md:hidden">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="shrink-0 text-[13px] text-hn-ink-muted">
          {item ? "Item" : (group?.label ?? "")}
        </span>
        <span className="text-hn-ink-muted">/</span>
        <span className="truncate text-[14px] font-medium text-hn-ink-primary">{title}</span>
        <span className="truncate font-hn-mono text-[11px] text-hn-ink-muted max-lg:hidden">
          {item ? `?item=${item}` : scene === "kit" ? "./" : `?scene=${scene}`}
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <ViewportSwitch view={view} onChange={onChange} />
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Inspector"
          aria-pressed={inspector}
          title={inspector ? "Hide the inspector" : "Show the inspector"}
          onClick={onInspector}
          className={inspector ? "text-hn-ink-primary" : "text-hn-ink-muted"}
        >
          <PanelIcon />
        </Button>
        <Button size="icon-sm" variant="ghost" asChild>
          <a
            href={alone}
            target="_blank"
            rel="noreferrer"
            aria-label="Open alone"
            title="Open alone"
          >
            <ExternalIcon />
          </a>
        </Button>
      </div>
    </div>
  );
}

// ── Inspector ───────────────────────────────────────────────────────────────────────────────

function CopyInstall({ item }: { item: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(t);
  }, [state]);
  const command = installCommand(item);
  return (
    <div className="flex flex-col gap-1.5">
      <code className="truncate rounded-hn-sm bg-hn-surface-band px-2 py-1 font-hn-mono text-[11.5px] text-hn-ink-body">
        {command}
      </code>
      <Button
        size="xs"
        variant="secondary"
        className="self-start"
        onClick={() =>
          navigator.clipboard.writeText(command).then(
            () => setState("copied"),
            () => setState("failed")
          )
        }
      >
        {state === "copied" ? <Check /> : null}
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy install"}
      </Button>
    </div>
  );
}

function Facts({ view, scene, item }: { view: View; scene: Scene | null; item: string | null }) {
  const byScene = useMemo(itemsByScene, []);
  if (item) {
    const info = registryLevels().find((i) => i.name === item);
    const home = ITEM_SCENES[item];
    return (
      <section className="flex flex-col gap-2 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-hn-ink-primary">{info?.title ?? item}</span>
          {info?.level ? <Badge>{info.level}</Badge> : null}
        </div>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
          <dt className="text-hn-ink-muted">Registry</dt>
          <dd className="m-0 font-hn-mono text-hn-ink-primary">{item}</dd>
          {home ? (
            <>
              <dt className="text-hn-ink-muted">Scene</dt>
              <dd className="m-0">
                <a href={sceneHref(home, view)} className="text-hn-ink-primary">
                  {SCENE_LABELS[home]}
                </a>
              </dd>
            </>
          ) : null}
        </dl>
        <CopyInstall item={item} />
      </section>
    );
  }
  if (!scene) return null;
  const items = byScene.get(scene) ?? [];
  return (
    <section className="flex flex-col gap-1.5 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-3 text-[12px]">
      <span className="text-[13px] font-medium text-hn-ink-primary">{SCENE_LABELS[scene]}</span>
      <span className="text-hn-ink-muted">
        {items.length
          ? `${items.length} registry item${items.length === 1 ? "" : "s"}. Pick one in the tree for its level, its blast radius and the install command.`
          : "No registry items of its own; it composes the kit."}
      </span>
    </section>
  );
}

// ── The frame ───────────────────────────────────────────────────────────────────────────────

type Pane = "scenes" | "canvas" | "inspect";

const PANES: { id: Pane; label: string; icon: () => ReactNode }[] = [
  { id: "scenes", label: "Scenes", icon: TreeIcon },
  { id: "canvas", label: "Canvas", icon: CanvasIcon },
  { id: "inspect", label: "Inspect", icon: SlidersIcon },
];

/** Wide enough for the inspector as a column beside the canvas (Tailwind's xl). */
const wide = () => typeof matchMedia === "function" && matchMedia("(min-width: 96rem)").matches;

/**
 * The workbench around the canvas. `scene` is null on an item page; `children` is what the
 * canvas shows (the scene, the matrix or the viewport iframe).
 */
export function Workbench({
  view,
  onChange,
  scene,
  item,
  liveSource,
  children,
}: {
  view: View;
  onChange: (view: View) => void;
  scene: Scene | null;
  item: string | null;
  liveSource: string;
  children: ReactNode;
}) {
  const [inspector, setInspector] = useState(wide);
  const [pane, setPane] = useState<Pane>("canvas");
  const title = item
    ? (registryLevels().find((i) => i.name === item)?.title ?? item)
    : scene
      ? SCENE_LABELS[scene]
      : "";

  return (
    <div
      data-workbench=""
      className={cx(
        "min-h-dvh md:grid",
        inspector
          ? "md:grid-cols-[15rem_minmax(0,1fr)] 2xl:grid-cols-[15rem_minmax(0,1fr)_18rem]"
          : "md:grid-cols-[15rem_minmax(0,1fr)]"
      )}
    >
      <header className="pointer-events-auto sticky top-0 z-40 flex h-12 items-center gap-2 border-b border-hn-line-subtle bg-hn-surface-band px-3 md:hidden">
        <HansenexusMark size={20} />
        <span className="text-hn-ink-muted">/</span>
        <span className="truncate text-[14px] font-medium text-hn-ink-primary">{title}</span>
        {view.viewport === "auto" ? null : <Kbd className="ml-auto">{view.viewport}</Kbd>}
      </header>

      <aside
        aria-label="Scenes and items"
        className={cx(
          "pointer-events-auto relative flex-col gap-3 md:z-[60] bg-hn-surface-rail px-2.5 py-3",
          pane === "scenes"
            ? "flex max-md:min-h-[calc(100dvh-3rem)] max-md:pb-20"
            : "max-md:hidden",
          "md:sticky md:top-0 md:flex md:h-dvh md:overflow-y-auto md:border-r md:border-hn-line-subtle"
        )}
      >
        <div className="px-2 py-1 max-md:hidden">
          <Brand />
        </div>
        <ProjectPicker view={view} onChange={onChange} />
        <Tree view={view} scene={scene} item={item} />
      </aside>

      <div className={cx("min-w-0", pane === "canvas" ? "max-md:pb-16" : "max-md:hidden")}>
        <CanvasToolbar
          view={view}
          onChange={onChange}
          scene={scene}
          item={item}
          title={title}
          inspector={inspector}
          onInspector={() => setInspector((o) => !o)}
        />
        {children}
      </div>

      <aside
        aria-label="Inspector"
        className={cx(
          "pointer-events-auto flex-col gap-5 md:z-[60] bg-hn-surface-rail px-4 py-4",
          pane === "inspect"
            ? "flex max-md:min-h-[calc(100dvh-3rem)] max-md:pb-20"
            : "max-md:hidden",
          inspector
            ? "md:fixed md:top-12 md:right-0 md:bottom-0 md:flex md:w-[18rem] md:overflow-y-auto md:border-l md:border-hn-line-subtle md:shadow-hn-overlay 2xl:sticky 2xl:top-0 2xl:bottom-auto 2xl:h-dvh 2xl:shadow-none"
            : "md:hidden"
        )}
      >
        <ViewToolbar view={view} onChange={onChange} liveSource={liveSource} />
        <div className="flex flex-col gap-1">
          <InspectorHeading>{item ? "Item" : "Scene"}</InspectorHeading>
          <Facts view={view} scene={scene} item={item} />
        </div>
      </aside>

      <nav
        aria-label="Panes"
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-3 border-t border-hn-line-subtle bg-hn-surface-rail md:hidden"
      >
        {PANES.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={pane === p.id}
            onClick={() => setPane(p.id)}
            className={cx(
              "flex flex-col items-center justify-center gap-1 text-[11px]",
              pane === p.id ? "text-hn-ink-primary" : "text-hn-ink-muted"
            )}
          >
            <p.icon />
            {p.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
