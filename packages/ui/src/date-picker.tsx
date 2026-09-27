import { type ComponentProps, useState } from "react";
import { Calendar, type DateRange, formatDate, formatDateRange, type WeekStart } from "./calendar";
import { cx, focusRing } from "./cx";
import { CalendarIcon } from "./icons";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Spinner } from "./spinner";
import { STATE_COPY, type StateLocale } from "./state-copy";

type DatePickerBaseProps = Omit<
  ComponentProps<"button">,
  "value" | "defaultValue" | "onChange" | "children"
> & {
  locale?: StateLocale;
  /** Shown while nothing is picked; defaults to the locale's copy. */
  placeholder?: string;
  /**
   * Work behind the field is running (the allowed days are loading, a save is in flight): the
   * trigger is busy and disabled, and a Spinner shows after 200 ms.
   */
  pending?: boolean;
  min?: Date;
  max?: Date;
  isDateDisabled?: (date: Date) => boolean;
  weekStartsOn?: WeekStart;
  /** Passed to Calendar: marked as today; pass it for deterministic renders. */
  today?: Date;
  /** Open state, for a controlled picker. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Portal target of the popover; defaults to document.body. */
  container?: HTMLElement | null;
};

export type DatePickerSingleProps = DatePickerBaseProps & {
  mode?: "single";
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (date: Date | null) => void;
};

export type DatePickerRangeProps = DatePickerBaseProps & {
  mode: "range";
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onValueChange?: (range: DateRange | null) => void;
};

export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps;

/** A controlled value when `value` is not undefined, else local state from `initial`. */
function useControllable<T>(value: T | undefined, initial: T, onChange?: (next: T) => void) {
  const [own, setOwn] = useState(initial);
  const current = value === undefined ? own : value;
  const set = (next: T) => {
    if (value === undefined) setOwn(next);
    onChange?.(next);
  };
  return [current, set] as const;
}

/**
 * A date field: a trigger that reads like a Select and opens a Calendar in a popover. Single
 * days close the popover on pick; a range closes once both ends are picked. The value is a
 * local calendar day (or a DateRange) and is written in the locale's short form. Wrap it in
 * Field: the trigger takes id, aria-labelledby, aria-describedby, aria-invalid and disabled.
 */
export function DatePicker(props: DatePickerProps) {
  const {
    mode = "single",
    value,
    defaultValue,
    onValueChange,
    locale = "en",
    placeholder,
    pending = false,
    min,
    max,
    isDateDisabled,
    weekStartsOn,
    today,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    container,
    disabled,
    className,
    ...trigger
  } = props;
  const copy = STATE_COPY[locale].date;
  const [picked, setPicked] = useControllable<Date | DateRange | null>(
    value,
    defaultValue ?? null,
    onValueChange as ((next: Date | DateRange | null) => void) | undefined
  );
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange);
  const range = mode === "range" ? (picked as DateRange | null) : null;
  const single = mode === "single" ? (picked as Date | null) : null;

  const text = range
    ? formatDateRange(range, locale)
    : single
      ? formatDate(single, locale)
      : (placeholder ?? (mode === "range" ? copy.rangePlaceholder : copy.placeholder));
  const empty = !range && !single;
  const calendar = { locale, today, weekStartsOn, min, max, isDateDisabled, autoFocus: true };

  return (
    <Popover open={open && !pending && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        data-placeholder={empty ? "" : undefined}
        className={cx(
          "inline-flex h-10 min-h-hn-target w-full min-w-0 cursor-pointer items-center gap-2 rounded-hn-md border border-hn-line-strong bg-hn-surface-page px-3 text-left font-hn-sans text-sm text-hn-ink-primary",
          "data-placeholder:text-hn-ink-muted disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-hn-status-crit",
          focusRing,
          className
        )}
        {...trigger}
      >
        <CalendarIcon className="shrink-0 text-hn-ink-muted" />
        <span className="min-w-0 flex-1 truncate tabular-nums">{text}</span>
        <Spinner pending={pending} label={STATE_COPY[locale].loading} />
      </PopoverTrigger>
      <PopoverContent
        aria-label={copy.calendar}
        container={container}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {mode === "range" ? (
          <Calendar
            mode="range"
            selected={range}
            onSelect={(next) => {
              setPicked(next);
              if (next.to) setOpen(false);
            }}
            {...calendar}
          />
        ) : (
          <Calendar
            selected={single}
            onSelect={(day) => {
              setPicked(day);
              setOpen(false);
            }}
            {...calendar}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
