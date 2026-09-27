import { type ComponentProps, type ReactNode, useState } from "react";
import { Button } from "./button";
import { DATE_LOCALES } from "./calendar";
import { Checkbox } from "./checkbox";
import { cx, focusRing } from "./cx";
import { useDelayedVisibility } from "./delayed-visibility";
import { EmptyState } from "./empty-state";
import { ErrorState, type StateError } from "./error-state";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "./icons";
import { useStateAnnouncement } from "./query-state";
import { Skeleton } from "./skeleton";
import { SpinnerGlyph } from "./spinner";
import { fillCopy, STATE_COPY, type StateLocale } from "./state-copy";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

export type SortDirection = "asc" | "desc";
export type DataTableSort = { id: string; direction: SortDirection };
export type SortValue = string | number | Date | null | undefined;

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Makes the column sortable by this value. Empty values sort last in both directions. */
  sortValue?: (row: T) => SortValue;
  /** The text a query matches in this column; defaults to a string or number sortValue. */
  filterValue?: (row: T) => string;
  /** Numbers and times: right-aligned, tabular figures. */
  align?: "start" | "end";
  mono?: boolean;
  muted?: boolean;
  className?: string;
};

/** Which state the table is in: the QueryState states, no-results for filters that match none. */
export type DataTableStatus = "loading" | "error" | "empty" | "no-results" | "data";

export function dataTableStatus(
  rows: readonly unknown[] | undefined,
  visible: readonly unknown[],
  error?: unknown
): DataTableStatus {
  if (error) return "error";
  if (rows === undefined) return "loading";
  if (rows.length === 0) return "empty";
  return visible.length === 0 ? "no-results" : "data";
}

function textOf<T>(column: DataTableColumn<T>, row: T): string {
  if (column.filterValue) return column.filterValue(row);
  const v = column.sortValue?.(row);
  return typeof v === "string" || typeof v === "number" ? String(v) : "";
}

/**
 * The rows a query and a predicate leave. The query matches, ignoring case, any column's
 * filter text; every whitespace-separated word must match somewhere.
 */
export function filterRows<T>(
  rows: readonly T[],
  columns: readonly DataTableColumn<T>[],
  query = "",
  predicate?: (row: T) => boolean
): T[] {
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (predicate && !predicate(row)) return false;
    if (words.length === 0) return true;
    const text = columns.map((c) => textOf(c, row).toLocaleLowerCase()).join("\u0000");
    return words.every((w) => text.includes(w));
  });
}

/** A stable sort by one column: strings by the locale's collation (numeric), then numbers, dates. */
export function sortRows<T>(
  rows: readonly T[],
  columns: readonly DataTableColumn<T>[],
  sort: DataTableSort | null | undefined,
  locale: StateLocale = "en"
): T[] {
  const column = sort ? columns.find((c) => c.id === sort.id) : undefined;
  const value = column?.sortValue;
  if (!sort || !value) return [...rows];
  const collator = new Intl.Collator(DATE_LOCALES[locale], { numeric: true });
  const sign = sort.direction === "asc" ? 1 : -1;
  const key = (v: SortValue) => (v instanceof Date ? v.getTime() : v);
  return rows
    .map((row, index) => ({ row, index, v: key(value(row)) }))
    .sort((a, b) => {
      const aEmpty = a.v === null || a.v === undefined || a.v === "";
      const bEmpty = b.v === null || b.v === undefined || b.v === "";
      if (aEmpty || bEmpty) return aEmpty === bEmpty ? a.index - b.index : aEmpty ? 1 : -1;
      const order =
        typeof a.v === "string" && typeof b.v === "string"
          ? collator.compare(a.v, b.v)
          : Number(a.v) - Number(b.v);
      return order === 0 ? a.index - b.index : sign * order;
    })
    .map((e) => e.row);
}

/** The sort after a click on a column's header: a new column sorts ascending, then it flips. */
export function nextSort(sort: DataTableSort | null | undefined, id: string): DataTableSort {
  return sort?.id === id
    ? { id, direction: sort.direction === "asc" ? "desc" : "asc" }
    : { id, direction: "asc" };
}

