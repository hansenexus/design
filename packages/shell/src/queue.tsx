// Queue (design#240, owner walkthrough 2026-11-27): work through items one after another, on the
// session layout with the item list in the aside (a column from 1280 px, a bottom sheet on a
// phone). One block, two modes:
//   create  entering many items (vocab): the form for one item in the slot, Enter saves and
//           starts the next empty one; the items so far in the list, editable and removable; a
//           counter in the header.
//   review  grading submissions, curation, requests: one item in the slot, the decisions in the
//           footer with their shortcuts; `12/40` in the header; the list with each item's status,
//           any item a click away. It resumes at the first open item and ends on "Alles erledigt".
// Keyboard first: each action's key, j/k or ←/→ for the previous and next item, ? for the
// shortcut overlay. Shortcuts stand down while the user types, except an action bound to Enter.
import {
  Button,
  type ButtonVariant,
  cx,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  fillCopy,
  focusRing,
  Kbd,
} from "@hansenexus/ui";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { PATTERN_COPY, type PatternCopy } from "./patterns-copy";
import {
  focusWithin,
  isTyping,
  overlayOpen,
  ownsArrows,
  type PatternShellProps,
} from "./patterns-shared";
import { type SessionExitConfirm, SessionFooter, SessionHeader } from "./session";
import { Shell, ShellAsideToggle, type ShellMeasure, useShell } from "./shell";

export type QueueStatus = "open" | "done" | "skipped" | "flagged";

export const QUEUE_STATUSES: readonly QueueStatus[] = ["open", "done", "skipped", "flagged"];

export type QueueItem = {
  id: string;
  label: ReactNode;
  /** Plain text for announcements; defaults to `label` when that is a string. */
  name?: string;
  /** Default "open". Review mode counts every item that is not open as handled. */
  status?: QueueStatus;
  /** A second line in the list: a score, a date, the author. */
  meta?: ReactNode;
};

export type QueueAction = {
  id: string;
  label: ReactNode;
  /** One key, as KeyboardEvent.key names it: "a", "x", "Enter". Shown in the footer. */
  shortcut?: string;
  variant?: ButtonVariant;
  /** Go on to the next open item once `run` is through. Default true. */
  advance?: boolean;
  run: (item: QueueItem) => void | Promise<void>;
};

type QueueBase = PatternShellProps & {
  /** The queue's name: a set, a test, a request list. */
  title: ReactNode;
  items: readonly QueueItem[];
  /** Leave the queue. Escape and the header's × call it. */
  onExit: () => void;
  /** Ask before leaving: true for the default words, or the page's own. */
  confirmExit?: boolean | SessionExitConfirm;
  /** A small status at the header's end: a timer, a score. */
  status?: ReactNode;
  /** The slot's width. Default "text". */
  measure?: ShellMeasure;
  /** The list in the aside from 1280 px. Default true. */
  defaultListOpen?: boolean;
  /** Words; defaults from PATTERN_COPY. */
  labels?: Partial<PatternCopy>;
};

export type ReviewQueueProps = QueueBase & {
  mode: "review";
  /** The decisions, in footer order: Annehmen, Ablehnen, Überspringen. */
  actions: readonly QueueAction[];
  /** The item in the slot. */
  renderItem: (item: QueueItem, index: number) => ReactNode;
  /** The item in front of the user; default: resume at the first open one. */
  current?: string | null;
  defaultCurrent?: string;
  onCurrentChange?: (id: string | null) => void;
  /** Nothing open is left: the default is "Alles erledigt" with a Fertig button for onFinish. */
  done?: ReactNode;
  onFinish?: () => void;
};

export type CreateQueueProps = QueueBase & {
  mode: "create";
  /** The fields for one item. They sit in the queue's form: Enter saves. */
  form: ReactNode;
  /**
   * Save the form: add a new item, or the edit of `editing`. Return false to stay (invalid);
   * otherwise the queue focuses the form's first field for the next item.
   */
  onSave: () => boolean | void | Promise<boolean | void>;
  /** The item the form is editing; null or left out for a new one. */
  editing?: string | null;
  onEdit?: (item: QueueItem) => void;
  onCancelEdit?: () => void;
  onRemove?: (item: QueueItem) => void;
  /** Fertig in the footer. */
  onFinish?: () => void;
};

