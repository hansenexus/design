// The gallery-layout vote (hansenexus/design#162): how the gallery itself is laid out, its chrome
// around the scenes. Today it is a wrapped row of 21 scene links over a grid of nine view selects,
// full width above a centred 1280 px page: nothing grouped, nothing sticky, no search, and the
// review tools (compare, matrix, speed, motion) as loud as the theme pack.
// Every variant draws the same kit scene in the same frame, so only the chrome differs between
// columns: at 1280 × 800 and at 390 × 844, in the gallery's own theme (kommandant) and the view's
// mode. The scene list below is SCENES of ../../view.ts in groups; the check under GROUPS fails
// the gallery build when a scene is added to view.ts without a group here.
import { type ReactNode, useSyncExternalStore } from "react";
import {
  Badge,
  Button,
  cx,
  HansenexusMark,
  Input,
  Kbd,
  Meter,
  StatusBadge,
  Switch,
} from "../../../src";
import { SCENES, type Scene } from "../../view";
import { SCREENS, type Screen, ScreenFrame } from "../shell-layout/category";
import type { CategorySpec, Fixture, Variant } from "../types";

/** A gallery-layout variant: the whole gallery page for one screen size. */
export type GalleryLayout = Variant & { Gallery: (props: { screen: Screen }) => ReactNode };

// ── The scene map ────────────────────────────────────────────────────────────────────────────

export type SceneEntry = { id: Scene; label: string; items: number };
export type SceneGroup = { id: string; label: string; scenes: SceneEntry[] };

/** SCENES of view.ts in five groups; the item counts are what each scene draws today. */
export const GROUPS: SceneGroup[] = [
  {
    id: "foundations",
    label: "Foundations",
    scenes: [
      { id: "brand", label: "Brand", items: 6 },
      { id: "motion", label: "Motion", items: 9 },
      { id: "illustrations", label: "Illustrations", items: 8 },
      { id: "school", label: "School", items: 16 },
    ],
  },
  {
    id: "components",
    label: "Components",
    scenes: [
      { id: "kit", label: "Kit", items: 24 },
      { id: "forms", label: "Forms", items: 11 },
      { id: "controls", label: "Controls", items: 9 },
      { id: "data", label: "Data", items: 7 },
      { id: "charts", label: "Charts", items: 1 },
      { id: "loading", label: "Loading", items: 6 },
      { id: "states", label: "States", items: 8 },
      { id: "navigation", label: "Navigation", items: 5 },
      { id: "layout", label: "Layout", items: 4 },
    ],
  },
  {
    id: "overlays",
    label: "Overlays",
    scenes: [
      { id: "dialog", label: "Dialog", items: 3 },
      { id: "alert-dialog", label: "Alert dialog", items: 1 },
      { id: "menu", label: "Menu", items: 2 },
      { id: "select", label: "Select", items: 2 },
      { id: "tooltip", label: "Tooltip", items: 2 },
      { id: "toast", label: "Toast", items: 3 },
      { id: "overlays", label: "All overlays", items: 6 },
    ],
  },
  {
    id: "templates",
    label: "Templates",
    scenes: [
      { id: "shell", label: "Shell", items: 4 },
      { id: "screens", label: "App screens", items: 1 },
      { id: "projects", label: "Projects", items: 1 },
    ],
  },
  {
    id: "review",
    label: "Review",
    scenes: [{ id: "vote", label: "Votes", items: 5 }],
  },
];

const grouped = new Set(GROUPS.flatMap((g) => g.scenes.map((s) => s.id)));
const missing = SCENES.filter((s) => !grouped.has(s));
if (missing.length)
  throw new Error(`gallery-layout: scenes without a group: ${missing.join(", ")}`);

export const ACTIVE_GROUP = GROUPS[1] as SceneGroup;
export const ACTIVE_SCENE = ACTIVE_GROUP.scenes[0] as SceneEntry;
export const TOTAL_ITEMS = GROUPS.reduce(
  (n, g) => n + g.scenes.reduce((m, s) => m + s.items, 0),
  0
);

