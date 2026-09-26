import { Toast as ToastPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx, focusRing } from "./cx";
import { XIcon } from "./icons";
import { type Status, StatusGlyph } from "./status-glyph";

export const ToastProvider = ToastPrimitive.Provider;

export function ToastViewport({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cx(
        "fixed right-0 bottom-0 z-50 m-0 flex w-[392px] max-w-full list-none flex-col gap-2 p-4 outline-none",
        className
      )}
      {...props}
    />
  );
}

export type ToastProps = ComponentProps<typeof ToastPrimitive.Root> & {
  /** Leading status shape for the outcome of a real event. */
  status?: Status;
};

/** A notice about something that just happened. Motion only on this real event. */
export function Toast({ status, className, children, ...props }: ToastProps) {
  return (
    <ToastPrimitive.Root
      className={cx(
        "relative flex items-start gap-3 rounded-hn-lg border border-hn-line-strong bg-hn-surface-card p-3.5 pr-10 font-hn-sans text-hn-ink-primary shadow-hn-lift",
        className
      )}
      {...props}
    >
      {status ? <StatusGlyph status={status} size={10} className="mt-[5px]" /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
      <ToastPrimitive.Close
        aria-label="Dismiss"
        className={cx(
          "absolute top-2.5 right-2.5 inline-flex size-6 min-h-hn-target min-w-hn-target cursor-pointer items-center justify-center rounded-hn-sm text-hn-ink-muted hover:bg-hn-surface-raised hover:text-hn-ink-primary",
          focusRing
        )}
      >
        <XIcon />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

export function ToastTitle({ className, ...props }: ComponentProps<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title className={cx("text-sm font-semibold", className)} {...props} />;
}

export function ToastDescription({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      className={cx("text-[13px] leading-normal text-hn-ink-body", className)}
      {...props}
    />
  );
}

/** An inline follow-up (Undo, View run). altText tells screen readers how to reach it. */
export function ToastAction({ className, ...props }: ComponentProps<typeof ToastPrimitive.Action>) {
  return (
    <ToastPrimitive.Action
      className={cx(
        "mt-1 inline-flex h-7 min-h-hn-target cursor-pointer items-center self-start rounded-hn-sm border border-hn-line-strong bg-transparent px-2.5 text-[13px] font-semibold text-hn-ink-primary hover:bg-hn-surface-raised",
        focusRing,
        className
      )}
      {...props}
    />
  );
}