export type QueueProps = ReviewQueueProps | CreateQueueProps;

const isOpen = (item: QueueItem) => (item.status ?? "open") === "open";

/** The first open item, or null. */
export function firstOpen(items: readonly QueueItem[]): string | null {
  return items.find(isOpen)?.id ?? null;
}

/**
 * The next open item after `from`, wrapping round to the start, never `from` itself: where the
 * queue goes once an item is decided. Null when nothing else is open.
 */
export function nextOpen(items: readonly QueueItem[], from: string | null): string | null {
  const at = from === null ? -1 : items.findIndex((i) => i.id === from);
  const order = [...items.slice(at + 1), ...items.slice(0, Math.max(at, 0))];
  return order.find((i) => i.id !== from && isOpen(i))?.id ?? null;
}

/** The neighbour of `from` by `step` (-1 or 1), clamped to the ends. */
export function stepItem(
  items: readonly QueueItem[],
  from: string | null,
  step: -1 | 1
): string | null {
  if (items.length === 0) return null;
  const at = from === null ? -1 : items.findIndex((i) => i.id === from);
  if (at < 0) return items[step === 1 ? 0 : items.length - 1]?.id ?? null;
  const to = Math.min(items.length - 1, Math.max(0, at + step));
  return items[to]?.id ?? null;
}

/** Whether a key press names `shortcut`: one key, letters without case, no modifier. */
export function matchesShortcut(
  e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">,
  shortcut: string
): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  return e.key.length === 1 && shortcut.length === 1
    ? e.key.toLowerCase() === shortcut.toLowerCase()
    : e.key === shortcut;
}

function nameOf(item: QueueItem): string {
  return item.name ?? (typeof item.label === "string" ? item.label : item.id);
}

/** Work through items one at a time: `mode="create"` to enter them, `mode="review"` to decide. */
export function Queue(props: QueueProps) {
  return props.mode === "review" ? <ReviewQueue {...props} /> : <CreateQueue {...props} />;
}

function splitBase<T extends QueueBase>(props: T) {
  const {
    title,
    items,
    onExit,
    confirmExit,
    status,
    measure = "text",
    defaultListOpen = true,
    labels,
    locale = "en",
    ...rest
  } = props;
  const copy: PatternCopy = { ...PATTERN_COPY[locale], ...labels };
  return {
    title,
    items,
    onExit,
    confirmExit,
    status,
    measure,
    defaultListOpen,
    copy,
    locale,
    rest,
  };
}

