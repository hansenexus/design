// Static blocks: the placeholders stand still in skeleton.base. No motion at all, so the page
// reads as "not here yet" only through shape; nothing signals that work is ongoing.
import { cx, Skeleton } from "../../../src";
import type { BoneProps, SkeletonStyle } from "./category";

function Bone({ step: _step, className, ...props }: BoneProps) {
  return <Skeleton className={cx("skeleton-static", className)} {...props} />;
}

export const variant: SkeletonStyle = {
  label: "Static blocks",
  summary:
    "Placeholders stand still in skeleton.base. Calmest and cheapest; nothing shows the load is still running.",
  css: ".skeleton-static, .skeleton-static * { animation: none; }",
  Bone,
};
