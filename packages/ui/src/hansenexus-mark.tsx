import type { SVGProps } from "react";
import { MARK } from "./brand-geometry";
import { cx } from "./cx";

/**
 * Flat colours only: lime (on ink), lime-deep (on light surfaces, where lime falls below
 * 3:1), ink, paper, and mono (`currentColor`, the default). Never a gradient, glow or outline.
 */
export type BrandVariant = "lime" | "lime-deep" | "ink" | "paper" | "mono";

export const BRAND_VARIANTS: readonly BrandVariant[] = [
  "lime",
  "lime-deep",
  "ink",
  "paper",
  "mono",
];

/** The fill utility per variant; brand.* tokens are the same in both modes. */
export const BRAND_FILL: Record<BrandVariant, string> = {
  lime: "fill-hn-brand-lime",
  "lime-deep": "fill-hn-brand-lime-deep",
  ink: "fill-hn-brand-ink",
  paper: "fill-hn-brand-paper",
  mono: "fill-current",
};

/** Named "hansenexus" by default; with `aria-hidden` it is decoration next to the name. */
export type BrandProps = Omit<SVGProps<SVGSVGElement>, "children" | "viewBox"> & {
  variant?: BrandVariant;
  /** Height in px (or any CSS length); the width follows the aspect ratio. */
  size?: number | string;
};

/** The hansenexus mark. Minimum 16 px wide on screen (12 px high). */
export function HansenexusMark({
  variant = "mono",
  size = 24,
  className,
  "aria-label": label = "hansenexus",
  ...props
}: BrandProps) {
  return (
    <svg
      viewBox={`0 0 ${MARK.width} ${MARK.height}`}
      height={size}
      data-variant={variant}
      className={cx("inline-block w-auto shrink-0", BRAND_FILL[variant], className)}
      role="img"
      aria-label={label}
      {...props}
    >
      {MARK.polygons.map((points) => (
        <polygon key={points} points={points} />
      ))}
    </svg>
  );
}
