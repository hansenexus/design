// Progressive reveal: static placeholders fade in top to bottom in reading order, one step every
// 90 ms, so the page assembles instead of appearing at once. Reduced motion shows them at once.
// The 240 ms fade and 90 ms step are candidates: the winner turns them into motion tokens.
import type { CSSProperties } from "react";
import { cx, Skeleton } from "../../../src";
import type { BoneProps, SkeletonStyle } from "./category";

function Bone({ step, className, style, ...props }: BoneProps) {
  return (
    <Skeleton
      className={cx("skeleton-reveal", className)}
      style={{ "--skeleton-step": step, ...style } as CSSProperties}
      {...props}
    />
  );
}

export const variant: SkeletonStyle = {
  label: "Progressive reveal",
  summary:
    "Still blocks fade in top to bottom, 90 ms per step. Shows the page's structure arriving; motion only at the start.",
  css: `
@keyframes skeleton-reveal { from { opacity: 0; } }
.skeleton-reveal {
  animation: skeleton-reveal 240ms var(--hn-pulse-easing) calc(var(--skeleton-step, 0) * 90ms) both;
}
.skeleton-reveal * { animation: none; }
@media (prefers-reduced-motion: reduce) { .skeleton-reveal { animation: none; } }
`,
  Bone,
};
