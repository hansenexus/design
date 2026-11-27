// The gallery view: theme, density, mode and viewport, plus the review tools of #60 (compare,
// speed, motion) and the pack compare of design#149 (compare as a list of themes, the matrix),
// read from and written to the query so a view can be linked. The motion set of design#221
// (motionSet) follows the pack's default until the query names one. Pure functions, so
// tests/gallery-view.test.ts covers them without a DOM.
import { SET_IDS } from "@hansenexus/illustrations/sets";
import { type Density, densities, type Mode, modes, motionSetIds } from "@hansenexus/tokens";
import { motionMs } from "../src/motion";
import { findProject, readProject } from "./projects";
import { BUILD_THEMES, GALLERY_THEMES, packMotion } from "./themes";

/** The gallery scenes, one page each: kit is ./, the rest ?scene=<name>. */
export const SCENES = [
  "kit",
  "dialog",
  "alert-dialog",
  "menu",
  "select",
  "tooltip",
  "toast",
  "brand",
  "loading",
  "states",
  "illustrations",
  "school",
  "forms",
  "layout",
  "data",
  "charts",
  "overlays",
  "navigation",
  "controls",
  "motion",
  "shell",
  "patterns",
  "screens",
  "projects",
  "vote",
] as const;
export type Scene = (typeof SCENES)[number];

/** A scene's name in the workbench tree (design#162). */
export const SCENE_LABELS: Record<Scene, string> = {
  kit: "Kit",
  dialog: "Dialog",
  "alert-dialog": "Alert dialog",
  menu: "Menu",
  select: "Select",
  tooltip: "Tooltip",
  toast: "Toast",
  brand: "Brand",
  loading: "Loading",
  states: "States",
  illustrations: "Illustrations",
  school: "School",
  forms: "Forms",
  layout: "Layout",
  data: "Data",
  charts: "Charts",
  overlays: "All overlays",
  navigation: "Navigation",
  controls: "Controls",
  motion: "Motion",
  shell: "Shell",
  patterns: "Page patterns",
  screens: "App screens",
  projects: "Projects",
  vote: "Votes",
};

/**
 * The scenes in the workbench tree's groups (design#162, decisions/gallery-layout.json). Every
 * scene sits in exactly one group; tests/gallery-view.test.ts holds that.
 */
export const SCENE_GROUPS: { id: string; label: string; scenes: Scene[] }[] = [
  {
    id: "foundations",
    label: "Foundations",
    scenes: ["brand", "motion", "illustrations", "school"],
  },
  {
    id: "components",
    label: "Components",
    scenes: [
      "kit",
      "forms",
      "controls",
      "data",
      "charts",
      "loading",
      "states",
      "navigation",
      "layout",
    ],
  },
  {
    id: "overlays",
    label: "Overlays",
    scenes: ["dialog", "alert-dialog", "menu", "select", "tooltip", "toast", "overlays"],
  },
  { id: "templates", label: "Templates", scenes: ["shell", "patterns", "screens", "projects"] },
  { id: "review", label: "Review", scenes: ["vote"] },
];

/** The group a scene sits in. */
export function groupOf(scene: Scene): (typeof SCENE_GROUPS)[number] | undefined {
  return SCENE_GROUPS.find((g) => g.scenes.includes(scene));
}

/** "auto" renders the scene in the page itself; a width renders it in an iframe of that width. */
export const VIEWPORTS = ["auto", "390", "1280"] as const;
export type Viewport = (typeof VIEWPORTS)[number];

/** Playback speed: 0.25 makes every motion token four times as long. */
export const SPEEDS = ["1", "0.5", "0.25"] as const;
export type Speed = (typeof SPEEDS)[number];

/** "reduced" resolves every motion token to 0, as a reduced-motion user would get it. */
export const MOTIONS = ["full", "reduced"] as const;
export type Motion = (typeof MOTIONS)[number];

