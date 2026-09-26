import { MARK, WORDMARK } from "./brand-geometry";
import { cx } from "./cx";
import { BRAND_FILL, type BrandProps, type BrandVariant } from "./hansenexus-mark";

/** The text colour for each mark variant: the lime mark stands on ink with paper text. */
export const WORDMARK_TEXT: Record<BrandVariant, BrandVariant> = {
  lime: "paper",
  "lime-deep": "ink",
  ink: "ink",
  paper: "paper",
  mono: "mono",
};

/**
 * The lockup: the mark and `hansenexus` (always lowercase) in Fraunces, outlined, on one
 * baseline. `size` is the height; minimum 16 px on screen.
 */
export function HansenexusWordmark({
  variant = "mono",
  size = 24,
  className,
  "aria-label": label = "hansenexus",
  ...props
}: BrandProps) {
  return (
    <svg
      viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}
      height={size}
      data-variant={variant}
      className={cx("inline-block w-auto shrink-0", className)}
      role="img"
      aria-label={label}
      {...props}
    >
      <g className={BRAND_FILL[variant]}>
        {MARK.polygons.map((points) => (
          <polygon key={points} points={points} />
        ))}
      </g>
      <path className={BRAND_FILL[WORDMARK_TEXT[variant]]} d={WORDMARK.text} />
    </svg>
  );
}
