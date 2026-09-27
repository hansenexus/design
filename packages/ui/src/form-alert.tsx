import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";
import { STATE_COPY, type StateLocale } from "./state-copy";
import { StatusGlyph } from "./status-glyph";

export type FormAlertKind = "invalid" | "server-error";

export type FormAlertProps = Omit<ComponentProps<"div">, "title"> & {
  /** `invalid`: a submit found field errors. `server-error`: the server refused or failed. */
  kind: FormAlertKind;
  /** Default copy language; title and children override it. */
  locale?: StateLocale;
  title?: ReactNode;
  /** The description; defaults to the copy for the kind. */
  children?: ReactNode;
};

/**
 * The form-level message after a failed submit, as role="alert" so it is announced when it
 * mounts. Render it only after the server answered: a form reports success or failure only once
 * the server confirmed it (the honest-success rule of the state contract).
 */
export function FormAlert({
  kind,
  locale = "en",
  title,
  children,
  className,
  ...props
}: FormAlertProps) {
  const copy = STATE_COPY[locale].form;
  const heading = title ?? (kind === "server-error" ? copy.serverError.title : undefined);
  const body = children ?? (kind === "server-error" ? copy.serverError.description : copy.invalid);
  return (
    <div
      role="alert"
      data-kind={kind}
      className={cx(
        "flex items-start gap-2.5 rounded-hn-md border border-hn-status-crit bg-hn-surface-card px-3.5 py-3 font-hn-sans text-sm text-hn-ink-body",
        className
      )}
      {...props}
    >
      <StatusGlyph status="crit" size={12} className="mt-1" />
      <div className="flex min-w-0 flex-col gap-0.5">
        {heading ? <p className="m-0 font-semibold text-hn-ink-primary">{heading}</p> : null}
        <p className="m-0">{body}</p>
      </div>
    </div>
  );
}
