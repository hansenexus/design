import { Slider as SliderPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx, focusRing } from "./cx";

export type SliderProps = ComponentProps<typeof SliderPrimitive.Root> & {
  /** One accessible name per thumb, in value order ("Minimum", "Maximum" for a range). */
  thumbLabels?: string[];
};

/**
 * A value on a track, on Radix Slider: one thumb per entry of `value` / `defaultValue`, so two
 * make a range. The arrow keys step, Page Up/Down step by ten, Home and End jump to the ends.
 * Name a single slider with aria-label or aria-labelledby (both land on the thumb); a range with
 * `thumbLabels`.
 */
export function Slider({
  className,
  value,
  defaultValue,
  min = 0,
  max = 100,
  thumbLabels,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: SliderProps) {
  const thumbs = (value ?? defaultValue ?? [min]).length;
  return (
    <SliderPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      className={cx(
        "relative flex w-full touch-none items-center select-none",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        "min-h-hn-target data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative grow overflow-hidden rounded-hn-pill bg-hn-surface-raised data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5">
        <SliderPrimitive.Range className="absolute bg-hn-action-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbs }, (_, i) => (
        <SliderPrimitive.Thumb
          // biome-ignore lint/suspicious/noArrayIndexKey: thumbs are positional, one per value
          key={i}
          aria-label={thumbLabels?.[i] ?? ariaLabel}
          aria-labelledby={thumbLabels?.[i] ? undefined : ariaLabelledBy}
          className={cx(
            "block size-[18px] cursor-grab rounded-hn-pill border-2 border-hn-action-primary bg-hn-surface-page shadow-hn-lift",
            "transition-colors duration-(--hn-duration-fast) motion-reduce:transition-none",
            "hover:bg-hn-surface-raised active:cursor-grabbing data-disabled:cursor-not-allowed",
            focusRing
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}
