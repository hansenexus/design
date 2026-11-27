// The session layout's building blocks (design#239 addendum, owner 2026-11-27): learning, reading
// and play get a page of their own, not a page inside the work shell. `<Shell layout="session">`
// drops the nav and the app header; the page brings a SessionHeader (exit, title, progress,
// status) and, where it helps, a SessionFooter (answer buttons, Weiter, reading tools).
// Escape goes to exit, through the same confirm as the exit button when progress would be lost.
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  cx,
  focusRing,
  Progress,
} from "@hansenexus/ui";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { SHELL_COPY } from "./copy";
import { SHELL_MEASURE, useShell } from "./shell";

/** The session's progress: a count drawn as a bar and `7/20`, or a node of the page's own. */
export type SessionProgress = { value: number; max: number; label?: string } | ReactNode;

/** The words of the confirm before an exit that would lose progress; defaults from SHELL_COPY. */
export type SessionExitConfirm = {
  title?: string;
  description?: string;
  leave?: string;
  stay?: string;
};

export type SessionHeaderProps = {
  /** The session's title or set name. Visually hidden under 768 px of shell width. */
  title: ReactNode;
  /** Leave the session: back to where the learner came from. Escape calls it too. */
  onExit: () => void;
  /** The exit button's name. Default from SHELL_COPY (`exit`). */
  exitLabel?: string;
  /**
   * Ask before leaving, when progress would be lost: `true` for the default words, or words of
   * the page's own. Leave it out (or false) to exit at once.
   */
  confirmExit?: boolean | SessionExitConfirm;
  /** A bar and `7/20` from `{ value, max }`, or a node of the page's own. */
  progress?: SessionProgress;
  /** A timer, a streak, a score, the connection: small, on the right. */
  status?: ReactNode;
  className?: string;
};

function isCount(p: SessionProgress): p is { value: number; max: number; label?: string } {
  return (
    typeof p === "object" &&
    p !== null &&
    "value" in p &&
    "max" in p &&
    typeof p.value === "number" &&
    typeof p.max === "number"
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * Whether an Escape belongs to something else: a dialog or menu open in the shell, which closes
 * itself first, or a composition in progress.
 */
function escapeTaken(e: KeyboardEvent, root: HTMLElement | null): boolean {
  if (e.defaultPrevented || e.isComposing) return true;
  const scope = root ?? document;
  return (
    scope.querySelector(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"], [role="listbox"]'
    ) !== null
  );
}

/**
 * The session header: exit (×), the title, the progress and a status slot, in that order. Under
 * 768 px of shell width it stays compact: exit, progress, status.
 */
export function SessionHeader({
  title,
  onExit,
  exitLabel,
  confirmExit = false,
  progress,
  status,
  className,
}: SessionHeaderProps) {
  const { locale, portal } = useShell();
  const copy = SHELL_COPY[locale];
  const [confirming, setConfirming] = useState(false);
  const exitButton = useRef<HTMLButtonElement>(null);
  const words = typeof confirmExit === "object" ? confirmExit : {};
  const ask = confirmExit !== false;

  const requestExit = useCallback(() => {
    if (ask) setConfirming(true);
    else onExit();
  }, [ask, onExit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || confirming || escapeTaken(e, portal)) return;
      // This session's Escape: focus is inside it, or nowhere (the body). A page with several
      // sessions (the gallery) leaves the others alone.
      const active = document.activeElement;
      const here = active === null || active === document.body || portal?.contains(active);
      if (!here) return;
      e.preventDefault();
      requestExit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming, portal, requestExit]);

  const label = exitLabel ?? copy.exit;
  return (
    <div
      data-session-header=""
      className={cx("flex min-w-0 flex-1 items-center gap-2 @3xl:gap-4", className)}
    >
      <button
        ref={exitButton}
        type="button"
        data-shell-control="exit"
        aria-label={label}
        title={label}
        onClick={requestExit}
        className={cx(
          "inline-flex min-h-hn-target min-w-hn-target shrink-0 cursor-pointer items-center justify-center rounded-hn-md text-hn-ink-muted",
          "hover:bg-hn-surface-raised hover:text-hn-ink-primary",
          focusRing
        )}
      >
        <CloseIcon />
      </button>
      <h1
        data-session-title=""
        className="sr-only m-0 truncate text-sm font-semibold text-hn-ink-primary @3xl:not-sr-only @3xl:min-w-0 @3xl:shrink"
      >
        {title}
      </h1>
      {progress !== undefined && progress !== null ? (
        <div data-session-progress="" className="flex min-w-0 flex-1 items-center gap-3">
          {isCount(progress) ? (
            <>
              <Progress
                value={progress.value}
                max={progress.max}
                label={progress.label ?? copy.progress}
                valueText={`${progress.value}/${progress.max}`}
                locale={locale}
                className="min-w-0 flex-1 @3xl:max-w-64"
              />
              <span
                aria-hidden="true"
                className="shrink-0 font-hn-mono text-[13px] text-hn-ink-muted tabular-nums"
              >
                {progress.value}/{progress.max}
              </span>
            </>
          ) : (
            progress
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}
      {status !== undefined && status !== null ? (
        <div
          data-session-status=""
          className="flex shrink-0 items-center gap-2 text-[13px] text-hn-ink-muted tabular-nums"
        >
          {status}
        </div>
      ) : null}
      {ask ? (
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogContent
            tone="neutral"
            container={portal}
            // Portalled into the shell root, its containing block: size to the shell, not 100vw.
            style={{ width: "calc(100% - 32px)" }}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              exitButton.current?.focus();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{words.title ?? copy.exitConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {words.description ?? copy.exitConfirmBody}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{words.stay ?? copy.exitStay}</AlertDialogCancel>
              <AlertDialogAction data-session-leave="" onClick={onExit}>
                {words.leave ?? copy.exitLeave}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}

export type SessionFooterProps = {
  children: ReactNode;
  /** Where the actions sit on the session's measure. Default "end". */
  align?: "start" | "center" | "end" | "between";
  className?: string;
};

const ALIGN = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;

/**
 * The session footer's action bar: answer buttons, Weiter, reading tools. Put it in the shell's
 * `footer` slot; the shell docks it, pads it for the safe area and lifts it above an on-screen
 * keyboard. It lines up with the slot's measure.
 */
export function SessionFooter({ children, align = "end", className }: SessionFooterProps) {
  const { measure } = useShell();
  return (
    <div
      data-session-footer=""
      className={cx(
        "mx-auto flex w-full flex-wrap items-center gap-2",
        SHELL_MEASURE[measure],
        ALIGN[align],
        className
      )}
    >
      {children}
    </div>
  );
}
