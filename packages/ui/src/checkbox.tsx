import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cx, focusRing } from "./cx";
import { CheckIcon, MinusIcon } from "./icons";

export type CheckboxProps = ComponentProps<typeof CheckboxPrimitive.Root> & {
  /** Visible label after the box. Without it, pass aria-label, aria-labelledby or wrap it in Field. */
  label?: ReactNode;
};

/**
 * A checkbox on Radix Checkbox: Space toggles, `checked="indeterminate"` draws a dash. Checked is
 * a flat lime fill with a dark mark, as Switch. The 18 px box sits in a row of the density's
 * target height when it has a label.
 */
export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const control = (
    <CheckboxPrimitive.Root
      id={controlId}
      className={cx(
        "peer inline-flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-hn-sm border border-hn-line-strong bg-hn-surface-page text-hn-action-primary-ink",
        "data-[state=checked]:border-hn-action-primary data-[state=checked]:bg-hn-action-primary",
        "data-[state=indeterminate]:border-hn-action-primary data-[state=indeterminate]:bg-hn-action-primary",
        "aria-invalid:border-hn-status-crit disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors duration-(--hn-duration-fast) motion-reduce:transition-none",
        focusRing,
        label ? undefined : className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="group/mark flex items-center justify-center [&_svg]:size-3.5">
        <CheckIcon strokeWidth={3} className="group-data-[state=indeterminate]/mark:hidden" />
        <MinusIcon strokeWidth={3} className="hidden group-data-[state=indeterminate]/mark:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
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
