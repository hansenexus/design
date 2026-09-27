import {
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cx, focusRing } from "./cx";
import { useDelayedVisibility } from "./delayed-visibility";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { SpinnerGlyph } from "./spinner";
import { fillCopy, STATE_COPY, type StateLocale } from "./state-copy";

export type PaginationSlot = number | "ellipsis";

/**
 * The page numbers to show: the first, the last, the current one with `siblings` on each side,
 * and an ellipsis for each gap. Once there are more pages than fit, the length is always
 * `2 * siblings + 5`, so the control keeps its width while paging.
 */
export function paginationRange(page: number, pageCount: number, siblings = 1): PaginationSlot[] {
  const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const slots = 2 * siblings + 5;
  if (pageCount <= slots) return range(1, Math.max(pageCount, 0));
  const current = Math.min(Math.max(page, 1), pageCount);
  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, pageCount);
  const edge = 3 + 2 * siblings;
  if (left <= 3) return [...range(1, edge), "ellipsis", pageCount];
  if (right >= pageCount - 2) return [1, "ellipsis", ...range(pageCount - edge + 1, pageCount)];
  return [1, "ellipsis", ...range(left, right), "ellipsis", pageCount];
}

export type PaginationProps = Omit<ComponentProps<"nav">, "onChange"> & {
  /** The page on screen, 1-based. Move it only once that page's data has arrived. */
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  /**
   * A page that was asked for and has not loaded yet. Its button shows the delayed Spinner, the
   * nav is aria-busy, and aria-current stays on `page` until the data is there.
   */
  pendingPage?: number | null;
  disabled?: boolean;
  /** Pages shown on each side of the current one. */
  siblings?: number;
  /** Render links instead of buttons, for server-rendered lists (`?page=3`). */
  href?: (page: number) => string;
  /** Default copy language; `aria-label` overrides the landmark's name. */
  locale?: StateLocale;
};

const CONTROL =
  "inline-flex h-9 min-h-hn-target min-w-8 cursor-pointer items-center justify-center gap-1.5 rounded-hn-md border px-1.5 sm:min-w-9 sm:px-2.5 font-hn-sans text-sm font-medium no-underline " +
  "transition-colors duration-(--hn-duration-fast) motion-reduce:transition-none " +
  "aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const REST =
  "border-transparent bg-transparent text-hn-ink-body hover:bg-hn-surface-raised hover:text-hn-ink-primary";
const CURRENT = "border-hn-line-strong bg-hn-surface-raised font-semibold text-hn-ink-primary";

/**
 * Page through a long list. Previous and next are icon-only below 640 px. The page on screen
 * carries aria-current; a polite live region says which page loaded, and which one is loading
 * once that takes longer than the pending delay. Renders nothing for fewer than two pages.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  pendingPage = null,
  disabled = false,
  siblings = 1,
  href,
  locale = "en",
  className,
  "aria-label": label,
  ...props
}: PaginationProps) {
  const copy = STATE_COPY[locale].navigation;
  const pending = pendingPage !== null && pendingPage !== page;
  const showSpinner = useDelayedVisibility(pending);
  const announcement = usePageAnnouncement(page, pageCount, showSpinner ? pendingPage : null, copy);
  if (pageCount < 2) return null;
  const current = Math.min(Math.max(page, 1), pageCount);

  const control = (
    target: number,
    content: ReactNode,
    extra: { label?: string; current?: boolean; edge?: boolean }
  ) => {
    const off = disabled || target < 1 || target > pageCount;
    const isCurrent = extra.current === true;
    const busy = showSpinner && target === pendingPage && !extra.edge;
    const props = {
      "aria-label": extra.label,
      "aria-current": isCurrent ? ("page" as const) : undefined,
      "aria-disabled": off || undefined,
      "data-pending": busy || undefined,
      className: cx(CONTROL, isCurrent ? CURRENT : REST, focusRing),
      children: busy ? (
        <SpinnerGlyph label={fillCopy(copy.loadingPage, { page: target })} />
      ) : (
        content
      ),
    };
    const go = (e: MouseEvent) => {
      if (off) {
        e.preventDefault();
        return;
      }
      if (!isCurrent) onPageChange?.(target);
    };
    return href ? (
      <a href={off ? undefined : href(target)} onClick={go} {...props} />
    ) : (
      <button type="button" disabled={off} onClick={go} {...props} />
    );
  };

  return (
    <nav
      aria-label={label ?? copy.pagination}
      aria-busy={pending || undefined}
      className={cx("font-hn-sans", className)}
      {...props}
    >
      <ul className="m-0 flex list-none flex-wrap items-center gap-0.5 p-0 sm:gap-1">
        <li>
          {control(
            current - 1,
            <>
              <ChevronLeftIcon />
              <span className="hidden sm:inline">{copy.previous}</span>
            </>,
            { label: copy.previous, edge: true }
          )}
        </li>
        {paginationRange(current, pageCount, siblings).map((slot, i) => (
          <li key={slot === "ellipsis" ? `gap-${i}` : slot}>
            {slot === "ellipsis" ? (
              <span
                aria-hidden="true"
                className="inline-flex h-9 min-w-5 items-center justify-center text-sm text-hn-ink-muted"
              >
                …
              </span>
            ) : (
              control(slot, slot, {
                label: fillCopy(copy.page, { page: slot }),
                current: slot === current,
              })
            )}
          </li>
        ))}
        <li>
          {control(
            current + 1,
            <>
              <span className="hidden sm:inline">{copy.next}</span>
              <ChevronRightIcon />
            </>,
            { label: copy.next, edge: true }
          )}
        </li>
      </ul>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
    </nav>
  );
}

/** Says which page loaded after a change (never on mount), or which one is still loading. */
function usePageAnnouncement(
  page: number,
  pageCount: number,
  loading: number | null,
  copy: { pageOf: string; loadingPage: string }
) {
  const [text, setText] = useState("");
  const previous = useRef({ page, loading });
  const { pageOf, loadingPage } = copy;
  useEffect(() => {
    if (loading !== null) setText(fillCopy(loadingPage, { page: loading }));
    else if (previous.current.page !== page) setText(fillCopy(pageOf, { page, count: pageCount }));
    // A request that was dropped without a page change leaves nothing to say.
    else if (previous.current.loading !== null) setText("");
    previous.current = { page, loading };
  }, [page, pageCount, loading, pageOf, loadingPage]);
  return text;
}