/** The kit scene's sections, in page order: what an outline or a tree lists under "Kit". */
export const SECTIONS = [
  { id: "button", label: "Button", level: "atom" },
  { id: "switch", label: "Switch", level: "atom" },
  { id: "status-badge", label: "StatusBadge", level: "atom" },
  { id: "meter", label: "Meter", level: "molecule" },
  { id: "card", label: "Card", level: "molecule" },
  { id: "rail", label: "Rail", level: "organism" },
] as const;

/** The view's settings as the chrome shows them; the values match the gallery's defaults. */
export const VIEW = {
  theme: [
    { id: "pack", label: "Pack", value: "core" },
    { id: "direction", label: "Direction", value: "kommandant" },
    { id: "density", label: "Density", value: "auto" },
  ],
  review: [
    { id: "compare", label: "Compare", value: "off" },
    { id: "matrix", label: "Matrix", value: "off" },
    { id: "speed", label: "Speed", value: "1×" },
    { id: "motion", label: "Motion", value: "full" },
  ],
} as const;

// ── Small chrome pieces every variant may use ──────────────────────────────────────────────

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

export const Glyph = {
  search: (
    <Icon>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  ),
  chevronDown: (
    <Icon size={14}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  ),
  chevronRight: (
    <Icon size={14}>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  ),
  chevronLeft: (
    <Icon size={14}>
      <path d="m15 18-6-6 6-6" />
    </Icon>
  ),
  menu: (
    <Icon>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  ),
  sliders: (
    <Icon>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </Icon>
  ),
  sun: (
    <Icon>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  ),
  moon: (
    <Icon>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </Icon>
  ),
  grid: (
    <Icon>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </Icon>
  ),
  panel: (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </Icon>
  ),
  frame: (
    <Icon>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M10 18h4" />
    </Icon>
  ),
  external: (
    <Icon size={14}>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </Icon>
  ),
  link: (
    <Icon size={14}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </Icon>
  ),
  copy: (
    <Icon size={14}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a1 1 0 0 1 1-1h10" />
    </Icon>
  ),
  close: (
    <Icon>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  ),
};

/** The gallery's brand row: mark, name and version. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <HansenexusMark size={compact ? 20 : 22} />
      <span className="font-semibold text-[14px] text-hn-ink-primary tracking-[-0.01em]">
        ui kit
      </span>
      {compact ? null : <span className="font-hn-mono text-[11px] text-hn-ink-muted">0.5.0</span>}
    </span>
  );
}

/** A select as the chrome draws it: label, value, chevron. */
export function Chip({
  label,
  value,
  bare = false,
  className,
}: {
  label?: string;
  value: string;
  /** No border: inside a dock or a row that already frames it. */
  bare?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-hn-md px-2 text-[12px] text-hn-ink-body hover:bg-hn-surface-raised",
        bare ? null : "border border-hn-line-subtle bg-hn-surface-card",
        className
      )}
    >
      {label ? <span className="text-hn-ink-muted">{label}</span> : null}
      <span className="font-hn-mono text-hn-ink-primary">{value}</span>
      <span className="text-hn-ink-muted">{Glyph.chevronDown}</span>
    </button>
  );
}

