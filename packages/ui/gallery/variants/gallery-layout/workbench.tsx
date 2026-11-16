// Workbench: three panes, like a component explorer. A tree on the left goes from group to scene
// to the scene's items, each with its atomic level. The centre is a canvas with its own toolbar
// (viewport, zoom, open alone), the scene drawn in a frame of the chosen width. An inspector on
// the right holds every view setting in labelled rows, and below them the selected item's facts:
// level, registry name, source and the install command. On a phone the three panes become tabs.
import { type ReactNode, useState } from "react";
import { Button, cx, Kbd } from "../../../src";
import {
  ACTIVE_SCENE,
  Brand,
  Chip,
  type GalleryLayout,
  Glyph,
  GROUPS,
  GroupHeading,
  KitScene,
  LevelTag,
  MODE_OPTIONS,
  NavRow,
  SECTIONS,
  SearchField,
  Segmented,
  VIEW,
  VIEWPORT_OPTIONS,
} from "./category";

function Tree({ selected }: { selected: string }) {
  return (
    <nav aria-label="Scenes and items" className="flex flex-col gap-3">
      {GROUPS.map((g) => (
        <div key={g.id} className="flex flex-col gap-0.5">
          <GroupHeading className="flex items-center gap-1 px-2 pb-0.5">
            {g.id === "components" || g.id === "foundations"
              ? Glyph.chevronDown
              : Glyph.chevronRight}
            {g.label}
          </GroupHeading>
          {g.id === "components" || g.id === "foundations"
            ? g.scenes.map((s) => (
                <div key={s.id} className="flex flex-col gap-0.5">
                  <NavRow label={s.label} trailing={s.items} indent={1} />
                  {s.id === ACTIVE_SCENE.id
                    ? SECTIONS.map((item) => (
                        <NavRow
                          key={item.id}
                          label={item.label}
                          indent={2}
                          dot
                          active={item.id === selected}
                        />
                      ))
                    : null}
                </div>
              ))
            : null}
        </div>
      ))}
    </nav>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-8 items-center justify-between gap-3">
      <span className="text-[12.5px] text-hn-ink-muted">{label}</span>
      {children}
    </div>
  );
}

function Inspector() {
  return (
    <aside className="flex w-[264px] shrink-0 flex-col gap-5 overflow-hidden border-hn-line-subtle border-l bg-hn-surface-rail px-4 py-4">
      <section className="flex flex-col gap-1">
        <GroupHeading className="pb-1">Theme</GroupHeading>
        {VIEW.theme.map((t) => (
          <Row key={t.id} label={t.label}>
            <Chip value={t.value} />
          </Row>
        ))}
        <Row label="Mode">
          <Segmented label="Mode" options={MODE_OPTIONS} value="dark" />
        </Row>
      </section>
      <section className="flex flex-col gap-1">
        <GroupHeading className="pb-1">Review</GroupHeading>
        {VIEW.review.map((t) => (
          <Row key={t.id} label={t.label}>
            <Chip value={t.value} />
          </Row>
        ))}
      </section>
      <section className="flex flex-col gap-2 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[13px] text-hn-ink-primary">Button</span>
          <LevelTag level="atom" />
        </div>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
          <dt className="text-hn-ink-muted">Registry</dt>
          <dd className="m-0 font-hn-mono text-hn-ink-primary">button</dd>
          <dt className="text-hn-ink-muted">Source</dt>
          <dd className="m-0 truncate font-hn-mono text-hn-ink-body">src/button.tsx</dd>
          <dt className="text-hn-ink-muted">Used by</dt>
          <dd className="m-0 text-hn-ink-body">14 items</dd>
        </dl>
        <Button size="xs" variant="secondary" className="self-start">
          {Glyph.copy}
          Copy install
        </Button>
      </section>
    </aside>
  );
}

function CanvasToolbar() {
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-hn-line-subtle border-b px-3">
      <span className="font-medium text-[13px] text-hn-ink-primary">{ACTIVE_SCENE.label}</span>
      <span className="font-hn-mono text-[11px] text-hn-ink-muted">?scene=kit</span>
      <div className="ml-auto flex items-center gap-2">
        <Segmented label="Viewport" options={VIEWPORT_OPTIONS} value="1280" />
        <Chip value="100%" />
        <Button size="icon-sm" variant="ghost" aria-label="Hide inspector">
          {Glyph.panel}
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="Open the scene alone">
          {Glyph.external}
        </Button>
      </div>
    </div>
  );
}

function Desktop() {
  return (
    <div className="flex h-full w-full">
      <aside className="flex w-[220px] shrink-0 flex-col gap-3 border-hn-line-subtle border-r bg-hn-surface-rail px-2.5 py-3">
        <div className="px-2">
          <Brand />
        </div>
        <SearchField placeholder="Find" />
        <div className="flex-1 overflow-hidden">
          <Tree selected="button" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-hn-surface-band">
        <CanvasToolbar />
        <div className="flex-1 overflow-hidden p-5">
          <div className="h-full overflow-hidden rounded-hn-lg border border-hn-line-subtle bg-hn-surface-page px-6 py-6 shadow-hn-raised">
            <KitScene columns={2} compact />
          </div>
        </div>
      </div>
      <Inspector />
    </div>
  );
}

const TABS = [
  { id: "scenes", label: "Scenes", icon: Glyph.grid },
  { id: "canvas", label: "Canvas", icon: Glyph.frame },
  { id: "inspect", label: "Inspect", icon: Glyph.sliders },
] as const;

function Phone() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("canvas");
  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-hn-line-subtle border-b px-3">
        <Brand compact />
        <span className="text-hn-ink-muted">/</span>
        <span className="font-medium text-[14px] text-hn-ink-primary">{ACTIVE_SCENE.label}</span>
        <Kbd className="ml-auto">390</Kbd>
      </header>
      <div className="flex-1 overflow-hidden">
        {tab === "canvas" ? (
          <div className="h-full overflow-hidden bg-hn-surface-page px-4 py-5">
            <KitScene columns={1} compact />
          </div>
        ) : tab === "scenes" ? (
          <div className="h-full overflow-hidden bg-hn-surface-rail px-3 py-3">
            <Tree selected="button" />
          </div>
        ) : (
          <div className="flex h-full">
            <Inspector />
          </div>
        )}
      </div>
      <nav
        aria-label="Panes"
        className="grid h-16 shrink-0 grid-cols-3 border-hn-line-subtle border-t bg-hn-surface-rail"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={t.id === tab ? "page" : undefined}
            onClick={() => setTab(t.id)}
            className={cx(
              "flex flex-col items-center justify-center gap-1 text-[11px]",
              t.id === tab ? "text-hn-ink-primary" : "text-hn-ink-muted"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export const variant: GalleryLayout = {
  label: "Workbench",
  summary:
    "Three panes: a scene → item tree, a framed canvas with its own viewport and zoom, and an inspector with every setting plus the selected item's level, registry name and install command. Best for working on one item; the most chrome, and the canvas is the narrowest of the four (try the tabs in the 390 px frame).",
  Gallery: ({ screen }) => (screen === "phone" ? <Phone /> : <Desktop />),
};
