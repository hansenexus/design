import {
  type ComponentProps,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cx, focusRing } from "./cx";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { STATE_COPY, type StateLocale } from "./state-copy";

/** A span of days. `to` is missing while only the first end is picked. */
export type DateRange = { from: Date; to?: Date };

/** 1: weeks start on Monday (ISO, German and British use); 0: on Sunday. */
export type WeekStart = 0 | 1;

/** The Intl locale per copy locale. English is British: day before month, Monday first. */
export const DATE_LOCALES: Record<StateLocale, string> = { de: "de-DE", en: "en-GB" };

/** The calendar day of `date`, at local midnight. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return (
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** The same day `months` later, clamped to the month's last day (31 Jan + 1 is 28/29 Feb). */
export function addMonths(date: Date, months: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), last));
}

const dayNumber = (date: Date) => startOfDay(date).getTime();

/** The 42 days (six weeks) a month view shows: always six rows, so the height never jumps. */
export function monthGrid(month: Date, weekStartsOn: WeekStart = 1): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = (first.getDay() - weekStartsOn + 7) % 7;
  return Array.from({ length: 42 }, (_, i) => addDays(first, i - lead));
}

/**
 * Where a key moves the focused day, or null for keys the grid does not handle. Arrows move
 * by day and week, Home and End to the week's ends, PageUp and PageDown by month (with Shift,
 * by year).
 */
export function calendarKeyTarget(
  date: Date,
  key: string,
  { weekStartsOn = 1, shiftKey = false }: { weekStartsOn?: WeekStart; shiftKey?: boolean } = {}
): Date | null {
  const weekday = (date.getDay() - weekStartsOn + 7) % 7;
  switch (key) {
    case "ArrowLeft":
      return addDays(date, -1);
    case "ArrowRight":
      return addDays(date, 1);
    case "ArrowUp":
      return addDays(date, -7);
    case "ArrowDown":
      return addDays(date, 7);
    case "Home":
      return addDays(date, -weekday);
    case "End":
      return addDays(date, 6 - weekday);
    case "PageUp":
      return addMonths(date, shiftKey ? -12 : -1);
    case "PageDown":
      return addMonths(date, shiftKey ? 12 : 1);
    default:
      return null;
  }
}

/**
 * The range after picking `date`: the first pick starts a range, the second closes it (either
 * direction), a pick on a closed range starts over.
 */
export function selectInRange(range: DateRange | null | undefined, date: Date): DateRange {
  const day = startOfDay(date);
  if (!range || range.to) return { from: day };
  return dayNumber(day) < dayNumber(range.from)
    ? { from: day, to: startOfDay(range.from) }
    : { from: startOfDay(range.from), to: day };
}

/** A day as the locale writes it in a field: 14.09.2026, 14 Sept 2026. */
export function formatDate(date: Date, locale: StateLocale = "en"): string {
  return new Intl.DateTimeFormat(DATE_LOCALES[locale], { dateStyle: "medium" }).format(date);
}

/** A range as the locale writes it (14.–18.09.2026); an open range ends in an ellipsis. */
export function formatDateRange(range: DateRange, locale: StateLocale = "en"): string {
  const format = new Intl.DateTimeFormat(DATE_LOCALES[locale], { dateStyle: "medium" });
  return range.to ? format.formatRange(range.from, range.to) : `${format.format(range.from)} – …`;
}

type Bounds = { min?: Date; max?: Date; isDateDisabled?: (date: Date) => boolean };

export function isDayDisabled(date: Date, { min, max, isDateDisabled }: Bounds): boolean {
  const n = dayNumber(date);
  if (min && n < dayNumber(min)) return true;
  if (max && n > dayNumber(max)) return true;
  return isDateDisabled?.(date) ?? false;
}

type CalendarBaseProps = Omit<ComponentProps<"div">, "onSelect" | "defaultValue"> &
  Bounds & {
    /** Copy language, month and weekday names. */
    locale?: StateLocale;
    /** Marked with aria-current="date"; defaults to now. Pass it for deterministic renders. */
    today?: Date;
    weekStartsOn?: WeekStart;
    /** The month shown; uncontrolled from `defaultMonth`, else the selection, else today. */
    month?: Date;
    defaultMonth?: Date;
    onMonthChange?: (month: Date) => void;
    /** Focus the active day on mount (DatePicker does this when it opens). */
    autoFocus?: boolean;
  };