/**
 * The motion set (design#221): "auto" follows the pack's default (pack.json `motion`, else
 * "default"), any other value is a set id of @hansenexus/tokens.
 */
export const MOTION_SETS: readonly string[] = ["auto", ...motionSetIds];
export type MotionSetChoice = string;

/**
 * What the current theme is compared with: "off", "on" (every theme of this build, the
 * preview cards' panels of #60), or a comma list of themes (design#149), e.g.
 * "fachwerk@live,lexilink". The query keeps it as written.
 */
export type Compare = string;

/** "on" renders the page as a matrix of frames: a column per theme, a row per mode and width. */
export const MATRICES = ["off", "on"] as const;
export type Matrix = (typeof MATRICES)[number];

/** The matrix rows (design#149): light and dark at 1280, then at 390, at a phone's height. */
export const MATRIX_ROWS = [
  { mode: "light", width: 1280, height: 800 },
  { mode: "dark", width: 1280, height: 800 },
  { mode: "light", width: 390, height: 844 },
  { mode: "dark", width: 390, height: 844 },
] as const satisfies readonly { mode: Mode; width: number; height: number }[];

/** "auto" leaves data-density unset, so the theme's own density applies. */
export type DensityChoice = Density | "auto";

/**
 * The illustration set (design#220): "auto" follows the theme pack's default (pack.json
 * "illustrations"), a set id of @hansenexus/illustrations/sets overrides it under any pack.
 */
export const ILLUSTRATION_CHOICES: readonly string[] = ["auto", ...SET_IDS];

/** The set the view draws: its own choice, or the pack's default under "auto". */
export function activeIllustrationSet(
  view: Pick<View, "illustrations">,
  packDefault: string
): string {
  return view.illustrations === "auto" ? packDefault : view.illustrations;
}

export interface View {
  /** A data-theme: a tokens theme or a theme-pack direction (gallery/packs.ts). */
  theme: string;
  density: DensityChoice;
  mode: Mode;
  viewport: Viewport;
  compare: Compare;
  matrix: Matrix;
  speed: Speed;
  motion: Motion;
  motionSet: MotionSetChoice;
  /** "auto" (the pack's default) or a set id: ILLUSTRATION_CHOICES. */
  illustrations: string;
  /** The picked project of workbench/projects.json (design#222), "" for none. */
  project: string;
}

/** Matches index.html: kommandant, dark. */
export const DEFAULT_VIEW: View = {
  theme: "kommandant",
  density: "auto",
  mode: "dark",
  viewport: "auto",
  compare: "off",
  matrix: "off",
  speed: "1",
  motion: "full",
  motionSet: "auto",
  illustrations: "auto",
  project: "",
};

export const VIEW_OPTIONS = {
  theme: GALLERY_THEMES,
  density: ["auto", ...densities] as readonly DensityChoice[],
  mode: modes,
  viewport: VIEWPORTS,
  matrix: MATRICES,
  speed: SPEEDS,
  motion: MOTIONS,
  motionSet: MOTION_SETS,
  illustrations: ILLUSTRATION_CHOICES,
} as const;

const KEYS = [
  "theme",
  "density",
  "mode",
  "viewport",
  "compare",
  "matrix",
  "speed",
  "motion",
  "motionSet",
  "illustrations",
  "project",
] as const;

function pick<T extends string>(list: readonly T[], value: string | null, fallback: T): T {
  return list.find((v) => v === value) ?? fallback;
}

/** "off", "on", or the known themes of a comma list in order, without repeats; else "off". */
export function readCompare(value: string | null): Compare {
  if (value === "on") return "on";
  const list = [...new Set((value ?? "").split(","))].filter((t) => GALLERY_THEMES.includes(t));
  return list.length ? list.join(",") : "off";
}

/** The themes the current one is compared with, none for "off". */
export function compareThemes(view: Pick<View, "compare">): string[] {
  if (view.compare === "on") return [...BUILD_THEMES];
  if (view.compare === "off") return [];
  return view.compare.split(",");
}