function ReviewQueue(props: ReviewQueueProps) {
  const {
    title,
    items,
    onExit,
    confirmExit,
    status,
    measure,
    defaultListOpen,
    copy,
    locale,
    rest,
  } = splitBase(props);
  const {
    mode: _mode,
    actions,
    renderItem,
    current: currentProp,
    defaultCurrent,
    onCurrentChange,
    done: doneNode,
    onFinish,
    ...shell
  } = rest;
  const [own, setOwn] = useState<string | null>(() => defaultCurrent ?? firstOpen(items));
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const wanted = currentProp === undefined ? own : currentProp;
  // A current id the items no longer hold falls back to the first open item.
  const current = wanted !== null && items.some((i) => i.id === wanted) ? wanted : firstOpen(items);
  const index = current === null ? -1 : items.findIndex((i) => i.id === current);
  const item = index >= 0 ? items[index] : undefined;
  const handled = items.filter((i) => !isOpen(i)).length;

  const move = useCallback(
    (to: string | null) => {
      if (currentProp === undefined) setOwn(to);
      onCurrentChange?.(to);
    },
    [currentProp, onCurrentChange]
  );

  const act = useCallback(
    async (action: QueueAction) => {
      if (!item || busy) return;
      setBusy(true);
      try {
        await action.run(item);
        if (action.advance !== false) move(nextOpen(items, item.id));
      } finally {
        setBusy(false);
      }
    },
    [item, busy, items, move]
  );

  const keys = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "?" && !isTyping(e.target)) {
        e.preventDefault();
        setHelp(true);
        return;
      }
      const typing = isTyping(e.target);
      for (const action of actions) {
        if (!action.shortcut || !matchesShortcut(e, action.shortcut)) continue;
        if (typing && action.shortcut !== "Enter") continue;
        e.preventDefault();
        void act(action);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      const arrows = (e.key === "ArrowLeft" || e.key === "ArrowRight") && !ownsArrows(e.target);
      if (e.key === "k" || e.key === "K" || (arrows && e.key === "ArrowLeft")) {
        e.preventDefault();
        move(stepItem(items, current, -1));
      } else if (e.key === "j" || e.key === "J" || (arrows && e.key === "ArrowRight")) {
        e.preventDefault();
        move(stepItem(items, current, 1));
      }
    },
    [actions, act, move, items, current]
  );

  const shortcuts: Shortcut[] = [
    ...actions.flatMap((a) => (a.shortcut ? [{ keys: [a.shortcut], label: a.label }] : [])),
    { keys: ["j", "→"], label: copy.queueShortcutNext },
    { keys: ["k", "←"], label: copy.queueShortcutPrev },
    { keys: ["?"], label: copy.queueShortcutHelp },
  ];

  return (
    <Shell
      {...shell}
      locale={locale}
      layout="session"
      measure={measure}
      defaultAsideOpen={defaultListOpen}
      header={
        <SessionHeader
          title={title}
          onExit={onExit}
          confirmExit={confirmExit}
          progress={{
            value: handled,
            max: items.length,
            label: fillCopy(copy.queueProgress, { done: handled, total: items.length }),
          }}
          status={<QueueHeaderTools status={status} onHelp={() => setHelp(true)} copy={copy} />}
        />
      }
      footer={
        item ? (
          <SessionFooter align="between">
            <span className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={copy.queuePrev}
                title={copy.queuePrev}
                data-queue="prev"
                disabled={index <= 0}
                onClick={() => move(stepItem(items, current, -1))}
              >
                <Chevron dir="left" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={copy.queueNext}
                title={copy.queueNext}
                data-queue="next"
                disabled={index >= items.length - 1}
                onClick={() => move(stepItem(items, current, 1))}
              >
                <Chevron dir="right" />
              </Button>
            </span>
            <span className="flex flex-wrap items-center justify-end gap-2">
              {actions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant ?? "secondary"}
                  data-queue-action={action.id}
                  aria-keyshortcuts={action.shortcut}
                  disabled={busy}
                  onClick={() => void act(action)}
                >
                  {action.label}
                  {action.shortcut ? <ShortcutHint shortcut={action.shortcut} /> : null}
                </Button>
              ))}
            </span>
          </SessionFooter>
        ) : null
      }
      aside={
        <QueueList
          items={items}
          current={current}
          onPick={(id) => move(id)}
          copy={copy}
          mode="review"
        />
      }
    >
      <QueueKeys onKey={keys} />
      <Announce
        text={item ? `${index + 1}/${items.length}: ${nameOf(item)}` : copy.queueDoneTitle}
      />
      {item ? (
        <div data-queue-item={item.id} className="flex flex-1 flex-col gap-4 py-2">
          {renderItem(item, index)}
        </div>
      ) : (
        (doneNode ?? (
          <div data-queue-done="" className="flex flex-1 flex-col items-center justify-center">
            <EmptyState
              locale={locale}
              title={copy.queueDoneTitle}
              description={copy.queueDoneBody}
              titleAs="h2"
              action={onFinish ? <Button onClick={onFinish}>{copy.queueFinish}</Button> : undefined}
            />
          </div>
        ))
      )}
      <ShortcutOverlay open={help} onOpenChange={setHelp} shortcuts={shortcuts} copy={copy} />
    </Shell>
  );
}

