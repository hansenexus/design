// Geometric, the winner (decisions/illustration-style.json): flat filled shapes in tones of
// currentColor with one token accent. The board now shows the motifs as they ship in
// @hansenexus/illustrations, so the decided column and the package cannot drift apart.
import { EmptyIllustration } from "@hansenexus/illustrations/empty";
import { ErrorIllustration } from "@hansenexus/illustrations/error";
import type { IllustrationStyle } from "./category";

export const variant: IllustrationStyle = {
  label: "Geometric",
  summary:
    "Flat filled shapes in tones of the ink colour, one accent (lime, or crit on error). Reads at a glance and small; less room for detail across eight motifs.",
  Empty: EmptyIllustration,
  Error: ErrorIllustration,
};