/** The themes side by side: the current one first, then those it is compared with. */
export function comparedThemes(view: Pick<View, "theme" | "compare">): string[] {
  return [...new Set([view.theme, ...compareThemes(view)])];
}

/**
 * What a key falls back to when the query leaves it out: the picked project's theme, illustration
 * set and motion set (design#222), else the default view. So ?project=<id> alone is the whole link.
 */
function viewDefaults(project: string): View {
  const picked = findProject(project);
  if (!picked) return DEFAULT_VIEW;
  return {
    ...DEFAULT_VIEW,
    theme: picked.theme ?? DEFAULT_VIEW.theme,
    illustrations: picked.illustrations ?? DEFAULT_VIEW.illustrations,
    motionSet: picked.motion ?? DEFAULT_VIEW.motionSet,
  };
}

export function readView(query: URLSearchParams): View {
  const project = readProject(query.get("project"));
  const defaults = viewDefaults(project);
  return {
    theme: pick(VIEW_OPTIONS.theme, query.get("theme"), defaults.theme),
    density: pick(VIEW_OPTIONS.density, query.get("density"), DEFAULT_VIEW.density),
    mode: pick(VIEW_OPTIONS.mode, query.get("mode"), DEFAULT_VIEW.mode),
    viewport: pick(VIEW_OPTIONS.viewport, query.get("viewport"), DEFAULT_VIEW.viewport),
    compare: readCompare(query.get("compare")),
    matrix: pick(VIEW_OPTIONS.matrix, query.get("matrix"), DEFAULT_VIEW.matrix),
    speed: pick(VIEW_OPTIONS.speed, query.get("speed"), DEFAULT_VIEW.speed),
    motion: pick(VIEW_OPTIONS.motion, query.get("motion"), DEFAULT_VIEW.motion),
    motionSet: pick(VIEW_OPTIONS.motionSet, query.get("motionSet"), defaults.motionSet),
    illustrations: pick(
      VIEW_OPTIONS.illustrations,
      query.get("illustrations"),
      defaults.illustrations
    ),
    project,
  };
}

/** A relative link to a scene that keeps the view: kit is ./, the rest ?scene=<name>. */
export function sceneHref(scene: Scene, view: View): string {
  const q = writeView(
    new URLSearchParams(scene === "kit" ? "" : `scene=${scene}`),
    view
  ).toString();
  return q ? `?${q}` : "./";
}

/** A relative link to a registry item's page (#59), keeping the view: ?item=<name>. */
export function itemHref(item: string, view: View): string {
  return `?${writeView(new URLSearchParams({ item }), view).toString()}`;
}

/**
 * A copy of `query` with the view's keys set; defaults are dropped so plain links stay plain. Under
 * a picked project its theme, illustration set and motion set are the defaults, so an override is
 * written out even when it is the default view's value.
 */
export function writeView(query: URLSearchParams, view: View): URLSearchParams {
  const next = new URLSearchParams(query);
  const defaults = viewDefaults(view.project);
  for (const key of KEYS) {
    if (view[key] === defaults[key]) next.delete(key);
    else next.set(key, view[key]);
  }
  return next;
}

/**
 * The query the viewport iframe loads: same view and scene at the frame's own width. frame=1 hides
 * the nav and toolbar there; the cards keep their replay and copy actions.
 */
export function frameQuery(query: URLSearchParams, view: View): URLSearchParams {
  const next = writeView(query, { ...view, viewport: "auto" });
  next.set("frame", "1");
  return next;
}

/**
 * The query of one matrix cell (design#149): the page alone (bare), under `theme` in `mode`, at
 * the frame's own width; no compare or matrix inside it.
 */
