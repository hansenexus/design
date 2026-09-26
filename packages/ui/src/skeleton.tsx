import type { ComponentProps, CSSProperties } from "react";
import { cx } from "./cx";

export type SkeletonShape = "block" | "text" | "circle";

export const SKELETON_SHAPES: readonly SkeletonShape[] = ["block", "text", "circle"];

const SHAPE: Record<SkeletonShape, string> = {
  block: "rounded-hn-md",
  text: "h-[0.75em] rounded-hn-sm",
  circle: "aspect-square rounded-full",
};

/** The pulse runs skeleton.base to skeleton.highlight; reduced motion keeps base, still. */
const FILL = "block bg-hn-skeleton-base animate-hn-pulse motion-reduce:animate-none";

export type SkeletonProps = Omit<ComponentProps<"span">, "children"> & {
  /** block: a card or media box; text: lines of copy; circle: an avatar or icon. */
  shape?: SkeletonShape;
  /** CSS width; a number is px. Text lines default to the full width, the last one shorter. */
  width?: number | string;
  /** CSS height; a number is px. For circle, the diameter is the width. */
  height?: number | string;
  /** Text only: how many lines. */
  lines?: number;
};

const size = (v: number | string | undefined) => (typeof v === "number" ? `${v}px` : v);

/**
 * A loading placeholder in the shape of the content it stands for. Decorative (aria-hidden):
 * the loading state is announced by the container, SkeletonGroup or its own aria-busy.
 */
export function Skeleton({
  shape = "block",
  width,
  height,
  lines = 1,
  className,
  style,
  ...props
}: SkeletonProps) {
  const box: CSSProperties = { width: size(width), height: size(height), ...style };
  if (shape === "text" && lines > 1) {
    return (
      <span
        aria-hidden="true"
        data-shape={shape}
        className={cx("flex flex-col gap-[0.5em]", className)}
        style={{ width: size(width), ...style }}
        {...props}
      >
        {Array.from({ length: lines }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: lines are identical and never reorder
            key={i}
            className={cx(FILL, SHAPE.text, i === lines - 1 ? "w-3/5" : "w-full")}
            style={{ height: size(height) }}
          />
        ))}
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      data-shape={shape}
      className={cx(FILL, SHAPE[shape], className)}
      style={box}
      {...props}
    />
  );
}

export type SkeletonGroupProps = ComponentProps<"div"> & {
  /** What assistive tech hears while the placeholders show. */
  label?: string;
};

/** The container for skeletons: aria-busy while loading, one polite "Loading" for screen readers. */
export function SkeletonGroup({
  label = "Loading",
  className,
  children,
  ...props
}: SkeletonGroupProps) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className} {...props}>
      {children}
    </div>
  );
}
