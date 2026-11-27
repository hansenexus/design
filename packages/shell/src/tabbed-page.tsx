// TabbedPage (design#240, owner walkthrough 2026-11-27): a settings-style page split into short
// sections. The tab bar sits in the page header (layout work or focus); each tab holds one form
// section with its own save button (the tab's `footer`) or autosave. The active tab lives in the
// URL (`?tab=`), so it can be linked and the back button works. On a phone the bar scrolls
// sideways with the active tab kept in view, or turns into a select when there are many tabs.
// The `sections` variant puts the list in a left sub-column of the slot instead, for settings
// with more than six areas. A switch or a leave with unsaved changes asks first.
import {
  cx,
  focusRing,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TabsContent,
  TabsTrigger,
} from "@hansenexus/ui";
import { Tabs as TabsPrimitive } from "radix-ui";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { PATTERN_COPY } from "./patterns-copy";
import { ConfirmLeave, type PatternShellProps, useBeforeUnload } from "./patterns-shared";
import { Shell, useShell } from "./shell";

export type TabbedPageTab = {
  id: string;
  label: ReactNode;
  /** A plain-text name for the phone's select; defaults to `label` when that is a string. */
  name?: string;
  /** The section: one short form, saved by its own button or automatically. */
  content: ReactNode;
  /** The footer bar while this tab is active: its save button, a status. */
  footer?: ReactNode;
  /** The section has unsaved changes: switching away or leaving asks first. */
  dirty?: boolean;
  /** A count or a dot after the label. */
  badge?: ReactNode;
  disabled?: boolean;
};

/** `tabs`: a bar in the page header. `sections`: a list in a left sub-column of the slot. */
export type TabbedPageVariant = "tabs" | "sections";

/** Where the active tab lives in the URL; `false` leaves routing to the app (`value`). */
export type TabbedPageUrl =
  | false
  | {
      /** The query parameter. Default "tab". */
      param?: string;
      /** push (default): every switch is a history entry, so back goes to the previous tab. */
      history?: "push" | "replace";
    };

export type TabbedPageProps = PatternShellProps & {
  /** The page's title, first in the header. */
  title: ReactNode;
  /** Controls at the header's end: the ⌘K trigger, a help link. */
  actions?: ReactNode;
  tabs: readonly TabbedPageTab[];
  /** The active tab's id, for a page that routes tabs itself (a sub-path). */
  value?: string;
  defaultValue?: string;
  /** A switch went through: after the unsaved-changes confirm, if there was one. */
  onValueChange?: (id: string) => void;
  /** The user confirmed dropping a tab's unsaved changes: reset that section's form. */
  onDiscard?: (id: string) => void;
  /** Default `{ param: "tab", history: "push" }`. */
  url?: TabbedPageUrl;
  variant?: TabbedPageVariant;
  /** Under 768 px of shell width, more tabs than this become a select. Default 4. */
  selectFrom?: number;
  /** The page layout: work (default) or focus. */
  layout?: "work" | "focus";
  /** The tab list's accessible name; default the title when it is a string, else "Section". */
  tabsLabel?: string;
};

/** The tab `search` names under `param`, when it is one of `ids`. */
export function readTabParam(
  search: string,
  param: string,
  ids: readonly string[]
): string | undefined {
  const value = new URLSearchParams(search).get(param);
  return value !== null && ids.includes(value) ? value : undefined;
}

/** `href` with `param` set to `id`; the rest of the URL is kept. */
export function withTabParam(href: string, param: string, id: string): string {
  const url = new URL(href);
  url.searchParams.set(param, id);
  return url.toString();
}

function nameOf(tab: TabbedPageTab): string {
  return tab.name ?? (typeof tab.label === "string" ? tab.label : tab.id);
}

type Pending = { to: string; via: "pick" | "history" };