function CreateQueue(props: CreateQueueProps) {
  const {
    title,
    items,
    onExit,
    confirmExit,
    status,
    measure,
    defaultListOpen,
    copy,
    locale,
    rest,
  } = splitBase(props);
  const {
    mode: _mode,
    form,
    onSave,
    editing = null,
    onEdit,
    onCancelEdit,
    onRemove,
    onFinish,
    ...shell
  } = rest;
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);

  const focusFirst = useCallback(() => {
    formRef.current
      ?.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select, [contenteditable]")
      ?.focus();
  }, []);

  // Editing an item puts the cursor into the form.
  useEffect(() => {
    if (editing !== null) focusFirst();
  }, [editing, focusFirst]);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await onSave();
      if (ok !== false) focusFirst();
    } finally {
      setBusy(false);
    }
  };

  const keys = useCallback((e: KeyboardEvent) => {
    if (e.key === "?" && !isTyping(e.target)) {
      e.preventDefault();
      setHelp(true);
    }
  }, []);

  const shortcuts: Shortcut[] = [
    { keys: ["Enter"], label: copy.queueShortcutSave },
    { keys: ["?"], label: copy.queueShortcutHelp },
  ];

  return (
    <Shell
      {...shell}
      locale={locale}
      layout="session"
      measure={measure}
      defaultAsideOpen={defaultListOpen}
      header={
        <SessionHeader
          title={title}
          onExit={onExit}
          confirmExit={confirmExit}
          progress={
            <span
              data-queue-count=""
              className="font-hn-mono text-[13px] text-hn-ink-muted tabular-nums"
            >
              {fillCopy(copy.queueCount, { count: items.length })}
            </span>
          }
          status={<QueueHeaderTools status={status} onHelp={() => setHelp(true)} copy={copy} />}
        />
      }
      footer={
        <SessionFooter align="between">
          {onFinish ? (
            <Button variant="ghost" data-queue="finish" onClick={onFinish} disabled={busy}>
              {copy.queueFinish}
            </Button>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-2">
            {editing !== null && onCancelEdit ? (
              <Button variant="secondary" data-queue="cancel-edit" onClick={onCancelEdit}>
                {copy.queueCancelEdit}
              </Button>
            ) : null}
            <Button
              type="submit"
              form={formId}
              data-queue="save"
              aria-keyshortcuts="Enter"
              aria-busy={busy || undefined}
              disabled={busy}
            >
              {editing !== null ? copy.queueSaveEdit : copy.queueSaveNext}
              <ShortcutHint shortcut="Enter" />
            </Button>
          </span>
        </SessionFooter>
      }
      aside={
        <QueueList
          items={items}
          current={editing}
          onPick={(id) => {
            const item = items.find((i) => i.id === id);
            if (item) onEdit?.(item);
          }}
          onRemove={onRemove}
          copy={copy}
          mode="create"
        />
      }
    >
      <QueueKeys onKey={keys} />
      <form
        ref={formRef}
        id={formId}
        noValidate
        data-queue-form={editing ?? "new"}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col gap-4 py-2"
      >
        {form}
      </form>
      <ShortcutOverlay open={help} onOpenChange={setHelp} shortcuts={shortcuts} copy={copy} />
    </Shell>
  );
}

/** Listens for the queue's keys while focus is in this shell and no dialog is open. */
function QueueKeys({ onKey }: { onKey: (e: KeyboardEvent) => void }) {
  const { portal } = useShell();
  const latest = useRef(onKey);
  latest.current = onKey;
  useEffect(() => {
    const listen = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      if (!focusWithin(portal) || overlayOpen(portal)) return;
      latest.current(e);
    };
    document.addEventListener("keydown", listen);
    return () => document.removeEventListener("keydown", listen);
  }, [portal]);
  return null;
}

function Announce({ text }: { text: string }) {
  return (
    <p aria-live="polite" className="sr-only">
      {text}
    </p>
  );
}

function QueueHeaderTools({
  status,
  onHelp,
  copy,
}: {
  status?: ReactNode;
  onHelp: () => void;
  copy: PatternCopy;
}) {
  return (
    <>
      {status}
      <Button
        variant="ghost"
        size="icon"
        data-queue="help"
        aria-label={copy.queueShortcuts}
        title={copy.queueShortcuts}
        aria-keyshortcuts="?"
        onClick={onHelp}
        className="hidden @3xl:inline-flex"
      >
        <span aria-hidden="true" className="font-hn-mono text-[13px]">
          ?
        </span>
      </Button>
      <ShellAsideToggle aria-label={copy.queueList} title={copy.queueList} />
    </>
  );
}

type Shortcut = { keys: string[]; label: ReactNode };

const KEY_NAMES: Record<string, string> = { Enter: "↵", Escape: "esc", " ": "space" };