/** A segmented control: one of a few values, all visible. */
export function Segmented({
  options,
  value,
  label,
  size = "sm",
}: {
  options: { id: string; label: ReactNode; title?: string }[];
  value: string;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-hn-md border border-hn-line-subtle bg-hn-surface-card p-0.5"
    >
      {options.map((o) => (
        // biome-ignore lint/a11y/useSemanticElements: a mock of the chrome; the real control is a ToggleGroup
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          title={o.title}
          className={cx(
            "inline-flex items-center justify-center gap-1 rounded-hn-sm font-hn-mono",
            size === "sm" ? "h-6 min-w-7 px-1.5 text-[11px]" : "h-7 min-w-8 px-2 text-[12px]",
            o.id === value
              ? "bg-hn-surface-raised text-hn-ink-primary shadow-hn-raised"
              : "text-hn-ink-muted hover:text-hn-ink-primary"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const VIEWPORT_OPTIONS = [
  { id: "auto", label: "auto" },
  { id: "390", label: "390" },
  { id: "1280", label: "1280" },
];

export const MODE_OPTIONS = [
  { id: "light", label: Glyph.sun, title: "Light" },
  { id: "dark", label: Glyph.moon, title: "Dark" },
];

/** The search field that opens the palette over scenes and items. */
export function SearchField({
  placeholder = `Search ${TOTAL_ITEMS} items`,
  className,
}: {
  placeholder?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cx(
        "flex h-8 items-center gap-2 rounded-hn-md border border-hn-line-subtle bg-hn-surface-card px-2.5 text-left text-[13px] text-hn-ink-muted hover:border-hn-line-strong",
        className
      )}
    >
      {Glyph.search}
      <span className="flex-1 truncate">{placeholder}</span>
      <Kbd>⌘K</Kbd>
    </button>
  );
}

/** A small uppercase group heading for nav lists and inspector sections. */
export function GroupHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "font-hn-mono text-[10.5px] text-hn-ink-muted uppercase tracking-[0.08em]",
        className
      )}
    >
      {children}
    </span>
  );
}

/** One nav row: label, trailing count, the active one filled. */
export function NavRow({
  label,
  trailing,
  active = false,
  indent = 0,
  dot,
}: {
  label: string;
  trailing?: ReactNode;
  active?: boolean;
  indent?: number;
  dot?: boolean;
}) {
  return (
    <a
      href={`?scene=${label.toLowerCase()}`}
      onClick={(e) => e.preventDefault()}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex h-7 items-center gap-2 rounded-hn-md pr-2 text-[13px] no-underline",
        active
          ? "bg-hn-nav-active font-medium text-hn-nav-active-ink"
          : "text-hn-ink-body hover:bg-hn-surface-raised hover:text-hn-ink-primary"
      )}
      style={{ paddingLeft: 8 + indent * 14 }}
    >
      {dot ? <span className="size-1.5 shrink-0 rounded-full bg-hn-line-strong" /> : null}
      <span className="flex-1 truncate">{label}</span>
      {trailing !== undefined ? (
        <span
          className={cx(
            "font-hn-mono text-[11px]",
            active ? "text-hn-nav-active-meta" : "text-hn-ink-muted"
          )}
        >
          {trailing}
        </span>
      ) : null}
    </a>
  );
}

const LEVEL_TONE: Record<string, string> = {
  atom: "text-hn-ink-muted",
  molecule: "text-hn-status-busy",
  organism: "text-hn-status-warn",
};

/** The atomic level of an item, as a quiet mono tag. */
export function LevelTag({ level }: { level: string }) {
  return (
    <span
      className={cx(
        "rounded-hn-sm border border-hn-line-subtle px-1.5 py-px font-hn-mono text-[10.5px]",
        LEVEL_TONE[level]
      )}
    >
      {level}
    </span>
  );
}

// ── The scene every variant frames: the kit, as item cards ─────────────────────────────────

function ItemCard({
  name,
  level,
  registry,
  children,
  wide = false,
}: {
  name: string;
  level: string;
  registry: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section
      className={cx(
        "flex min-w-0 flex-col rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card",
        wide ? "col-span-2" : null
      )}
    >
      <header className="flex items-center gap-2 border-hn-line-subtle border-b px-3.5 py-2">
        <h3 className="m-0 font-medium text-[13px] text-hn-ink-primary">{name}</h3>
        <LevelTag level={level} />
        <span className="ml-auto font-hn-mono text-[11px] text-hn-ink-muted">{registry}</span>
        <span className="text-hn-ink-muted">{Glyph.link}</span>
      </header>
      <div className="flex flex-1 flex-wrap items-center gap-2.5 p-3.5">{children}</div>
    </section>
  );
}

/**
 * The kit scene as every variant shows it: a title row and the first item cards. `columns` is
 * how many cards sit side by side; the variant decides from the room it leaves.
 */