/** The selection after the header checkbox: all visible rows on, or, when all are on, off. */
export function toggleAll(
  selection: ReadonlySet<string>,
  visibleIds: readonly string[]
): Set<string> {
  const next = new Set(selection);
  const all = visibleIds.length > 0 && visibleIds.every((id) => next.has(id));
  for (const id of visibleIds) {
    if (all) next.delete(id);
    else next.add(id);
  }
  return next;
}

export type DataTableProps<T> = Omit<ComponentProps<"table">, "children"> & {
  columns: readonly DataTableColumn<T>[];
  /** The rows; `undefined` while they load (the QueryState convention). */
  rows: readonly T[] | undefined;
  getRowId: (row: T) => string;
  /** A failure: takes precedence over the rows. */
  error?: StateError | null;
  onRetry?: () => void;
  /** Free-text filter over the columns' filter text. */
  query?: string;
  /** A structured filter (status, owner, dates), applied with the query. */
  filter?: (row: T) => boolean;
  /** Shown as the no-results action. Clear the query and the filter here. */
  onClearFilters?: () => void;
  sort?: DataTableSort | null;
  defaultSort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort) => void;
  /** Adds a checkbox column. */
  selectable?: boolean;
  selection?: ReadonlySet<string>;
  defaultSelection?: Iterable<string>;
  onSelectionChange?: (selection: Set<string>) => void;
  /** Names a row for its checkbox (“Select kran-01”); defaults to the row id. */
  getRowLabel?: (row: T) => string;
  /**
   * An action or refetch is running on data that is still shown: the table is aria-busy and,
   * after 200 ms, dims and shows a Spinner. Selection and sorting stay off meanwhile.
   */
  pending?: boolean;
  locale?: StateLocale;
  /** Skeleton rows while loading. */
  loadingRows?: number;
  /** Replace the default EmptyState, no-results EmptyState and ErrorState. */
  empty?: ReactNode;
  noResults?: ReactNode;
  errorFallback?: ReactNode;
  /** Names the table for assistive tech; rendered visually hidden. */
  caption?: ReactNode;
};

