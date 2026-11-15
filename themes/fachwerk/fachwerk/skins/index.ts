import type { Skins } from "@hansenexus/ui";
import { CardHeader } from "./card.header";
import { EmptyState } from "./empty-state";

/** The direction's skins: what the recipes cannot say. Every other slot renders the default. */
export const skins: Skins = {
  "card.header": CardHeader,
  "empty-state": EmptyState,
};
