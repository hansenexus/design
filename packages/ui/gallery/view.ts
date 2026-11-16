// The gallery view: theme, density, mode and viewport, plus the review tools of #60 (compare,
// speed, motion) and the pack compare of design#149 (compare as a list of themes, the matrix),
// read from and written to the query so a view can be linked. Pure functions, so
// tests/gallery-view.test.ts covers them without a DOM.
import { type Density, densities, type Mode, modes } from "@hansenexus/tokens";
import { motionMs } from "../src/motion";
import { BUILD_THEMES, GALLERY_THEMES } from "./themes";

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
  "screens",
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
  screens: "App screens",
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
  { id: "templates", label: "Templates", scenes: ["shell", "screens"] },
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
};

export const VIEW_OPTIONS = {
  theme: GALLERY_THEMES,
  density: ["auto", ...densities] as readonly DensityChoice[],
  mode: modes,
  viewport: VIEWPORTS,
  matrix: MATRICES,
  speed: SPEEDS,
  motion: MOTIONS,
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

export function readView(query: URLSearchParams): View {
  return {
    theme: pick(VIEW_OPTIONS.theme, query.get("theme"), DEFAULT_VIEW.theme),
    density: pick(VIEW_OPTIONS.density, query.get("density"), DEFAULT_VIEW.density),
    mode: pick(VIEW_OPTIONS.mode, query.get("mode"), DEFAULT_VIEW.mode),
    viewport: pick(VIEW_OPTIONS.viewport, query.get("viewport"), DEFAULT_VIEW.viewport),
    compare: readCompare(query.get("compare")),
    matrix: pick(VIEW_OPTIONS.matrix, query.get("matrix"), DEFAULT_VIEW.matrix),
    speed: pick(VIEW_OPTIONS.speed, query.get("speed"), DEFAULT_VIEW.speed),
    motion: pick(VIEW_OPTIONS.motion, query.get("motion"), DEFAULT_VIEW.motion),
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

/** A copy of `query` with the view's keys set; defaults are dropped so plain links stay plain. */
export function writeView(query: URLSearchParams, view: View): URLSearchParams {
  const next = new URLSearchParams(query);
  for (const key of KEYS) {
    if (view[key] === DEFAULT_VIEW[key]) next.delete(key);
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

/**
 * The attributes @hansenexus/tokens reads: data-theme, data-mode, data-density, and
 * data-reduced-motion, which its motion-reduce: variant matches whatever the OS says (#91).
 */
export function viewAttributes(
  view: View
): Record<"theme" | "mode" | "density" | "reducedMotion", string | null> {
  return {
    theme: view.theme,
    mode: view.mode,
    density: view.density === "auto" ? null : view.density,
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

/** Every duration token as [css variable, ms] at `scale`, from motionMs of @hansenexus/ui. */
export function motionTokens(scale = 1): [string, number][] {
  return Object.entries(motionMs(scale)).flatMap(([group, values]) =>
    Object.entries(values).map(([key, value]): [string, number] => [`--hn-${group}-${key}`, value])
  );
}

/**
 * The motion variables to set at the gallery root: each duration token times motionScale. Empty
 * at the default scale, so the tokens' own values apply and the screenshot baselines hold.
 * Component code is untouched; it reads the variables.
 */
export function motionVariables(view: Pick<View, "speed" | "motion">): Record<string, string> {
  const scale = motionScale(view);
  if (scale === 1) return {};
  return Object.fromEntries(motionTokens(scale).map(([name, value]) => [name, `${value}ms`]));
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
export function loopTimings(view: Pick<View, "speed" | "motion">) {
  const pace = 1 / Number(view.speed);
  const ms = motionMs();
  const scaled = motionMs(motionScale(view));
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
