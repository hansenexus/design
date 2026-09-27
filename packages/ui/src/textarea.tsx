import type { ComponentProps } from "react";
import { cx, focusRing } from "./cx";

export type TextareaProps = ComponentProps<"textarea"> & {
  /** JetBrains Mono, for manifests, logs and config snippets. */
  mono?: boolean;
};

/** Multi-line text. Resizes vertically only; the same border, invalid and disabled looks as Input. */
export function Textarea({ mono = false, rows = 4, className, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cx(
        "block min-h-20 w-full min-w-0 resize-y rounded-hn-md border border-hn-line-strong bg-hn-surface-page px-3 py-2 text-sm leading-relaxed text-hn-ink-primary",
        "placeholder:text-hn-ink-muted disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-hn-surface-band",
        "aria-invalid:border-hn-status-crit",
        mono ? "font-hn-mono" : "font-hn-sans",
        focusRing,
        className
      )}
      {...props}
    />
  );
}
