// The gallery view: theme, density, mode and viewport, read from and written to the query so a
// view can be linked. Pure functions, so tests/gallery-view.test.ts covers them without a DOM.
import { type Density, densities, type Mode, modes, type Theme, themes } from "@hansenexus/tokens";

/** "auto" renders the scene in the page itself; a width renders it in an iframe of that width. */
export const VIEWPORTS = ["auto", "390", "1280"] as const;
export type Viewport = (typeof VIEWPORTS)[number];

/** "auto" leaves data-density unset, so the theme's own density applies. */
export type DensityChoice = Density | "auto";

export interface View {
  theme: Theme;
  density: DensityChoice;
  mode: Mode;
  viewport: Viewport;
}

/** Matches index.html: kommandant, dark. */
export const DEFAULT_VIEW: View = {
  theme: "kommandant",
  density: "auto",
  mode: "dark",
  viewport: "auto",
};

export const VIEW_OPTIONS = {
  theme: themes,
  density: ["auto", ...densities] as readonly DensityChoice[],
  mode: modes,
  viewport: VIEWPORTS,
} as const;

const KEYS = ["theme", "density", "mode", "viewport"] as const;

function pick<T extends string>(list: readonly T[], value: string | null, fallback: T): T {
  return list.find((v) => v === value) ?? fallback;
}

export function readView(query: URLSearchParams): View {
  return {
    theme: pick(VIEW_OPTIONS.theme, query.get("theme"), DEFAULT_VIEW.theme),
    density: pick(VIEW_OPTIONS.density, query.get("density"), DEFAULT_VIEW.density),
    mode: pick(VIEW_OPTIONS.mode, query.get("mode"), DEFAULT_VIEW.mode),
    viewport: pick(VIEW_OPTIONS.viewport, query.get("viewport"), DEFAULT_VIEW.viewport),
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
