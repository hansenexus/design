// The theme packs the gallery renders (design#143): each @hansenexus/theme-<app> package's
// directions, from the source in themes/. Their tokens come in as gallery/dist/packs.css
// (scripts/gallery.ts), their skins through ThemePack. lexilink is also bundled into
// @hansenexus/tokens, so it is already a core theme choice; the others add theirs.
import { themes } from "@hansenexus/tokens";
import { directions as fachwerk } from "../../../themes/fachwerk";
import { directions as lexilink } from "../../../themes/lexilink";
import type { ThemePackDefinition } from "../src";

export const PACKS: readonly ThemePackDefinition[] = [...lexilink, ...fachwerk];

/** Every data-theme the gallery offers: the tokens' themes, then each pack direction not in them. */
export const GALLERY_THEMES: readonly string[] = [
  ...themes,
  ...PACKS.map((p) => p.id).filter((id) => !(themes as readonly string[]).includes(id)),
];

const NO_PACK: ThemePackDefinition = { id: "none" };

/** The pack whose id is `theme`, or one without skins: every slot renders the default. */
export function packFor(theme: string): ThemePackDefinition {
  return PACKS.find((p) => p.id === theme) ?? NO_PACK;
}
