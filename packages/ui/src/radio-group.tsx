import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cx, focusRing } from "./cx";

export type RadioGroupProps = ComponentProps<typeof RadioGroupPrimitive.Root>;

/**
 * One choice out of a few, on Radix RadioGroup: Tab enters the group at the checked item, the
 * arrow keys move and select. Name it with aria-label, aria-labelledby or by wrapping it in Field,
 * which also passes aria-invalid and aria-describedby to the group.
 */
export function RadioGroup({ className, orientation, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      orientation={orientation}
      className={cx(
        "flex gap-x-5 gap-y-0.5",
        orientation === "horizontal" ? "flex-row flex-wrap" : "flex-col",
        className
      )}
      {...props}
    />
  );
}

export type RadioGroupItemProps = ComponentProps<typeof RadioGroupPrimitive.Item> & {
  /** Visible label after the circle. Without it, pass aria-label. */
  label?: ReactNode;
};

/** A radio: hollow circle, checked is a flat lime fill with a dark dot. */
export function RadioGroupItem({ label, className, id, ...props }: RadioGroupItemProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const control = (
    <RadioGroupPrimitive.Item
      id={controlId}
      className={cx(
        "peer inline-flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-hn-pill border border-hn-line-strong bg-hn-surface-page",
        "data-[state=checked]:border-hn-action-primary data-[state=checked]:bg-hn-action-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "in-[[aria-invalid=true]]:data-[state=unchecked]:border-hn-status-crit",
        "transition-colors duration-(--hn-duration-fast) motion-reduce:transition-none",
        focusRing,
        label ? undefined : className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="block size-2 rounded-hn-pill bg-hn-action-primary-ink" />
    </RadioGroupPrimitive.Item>
  );
  if (!label) return control;
  return (
    <span
      className={cx(
        "inline-flex min-h-hn-target items-center gap-2.5 font-hn-sans text-[13px] text-hn-ink-body",
        className
      )}
    >
      {control}
      <label
        htmlFor={controlId}
        className="cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
      >
        {label}
      </label>
    </span>
  );
}
