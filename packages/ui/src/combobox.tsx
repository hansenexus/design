import {
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "./button";
import { cx, focusRing } from "./cx";
import { CheckIcon, ChevronsUpDownIcon } from "./icons";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";
import { Spinner } from "./spinner";
import { fillCopy, STATE_COPY, type StateLocale } from "./state-copy";
import { StatusGlyph } from "./status-glyph";

export type ComboboxOption = {
  value: string;
  label: string;
  /** A second, muted line. */
  description?: string;
  disabled?: boolean;
};

/** Which state the list is in: the QueryState states plus no-results for a query. */
export type ComboboxStatus = "loading" | "error" | "empty" | "no-results" | "options";

export type ComboboxFilter = (option: ComboboxOption, query: string) => boolean;

/** The default filter: the label contains the query, ignoring case and surrounding space. */
export const containsFilter: ComboboxFilter = (option, query) =>
  option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());

/** The options a query leaves. `filter: false` keeps all, for options the server filtered. */
export function filterOptions(
  options: readonly ComboboxOption[],
  query: string,
  filter: ComboboxFilter | false = containsFilter
): ComboboxOption[] {
  if (filter === false || query.trim() === "") return [...options];
  return options.filter((o) => filter(o, query));
}

export function comboboxStatus(
  options: readonly ComboboxOption[] | undefined,
  shown: readonly ComboboxOption[],
  { error, query }: { error?: unknown; query: string }
): ComboboxStatus {
  if (error) return "error";
  if (options === undefined) return "loading";
  if (shown.length > 0) return "options";
  return options.length === 0 && query.trim() === "" ? "empty" : "no-results";
}

/** The next enabled option from `from` in direction `step`, wrapping; -1 when none is enabled. */
export function nextOptionIndex(
  options: readonly ComboboxOption[],
  from: number,
  step: 1 | -1
): number {
  const n = options.length;
  for (let i = 1; i <= n; i++) {
    const at = (((from + step * i) % n) + n) % n;
    if (!options[at]?.disabled) return at;
  }
  return -1;
}

export type ComboboxProps = Omit<
  ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "children" | "role"
> & {
  /** The choices; `undefined` while they load (the QueryState convention). */
  options: readonly ComboboxOption[] | undefined;
  /** Loading the options failed. The list shows the error and, with onRetry, a retry. */
  error?: unknown;
  onRetry?: () => void;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null, option?: ComboboxOption) => void;
  /** Text already typed when it mounts, as if the user had typed it (a restored search). */
  defaultQuery?: string;
  /** Every keystroke, for async search: fetch, then pass the new options (undefined meanwhile). */
  onQueryChange?: (query: string) => void;
  /** How typed text narrows the options; `false` when the server already filtered them. */
  filter?: ComboboxFilter | false;
  locale?: StateLocale;
  /** Overrides the locale's messages for the empty and no-results list. */
  emptyMessage?: ReactNode;
  noResultsMessage?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Portal target of the list; defaults to document.body. */
  container?: HTMLElement | null;
  /** Flip or shift the list to stay in view (default). */
  avoidCollisions?: boolean;
};

/**
 * A text input that filters a list of options, following the ARIA combobox pattern: focus
 * stays in the input, the arrows move the active option (aria-activedescendant), Enter picks
 * it, Escape closes. The options may load asynchronously: `undefined` shows a loading row (the
 * Spinner after 200 ms), `error` an error row with retry, and an empty list says whether there
 * is nothing at all or nothing for the query. Wrap it in Field; the input takes the ids.
 */
