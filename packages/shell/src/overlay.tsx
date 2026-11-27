// The shell's two narrow-width overlays (design#239): the nav drawer from the left under 768 px
// of shell width, and the aside sheet, a bottom sheet under 768 px and a side sheet up to 1280 px.
// Both are Radix dialogs portalled into the shell's root, so they carry its data-theme and, with
// the root's `contain: layout`, cover the shell rather than the viewport. Their edges, widths and
// corners read the shell recipe (rail, context, radius, border width), so a pack skins them like
// the columns they stand in for.
import { cx, DialogOverlay, focusRing } from "@hansenexus/ui";
import { Dialog as DialogPrimitive } from "radix-ui";
import { type PointerEvent, type ReactNode, useRef } from "react";

/** How far (px) a horizontal swipe has to travel to close the drawer. */
export const SHELL_SWIPE_CLOSE = 48;

/**
 * Whether a pointer that went down at `from` and came up at `to` swiped the drawer shut: leftwards
 * by at least SHELL_SWIPE_CLOSE and more sideways than up or down (a scroll is not a swipe).
 */
export function swipedClosed(
  from: { x: number; y: number },
  to: { x: number; y: number }
): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return dx <= -SHELL_SWIPE_CLOSE && Math.abs(dx) > Math.abs(dy);
}

const EDGE = {
  // The drawer: the rail's width plus room for the overlay to show, never wider than the shell
  // less a strip to tap out on.
  left: cx(
    "inset-y-0 left-0 w-[min(calc(var(--hn-shell-rail)+48px),calc(100%-48px))]",
    "rounded-r-(--hn-shell-radius) border-r-(length:--hn-border-width)",
    "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] touch-pan-y",
    "starting:-translate-x-full"
  ),
  // The aside: a bottom sheet under 768 px, a side sheet of the context width from there.
  aside: cx(
    "inset-x-0 bottom-0 max-h-[85%] rounded-t-(--hn-shell-radius) border-t-(length:--hn-border-width) pb-[env(safe-area-inset-bottom)]",
    "starting:translate-y-full",
    "@3xl:inset-x-auto @3xl:inset-y-0 @3xl:right-0 @3xl:max-h-none @3xl:w-[min(var(--hn-shell-context),calc(100%-48px))]",
    "@3xl:rounded-t-none @3xl:rounded-l-(--hn-shell-radius) @3xl:border-t-0 @3xl:border-l-(length:--hn-border-width)",
    "@3xl:starting:translate-x-full @3xl:starting:translate-y-0"
  ),
} as const;

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export type ShellOverlayProps = {
  /** "left" is the nav drawer, "aside" the aside sheet. */
  edge: keyof typeof EDGE;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where the overlay portals: the shell's root. */
  container: HTMLElement | null;
  /** The dialog's accessible name, also its visible heading. */
  title: string;
  closeLabel: string;
  /** Close on a leftward swipe (the drawer). */
  swipeToClose?: boolean;
  children: ReactNode;
};

/**
 * A modal panel from the shell's edge. Radix Dialog underneath: focus is trapped, Escape and a
 * click outside close it, and focus goes back to what had it when the panel opened (the menu
 * button, the aside toggle), since the shell opens it from its own state, not a Dialog trigger.
 */
export function ShellOverlay({
  edge,
  open,
  onOpenChange,
  container,
  title,
  closeLabel,
  swipeToClose = false,
  children,
}: ShellOverlayProps) {
  const returnTo = useRef<HTMLElement | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  if (open && returnTo.current === null && typeof document !== "undefined") {
    const focused = document.activeElement;
    returnTo.current = focused instanceof HTMLElement ? focused : null;
  }
  const swipe = swipeToClose
    ? {
        onPointerDown: (e: PointerEvent) => {
          start.current = { x: e.clientX, y: e.clientY };
        },
        onPointerUp: (e: PointerEvent) => {
          const from = start.current;
          start.current = null;
          if (from && swipedClosed(from, { x: e.clientX, y: e.clientY })) onOpenChange(false);
        },
        onPointerCancel: () => {
          start.current = null;
        },
      }
    : {};
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal container={container}>
        <DialogOverlay data-shell-overlay={edge} />
        <DialogPrimitive.Content
          data-shell-sheet={edge === "left" ? "nav" : "aside"}
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnTo.current?.focus();
            returnTo.current = null;
          }}
          className={cx(
            "fixed z-50 flex flex-col overflow-hidden border-hn-line-strong bg-hn-surface-card font-hn-sans text-hn-ink-primary shadow-hn-overlay outline-none",
            "transition-transform duration-(--hn-duration-base) ease-out motion-reduce:transition-none",
            EDGE[edge]
          )}
          {...swipe}
        >
          <div className="flex min-h-12 shrink-0 items-center gap-2 border-0 border-b-(length:--hn-border-width) border-hn-line-subtle px-4 py-2">
            <DialogPrimitive.Title className="m-0 min-w-0 flex-1 truncate font-semibold text-sm">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label={closeLabel}
              title={closeLabel}
              className={cx(
                "inline-flex min-h-hn-target min-w-hn-target cursor-pointer items-center justify-center rounded-hn-sm text-hn-ink-muted hover:bg-hn-surface-raised hover:text-hn-ink-primary",
                focusRing
              )}
            >
              <CloseIcon />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
