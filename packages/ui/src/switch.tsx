import { Switch as SwitchPrimitive } from "radix-ui";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cx, focusRing } from "./cx";

export type SwitchProps = ComponentProps<typeof SwitchPrimitive.Root> & {
  /** Visible label before the track. Without it, pass aria-label or aria-labelledby. */
  label?: ReactNode;
};

/** An on/off setting (Motion). Lime track when on, with a dark knob. */
export function Switch({ label, className, id, ...props }: SwitchProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const control = (
    <SwitchPrimitive.Root
      id={controlId}
      className={cx(
        "peer relative inline-flex h-6 w-[42px] shrink-0 cursor-pointer items-center rounded-hn-pill border",
        "border-hn-line-strong bg-hn-surface-raised data-[state=checked]:border-hn-action-primary data-[state=checked]:bg-hn-action-primary",
        "transition-colors duration-(--hn-duration-fast) motion-reduce:transition-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        label ? undefined : className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cx(
          "pointer-events-none block size-[18px] translate-x-[2px] rounded-hn-pill bg-hn-ink-muted",
          "data-[state=checked]:translate-x-[20px] data-[state=checked]:bg-hn-action-primary-ink",
          "transition-transform duration-(--hn-duration-fast) motion-reduce:transition-none"
        )}
      />
    </SwitchPrimitive.Root>
  );
  if (!label) return control;
  return (
    <span
      className={cx(
        "inline-flex min-h-hn-target items-center gap-2.5 font-hn-sans text-[13px] text-hn-ink-body",
        className
      )}
    >
      <label htmlFor={controlId} className="cursor-pointer">
        {label}
      </label>
      {control}
    </span>
  );
}
