import { Dialog as DialogPrimitive } from "radix-ui";
import {
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "./button";
import { cx } from "./cx";
import { DialogOverlay } from "./dialog";
import { SearchIcon } from "./icons";
import { Kbd } from "./kbd";
import { Skeleton } from "./skeleton";
import { Spinner } from "./spinner";
import { fillCopy, STATE_COPY, type StateLocale } from "./state-copy";
import { StatusGlyph } from "./status-glyph";

export type CommandItem = {
  /** Unique across all groups. */
  id: string;
  /** What the row says; the default filter matches against it. */
  label: string;
  /** Extra words the default filter matches (a hostname, an alias). Not shown. */
  keywords?: string[];
  /** Decorative, before the label. */
  icon?: ReactNode;
  /** Right-aligned meta: a namespace, a count. */
  hint?: ReactNode;
  /** A keyboard shortcut shown at the end, e.g. "⌘T". */
  shortcut?: string;
  disabled?: boolean;
};

export type CommandGroup = { id: string; heading?: string; items: CommandItem[] };

export type CommandMatch = (item: CommandItem, query: string) => boolean;

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Every word of the query appears in the label or a keyword; case and accents are ignored. */
export const defaultCommandMatch: CommandMatch = (item, query) => {
  const haystack = fold([item.label, ...(item.keywords ?? [])].join(" "));
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
};

/** The groups with only their matching items, dropping groups left empty. */
export function filterCommandGroups(
  groups: CommandGroup[],
  query: string,
  match: CommandMatch = defaultCommandMatch
): CommandGroup[] {
  const q = query.trim();
  return groups
    .map((g) => ({ ...g, items: q ? g.items.filter((item) => match(item, q)) : g.items }))
    .filter((g) => g.items.length > 0);
}

export type CommandStatus = "results" | "loading" | "empty" | "no-results" | "error";

/**
 * What the palette shows. An error wins; loading shows skeleton rows only while there is
 * nothing to show yet (older results stay, with the Spinner); no-results is claimed only once
 * loading is over.
 */
export function commandStatus({
  count,
  query,
  loading = false,
  error = false,
}: {
  count: number;
  query: string;
  loading?: boolean;
  error?: boolean;
}): CommandStatus {
  if (error) return "error";
  if (count > 0) return "results";
  if (loading) return "loading";
  return query.trim() ? "no-results" : "empty";
}

export type CommandProps = Omit<ComponentProps<"div">, "onSelect" | "children"> & {
  groups: CommandGroup[];
  /** Enter or a click on an enabled item. */
  onSelect?: (item: CommandItem) => void;
  /** The search text, controlled. */
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  /**
   * How items match the query. `false`: `groups` already are the results (a server search), so
   * nothing is filtered here.
   */
  filter?: CommandMatch | false;
  /** A search is in flight. */
  loading?: boolean;
  /** The search failed. Shows the error with a retry when `onRetry` is set. */
  error?: boolean;
  onRetry?: () => void;
  /** Default copy language; `label`, `placeholder` and the messages override it. */
  locale?: StateLocale;
  /** The input's and the list's accessible name. */
  label?: string;
  placeholder?: string;
  /** Nothing typed and nothing to suggest. */
  emptyMessage?: ReactNode;
  /** The query matched nothing. */
  noResultsMessage?: ReactNode;
  /** Keyboard hints under the list (from 640 px). */
  showHints?: boolean;
  autoFocus?: boolean;
};

const ROW =
  "flex h-9 min-h-hn-target cursor-pointer items-center gap-2.5 rounded-hn-sm px-2.5 text-sm text-hn-ink-body select-none " +
  "data-active:bg-hn-surface-raised data-active:text-hn-ink-primary " +
  "aria-disabled:cursor-default aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

/**
 * A search box over a list of commands: the palette's body, inline or inside CommandDialog.
 * The input is a combobox that owns a listbox; the arrow keys move the active option
 * (aria-activedescendant, focus stays in the input), Enter selects it. It shows loading, empty,
 * no-results and error states, and a polite live region says how many results there are.
 */
export function Command({
  groups,
  onSelect,
  query: queryProp,
  defaultQuery = "",
  onQueryChange,
  filter = defaultCommandMatch,
  loading = false,
  error = false,
  onRetry,
  locale = "en",
  label,
  placeholder,
  emptyMessage,
  noResultsMessage,
  showHints = true,
  autoFocus = false,
  className,
  ...props
}: CommandProps) {
  const copy = STATE_COPY[locale];
  const [ownQuery, setOwnQuery] = useState(defaultQuery);
  const query = queryProp ?? ownQuery;
  const setQuery = (next: string) => {
    if (queryProp === undefined) setOwnQuery(next);
    onQueryChange?.(next);
  };

  const shown =
    filter === false
      ? groups.filter((g) => g.items.length > 0)
      : filterCommandGroups(groups, query, filter);
  const flat = shown.flatMap((g) => g.items);
  const enabled = flat.filter((item) => !item.disabled);
  const status = commandStatus({ count: flat.length, query, loading, error });

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = enabled.find((item) => item.id === activeId) ?? enabled[0];
  const base = useId();
  const listId = `${base}-list`;
  const optionId = (item: CommandItem) => `${base}-o${flat.indexOf(item)}`;
  const listRef = useRef<HTMLDivElement>(null);
  const activeDomId = status === "results" && active ? optionId(active) : undefined;

  useEffect(() => {
    if (!activeDomId) return;
    const el = listRef.current?.querySelector(`[id="${activeDomId}"]`);
    el?.scrollIntoView?.({ block: "nearest" });
  }, [activeDomId]);

  const move = (by: number | "first" | "last") => {
    if (enabled.length === 0) return;
    const at = active ? enabled.indexOf(active) : -1;
    const next =
      by === "first"
        ? 0
        : by === "last"
          ? enabled.length - 1
          : (at + by + enabled.length) % enabled.length;
    setActiveId(enabled[next]?.id ?? null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    const keys: Record<string, () => void> = {
      ArrowDown: () => move(1),
      ArrowUp: () => move(-1),
      PageDown: () => move("last"),
      PageUp: () => move("first"),
      Enter: () => {
        if (status === "results" && active) onSelect?.(active);
      },
    };
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  };

  const results = flat.length === 1 ? copy.command.results.one : copy.command.results.other;
  const announcement =
    status === "results"
      ? fillCopy(results, { count: flat.length })
      : status === "no-results"
        ? fillCopy(copy.command.noResults, { query: query.trim() })
        : "";

  return (
    <div
      data-state={status}
      className={cx(
        "flex min-w-0 flex-col overflow-hidden rounded-hn-xl border border-hn-line-strong bg-hn-surface-card font-hn-sans text-hn-ink-primary",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2.5 border-b border-hn-line-subtle px-3.5">
        <SearchIcon className="shrink-0 text-hn-ink-muted" />
        <input
          role="combobox"
          aria-expanded={status === "results"}
          aria-controls={listId}
          aria-activedescendant={activeDomId}
          aria-autocomplete="list"
          aria-label={label ?? copy.command.label}
          aria-busy={loading || undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          // biome-ignore lint/a11y/noAutofocus: opt-in, for the palette opened on purpose
          autoFocus={autoFocus}
          placeholder={placeholder ?? copy.command.placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveId(null);
          }}
          onKeyDown={onKeyDown}
          className="h-12 min-w-0 flex-1 border-0 bg-transparent p-0 font-hn-sans text-[15px] text-hn-ink-primary outline-none placeholder:text-hn-ink-muted"
        />
        <Spinner pending={loading} label={copy.loading} />
      </div>
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={label ?? copy.command.label}
        hidden={status !== "results"}
        className="max-h-[min(360px,50dvh)] overflow-y-auto p-1.5"
      >
        {shown.map((group, gi) => (
          // biome-ignore lint/a11y/useSemanticElements: an option group inside a listbox, not a fieldset of form controls
          <div
            key={group.id}
            role="group"
            aria-labelledby={group.heading ? `${base}-g${gi}` : undefined}
            className="flex flex-col gap-px"
          >
            {group.heading ? (
              <div
                id={`${base}-g${gi}`}
                className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-[0.06em] text-hn-ink-muted uppercase"
              >
                {group.heading}
              </div>
            ) : null}
            {group.items.map((item) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/useFocusableInteractive: focus stays in the combobox input, which handles the keys and points aria-activedescendant here
              <div
                key={item.id}
                id={optionId(item)}
                role="option"
                aria-selected={item === active}
                aria-disabled={item.disabled || undefined}
                data-active={item === active ? "" : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => {
                  if (!item.disabled && item !== active) setActiveId(item.id);
                }}
                onClick={() => {
                  if (!item.disabled) onSelect?.(item);
                }}
                className={ROW}
              >
                {item.icon ? (
                  <span aria-hidden="true" className="flex text-hn-ink-muted">
                    {item.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint ? (
                  <span className="shrink-0 font-hn-mono text-[11.5px] text-hn-ink-muted">
                    {item.hint}
                  </span>
                ) : null}
                {item.shortcut ? (
                  <kbd className="shrink-0 font-hn-mono text-[11.5px] text-hn-ink-muted">
                    {item.shortcut}
                  </kbd>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
      {status === "loading" ? (
        <div aria-hidden="true" className="flex flex-col gap-3 px-4 py-4">
          <Skeleton shape="text" width="40%" className="text-sm" />
          <Skeleton shape="text" width="72%" className="text-sm" />
          <Skeleton shape="text" width="56%" className="text-sm" />
        </div>
      ) : null}
      {status === "empty" ? (
        <p className="m-0 px-4 py-8 text-center text-sm text-hn-ink-muted">
          {emptyMessage ?? copy.command.empty}
        </p>
      ) : null}
      {status === "no-results" ? (
        <div className="flex flex-col items-center gap-1 px-4 py-8 text-center text-sm">
          <p className="m-0 font-medium text-hn-ink-primary">
            {noResultsMessage ?? fillCopy(copy.command.noResults, { query: query.trim() })}
          </p>
          <p className="m-0 text-hn-ink-muted">{copy.noResults.description}</p>
        </div>
      ) : null}
      {status === "error" ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 px-4 py-7 text-center text-sm text-hn-ink-body"
        >
          <p className="m-0 flex items-center gap-2 font-medium text-hn-ink-primary">
            <StatusGlyph status="crit" />
            {copy.error.title}
          </p>
          <p className="m-0">{copy.command.error}</p>
          {onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              {copy.error.retry}
            </Button>
          ) : null}
        </div>
      ) : null}
      {showHints ? (
        <div
          aria-hidden="true"
          className="hidden items-center gap-4 border-t border-hn-line-subtle px-3.5 py-2 text-xs text-hn-ink-muted sm:flex"
        >
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            {copy.command.hints.navigate}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            {copy.command.hints.select}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>esc</Kbd>
            {copy.command.hints.close}
          </span>
        </div>
      ) : null}
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

export type CommandDialogProps = CommandProps & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Close after an item was selected. */
  closeOnSelect?: boolean;
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
};

/**
 * The command palette: Command in a modal dialog near the top of the screen. The input gets
 * focus on open, Escape closes and focus returns to where it was. Open it with
 * `useCommandShortcut` (⌘K / Ctrl+K).
 */
export function CommandDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  closeOnSelect = true,
  container,
  onSelect,
  locale = "en",
  label,
  className,
  ...props
}: CommandDialogProps) {
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const open = openProp ?? ownOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };
  // No DialogTrigger to hand focus back to (⌘K opens it from anywhere), so remember what had
  // focus when it opened. Read during render: the dialog's input takes focus in an effect.
  const returnTo = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current && typeof document !== "undefined") {
    const focused = document.activeElement;
    returnTo.current = focused instanceof HTMLElement ? focused : null;
  }
  wasOpen.current = open;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal container={container}>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnTo.current?.focus();
          }}
          className="fixed top-[12dvh] left-1/2 z-50 w-[calc(100vw-32px)] max-w-[560px] -translate-x-1/2 outline-none"
        >
          <DialogPrimitive.Title className="sr-only">
            {label ?? STATE_COPY[locale].command.label}
          </DialogPrimitive.Title>
          <Command
            locale={locale}
            label={label}
            onSelect={(item) => {
              onSelect?.(item);
              if (closeOnSelect) setOpen(false);
            }}
            className={cx("shadow-hn-lift", className)}
            {...props}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Whether a keydown is the palette shortcut: ⌘ or Ctrl plus `key`, no Alt or Shift. */
export function isCommandShortcut(
  e: Pick<globalThis.KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">,
  key = "k"
): boolean {
  return (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === key;
}

/** Calls `onTrigger` on ⌘K / Ctrl+K anywhere on the page (another key with `key`). */
export function useCommandShortcut(onTrigger: () => void, key = "k") {
  const handler = useRef(onTrigger);
  handler.current = onTrigger;
  useEffect(() => {
    const listener = (e: globalThis.KeyboardEvent) => {
      if (!isCommandShortcut(e, key)) return;
      e.preventDefault();
      handler.current();
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [key]);
}