/** The page with tabs. Fill a tab per section; the pattern brings the Shell. */
export function TabbedPage({
  title,
  actions,
  tabs,
  value,
  defaultValue,
  onValueChange,
  onDiscard,
  url = {},
  variant = "tabs",
  selectFrom = 4,
  layout = "work",
  tabsLabel,
  locale = "en",
  ...shell
}: TabbedPageProps) {
  const ids = tabs.map((t) => t.id);
  const param = url === false ? null : (url.param ?? "tab");
  const history = url === false ? "replace" : (url.history ?? "push");
  const first = tabs.find((t) => !t.disabled)?.id ?? tabs[0]?.id ?? "";
  const [own, setOwn] = useState<string>(() => {
    const fromUrl =
      param !== null && typeof window !== "undefined"
        ? readTabParam(window.location.search, param, ids)
        : undefined;
    return fromUrl ?? defaultValue ?? first;
  });
  const active = value ?? (ids.includes(own) ? own : first);
  const [pending, setPending] = useState<Pending | null>(null);
  const activeTab = tabs.find((t) => t.id === active);
  useBeforeUnload(tabs.some((t) => t.dirty));

  const commit = useCallback(
    (to: string, via: Pending["via"]) => {
      if (value === undefined) setOwn(to);
      onValueChange?.(to);
      if (param !== null && via === "pick" && typeof window !== "undefined") {
        const next = withTabParam(window.location.href, param, to);
        if (history === "push") window.history.pushState(window.history.state, "", next);
        else window.history.replaceState(window.history.state, "", next);
      }
    },
    [value, onValueChange, param, history]
  );

  const request = useCallback(
    (to: string, via: Pending["via"]) => {
      if (to === active) return;
      if (activeTab?.dirty) setPending({ to, via });
      else commit(to, via);
    },
    [active, activeTab, commit]
  );

  // Back and forward move between tabs; with unsaved changes the confirm asks first.
  useEffect(() => {
    if (param === null || typeof window === "undefined") return;
    const onPop = () => {
      const to = readTabParam(window.location.search, param, ids) ?? defaultValue ?? first;
      request(to, "history");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [param, ids, defaultValue, first, request]);

  const stay = () => {
    // A history move already changed the URL: put the tab that stays back.
    if (pending?.via === "history" && param !== null && typeof window !== "undefined") {
      window.history.pushState(
        window.history.state,
        "",
        withTabParam(window.location.href, param, active)
      );
    }
    setPending(null);
  };

  const leave = () => {
    if (!pending) return;
    onDiscard?.(active);
    commit(pending.to, pending.via);
    setPending(null);
  };

  const listName =
    tabsLabel ?? (typeof title === "string" ? title : PATTERN_COPY[locale].tabsSelect);
  const sections = variant === "sections";
  const bar = (
    <TabBar
      tabs={tabs}
      active={active}
      onPick={(id) => request(id, "pick")}
      label={listName}
      selectFrom={selectFrom}
      locale={locale}
      vertical={sections}
    />
  );

  return (
    <TabsPrimitive.Root
      value={active}
      onValueChange={(id) => request(id, "pick")}
      activationMode="manual"
      orientation={sections ? "vertical" : "horizontal"}
      data-tabbed-page={variant}
      className="h-full min-h-0"
    >
      <Shell
        {...shell}
        locale={locale}
        layout={layout}
        header={
          <TabbedHeader title={title} actions={actions} bar={sections ? null : bar}>
            <ConfirmGate open={pending !== null} onStay={stay} onLeave={leave} locale={locale} />
          </TabbedHeader>
        }
        footer={activeTab?.footer}
      >
        {sections ? (
          <div className="flex min-h-full flex-col gap-4 @3xl:grid @3xl:grid-cols-[13rem_minmax(0,1fr)] @3xl:gap-8">
            <div data-tabbed-sections="" className="@3xl:sticky @3xl:top-0 @3xl:self-start">
              {bar}
            </div>
            <div className="min-w-0">
              <Panels tabs={tabs} />
            </div>
          </div>
        ) : (
          <Panels tabs={tabs} />
        )}
      </Shell>
    </TabsPrimitive.Root>
  );
}

function Panels({ tabs }: { tabs: readonly TabbedPageTab[] }) {
  return (
    <>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} data-tab-panel={tab.id}>
          {tab.content}
        </TabsContent>
      ))}
    </>
  );
}

