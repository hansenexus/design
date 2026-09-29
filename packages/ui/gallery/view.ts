// The gallery view: theme, density, mode and viewport, plus the review tools of #60 (compare,
// speed, motion), read from and written to the query so a view can be linked. Pure functions, so
// tests/gallery-view.test.ts covers them without a DOM.
import {
  type Density,
  densities,
  type Mode,
  modes,
  ms,
  type Theme,
  themes,
} from "@hansenexus/tokens";

/** "auto" renders the scene in the page itself; a width renders it in an iframe of that width. */
export const VIEWPORTS = ["auto", "390", "1280"] as const;
export type Viewport = (typeof VIEWPORTS)[number];

/** Playback speed: 0.25 makes every motion token four times as long. */
export const SPEEDS = ["1", "0.5", "0.25"] as const;
export type Speed = (typeof SPEEDS)[number];

/** "reduced" resolves every motion token to 0, as a reduced-motion user would get it. */
export const MOTIONS = ["full", "reduced"] as const;
export type Motion = (typeof MOTIONS)[number];

/** "on" renders each preview card once per theme, side by side. */
export const COMPARES = ["off", "on"] as const;
export type Compare = (typeof COMPARES)[number];

/** "auto" leaves data-density unset, so the theme's own density applies. */
export type DensityChoice = Density | "auto";

export interface View {
  theme: Theme;
  density: DensityChoice;
  mode: Mode;
  viewport: Viewport;
  compare: Compare;
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
  speed: "1",
  motion: "full",
};

export const VIEW_OPTIONS = {
  theme: themes,
  density: ["auto", ...densities] as readonly DensityChoice[],
  mode: modes,
  viewport: VIEWPORTS,
  compare: COMPARES,
  speed: SPEEDS,
  motion: MOTIONS,
} as const;

const KEYS = ["theme", "density", "mode", "viewport", "compare", "speed", "motion"] as const;

function pick<T extends string>(list: readonly T[], value: string | null, fallback: T): T {
  return list.find((v) => v === value) ?? fallback;
}

export function readView(query: URLSearchParams): View {
  return {
    theme: pick(VIEW_OPTIONS.theme, query.get("theme"), DEFAULT_VIEW.theme),
    density: pick(VIEW_OPTIONS.density, query.get("density"), DEFAULT_VIEW.density),
    mode: pick(VIEW_OPTIONS.mode, query.get("mode"), DEFAULT_VIEW.mode),
    viewport: pick(VIEW_OPTIONS.viewport, query.get("viewport"), DEFAULT_VIEW.viewport),
    compare: pick(VIEW_OPTIONS.compare, query.get("compare"), DEFAULT_VIEW.compare),
    speed: pick(VIEW_OPTIONS.speed, query.get("speed"), DEFAULT_VIEW.speed),
    motion: pick(VIEW_OPTIONS.motion, query.get("motion"), DEFAULT_VIEW.motion),
  };
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

/** The attributes @hansenexus/tokens reads: data-theme, data-mode, data-density. */
export function viewAttributes(view: View): Record<"theme" | "mode" | "density", string | null> {
  return {
    theme: view.theme,
    mode: view.mode,
    density: view.density === "auto" ? null : view.density,
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

/** Every duration token as [css variable, ms], from the ms export of @hansenexus/tokens. */
export function motionTokens(): [string, number][] {
  const out: [string, number][] = [];
  const walk = (node: object, path: string[]) => {
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === "number") out.push([`--hn-${[...path, key].join("-")}`, value]);
      else walk(value, [...path, key]);
    }
  };
  walk(ms, []);
  return out;
}

/**
 * The motion variables to set at the gallery root: each duration token times motionScale. Empty
 * at the default scale, so the tokens' own values apply and the screenshot baselines hold.
 * Component code is untouched; it reads the variables.
 */
export function motionVariables(view: Pick<View, "speed" | "motion">): Record<string, string> {
  const scale = motionScale(view);
  if (scale === 1) return {};
  return Object.fromEntries(motionTokens().map(([name, value]) => [name, `${value * scale}ms`]));
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
  const scale = motionScale(view);
  const delayMs = ms.delay.pending * scale;
  const minVisibleMs = ms["min-visible"].pending * scale;
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
