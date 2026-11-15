import type { ThemePackDefinition } from "@hansenexus/ui";
import { skins } from "./fachwerk/skins";

/** Direction B "Fachwerk", the pack's default: data-theme="fachwerk". */
export const fachwerk: ThemePackDefinition = { id: "fachwerk", skins };

/** Every direction of the pack, the default first. */
export const directions: readonly ThemePackDefinition[] = [fachwerk];
