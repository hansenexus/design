// Pieces the page patterns share (design#240): the leave confirm, the beforeunload guard and the
// test for a key that belongs to a text field.
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@hansenexus/ui";
import { useEffect } from "react";
import type { ShellProps } from "./shell";

/**
 * The Shell props a pattern passes through: everything but the slots it fills itself. The
 * layout is the pattern's to pick from a narrower set.
 */
export type PatternShellProps = Omit<
  ShellProps,
  "layout" | "header" | "children" | "main" | "footer" | "aside" | "contextPane"
>;

/** Asks the browser to confirm a reload or tab close while `active` (unsaved changes). */
export function useBeforeUnload(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older browsers need returnValue set to show the prompt.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [active]);
}

/** Whether a key press is typing: in a text field, a textarea, a select or editable content. */
export function isTyping(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  const el = target as HTMLElement;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const type = (el as HTMLInputElement).type;
  return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"].includes(
    type
  );
}

/** Whether a key press sits in a widget that uses the arrow keys itself. */
export function ownsArrows(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  return (
    (target as Element).closest(
      '[role="radiogroup"], [role="slider"], [role="listbox"], [role="tablist"], [role="menu"], [role="grid"], [role="tree"], input[type="range"]'
    ) !== null
  );
}

/** Whether a dialog or menu is open in `root`: then the page's shortcuts stand down. */
export function overlayOpen(root: HTMLElement | null): boolean {
  const scope = root ?? (typeof document === "undefined" ? null : document);
  if (!scope) return false;
  return (
    scope.querySelector(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"], [role="listbox"]'
    ) !== null
  );
}

/** Whether focus is inside `root`, or nowhere: a page with several shells leaves the others alone. */
export function focusWithin(root: HTMLElement | null): boolean {
  if (typeof document === "undefined") return false;
  const active = document.activeElement;
  return active === null || active === document.body || (root?.contains(active) ?? false);
}

export type ConfirmLeaveProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  leave: string;
  stay: string;
  onLeave: () => void;
  container: HTMLElement | null;
};

/** The confirm before a step that drops unsaved work: stay is the default. */
export function ConfirmLeave({
  open,
  onOpenChange,
  title,
  description,
  leave,
  stay,
  onLeave,
  container,
}: ConfirmLeaveProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        tone="neutral"
        container={container}
        // Portalled into the shell root, its containing block: size to the shell, not 100vw.
        style={{ width: "calc(100% - 32px)" }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{stay}</AlertDialogCancel>
          <AlertDialogAction data-pattern-leave="" onClick={onLeave}>
            {leave}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
