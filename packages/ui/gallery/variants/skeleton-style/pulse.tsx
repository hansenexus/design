// Pulse: every placeholder breathes from skeleton.base to skeleton.highlight, all in step.
// The winner of the vote (decisions/skeleton-style.json) and the default of Skeleton; reduced
// motion holds it still.
import { Skeleton } from "../../../src";
import type { BoneProps, SkeletonStyle } from "./category";

function Bone({ step: _step, ...props }: BoneProps) {
  return <Skeleton {...props} />;
}

export const variant: SkeletonStyle = {
  label: "Pulse",
  summary:
    "All placeholders pulse together (1600 ms, skeleton.base to highlight). Clearly alive; the most motion on a busy page.",
  Bone,
};
