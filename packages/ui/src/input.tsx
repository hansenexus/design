import type { ComponentProps } from "react";
import { cx, focusRing } from "./cx";

export type InputProps = ComponentProps<"input"> & {
  /** JetBrains Mono, for hostnames, IPs, tickets and SHAs. */
  mono?: boolean;
};

export function Input({ mono = false, className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cx(
        "h-10 w-full min-w-0 rounded-hn-md border border-hn-line-strong bg-hn-surface-page px-3 text-sm text-hn-ink-primary",
        "placeholder:text-hn-ink-muted disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-hn-status-crit",
        mono ? "font-hn-mono" : "font-hn-sans",
        focusRing,
        className
      )}
      {...props}
    />
  );
}