export function matrixQuery(
  query: URLSearchParams,
  view: View,
  theme: string,
  mode: Mode
): URLSearchParams {
  const next = writeView(query, {
    ...view,
    theme,
    mode,
    viewport: "auto",
    compare: "off",
    matrix: "off",
  });
  next.delete("frame");
  next.set("bare", "1");
  return next;
}

/** The motion set in play: the view's, or for "auto" the pack's default, else "default". */
export function activeMotionSet(view: Partial<Pick<View, "theme" | "motionSet">>): string {
  if (view.motionSet && view.motionSet !== "auto") return view.motionSet;
  return (view.theme && packMotion(view.theme)) || "default";
}

/**
 * The attributes @hansenexus/tokens reads: data-theme, data-mode, data-density, data-motion
 * (the motion set, design#221), and data-reduced-motion, which its motion-reduce: variant
 * matches whatever the OS says (#91).
 */
export function viewAttributes(
  view: View
): Record<"theme" | "mode" | "density" | "motion" | "reducedMotion", string | null> {
  return {
    theme: view.theme,
    mode: view.mode,
    density: view.density === "auto" ? null : view.density,
    motion: activeMotionSet(view),
    reducedMotion: view.motion === "reduced" ? "" : null,
  };
}

/** What the "copy install" action puts on the clipboard for a registry item. */
export function installCommand(item: string): string {
  return `/design add ${item}`;
}

/** The factor on every motion token: 1 / speed, or 0 under reduced motion. */
export function motionScale(view: Pick<View, "speed" | "motion">): number {
  return view.motion === "reduced" ? 0 : 1 / Number(view.speed);
}

/**
 * Every duration token as [css variable, ms] at `scale`, from motionMs of @hansenexus/ui, in the
 * motion set `set` (the default without one).
 */
export function motionTokens(scale = 1, set?: string): [string, number][] {
  return Object.entries(motionMs(scale, set)).flatMap(([group, values]) =>
    Object.entries(values).map(([key, value]): [string, number] => [`--hn-${group}-${key}`, value])
  );
}

/** What the motion variables and timings depend on; theme and motionSet pick the set. */
type MotionView = Pick<View, "speed" | "motion"> & Partial<Pick<View, "theme" | "motionSet">>;

/**
 * The motion variables to set at the gallery root: each duration token of the active motion set
 * times motionScale. Empty at the default scale, so data-motion's values apply and the
 * screenshot baselines hold. Component code is untouched; it reads the variables.
 */
export function motionVariables(view: MotionView): Record<string, string> {
  const scale = motionScale(view);
  if (scale === 1) return {};
  return Object.fromEntries(
    motionTokens(scale, activeMotionSet(view)).map(([name, value]) => [name, `${value}ms`])
  );
}

/** QueryState's statuses in the order the auto-loop shows them; "data" is the success state. */
export const LOOP = ["loading", "empty", "error", "data"] as const;
export type LoopStatus = (typeof LOOP)[number];

/** How long the auto-loop holds a result (empty, error, data) at speed 1, long enough to read. */
export const LOOP_HOLD_MS = 2000;

/**
 * The auto-loop's timings at this view, from the motion tokens: the loading indicator shows after
 * delay.pending and stays min-visible.pending, so loading lasts their sum; a result holds
 * LOOP_HOLD_MS. The loop runs at 1 / speed; reduced motion zeroes the indicator's delay and
 * minimum, not the loop, so every state still stays on screen long enough to read.
 */
export function loopTimings(view: MotionView) {
  const pace = 1 / Number(view.speed);
  const set = activeMotionSet(view);
  const ms = motionMs(1, set);
  const scaled = motionMs(motionScale(view), set);
  const delayMs = scaled.delay.pending;
  const minVisibleMs = scaled["min-visible"].pending;
  return {
    delayMs,
    minVisibleMs,
    steps: LOOP.map((status) => ({
      status,
      ms:
        status === "loading"
          ? (ms.delay.pending + ms["min-visible"].pending) * pace
          : LOOP_HOLD_MS * pace,
    })),
  };
}
