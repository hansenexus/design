import type { ComponentProps, ReactNode } from "react";
import { Button } from "./button";
import { cx } from "./cx";
import { STATE_FRAME, type StateTitleElement } from "./empty-state";
import { STATE_COPY, type StateLocale } from "./state-copy";

/** What Next.js hands an error boundary: `digest` is the server-side reference, safe to show. */
export type StateError = Error & { digest?: string };

export type ErrorStateProps = Omit<ComponentProps<"div">, "title"> & {
  /** The caught error. In production only its `digest` is shown, never the message or stack. */
  error?: StateError | null;
  /** The reference to show; defaults to `error.digest`. */
  digest?: string;
  /** Shows a retry button; Next's error.tsx passes `reset`. */
  onRetry?: () => void;
  /** Default copy language; the text props override it. */
  locale?: StateLocale;
  title?: ReactNode;
  description?: ReactNode;
  retryLabel?: ReactNode;
  /** An illustration or icon above the title. Decorative: rendered aria-hidden. */
  illustration?: ReactNode;
  titleAs?: StateTitleElement;
  /**
   * Also show the error's message and stack. Defaults to `NODE_ENV === "development"`, so a
   * build without that variable fails closed to the production view.
   */
  dev?: boolean;
};

// Declared here so the package needs no Node types; bundlers replace the literal expression.
declare const process: { env: { NODE_ENV?: string } };

function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV === "development";
  } catch {
    return false; // no bundler replacement and no `process`: a browser, so production
  }
}

/** The message and the stack; engines differ on whether the stack repeats the message. */
function details(error: StateError): string {
  const head = `${error.name}: ${error.message}`;
  if (!error.stack) return head;
  return error.stack.includes(error.message) ? error.stack : `${head}\n${error.stack}`;
}

/**
 * A data surface that failed. Production shows the copy, the error reference (digest) and an
 * optional retry; the raw message and stack only in development. Log details server-side.
 */
export function ErrorState({
  error,
  digest = error?.digest,
  onRetry,
  locale = "en",
  title,
  description,
  retryLabel,
  illustration,
  titleAs: Title = "h2",
  dev = isDevelopment(),
  className,
  ...props
}: ErrorStateProps) {
  const copy = STATE_COPY[locale].error;
  return (
    <div data-state="error" className={cx(STATE_FRAME, className)} {...props}>
      {illustration ? (
        <div aria-hidden="true" className="mb-1 text-hn-ink-muted">
          {illustration}
        </div>
      ) : null}
      <Title className="m-0 font-hn-display text-lg font-semibold text-hn-ink-primary">
        {title ?? copy.title}
      </Title>
      <p className="m-0 max-w-[48ch] text-sm">{description ?? copy.description}</p>
      {digest ? (
        <p className="m-0 text-xs text-hn-ink-muted">
          {copy.digest}: <code className="font-hn-mono select-all">{digest}</code>
        </p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          {retryLabel ?? copy.retry}
        </Button>
      ) : null}
      {dev && error ? (
        <pre
          data-dev-details=""
          className="m-0 mt-3 max-h-64 w-full max-w-[72ch] overflow-auto rounded-hn-md border border-hn-status-crit bg-hn-surface-raised p-3 text-left font-hn-mono text-xs whitespace-pre-wrap text-hn-ink-primary"
        >
          {details(error)}
        </pre>
      ) : null}
    </div>
  );
}