/**
 * A data table on Table with sorting, filtering and row selection, in every state of the
 * contract: loading keeps the header and draws skeleton rows, empty and no-results use
 * EmptyState (no-results offers to clear the filters), error uses ErrorState, pending dims the
 * stale rows after 200 ms. Sorting is on the header buttons with aria-sort; selection is a
 * checkbox column with a tri-state header box over the visible rows. A polite live region says
 * when rows arrive or loading fails. Sorting and filtering run on the rows given; for server
 * paging pass the page and control `sort`.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  error,
  onRetry,
  query = "",
  filter,
  onClearFilters,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  selectable = false,
  selection: selectionProp,
  defaultSelection,
  onSelectionChange,
  getRowLabel,
  pending = false,
  locale = "en",
  loadingRows = 5,
  empty,
  noResults,
  errorFallback,
  caption,
  className,
  ...props
}: DataTableProps<T>) {
  const copy = STATE_COPY[locale];
  const [ownSort, setOwnSort] = useState(defaultSort);
  const sort = sortProp === undefined ? ownSort : sortProp;
  const [ownSelection, setOwnSelection] = useState<ReadonlySet<string>>(
    () => new Set(defaultSelection)
  );
  const selection = selectionProp ?? ownSelection;
  const dimmed = useDelayedVisibility(pending);

  const visible = sortRows(filterRows(rows ?? [], columns, query, filter), columns, sort, locale);
  const status = dataTableStatus(rows, visible, error);
  const announcement = useStateAnnouncement(status === "no-results" ? "empty" : status, {
    loaded: copy.loaded,
    error: copy.error.title,
  });

  const select = (next: Set<string>) => {
    if (selectionProp === undefined) setOwnSelection(next);
    onSelectionChange?.(next);
  };
  const sortBy = (id: string) => {
    const next = nextSort(sort, id);
    if (sortProp === undefined) setOwnSort(next);
    onSortChange?.(next);
  };

  const visibleIds = status === "data" ? visible.map(getRowId) : [];
  const onCount = visibleIds.filter((id) => selection.has(id)).length;
  const span = columns.length + (selectable ? 1 : 0);
  const locked = pending || status !== "data";

  let body: ReactNode;
  if (status === "loading")
    body = Array.from({ length: loadingRows }, (_, r) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows have no identity
      <TableRow key={r} aria-hidden="true">
        {selectable ? (
          <TableCell className="w-10">
            <Skeleton width={18} height={18} />
          </TableCell>
        ) : null}
        {columns.map((c) => (
          <TableCell key={c.id}>
            <Skeleton shape="text" width={r % 2 ? "60%" : "80%"} />
          </TableCell>
        ))}
      </TableRow>
    ));
  else if (status === "data")
    body = visible.map((row) => {
      const id = getRowId(row);
      const on = selection.has(id);
      return (
        <TableRow key={id} data-state={on ? "selected" : undefined}>
          {selectable ? (
            <TableCell className="w-10">
              <Checkbox
                checked={on}
                disabled={pending}
                aria-label={fillCopy(copy.table.selectRow, { row: getRowLabel?.(row) ?? id })}
                onCheckedChange={(checked) => {
                  const next = new Set(selection);
                  if (checked === true) next.add(id);
                  else next.delete(id);
                  select(next);
                }}
              />
            </TableCell>
          ) : null}
          {columns.map((c) => (
            <TableCell
              key={c.id}
              mono={c.mono}
              muted={c.muted}
              className={cx(c.align === "end" && "text-right tabular-nums", c.className)}
            >
              {c.cell(row)}
            </TableCell>
          ))}
        </TableRow>
      );
    });
  else {
    let content: ReactNode;
    if (status === "error")
      content = errorFallback ?? (
        <ErrorState error={error} onRetry={onRetry} locale={locale} titleAs="p" />
      );
    else if (status === "empty") content = empty ?? <EmptyState locale={locale} titleAs="p" />;
    else
      content = noResults ?? (
        <EmptyState
          variant="no-results"
          locale={locale}
          titleAs="p"
          action={
            onClearFilters ? (
              <Button variant="secondary" onClick={onClearFilters}>
                {copy.table.clearFilters}
              </Button>
            ) : undefined
          }
        />
      );
    body = (
      <tr>
        <td colSpan={span}>{content}</td>
      </tr>
    );
  }

  return (
    <div
      data-state={status}
      data-pending={pending ? "" : undefined}
      className="relative w-full min-w-0"
    >
      <Table
        aria-busy={status === "loading" || pending || undefined}
        className={className}
        {...props}
      >
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <TableHeader>
          <TableRow>
            {selectable ? (
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    onCount === 0 ? false : onCount === visibleIds.length ? true : "indeterminate"
                  }
                  disabled={locked}
                  aria-label={copy.table.selectAll}
                  onCheckedChange={() => select(toggleAll(selection, visibleIds))}
                />
              </TableHead>
            ) : null}
            {columns.map((c) => {
              const sorted = sort?.id === c.id ? sort.direction : undefined;
              const Icon =
                sorted === "asc"
                  ? ArrowUpIcon
                  : sorted === "desc"
                    ? ArrowDownIcon
                    : ChevronsUpDownIcon;
              return (
                <TableHead
                  key={c.id}
                  aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined}
                  className={cx(c.align === "end" && "text-right")}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => sortBy(c.id)}
                      className={cx(
                        "-mx-1.5 inline-flex cursor-pointer items-center gap-1 rounded-hn-sm px-1.5 py-0.5 font-semibold hover:text-hn-ink-primary disabled:cursor-default",
                        sorted && "text-hn-ink-primary",
                        c.align === "end" && "flex-row-reverse",
                        focusRing
                      )}
                    >
                      {c.header}
                      <Icon
                        className={cx("size-3.5", sorted ? "text-hn-action-text" : "opacity-60")}
                      />
                    </button>
                  ) : (
                    c.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody
          className={cx(
            dimmed && "opacity-60",
            "transition-opacity duration-(--hn-duration-fast) motion-reduce:transition-none"
          )}
        >
          {body}
        </TableBody>
      </Table>
      {dimmed ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <SpinnerGlyph label={copy.loading} size={20} />
        </span>
      ) : null}
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
