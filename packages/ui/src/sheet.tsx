import { Dialog as SheetPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx, focusRing } from "./cx";
import { XIcon } from "./icons";
import { STATE_COPY, type StateLocale } from "./state-copy";

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetPortal = SheetPrimitive.Portal;

export type SheetSide = "right" | "left" | "bottom";

export const SHEET_SIDES: readonly SheetSide[] = ["right", "left", "bottom"];

export function SheetOverlay({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      className={cx("fixed inset-0 z-50 bg-hn-surface-page/70", className)}
      {...props}
    />
  );
}

const EDGE: Record<SheetSide, string> = {
  right: "inset-y-0 right-0 w-[min(420px,calc(100vw-48px))] rounded-l-hn-xl border-l",
  left: "inset-y-0 left-0 w-[min(420px,calc(100vw-48px))] rounded-r-hn-xl border-r",
  bottom: "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-hn-xl border-t",
};

/**
 * A side sheet that is a bottom sheet below the sm breakpoint (640 px). Written out in full so
 * Tailwind sees every class; the sm: half undoes the bottom edge and draws the side one.
 */
const EDGE_RESPONSIVE: Record<Exclude<SheetSide, "bottom">, string> = {
  right:
    "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-hn-xl border-t " +
    "sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:max-h-none sm:w-[min(420px,calc(100vw-48px))] " +
    "sm:rounded-tr-none sm:rounded-bl-hn-xl sm:border-t-0 sm:border-l",
  left:
    "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-hn-xl border-t " +
    "sm:inset-x-auto sm:inset-y-0 sm:left-0 sm:max-h-none sm:w-[min(420px,calc(100vw-48px))] " +
    "sm:rounded-tl-none sm:rounded-br-hn-xl sm:border-t-0 sm:border-r",
};

export type SheetContentProps = ComponentProps<typeof SheetPrimitive.Content> & {
  /** The edge it slides from. */
  side?: SheetSide;
  /** A right or left sheet becomes a bottom sheet on narrow screens (below 640 px). */
  bottomOnMobile?: boolean;
  /** Show the corner close button. */
  showClose?: boolean;
  /** Default copy language, for the close button's name. */
  locale?: StateLocale;
  closeLabel?: string;
  /**
   * Work the sheet started has not been confirmed yet: the sheet is aria-busy and cannot be
   * dismissed (Escape, outside click, the close button), so it never closes before the server
   * answered.
   */
  pending?: boolean;
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
};

/**
 * A modal panel from a screen edge on Fläche with the one lift shadow: a detail view, filters,
 * a form. Radix Dialog underneath: focus is trapped, Escape closes, focus returns to the trigger.
 * Name it with SheetTitle.
 */
export function SheetContent({
  side = "right",
  bottomOnMobile = true,
  showClose = true,
  locale = "en",
  closeLabel,
  pending = false,
  container,
  className,
  children,
  onEscapeKeyDown,
  onInteractOutside,
  ...props
}: SheetContentProps) {
  const responsive = bottomOnMobile && side !== "bottom";
  const handle = side === "bottom" ? "" : responsive ? "sm:hidden" : "hidden";
  return (
    <SheetPortal container={container}>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-side={side}
        data-bottom-on-mobile={responsive || undefined}
        aria-busy={pending || undefined}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault();
          onEscapeKeyDown?.(e);
        }}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault();
          onInteractOutside?.(e);
        }}
        className={cx(
          "fixed z-50 flex flex-col overflow-hidden border-hn-line-strong bg-hn-surface-card font-hn-sans text-hn-ink-primary shadow-hn-lift outline-none",
          side !== "bottom" && responsive ? EDGE_RESPONSIVE[side] : EDGE[side],
          className
        )}
        {...props}
      >
        {handle !== "hidden" ? (
          <span
            aria-hidden="true"
            className={cx(
              "mx-auto mt-2 block h-1 w-10 shrink-0 rounded-hn-pill bg-hn-line-strong",
              handle
            )}
          />
        ) : null}
        {children}
        {showClose ? (
          <SheetPrimitive.Close
            aria-label={closeLabel ?? STATE_COPY[locale].overlay.close}
            disabled={pending}
            className={cx(
              "absolute top-3.5 right-3.5 inline-flex size-6 min-h-hn-target min-w-hn-target cursor-pointer items-center justify-center rounded-hn-sm text-hn-ink-muted hover:bg-hn-surface-raised hover:text-hn-ink-primary",
              "disabled:pointer-events-none disabled:opacity-50",
              focusRing
            )}
          >
            <XIcon />
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("flex flex-col gap-1.5 px-5 pt-5 pr-14", className)} {...props} />;
}

/** The scrolling middle; header and footer stay put. */
export function SheetBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4", className)}
      {...props}
    />
  );
}

export function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "flex flex-wrap justify-end gap-2 border-t border-hn-line-subtle px-5 py-4",
        className
      )}
      {...props}
    />
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      className={cx("m-0 text-lg font-semibold text-hn-ink-primary", className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cx("m-0 text-[13.5px] leading-normal text-hn-ink-body", className)}
      {...props}
    />
  );
}
