// The data-themes the gallery offers (design#143): the tokens' themes, then each theme-pack
// direction not among them. Kept apart from packs.ts, which imports the packs' skins, so the
// view module (and the Playwright specs that read it) loads no pack source.
// tests/packs.test.tsx holds PACK_THEMES to the ids of gallery/packs.ts's PACKS.
import { themes } from "@hansenexus/tokens";

/** The pack directions @hansenexus/tokens does not bundle, by data-theme. */
export const PACK_THEMES: readonly string[] = ["fachwerk"];

/** Every data-theme the gallery offers: the tokens' themes, then the pack directions. */
export const GALLERY_THEMES: readonly string[] = [...themes, ...PACK_THEMES];
