import type { ComponentProps } from "react";
import { cx } from "./cx";

/** A key or shortcut: ⌘K, esc, Enter. */
export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cx(
        "inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-hn-sm border border-hn-line-subtle px-1.5 font-hn-mono text-[11.5px] text-hn-ink-muted",
        className
      )}
      {...props}
    />
  );
}
