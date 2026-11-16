// The theme packs the gallery renders (design#143): each @hansenexus/theme-<app> package's
// directions, from the source in themes/. Their tokens come in as gallery/dist/packs.css
// (scripts/gallery.ts), their skins through ThemePack. lexilink is also bundled into
// @hansenexus/tokens, so it is already a core theme choice; the others add theirs
// (gallery/themes.ts lists their ids for the pack switcher).
// The live copies `<id>@live` (design#149), built from main by scripts/live.ts, are registered
// by main.tsx from `virtual:live-packs`, so this module (and the tests that import it) needs no
// gallery build.
import { directions as fachwerk } from "../../../themes/fachwerk";
import { directions as lexilink } from "../../../themes/lexilink";
import type { ThemePackDefinition } from "../src";

export const PACKS: readonly ThemePackDefinition[] = [...lexilink, ...fachwerk];

const NO_PACK: ThemePackDefinition = { id: "none" };

let live: readonly ThemePackDefinition[] = [];

/** The live copies of the packs, from main (main.tsx, `virtual:live-packs`). */
export function registerLive(packs: readonly ThemePackDefinition[]) {
  live = packs;
}

/** The pack whose id is `theme`, or one without skins: every slot renders the default. */
export function packFor(theme: string): ThemePackDefinition {
  return PACKS.find((p) => p.id === theme) ?? live.find((p) => p.id === theme) ?? NO_PACK;
}