function TabbedHeader({
  title,
  actions,
  bar,
  children,
}: {
  title: ReactNode;
  actions?: ReactNode;
  bar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 @3xl:flex-row @3xl:items-center @3xl:gap-6">
      <div className="flex min-h-hn-target min-w-0 items-center gap-2">
        <h1 className="m-0 min-w-0 truncate text-[15px] font-semibold text-hn-ink-primary">
          {title}
        </h1>
        {actions ? (
          <span className="ml-auto flex shrink-0 items-center gap-1 @3xl:hidden">{actions}</span>
        ) : null}
      </div>
      {bar ? <div className="-mb-1.5 min-w-0 @3xl:mb-0 @3xl:-my-2 @3xl:flex-1">{bar}</div> : null}
      {actions ? (
        <span className="ml-auto hidden shrink-0 items-center gap-1 @3xl:flex">{actions}</span>
      ) : null}
      {children}
    </div>
  );
}

function ConfirmGate({
  open,
  onStay,
  onLeave,
  locale,
}: {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
  locale: "de" | "en";
}) {
  const { portal } = useShell();
  const copy = PATTERN_COPY[locale];
  return (
    <ConfirmLeave
      open={open}
      onOpenChange={(next) => {
        if (!next) onStay();
      }}
      title={copy.unsavedTitle}
      description={copy.unsavedBody}
      leave={copy.unsavedDiscard}
      stay={copy.unsavedStay}
      onLeave={onLeave}
      container={portal}
    />
  );
}

const SECTION_TRIGGER = cx(
  "flex min-h-hn-target w-full cursor-pointer items-center gap-2 rounded-hn-md px-3 text-left text-sm text-hn-ink-body",
  "hover:bg-hn-surface-raised hover:text-hn-ink-primary",
  "data-[state=active]:bg-hn-nav-active data-[state=active]:font-semibold data-[state=active]:text-hn-nav-active-ink",
  "disabled:pointer-events-none disabled:opacity-50",
  focusRing
);

function TabBar({
  tabs,
  active,
  onPick,
  label,
  selectFrom,
  locale,
  vertical,
}: {
  tabs: readonly TabbedPageTab[];
  active: string;
  onPick: (id: string) => void;
  label: string;
  selectFrom: number;
  locale: "de" | "en";
  vertical: boolean;
}) {
  const { width, portal } = useShell();
  const list = useRef<HTMLDivElement>(null);
  const selectId = useId();
  const compact = width === "compact";
  // A phone gets a select once the tabs outgrow a thumb's sideways scroll; sections always do.
  const asSelect = compact && (vertical || tabs.length > selectFrom);

  // Keep the active tab in view in a bar that scrolls sideways.
  useEffect(() => {
    const el = list.current;
    if (!el || vertical) return;
    const tab = el.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(active)}"]`);
    if (!tab) return;
    const left = tab.offsetLeft - el.offsetLeft;
    const right = left + tab.offsetWidth;
    if (left < el.scrollLeft) el.scrollLeft = left - 8;
    else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth + 8;
  }, [active, vertical]);

  if (asSelect) {
    return (
      <div data-tabbed-select="" className="flex min-w-0 items-center gap-2 py-1">
        <label htmlFor={selectId} className="sr-only">
          {PATTERN_COPY[locale].tabsSelect}
        </label>
        <Select value={active} onValueChange={onPick}>
          <SelectTrigger id={selectId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent container={portal}>
            {tabs.map((tab) => (
              <SelectItem key={tab.id} value={tab.id} disabled={tab.disabled}>
                {nameOf(tab)}
                {tab.dirty ? " •" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <TabsPrimitive.List
      ref={list}
      aria-label={label}
      data-tabbed-bar={vertical ? "sections" : "tabs"}
      className={cx(
        "flex font-hn-sans",
        vertical
          ? "flex-col items-stretch gap-0.5"
          : "min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]"
      )}
    >
      {tabs.map((tab) => {
        const face = (
          <>
            <span className="truncate">{tab.label}</span>
            {tab.badge !== undefined ? <span className="shrink-0">{tab.badge}</span> : null}
            {tab.dirty ? (
              <span
                data-tab-dirty=""
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-hn-status-warn"
              />
            ) : null}
          </>
        );
        return vertical ? (
          <TabsPrimitive.Trigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            data-tab-id={tab.id}
            className={SECTION_TRIGGER}
          >
            {face}
          </TabsPrimitive.Trigger>
        ) : (
          <TabsTrigger key={tab.id} value={tab.id} disabled={tab.disabled} data-tab-id={tab.id}>
            {face}
          </TabsTrigger>
        );
      })}
    </TabsPrimitive.List>
  );
}
