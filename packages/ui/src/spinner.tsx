import type { SVGProps } from "react";
import { cx } from "./cx";
import { type DelayedVisibilityOptions, useDelayedVisibility } from "./delayed-visibility";

export type SpinnerProps = Omit<SVGProps<SVGSVGElement>, "children"> &
  DelayedVisibilityOptions & {
    /**
     * Whether the work is still running. Keep the Spinner mounted and flip this, so the minimum
     * visible time can hold: it shows after delayMs and then stays at least minVisibleMs.
     */
    pending?: boolean;
    /** What assistive tech hears while it shows. */
    label?: string;
    /** Edge length in px. */
    size?: number;
  };

/**
 * A pending indicator for work of unknown length. Renders nothing for the first 200 ms, so fast
 * work never flashes it, then at least 400 ms (the motion tokens). Under reduced motion the
 * ring stands still. Route and content loading use Skeleton instead.
 */
export function Spinner({
  pending = true,
  label = "Loading",
  size = 16,
  delayMs,
  minVisibleMs,
  className,
  ...props
}: SpinnerProps) {
  const visible = useDelayedVisibility(pending, { delayMs, minVisibleMs });
  if (!visible) return null;
  return <SpinnerGlyph label={label} size={size} className={className} {...props} />;
}

export type SpinnerGlyphProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  label?: string;
  size?: number;
};

/** The spinner's ring without the timing rule, for a caller that already applies it. */
export function SpinnerGlyph({
  label = "Loading",
  size = 16,
  className,
  ...props
}: SpinnerGlyphProps) {
  return (
    <svg
      role="status"
      aria-busy="true"
      aria-label={label}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={cx("shrink-0 animate-hn-spin motion-reduce:animate-none", className)}
      {...props}
    >
      <circle cx="8" cy="8" r="6.5" strokeWidth="2" className="stroke-hn-line-subtle" />
      <path
        d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-hn-ink-muted"
      />
    </svg>
  );
}
