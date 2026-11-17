// The live editor's draft on the canvas (design#151): DraftPack mounts a theme's pack with its
// draft's skins, following the draft store (gallery/edit.ts), so a change in the inspector redraws
// the page, its viewport iframe and every matrix cell. The token values come in as DraftStyle
// (gallery/editor.tsx). No virtual module here: the tests render the panels that import it.
import { type ReactNode, useSyncExternalStore } from "react";
import { ThemePack } from "../src";
import { draftsVersion, editedPack, getDraft, subscribeDrafts } from "./edit";
import { packFor } from "./packs";

/** Re-renders on every draft change, here or in another frame. */
export const useDrafts = () => useSyncExternalStore(subscribeDrafts, draftsVersion, draftsVersion);

/** A theme's pack with its draft's skins: what PackedPage and the compare panels mount. */
export function DraftPack({ theme, children }: { theme: string; children: ReactNode }) {
  useDrafts();
  return (
    <ThemePack pack={editedPack(packFor(theme), getDraft(theme), packFor)}>{children}</ThemePack>
  );
}
