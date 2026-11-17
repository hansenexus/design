// The data-themes the gallery offers (design#143), grouped into packs for the pack switcher
// (design#149): the core themes of @hansenexus/tokens, then each theme pack's directions, each also
// as its live copy `<id>@live`, built from main (scripts/live.ts), so a theme-pack branch compares
// against what ships. Kept apart from packs.ts, which imports the packs' skins, so the view module
// (and the Playwright specs that read it) loads no pack source.
// tests/packs.test.tsx holds PACK_APPS and PACK_THEMES to the packs of gallery/packs.ts.
import { themes } from "@hansenexus/tokens";

/** The theme packs under themes/, by app. */
export const PACK_APPS: readonly string[] = ["lexilink", "fachwerk"];

/**
 * Each pack's default motion set (design#221), the `motion` of its pack.json, by app; a pack
 * without one is not listed. Kept here rather than imported, so the Playwright specs load no
 * JSON; tests/gallery-motion-sets.test.tsx holds it to every pack.json.
 */
export const PACK_MOTION: Record<string, string> = {};

/** The pack directions @hansenexus/tokens does not bundle, by data-theme. */
export const PACK_THEMES: readonly string[] = ["fachwerk"];

/** The suffix of a pack direction's live copy: `fachwerk@live`. */
export const LIVE = "@live";

/** The pack a theme belongs to: its app, or "core" for the tokens' own themes. */
export function packOf(theme: string): string {
  const id = theme.endsWith(LIVE) ? theme.slice(0, -LIVE.length) : theme;
  return PACK_APPS.find((app) => id === app || id.startsWith(`${app}-`)) ?? "core";
}

/** The default motion set of the pack `theme` belongs to (pack.json `motion`), if it names one. */
export function packMotion(theme: string): string | undefined {
  return PACK_MOTION[packOf(theme)];
}

/** Every pack direction, bundled in the tokens or not: lexilink, fachwerk. */
const DIRECTIONS: readonly string[] = [...themes, ...PACK_THEMES].filter(
  (t) => packOf(t) !== "core"
);

/** The live copy of every pack direction. */
export const LIVE_THEMES: readonly string[] = DIRECTIONS.map((t) => `${t}${LIVE}`);

/** Every data-theme the gallery offers: the tokens' themes, the pack directions, their live copies. */
export const GALLERY_THEMES: readonly string[] = [...themes, ...PACK_THEMES, ...LIVE_THEMES];

/** The themes a compare of "on" shows: every theme of this build, no live copies. */
export const BUILD_THEMES: readonly string[] = [...themes, ...PACK_THEMES];

/** The pack switcher's packs, each with its directions, the live copies after them. */
export const PACK_GROUPS: readonly { pack: string; directions: readonly string[] }[] = [
  "core",
  ...PACK_APPS,
].map((pack) => ({
  pack,
  directions: GALLERY_THEMES.filter((t) => packOf(t) === pack).sort(
    (a, b) => Number(a.endsWith(LIVE)) - Number(b.endsWith(LIVE))
  ),
}));
