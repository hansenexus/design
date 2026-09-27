import { Label as LabelPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx } from "./cx";

export type LabelProps = ComponentProps<typeof LabelPrimitive.Root> & {
  /** Shows the `*` marker. It is aria-hidden: the control carries aria-required instead. */
  required?: boolean;
  /** Dims the label with its disabled control. */
  disabled?: boolean;
};

/** A control's visible name, on Radix Label (a double click does not select its text). */
export function Label({
  required = false,
  disabled = false,
  className,
  children,
  ...props
}: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-disabled={disabled ? "" : undefined}
      className={cx(
        "font-hn-sans text-[13px] font-medium text-hn-ink-primary",
        // Also dim inside a disabled fieldset, the way a pending form disables its controls.
        disabled
          ? "cursor-not-allowed opacity-50"
          : "in-disabled:cursor-not-allowed in-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="ml-0.5 text-hn-ink-muted">
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  );
}
