import type { ThemePackDefinition } from "@hansenexus/ui";
import { skins } from "./fachwerk/skins";

/** Direction B "Fachwerk", the pack's default: data-theme="fachwerk". */
export const fachwerk: ThemePackDefinition = { id: "fachwerk", skins };

/**
 * Direction "rund" (design#243): fachwerk's colours on a round, roomier mask, set entirely by
 * recipe tokens, so it has no skins: data-theme="fachwerk-rund".
 */
export const fachwerkRund: ThemePackDefinition = { id: "fachwerk-rund" };

/** Every direction of the pack, the default first. */
export const directions: readonly ThemePackDefinition[] = [fachwerk, fachwerkRund];
