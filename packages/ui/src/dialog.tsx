import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx, focusRing } from "./cx";
import { XIcon } from "./icons";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export function DialogOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cx("fixed inset-0 z-50 bg-hn-surface-page/70", className)}
      {...props}
    />
  );
}

export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  /** Show the corner close button. Off when the footer already has Cancel. */
  showClose?: boolean;
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
};

/** A modal sheet on Fläche with the one neutral lift shadow. */
export function DialogContent({
  className,
  children,
  showClose = false,
  container,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal container={container}>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cx(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto",
          "rounded-hn-xl border border-hn-line-strong bg-hn-surface-card p-[22px] font-hn-sans text-hn-ink-primary shadow-hn-lift",
          "outline-none",
          className
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close
            aria-label="Close"
            className={cx(
              "absolute top-3 right-3 inline-flex size-6 min-h-hn-target min-w-hn-target cursor-pointer items-center justify-center rounded-hn-sm text-hn-ink-muted hover:bg-hn-surface-raised hover:text-hn-ink-primary",
              focusRing
            )}
          >
            <XIcon />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("flex flex-col gap-1.5", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("flex flex-wrap justify-end gap-2", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cx("m-0 text-lg font-semibold text-hn-ink-primary", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cx("m-0 text-[13.5px] leading-normal text-hn-ink-body", className)}
      {...props}
    />
  );
}