function ShortcutHint({ shortcut }: { shortcut: string }) {
  return (
    <span
      aria-hidden="true"
      data-shortcut-hint=""
      className="ml-1 hidden h-[18px] min-w-[18px] items-center justify-center rounded-hn-sm border border-current px-1 font-hn-mono text-[11px] font-normal opacity-60 @3xl:inline-flex"
    >
      {KEY_NAMES[shortcut] ?? shortcut.toUpperCase()}
    </span>
  );
}

function ShortcutOverlay({
  open,
  onOpenChange,
  shortcuts,
  copy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: Shortcut[];
  copy: PatternCopy;
}) {
  const { portal } = useShell();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        container={portal}
        showClose
        data-queue-shortcuts=""
        style={{ width: "calc(100% - 32px)" }}
      >
        <DialogHeader>
          <DialogTitle>{copy.queueShortcuts}</DialogTitle>
          <DialogDescription className="sr-only">{copy.queueShortcutHelp}</DialogDescription>
        </DialogHeader>
        <dl className="m-0 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
          {shortcuts.map((s) => (
            <div key={s.keys.join("+")} className="contents">
              <dt className="flex gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k}>{KEY_NAMES[k] ?? k}</Kbd>
                ))}
              </dt>
              <dd className="m-0 text-hn-ink-body">{s.label}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_MARK: Record<QueueStatus, string> = {
  open: "border border-hn-line-strong",
  done: "bg-hn-status-ok",
  skipped: "border border-dashed border-hn-ink-muted",
  flagged: "bg-hn-status-warn",
};

function QueueList({
  items,
  current,
  onPick,
  onRemove,
  copy,
  mode,
}: {
  items: readonly QueueItem[];
  current: string | null;
  onPick: (id: string) => void;
  onRemove?: (item: QueueItem) => void;
  copy: PatternCopy;
  mode: "create" | "review";
}) {
  const { width, asideShown, toggleAside } = useShell();
  const headingId = useId();
  const pick = (id: string) => {
    onPick(id);
    // A sheet stands in for the column below 1280 px: close it once an item is picked.
    if (width !== "wide" && asideShown) toggleAside();
  };
  return (
    <section aria-labelledby={headingId} data-queue-list={mode} className="flex flex-col gap-3">
      <h2 id={headingId} className="m-0 flex items-baseline gap-2 text-sm font-semibold">
        {copy.queueList}
        <span className="font-hn-mono text-[12px] font-normal text-hn-ink-muted tabular-nums">
          {items.length}
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="m-0 text-[13px] text-hn-ink-muted">{copy.queueEmptyList}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
          {items.map((item, index) => {
            const status = item.status ?? "open";
            const here = item.id === current;
            return (
              <li
                key={item.id}
                data-queue-row={item.id}
                data-status={status}
                className="group flex items-center gap-1"
              >
                <button
                  type="button"
                  aria-current={here ? (mode === "review" ? "step" : "true") : undefined}
                  onClick={() => pick(item.id)}
                  className={cx(
                    "flex min-h-hn-target min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-hn-md px-2 py-1 text-left",
                    here
                      ? "bg-hn-nav-active text-hn-nav-active-ink"
                      : "text-hn-ink-body hover:bg-hn-surface-raised hover:text-hn-ink-primary",
                    focusRing
                  )}
                >
                  {mode === "review" ? (
                    <span
                      aria-hidden="true"
                      className={cx("size-2.5 shrink-0 rounded-full", STATUS_MARK[status])}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="w-5 shrink-0 text-right font-hn-mono text-[12px] text-hn-ink-muted tabular-nums"
                    >
                      {index + 1}
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px]">{item.label}</span>
                    {item.meta ? (
                      <span className="truncate text-[12px] text-hn-ink-muted">{item.meta}</span>
                    ) : null}
                  </span>
                  {mode === "review" ? (
                    <span className="sr-only">({copy.queueStatus[status]})</span>
                  ) : (
                    <span className="sr-only">({copy.queueEdit})</span>
                  )}
                </button>
                {mode === "create" && onRemove ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    data-queue-remove={item.id}
                    aria-label={`${copy.queueRemove}: ${nameOf(item)}`}
                    title={copy.queueRemove}
                    onClick={() => onRemove(item)}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}
