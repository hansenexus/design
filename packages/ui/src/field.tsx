import {
  Children,
  type ComponentProps,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import { cx } from "./cx";
import { Label } from "./label";
import { StatusGlyph } from "./status-glyph";

export type FieldLayout = "stack" | "inline";

export type FieldProps = Omit<ComponentProps<"div">, "children"> & {
  /** The control's visible name. */
  label: ReactNode;
  /** A hint under the control; the control is described by it. */
  help?: ReactNode;
  /** The validation message. When set the control gets aria-invalid and is described by it. */
  error?: ReactNode;
  /** Shows the `*` marker and sets aria-required on the control. */
  required?: boolean;
  /** Disables the control and dims the label. A pending form disables its fieldset instead. */
  disabled?: boolean;
  /** `stack`: label above the control (Input, Textarea, Select, RadioGroup). `inline`: control
   * first, label beside it (Checkbox, Switch). */
  layout?: FieldLayout;
  /** The control's id; defaults to the child's id, then a generated one. */
  controlId?: string;
  /** Exactly one control element. It receives id, aria-labelledby, aria-describedby,
   * aria-invalid, aria-required and disabled, merged with what it already has. */
  children: ReactElement;
};

type ControlProps = {
  id?: string;
  disabled?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-required"?: boolean | "true" | "false";
};

const hasContent = (node: ReactNode) => node !== undefined && node !== null && node !== false;

/**
 * One form control with its label, help text and error. It wires the ids so assistive tech reads
 * the label as the name and the help and error as the description, and marks the control invalid
 * while there is an error. The error never relies on colour alone: it carries the crit diamond.
 */
export function Field({
  label,
  help,
  error,
  required = false,
  disabled = false,
  layout = "stack",
  controlId,
  className,
  children,
  ...props
}: FieldProps) {
  const auto = useId();
  const child = Children.only(children);
  const own: ControlProps = isValidElement<ControlProps>(child) ? child.props : {};
  const id = controlId ?? own.id ?? `${auto}-control`;
  const labelId = `${id}-label`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const invalid = hasContent(error);
  const describedBy =
    [own["aria-describedby"], hasContent(help) ? helpId : null, invalid ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const control = cloneElement(
    child as ReactElement<ControlProps & { "aria-labelledby"?: string }>,
    {
      id,
      "aria-labelledby": labelId,
      "aria-describedby": describedBy,
      "aria-invalid": invalid ? true : own["aria-invalid"],
      "aria-required": required ? true : own["aria-required"],
      disabled: disabled || own.disabled,
    }
  );
  const name = (
    <Label id={labelId} htmlFor={id} required={required} disabled={disabled}>
      {label}
    </Label>
  );
  const notes = (
    <>
      {hasContent(help) ? <FieldHelp id={helpId}>{help}</FieldHelp> : null}
      {invalid ? <FieldError id={errorId}>{error}</FieldError> : null}
    </>
  );
  return (
    <div
      data-invalid={invalid ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      className={cx("flex min-w-0 flex-col gap-1.5", className)}
      {...props}
    >
      {layout === "inline" ? (
        <>
          <div className="flex min-h-hn-target items-center gap-2.5">
            {control}
            {name}
          </div>
          {help || invalid ? <div className="-mt-1 flex flex-col gap-1.5 pl-7">{notes}</div> : null}
        </>
      ) : (
        <>
          {name}
          {control}
          {notes}
        </>
      )}
    </div>
  );
}

/** Help text under a control. Give it an id and list that id in the control's aria-describedby. */
export function FieldHelp({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cx("m-0 font-hn-sans text-[12.5px] leading-snug text-hn-ink-muted", className)}
      {...props}
    />
  );
}

/** A validation message: crit diamond plus text in status.crit (AA as text on every surface). */
export function FieldError({ className, children, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-state="error"
      className={cx(
        "m-0 flex items-start gap-1.5 font-hn-sans text-[12.5px] leading-snug font-medium text-hn-status-crit",
        className
      )}
      {...props}
    >
      <StatusGlyph status="crit" className="mt-[3px]" />
      <span>{children}</span>
    </p>
  );
}