export function KitScene({ columns = 2, compact = false }: { columns?: 1 | 2; compact?: boolean }) {
  return (
    <div className={cx("flex flex-col", compact ? "gap-4" : "gap-6")}>
      <header className="flex flex-col gap-1.5">
        <span className="font-hn-mono text-[11px] text-hn-ink-muted">
          Components · {ACTIVE_SCENE.items} items
        </span>
        <p
          className={cx(
            "m-0 font-hn-display font-semibold text-hn-ink-primary leading-tight tracking-[-0.02em]",
            compact ? "text-[24px]" : "text-[30px]"
          )}
        >
          Kit
        </p>
        <p className="m-0 max-w-[60ch] text-[13px] text-hn-ink-body">
          Every primitive in its board states, built only from semantic tokens.
        </p>
      </header>
      <div className={cx("grid gap-3", columns === 2 ? "grid-cols-2" : "grid-cols-1")}>
        <ItemCard name="Button" level="atom" registry="button" wide={columns === 2}>
          <Button size="sm">Approve</Button>
          <Button size="sm" variant="secondary">
            Poll now
          </Button>
          <Button size="sm" variant="ghost">
            Cancel
          </Button>
          <Button size="sm" variant="danger">
            Scale to 2
          </Button>
          <Button size="sm" variant="outline" disabled>
            Disabled
          </Button>
        </ItemCard>
        <ItemCard name="Switch" level="atom" registry="switch">
          <Switch label="Motion" defaultChecked />
          <Switch label="Motion off" />
        </ItemCard>
        <ItemCard name="StatusBadge" level="atom" registry="status-badge">
          <StatusBadge status="ok" />
          <StatusBadge status="busy" />
          <StatusBadge status="warn" />
          <StatusBadge status="crit" />
        </ItemCard>
        <ItemCard name="Meter" level="molecule" registry="meter" wide={columns === 2}>
          <div className="flex w-full flex-col gap-3">
            <Meter label="Memory" value={83} tone="warn" />
            <Meter label="CPU" value={22} />
          </div>
        </ItemCard>
        <ItemCard name="Input" level="atom" registry="input">
          <Input placeholder="Search machines" className="max-w-[240px]" />
          <Input mono defaultValue="speicher-web" className="max-w-[200px]" />
        </ItemCard>
        <ItemCard name="Badge, Kbd" level="atom" registry="badge">
          <Badge>2 vols</Badge>
          <Badge tone="accent">new</Badge>
          <Kbd>⌘K</Kbd>
          <Kbd>Esc</Kbd>
        </ItemCard>
      </div>
    </div>
  );
}

// ── Shared state for variant controls ──────────────────────────────────────────────────────

/** A tiny store a variant's Controls and its fixtures share, as floating-panels' glass does. */
export function createToggle(param: string) {
  let on =
    typeof location !== "undefined" && new URLSearchParams(location.search).get(param) === "on";
  const listeners = new Set<() => void>();
  const set = (next: boolean) => {
    on = next;
    for (const l of listeners) l();
  };
  const use = () =>
    useSyncExternalStore(
      (l) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
      () => on,
      () => on
    );
  return { set, use };
}

// ── Fixtures ───────────────────────────────────────────────────────────────────────────────

const fixtures: Fixture<GalleryLayout>[] = (["desktop", "phone"] as const).map((screen) => ({
  id: screen,
  label: `Kit scene, ${SCREENS[screen].width} px`,
  note: "The scene content is the same in every column; only the gallery's chrome differs.",
  columns: screen === "desktop" ? 1 : 4,
  render: ({ Gallery }: GalleryLayout) => (
    <ScreenFrame theme="kommandant" screen={screen}>
      <Gallery screen={screen} />
    </ScreenFrame>
  ),
}));

export const category: CategorySpec<GalleryLayout> = {
  title: "Gallery layout",
  question:
    "How is the gallery itself laid out? Each column draws the kit scene with a different chrome: how the 21 scenes are found, where the view settings live, and what stays on screen while you scroll.",
  level: "template",
  fixtures,
};
