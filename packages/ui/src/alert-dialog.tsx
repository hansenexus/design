// AlertDialog (hansenexus/design#167): a modal confirmation before a destructive or irreversible
// action, on Radix AlertDialog. The marked layout won the vote (decisions/alert-dialog.json): the
// tone shows before the buttons. A destructive ask gets the crit glyph in a tinted tile and a crit
// rule along the top edge; a neutral one the info glyph on a raised tile. What happens sits in a
// raised box. Focus starts on Cancel, Escape cancels, the action button names the action. Below
// 640 px the glyph and the title centre above the text and the buttons stack full width, the
// action on top.
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { type ComponentProps, createContext, type ReactNode, useContext } from "react";
import { Button, type ButtonProps } from "./button";
import { cx } from "./cx";
import { InfoIcon } from "./icons";
import { StatusGlyph } from "./status-glyph";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;

/** destructive: data or access is lost. neutral: irreversible, but nothing is destroyed. */
export type AlertDialogTone = "destructive" | "neutral";

const ToneContext = createContext<AlertDialogTone>("destructive");

/** The tone of the enclosing AlertDialogContent. */
export const useAlertDialogTone = () => useContext(ToneContext);

export function AlertDialogOverlay({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cx("fixed inset-0 z-50 bg-hn-surface-page/70", className)}
      {...props}
    />
  );
}

export type AlertDialogContentProps = ComponentProps<typeof AlertDialogPrimitive.Content> & {
  /** Sets the glyph, the top rule, the consequence marks and the action's look. */
  tone?: AlertDialogTone;
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
};

/** The modal sheet: the Dialog surface, with a crit rule along the top when destructive. */
export function AlertDialogContent({
  className,
  children,
  tone = "destructive",
  container,
  ...props
}: AlertDialogContentProps) {
  return (
    <AlertDialogPortal container={container}>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-tone={tone}
        className={cx(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto",
          "rounded-hn-control-dialog border-(length:--hn-border-frame) border-hn-line-strong bg-hn-surface-card p-[22px] font-hn-sans text-hn-ink-primary shadow-hn-overlay",
          "outline-none",
          tone === "destructive" && "border-t-[3px] border-t-hn-status-crit",
          className
        )}
        {...props}
      >
        <ToneContext.Provider value={tone}>{children}</ToneContext.Provider>
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  );
}

/** The tone glyph on its tile: crit on a crit tint, or info on the raised surface. Decorative. */
export function AlertDialogMark({ className, ...props }: ComponentProps<"span">) {
  const destructive = useAlertDialogTone() === "destructive";
  return (
    <span
      aria-hidden="true"
      data-mark=""
      className={cx(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-hn-lg",
        destructive ? "bg-hn-status-crit/15" : "bg-hn-surface-raised text-hn-status-busy",
        className
      )}
      {...props}
    >
      {destructive ? <StatusGlyph status="crit" size={16} /> : <InfoIcon />}
    </span>
  );
}

/** The mark beside the title and description; above them, centred, below 640 px. */
export function AlertDialogHeader({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "flex flex-col items-center gap-3.5 text-center sm:flex-row sm:items-start sm:text-left",
        className
      )}
      {...props}
    >
      <AlertDialogMark />
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

export function AlertDialogTitle({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cx("m-0 text-lg font-semibold text-hn-ink-primary", className)}
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cx("m-0 text-[13.5px] leading-normal text-hn-ink-body", className)}
      {...props}
    />
  );
}

export type AlertDialogConsequencesProps = Omit<ComponentProps<"div">, "children"> & {
  /** The heading over the list, e.g. "What happens" or "Was passiert". */
  label: ReactNode;
  /** AlertDialogConsequence items, one fact each. */
  children: ReactNode;
};

/** What exactly happens, one fact per line, in a raised box. */
export function AlertDialogConsequences({
  label,
  className,
  children,
  ...props
}: AlertDialogConsequencesProps) {
  return (
    <div
      className={cx(
        "flex flex-col gap-1.5 rounded-hn-md bg-hn-surface-raised px-3.5 py-3",
        className
      )}
      {...props}
    >
      <span className="font-semibold text-hn-ink-muted text-xs uppercase tracking-wide">
        {label}
      </span>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] text-hn-ink-body leading-normal">
        {children}
      </ul>
    </div>
  );
}

/** One fact, marked crit when destructive and busy when neutral. */
export function AlertDialogConsequence({ className, children, ...props }: ComponentProps<"li">) {
  const destructive = useAlertDialogTone() === "destructive";
  return (
    <li className={cx("flex items-start gap-2", className)} {...props}>
      <StatusGlyph status={destructive ? "crit" : "busy"} size={8} className="mt-[6px] shrink-0" />
      <span>{children}</span>
    </li>
  );
}

/** Cancel then Action in a row; below 640 px full width and stacked, the action on top. */
export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "flex flex-col-reverse gap-2 max-sm:[&>*]:h-11 max-sm:[&>*]:w-full sm:flex-row sm:flex-wrap sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

/** Closes without acting. Radix focuses it when the dialog opens. */
export function AlertDialogCancel({ variant = "secondary", ...props }: ButtonProps) {
  return (
    <AlertDialogPrimitive.Cancel asChild>
      <Button variant={variant} {...props} />
    </AlertDialogPrimitive.Cancel>
  );
}

/** Acts and closes. Name the action ("Delete kran-03"), never "OK". Danger when destructive. */
export function AlertDialogAction({ variant, ...props }: ButtonProps) {
  const tone = useAlertDialogTone();
  return (
    <AlertDialogPrimitive.Action asChild>
      <Button variant={variant ?? (tone === "destructive" ? "danger" : "primary")} {...props} />
    </AlertDialogPrimitive.Action>
  );
}
