import { type ComponentProps, type ReactNode, useState } from "react";
import { cx, focusRing } from "./cx";
import { InfoIcon, XIcon } from "./icons";
import { type AlertTone, LAYOUT_COPY } from "./layout-copy";
import type { StateLocale } from "./state-copy";
import { StatusGlyph } from "./status-glyph";

export const ALERT_TONES: readonly AlertTone[] = ["info", "success", "warning", "critical"];

/** Tone accent: a 3 px leading rule in the status colour. The glyph gives each tone a shape. */
const ACCENT: Record<AlertTone, string> = {
  info: "border-l-hn-status-busy",
  success: "border-l-hn-status-ok",
  warning: "border-l-hn-status-warn",
  critical: "border-l-hn-status-crit",
};

const GLYPH_STATUS = { success: "ok", warning: "warn", critical: "crit" } as const;

function ToneGlyph({ tone }: { tone: AlertTone }) {
  if (tone === "info")
    return <InfoIcon aria-hidden="true" className="mt-[2px] shrink-0 text-hn-status-busy" />;
  return <StatusGlyph status={GLYPH_STATUS[tone]} size={12} className="mt-[4px]" />;
}

export type AlertLayout = "inline" | "banner";

export type AlertProps = Omit<ComponentProps<"div">, "title"> & {
  tone?: AlertTone;
  /** inline: a rounded box in the flow; banner: full width, square, a rule underneath. */
  layout?: AlertLayout;
  title?: ReactNode;
  /** A follow-up, e.g. a secondary Button; sits after the text. */
  action?: ReactNode;
  /** Shows a close button. Uncontrolled unless `open` is set. */
  dismissible?: boolean;
  /** Controlled visibility; pair with onDismiss. */
  open?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
  /** Language of the tone prefix and the dismiss label. */
  locale?: StateLocale;
};

/**
 * A persistent message about the state of something: info, success, warning or critical.
 * Critical is role=alert (announced at once), the rest role=status (polite). A visually hidden
 * tone word ("Warning:") leads the text, so the tone never rests on colour or shape alone.
 */
export function Alert({
  tone = "info",
  layout = "inline",
  title,
  action,
  dismissible = false,
  open,
  onDismiss,
  dismissLabel,
  locale = "en",
  role,
  className,
  children,
  ...props
}: AlertProps) {
  const [dismissed, setDismissed] = useState(false);
  const shown = open ?? !dismissed;
  if (!shown) return null;
  const copy = LAYOUT_COPY[locale];
  const dismiss = () => {
    if (open === undefined) setDismissed(true);
    onDismiss?.();
  };
  return (
    <div
      role={role ?? (tone === "critical" ? "alert" : "status")}
      data-tone={tone}
      data-layout={layout}
      className={cx(
        "relative flex items-start gap-3 border border-l-[3px] border-hn-line-subtle bg-hn-surface-card py-3 pl-3.5 font-hn-sans text-hn-ink-body",
        layout === "banner" ? "w-full rounded-none border-t-0 border-r-0" : "rounded-hn-md",
        dismissible ? "pr-11" : "pr-3.5",
        ACCENT[tone],
        className
      )}
      {...props}
    >
      <ToneGlyph tone={tone} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        <span className="sr-only">{copy.tone[tone]}: </span>
        {title ? <p className="m-0 font-semibold text-hn-ink-primary">{title}</p> : null}
        {children ? <div className="text-[13px] leading-normal">{children}</div> : null}
        {action ? <div className="mt-1.5 flex flex-wrap gap-2">{action}</div> : null}
      </div>
      {dismissible ? (
        <button
          type="button"
          aria-label={dismissLabel ?? copy.dismiss}
          onClick={dismiss}
          className={cx(
            "absolute top-2 right-2 inline-flex size-7 min-h-hn-target min-w-hn-target cursor-pointer items-center justify-center rounded-hn-sm border-0 bg-transparent text-hn-ink-muted hover:bg-hn-surface-raised hover:text-hn-ink-primary",
            "transition-colors duration-(--hn-duration-fast) motion-reduce:transition-none",
            focusRing
          )}
        >
          <XIcon />
        </button>
      ) : null}
    </div>
  );
}

export type BannerProps = Omit<AlertProps, "layout">;

/** A page-wide Alert: put it at the top of the page or of a region, above the content. */
export function Banner(props: BannerProps) {
  return <Alert layout="banner" {...props} />;
}
