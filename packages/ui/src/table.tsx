import type { ComponentProps } from "react";
import { cx } from "./cx";

/** A data table in a card. Rows follow the density: 36 px compact, 48 comfortable, 56 touch. */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card">
      <table
        className={cx(
          "w-full border-collapse font-hn-sans text-[13.5px] text-hn-ink-primary",
          className
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={className} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cx(
        "h-hn-row border-t border-hn-line-subtle first:border-t-0 [tbody_&]:hover:bg-hn-surface-raised",
        "data-[state=selected]:bg-hn-surface-raised",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, scope = "col", ...props }: ComponentProps<"th">) {
  return (
    <th
      scope={scope}
      className={cx(
        "px-3 py-2.5 text-left align-middle text-xs font-semibold whitespace-nowrap text-hn-ink-muted",
        className
      )}
      {...props}
    />
  );
}

export type TableCellProps = ComponentProps<"td"> & {
  /** JetBrains Mono, for times, hostnames, principals, tickets. */
  mono?: boolean;
  /** Secondary columns: ink.muted instead of ink.primary. */
  muted?: boolean;
};

export function TableCell({ mono = false, muted = false, className, ...props }: TableCellProps) {
  return (
    <td
      className={cx(
        "px-3 py-1.5 align-middle",
        mono && "font-hn-mono text-[12.5px]",
        muted && "text-hn-ink-muted",
        className
      )}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return (
    <caption
      className={cx("caption-bottom px-3 py-2 text-left text-xs text-hn-ink-muted", className)}
      {...props}
    />
  );
}