export type CalendarSingleProps = CalendarBaseProps & {
  mode?: "single";
  selected?: Date | null;
  onSelect?: (date: Date) => void;
};

export type CalendarRangeProps = CalendarBaseProps & {
  mode: "range";
  selected?: DateRange | null;
  onSelect?: (range: DateRange) => void;
};

export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

/**
 * A month grid for one day or a range, keyboard first: one Tab stop, the arrows, Home/End and
 * PageUp/PageDown move the focused day (across months), Enter or Space picks it. It is an ARIA
 * grid with the full date as each day's name, aria-selected on the picked days and
 * aria-current on today. Disabled days stay focusable (aria-disabled) so the arrows never trap.
 * Dates are local calendar days (midnight); times are dropped.
 */
export function Calendar(props: CalendarProps) {
  const {
    mode = "single",
    selected,
    onSelect,
    locale = "en",
    today: todayProp,
    weekStartsOn = 1,
    month: monthProp,
    defaultMonth,
    onMonthChange,
    autoFocus = false,
    min,
    max,
    isDateDisabled,
    className,
    ...rest
  } = props;
  const copy = STATE_COPY[locale].date;
  const today = startOfDay(todayProp ?? new Date());
  const range = mode === "range" ? (selected as DateRange | null | undefined) : undefined;
  const single = mode === "single" ? (selected as Date | null | undefined) : undefined;
  const anchor = single ?? range?.from ?? null;

  const [ownMonth, setOwnMonth] = useState(() => monthStart(defaultMonth ?? anchor ?? today));
  const month = monthStart(monthProp ?? ownMonth);
  const [focusDay, setFocusDay] = useState(() =>
    anchor && anchor.getMonth() === month.getMonth() ? startOfDay(anchor) : null
  );
  const [preview, setPreview] = useState<Date | null>(null);
  const moved = useRef(false);
  const grid = useRef<HTMLTableElement>(null);
  const titleId = `${useId()}-title`;

  // The roving tab stop: the focused day while it is in view, else the selection, today or the 1st.
  const inView = (d: Date | null | undefined): d is Date =>
    !!d && d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
  const active = inView(focusDay)
    ? focusDay
    : inView(anchor)
      ? startOfDay(anchor)
      : inView(today)
        ? today
        : month;

  const setMonth = (next: Date) => {
    const m = monthStart(next);
    setOwnMonth(m);
    onMonthChange?.(m);
  };

  const focusActive = () =>
    grid.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();

  // biome-ignore lint/correctness/useExhaustiveDependencies: focus follows the active day
  useEffect(() => {
    if (moved.current) {
      moved.current = false;
      focusActive();
    }
  }, [active.getTime()]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: autoFocus acts once, on mount
  useEffect(() => {
    if (autoFocus) focusActive();
  }, []);

  const bounds = { min, max, isDateDisabled };
  const pick = (day: Date) => {
    if (isDayDisabled(day, bounds)) return;
    setFocusDay(day);
    if (!inView(day)) setMonth(day);
    if (mode === "range") (onSelect as CalendarRangeProps["onSelect"])?.(selectInRange(range, day));
    else (onSelect as CalendarSingleProps["onSelect"])?.(startOfDay(day));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const target = calendarKeyTarget(active, event.key, {
      weekStartsOn,
      shiftKey: event.shiftKey,
    });
    if (!target) return;
    event.preventDefault();
    moved.current = true;
    setFocusDay(target);
    if (range && !range.to) setPreview(target);
    if (!inView(target)) setMonth(target);
  };

  const step = (months: number) => {
    setFocusDay(addMonths(active, months));
    setMonth(addMonths(month, months));
  };

  const names = useMemo(() => {
    const tag = DATE_LOCALES[locale];
    return {
      title: new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" }),
      day: new Intl.DateTimeFormat(tag, { dateStyle: "full" }),
      short: new Intl.DateTimeFormat(tag, { weekday: "short" }),
      long: new Intl.DateTimeFormat(tag, { weekday: "long" }),
    };
  }, [locale]);

  // 1 Jan 2024 was a Monday, 31 Dec 2023 a Sunday.
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, i + weekStartsOn));
  const days = monthGrid(month, weekStartsOn);
  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));

  const rangeEnd = range?.to ?? (range && preview ? preview : undefined);
  const [lo = Number.NaN, hi = Number.NaN] =
    range && rangeEnd ? [range.from, rangeEnd].map(dayNumber).sort((a, b) => a - b) : [];

  const navButton =
    "inline-flex size-8 min-h-hn-target cursor-pointer items-center justify-center rounded-hn-md text-hn-ink-body hover:bg-hn-surface-raised hover:text-hn-ink-primary " +
    focusRing;

  return (
    <div
      data-mode={mode}
      className={cx("inline-flex flex-col gap-2 p-3 font-hn-sans", className)}
      {...rest}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={copy.previousMonth}
          className={navButton}
          onClick={() => step(-1)}
        >
          <ChevronLeftIcon />
        </button>
        <div
          id={titleId}
          aria-live="polite"
          className="text-sm font-semibold text-hn-ink-primary capitalize"
        >
          {names.title.format(month)}
        </div>
        <button
          type="button"
          aria-label={copy.nextMonth}
          className={navButton}
          onClick={() => step(1)}
        >
          <ChevronRightIcon />
        </button>
      </div>
      {/* The APG date grid: native table semantics under role="grid", one roving tab stop. */}
      <table
        ref={grid}
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the APG date grid
        role="grid"
        aria-labelledby={titleId}
        aria-multiselectable={mode === "range" ? true : undefined}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setPreview(null)}
        className="border-collapse"
      >
        <thead>
          <tr>
            {weekdays.map((d) => (
              <th
                key={d.getDay()}
                scope="col"
                abbr={names.long.format(d)}
                className="h-8 w-9 p-0 text-center text-[11.5px] font-medium text-hn-ink-muted"
              >
                {names.short.format(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]?.getTime()}>
              {week.map((day) => {
                const n = dayNumber(day);
                const outside = !inView(day);
                const disabled = isDayDisabled(day, bounds);
                const isStart = n === lo;
                const isEnd = n === hi;
                const between = n > lo && n < hi;
                const picked = range
                  ? (isSameDay(day, range.from) || isSameDay(day, range.to)) && !outside
                  : isSameDay(day, single) && !outside;
                const inRange = range ? (isStart || isEnd || between) && !outside : false;
                return (
                  // biome-ignore lint/a11y/useFocusableInteractive: the day button inside takes focus
                  <td
                    key={n}
                    // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: APG date grid cell
                    role="gridcell"
                    aria-selected={range ? inRange && !!range.to : picked}
                    className={cx(
                      "p-0 text-center",
                      inRange && "bg-hn-surface-tint",
                      inRange && isStart && "rounded-l-hn-md",
                      inRange && isEnd && "rounded-r-hn-md"
                    )}
                  >
                    <button
                      type="button"
                      tabIndex={isSameDay(day, active) ? 0 : -1}
                      aria-label={names.day.format(day)}
                      aria-current={isSameDay(day, today) ? "date" : undefined}
                      aria-disabled={disabled || undefined}
                      data-outside={outside ? "" : undefined}
                      data-today={isSameDay(day, today) ? "" : undefined}
                      data-selected={picked ? "" : undefined}
                      data-range={
                        inRange ? (isStart ? "start" : isEnd ? "end" : "middle") : undefined
                      }
                      onClick={() => pick(day)}
                      onMouseEnter={() => (range && !range.to ? setPreview(day) : undefined)}
                      className={cx(
                        "relative inline-flex h-9 min-h-hn-target w-9 cursor-pointer items-center justify-center rounded-hn-md text-[13px] text-hn-ink-body tabular-nums",
                        "hover:bg-hn-surface-raised hover:text-hn-ink-primary",
                        "data-outside:text-hn-ink-muted data-outside:opacity-60",
                        "data-today:font-semibold data-today:text-hn-ink-primary data-today:underline data-today:decoration-hn-action-text data-today:decoration-2 data-today:underline-offset-4",
                        "data-selected:bg-hn-action-primary data-selected:font-semibold data-selected:text-hn-action-primary-ink data-selected:no-underline data-selected:hover:bg-hn-action-primary-hover",
                        "aria-disabled:cursor-not-allowed aria-disabled:line-through aria-disabled:opacity-40 aria-disabled:hover:bg-transparent",
                        focusRing
                      )}
                    >
                      {day.getDate()}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
