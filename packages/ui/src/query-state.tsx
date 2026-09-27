import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { cx } from "./cx";
import { EmptyState } from "./empty-state";
import { ErrorState, type StateError } from "./error-state";
import { Skeleton } from "./skeleton";
import { STATE_COPY, type StateLocale } from "./state-copy";

export type QueryStatus = "loading" | "empty" | "error" | "data";

/** Empty by default: null (a lookup that found nothing) and an empty array. */
export function defaultIsEmpty(data: unknown): boolean {
  return data === null || (Array.isArray(data) && data.length === 0);
}

/** Which state a query result is in. `undefined` is loading, the convention Convex's useQuery uses. */
export function queryStatus<T>(
  query: T | undefined,
  { error, isEmpty = defaultIsEmpty }: { error?: unknown; isEmpty?: (data: T) => boolean } = {}
): QueryStatus {
  if (error) return "error";
  if (query === undefined) return "loading";
  return isEmpty(query) ? "empty" : "data";
}

export type QueryStateProps<T> = Omit<ComponentProps<"div">, "children"> & {
  /** The result: `undefined` while loading, then the data. */
  query: T | undefined;
  /** Renders the data once it is there and not empty. */
  children: (data: T) => ReactNode;
  /** When the data counts as empty; defaults to null or an empty array. */
  isEmpty?: (data: T) => boolean;
  /** Shown while loading; defaults to three lines of text Skeleton. */
  loading?: ReactNode;
  /** Shown when empty; defaults to EmptyState. */
  empty?: ReactNode;
  /** A failure. Takes precedence over the data; for hooks that return errors instead of throwing. */
  error?: StateError | null;
  /** Shown on error; defaults to ErrorState with `onRetry`. */
  errorFallback?: ReactNode;
  onRetry?: () => void;
  /** Default copy language, for the defaults and the announcements. */
  locale?: StateLocale;
  /** What the live region says when the data arrives; defaults to the locale's "Loaded". */
  loadedMessage?: string;
};

/**
 * Renders a query result in its four states: loading, empty, error and data. Generic over the
 * result type and framework-neutral: it reads `undefined` as loading and imports no data
 * library. The container is aria-busy while loading, and a polite live region announces when
 * the data arrives or the query fails.
 */
export function QueryState<T>({
  query,
  children,
  isEmpty,
  loading,
  empty,
  error,
  errorFallback,
  onRetry,
  locale = "en",
  loadedMessage,
  className,
  ...props
}: QueryStateProps<T>) {
  const status = queryStatus(query, { error, isEmpty });
  const copy = STATE_COPY[locale];
  const announcement = useStateAnnouncement(status, {
    loaded: loadedMessage ?? copy.loaded,
    error: copy.error.title,
  });

  let content: ReactNode;
  if (status === "error")
    content = errorFallback ?? <ErrorState error={error} onRetry={onRetry} locale={locale} />;
  else if (status === "loading")
    content = loading ?? <Skeleton shape="text" lines={3} className="text-sm" />;
  else if (status === "empty") content = empty ?? <EmptyState locale={locale} />;
  else content = children(query as T);

  return (
    <div
      aria-busy={status === "loading" ? true : undefined}
      data-state={status}
      className={cx("relative", className)}
      {...props}
    >
      {content}
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

/**
 * What the live region says after a status change, or null to keep its text. It speaks on a
 * change from loading to a result, or to an error; returning to loading clears it.
 */
export function nextAnnouncement(
  from: QueryStatus,
  to: QueryStatus,
  messages: { loaded: string; error: string }
): string | null {
  if (from === to) return null;
  if (to === "error") return messages.error;
  if (to === "loading") return "";
  return from === "loading" ? messages.loaded : null;
}

/**
 * The live region's text for a status. Starts empty, so a region that renders with its data
 * says nothing. DataTable shares it with QueryState.
 */
export function useStateAnnouncement(
  status: QueryStatus,
  messages: { loaded: string; error: string }
) {
  const [text, setText] = useState("");
  const previous = useRef(status);
  const { loaded, error } = messages;
  useEffect(() => {
    const next = nextAnnouncement(previous.current, status, { loaded, error });
    previous.current = status;
    if (next !== null) setText(next);
  }, [status, loaded, error]);
  return text;
}