export function Combobox({
  options,
  error,
  onRetry,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  defaultQuery = "",
  onQueryChange,
  filter,
  locale = "en",
  emptyMessage,
  noResultsMessage,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  container,
  avoidCollisions = true,
  placeholder,
  disabled,
  className,
  id,
  onKeyDown,
  onBlur,
  ...props
}: ComboboxProps) {
  const copy = STATE_COPY[locale].combobox;
  const auto = useId();
  const inputId = id ?? `${auto}-input`;
  const listId = `${auto}-list`;
  const [ownValue, setOwnValue] = useState(defaultValue);
  const value = valueProp === undefined ? ownValue : valueProp;
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const open = (openProp ?? ownOpen) && !disabled;
  const [query, setQuery] = useState(defaultQuery);
  const [editing, setEditing] = useState(defaultQuery !== "");
  const [pickedLabel, setPickedLabel] = useState("");
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const selected = options?.find((o) => o.value === value);
  const shown = editing ? filterOptions(options ?? [], query, filter) : [...(options ?? [])];
  const status = comboboxStatus(options, shown, { error, query: editing ? query : "" });
  const activeOption = status === "options" && open ? shown[active] : undefined;

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };

  const pick = (option: ComboboxOption) => {
    if (option.disabled) return;
    if (valueProp === undefined) setOwnValue(option.value);
    setPickedLabel(option.label);
    setEditing(false);
    setOpen(false);
    onValueChange?.(option.value, option);
  };

  // With the list open and nothing active yet, start on the selection or the first option.
  const firstActive = () => {
    const at = shown.findIndex((o) => o.value === value && !o.disabled);
    return at >= 0 ? at : nextOptionIndex(shown, -1, 1);
  };

  useEffect(() => {
    if (!activeOption) return;
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, activeOption]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (step !== 0) {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(firstActive());
      } else if (status === "options") {
        setActive(nextOptionIndex(shown, active < 0 && step === -1 ? shown.length : active, step));
      }
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (activeOption) pick(activeOption);
      else if (status === "error") onRetry?.();
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    onBlur?.(event);
    // Leaving the field drops unconfirmed text: the input shows the selection again.
    setEditing(false);
    setOpen(false);
  };

  const text = editing ? query : (selected?.label ?? (value ? pickedLabel : ""));

  let panel: ReactNode;
  if (status === "loading")
    panel = (
      <div className="flex min-h-hn-target items-center gap-2 px-2.5 py-2 text-sm text-hn-ink-muted">
        <Spinner label={copy.loading} />
        {copy.loading}
      </div>
    );
  else if (status === "error")
    panel = (
      <div data-state="error" className="flex flex-col items-start gap-2 px-2.5 py-2 text-sm">
        <p className="m-0 flex items-start gap-1.5 font-medium text-hn-status-crit">
          <StatusGlyph status="crit" className="mt-[3px]" />
          <span>{copy.error}</span>
        </p>
        {onRetry ? (
          <Button
            variant="secondary"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onRetry}
            tabIndex={-1}
          >
            {copy.retry}
          </Button>
        ) : null}
      </div>
    );
  else if (status === "empty" || status === "no-results")
    panel = (
      <p data-state={status} className="m-0 px-2.5 py-2 text-sm text-hn-ink-muted">
        {status === "empty"
          ? (emptyMessage ?? copy.empty)
          : (noResultsMessage ?? fillCopy(copy.noResults, { query: query.trim() }))}
      </p>
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cx("relative w-full min-w-0", className)}>
          <input
            ref={input}
            id={inputId}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={activeOption ? `${listId}-${active}` : undefined}
            aria-busy={status === "loading" || undefined}
            disabled={disabled}
            placeholder={placeholder ?? copy.placeholder}
            value={text}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              setEditing(true);
              if (!open) setOpen(true);
              const narrowed = filterOptions(options ?? [], next, filter);
              setActive(nextOptionIndex(narrowed, -1, 1));
              onQueryChange?.(next);
            }}
            onClick={() => {
              if (!open) {
                setOpen(true);
                setActive(firstActive());
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={cx(
              "h-10 w-full min-w-0 rounded-hn-md border border-hn-line-strong bg-hn-surface-page pr-9 pl-3 font-hn-sans text-sm text-hn-ink-primary",
              "placeholder:text-hn-ink-muted disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-hn-status-crit",
              focusRing
            )}
            {...props}
          />
          <ChevronsUpDownIcon className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-hn-ink-muted" />
        </div>
      </PopoverAnchor>
      <PopoverContent
        container={container}
        avoidCollisions={avoidCollisions}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (e.target instanceof Node && input.current?.contains(e.target)) e.preventDefault();
        }}
        className="max-h-72 w-(--radix-popover-trigger-width) min-w-48 overflow-y-auto p-1"
      >
        {status === "options" ? (
          <ul
            ref={list}
            id={listId}
            // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the combobox listbox
            role="listbox"
            aria-labelledby={props["aria-labelledby"]}
            aria-label={props["aria-labelledby"] ? undefined : props["aria-label"]}
            className="m-0 flex list-none flex-col gap-px p-0"
          >
            {shown.map((option, index) => (
              // biome-ignore lint/a11y/useFocusableInteractive: focus stays in the input (aria-activedescendant)
              // biome-ignore lint/a11y/useKeyWithClickEvents: the input handles the keys
              <li
                key={option.value}
                id={`${listId}-${index}`}
                data-index={index}
                // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: listbox option
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled || undefined}
                data-active={index === active ? "" : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => (option.disabled ? undefined : setActive(index))}
                onClick={() => pick(option)}
                className={cx(
                  "relative flex min-h-hn-target cursor-pointer flex-col justify-center rounded-hn-sm py-1.5 pr-8 pl-2.5 text-sm text-hn-ink-body select-none",
                  "data-active:bg-hn-surface-raised data-active:text-hn-ink-primary aria-selected:text-hn-ink-primary",
                  "aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                )}
              >
                <span className="truncate">{option.label}</span>
                {option.description ? (
                  <span className="truncate text-xs text-hn-ink-muted">{option.description}</span>
                ) : null}
                {option.value === value ? (
                  <CheckIcon className="absolute top-1/2 right-2.5 -translate-y-1/2 text-hn-action-text" />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div id={listId} role="status" aria-live="polite">
            {panel}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
