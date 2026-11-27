// The app shell, 0.3 (design#239): a layout system every page picks from.
//   work   a nav column, a page column (sticky header, scrolling slot, fixed footer bar) and an
//          optional right column (aside).
//   focus  the same with the aside folded away; the page can toggle it back.
//   full   no nav column; the header carries its own back link. Live quiz, presentation, print,
//          auth, onboarding.
//   session no nav, no app header: the page's SessionHeader (exit, title, progress, status), the
//          slot centred to a reading measure, an optional SessionFooter. Learning, reading, play.
// Under 768 px of shell width the nav is a drawer from the header's menu button (the owner's M2,
// 2026-11-27), the aside a bottom sheet from a header action, the footer docked at the bottom,
// safe-area and keyboard aware. The aside is a column from 1280 px, a side sheet in between.
// The panels are the floating cards of the shell-layout vote (packages/ui/decisions/shell-layout.json)
// unless a pack's shell recipe makes them flush (design#152). The layout follows the shell's own
// width, not the viewport's (container queries), so it is right wherever it is mounted.
import {
  Button,
  cx,
  focusRing,
  isCommandShortcut,
  Kbd,
  STATE_COPY,
  type StateLocale,
  skinnable,
} from "@hansenexus/ui";
import {
  type ComponentProps,
  type ComponentType,
  createContext,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { CommandContainer, PaletteBody, type ShellCommandSet, type ShellPalette } from "./command";
import { SHELL_COPY } from "./copy";
import { ShellOverlay } from "./overlay";

/** The layouts a page picks from. */
export type ShellLayout = "work" | "focus" | "full" | "session";

export const SHELL_LAYOUTS: readonly ShellLayout[] = ["work", "focus", "full", "session"];

/** The session layout's widths: a reading measure for text, wider for cards or a quiz board. */
export type ShellMeasure = "text" | "board";

/**
 * The session slot's max width per measure. A pack sets them with --hn-shell-measure and
 * --hn-shell-board; the fallbacks are the defaults (65ch, 72rem).
 */
export const SHELL_MEASURE: Record<ShellMeasure, string> = {
  text: "max-w-[var(--hn-shell-measure,65ch)]",
  board: "max-w-[var(--hn-shell-board,72rem)]",
};

/**
 * The shell's width class, measured from its root: compact under 768 px (drawer, bottom sheet),
 * medium to 1280 px (nav column, aside as a side sheet), wide from there (aside column).
 */
export type ShellWidth = "compact" | "medium" | "wide";

/** The two breakpoints, in px of shell width: Tailwind's @3xl and @7xl container sizes. */
export const SHELL_BREAKPOINTS = { medium: 768, wide: 1280 } as const;

export function shellWidthOf(px: number): ShellWidth {
  if (px >= SHELL_BREAKPOINTS.wide) return "wide";
  if (px >= SHELL_BREAKPOINTS.medium) return "medium";
  return "compact";
}

/** The full layout's back link. */
export type ShellBack = {
  href: string;
  /** Default from SHELL_COPY (`back`). */
  label?: string;
  /** A click, for a client-side router: call `event.preventDefault()` and navigate. */
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
  /** Render the link as this component instead of `<a>`, e.g. a router's Link. */
  link?: ComponentType<ComponentProps<"a"> & { href: string }>;
};

/** The slots. Only header is required; the rest draw nothing when left out. */
export type ShellSlots = {
  /** Which layout the page uses. Default "work". */
  layout?: ShellLayout;
  /**
   * The app's navigation, inside the nav landmark: a column on the left from 768 px of shell
   * width, a drawer from the header's menu button below. ShellNav draws both. Not drawn in full
   * or session.
   */
  nav?: ReactNode;
  /**
   * The page column's sticky top bar: title, actions, the ⌘K trigger, the aside toggle. In
   * session, the SessionHeader.
   */
  header: ReactNode;
  /** The page: the slot that scrolls between header and footer. */
  children?: ReactNode;
  /** @deprecated 0.2's name for the slot; pass children. */
  main?: ReactNode;
  /**
   * The fixed footer bar under the slot: the page's primary actions. Docked on a phone. In
   * session, the SessionFooter; without one the slot fills the height.
   */
  footer?: ReactNode;
  /**
   * The right column: details, an inspector, a roster. A column from 1280 px of shell width when
   * open, a sheet below (bottom sheet under 768 px). Toggle it with ShellAsideToggle. Not drawn
   * in session.
   */
  aside?: ReactNode;
  /** @deprecated 0.2's name for aside. */
  contextPane?: ReactNode;
};

export type ShellProps = ShellSlots & {
  /** The full layout's back link, first in the header. Ignored in work and focus. */
  back?: ShellBack;
  /** The session slot's width: "text" (a reading measure) or "board" (cards, a quiz board). */
  measure?: ShellMeasure;
  /** Command sets for the ⌘K container: the nav (navCommands), an addon's actions, a preset. */
  commands?: readonly ShellCommandSet[];
  /**
   * A whole palette body instead of the default list, e.g. Lotse's CommandBar as the ops preset.
   * The shell keeps the shortcut, the modal and the focus handling.
   */
  palette?: ShellPalette;
  /**
   * The page brings its own `<main>` landmark and padding (fachwerk's pages, design#152): the
   * slot is then a plain, unpadded `<div>`, so there is one main landmark, not two.
   */
  pageOwnsMain?: boolean;
  /** The ⌘K / Ctrl+K key; `false` for no shortcut (a second shell on the page). Default "k". */
  commandHotkey?: string | false;
  commandOpen?: boolean;
  defaultCommandOpen?: boolean;
  onCommandOpenChange?: (open: boolean) => void;
  /** Whether the aside column is shown from 1280 px. Default: open in work, closed in focus. */
  asideOpen?: boolean;
  defaultAsideOpen?: boolean;
  onAsideOpenChange?: (open: boolean) => void;
  /** @deprecated 0.2's name for asideOpen. */
  contextOpen?: boolean;
  /** @deprecated 0.2's name for defaultAsideOpen. */
  defaultContextOpen?: boolean;
  /** @deprecated 0.2's name for onAsideOpenChange. */
  onContextOpenChange?: (open: boolean) => void;
  /** The shell's own copy and the default palette's. Default "en". */
  locale?: StateLocale;
  /** Landmark names; the defaults come from SHELL_COPY. */
  navLabel?: string;
  asideLabel?: string;
  /** @deprecated 0.2's name for asideLabel. */
  contextLabel?: string;
  /** The palette's accessible name; the default comes from STATE_COPY.command.label. */
  commandLabel?: string;
  className?: string;
};

/**
 * A panel: an opaque card, inset, the one neutral lift, no blur. Its corner is the shell.radius
 * recipe (design#152), radius.lg unless a pack says otherwise.
 */
export const SHELL_PANEL =
  "rounded-(--hn-shell-radius) border-(length:--hn-border-width) border-hn-line-subtle bg-hn-surface-card shadow-hn-panel";

// The slot's frame with its own fill instead of SHELL_PANEL's card: two bg utilities on one
// element resolve by Tailwind's sort order, not class order, so panel.main would always lose.
// panel.main is surface.card unless a pack seats its pages on another ground.
const MAIN_PANEL =
  "rounded-(--hn-shell-radius) border-(length:--hn-border-width) border-hn-line-subtle bg-hn-panel-main shadow-hn-panel";

// The columns from 768 px, written out so Tailwind sees each: with or without the nav column,
// with or without the aside column from 1280 px.
const COLUMNS = {
  nav: "@3xl:grid-cols-[var(--hn-shell-rail)_minmax(0,1fr)]",
  navAside:
    "@3xl:grid-cols-[var(--hn-shell-rail)_minmax(0,1fr)] @7xl:grid-cols-[var(--hn-shell-rail)_minmax(0,1fr)_var(--hn-shell-context)]",
  bare: "@3xl:grid-cols-[minmax(0,1fr)]",
  bareAside:
    "@3xl:grid-cols-[minmax(0,1fr)] @7xl:grid-cols-[minmax(0,1fr)_var(--hn-shell-context)]",
} as const;

export type ShellState = {
  locale: StateLocale;
  layout: ShellLayout;
  /** The session slot's width; "text" outside session. */
  measure: ShellMeasure;
  /** The shell's measured width class; "wide" until the first measure (and on the server). */
  width: ShellWidth;
  /** A nav was passed and the layout draws one. */
  hasNav: boolean;
  /** The nav drawer is open (compact width only). */
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
  /** An aside was passed. */
  hasAside: boolean;
  /** The aside column is open (drawn from 1280 px in work and focus). */
  asideOpen: boolean;
  setAsideOpen: (open: boolean) => void;
  /** The aside sheet is open (below 1280 px, or in full). */
  asideSheetOpen: boolean;
  /** Whether the aside is visible now, as a column or a sheet: the toggle's aria-expanded. */
  asideShown: boolean;
  /** The aside toggle's action: the column from 1280 px in work and focus, the sheet otherwise. */
  toggleAside: () => void;
  /** @deprecated 0.2: hasAside. */
  hasContext: boolean;
  /** @deprecated 0.2: asideOpen. */
  contextOpen: boolean;
  /** @deprecated 0.2: setAsideOpen. */
  setContextOpen: (open: boolean) => void;
  /** Commands or a palette were passed, so there is a ⌘K container to open. */
  hasCommand: boolean;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  /** The shell's root, where its overlays portal so they carry its data-theme. */
  portal: HTMLElement | null;
};

const ShellContext = createContext<ShellState | null>(null);

/** The shell's state, for controls inside its slots. Throws outside a Shell. */
export function useShell(): ShellState {
  const state = useContext(ShellContext);
  if (!state) throw new Error("useShell: not inside a <Shell>");
  return state;
}

/** The shell's state, or null outside a Shell (ShellNav mounted on its own). */
export function useShellIfAny(): ShellState | null {
  return useContext(ShellContext);
}

function useControllable(
  value: boolean | undefined,
  initial: boolean,
  onChange?: (next: boolean) => void
): [boolean, (next: boolean) => void, (next: boolean) => void] {
  const [own, setOwn] = useState(initial);
  const set = useCallback(
    (next: boolean) => {
      if (value === undefined) setOwn(next);
      onChange?.(next);
    },
    [value, onChange]
  );
  return [value ?? own, set, setOwn];
}

/** The root's width class, kept current by a ResizeObserver. */
function useShellWidth(root: HTMLElement | null): ShellWidth {
  const [width, setWidth] = useState<ShellWidth>("wide");
  useEffect(() => {
    if (!root || typeof ResizeObserver === "undefined") return;
    const measure = () => setWidth(shellWidthOf(root.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [root]);
  return width;
}

/** Below this many px of visual viewport lost to the bottom, it is no on-screen keyboard. */
const KEYBOARD_MIN = 80;

/**
 * How far an on-screen keyboard covers the shell's bottom edge, written to the root as
 * --hn-shell-keyboard so the footer bar can ride above it. A browser that resizes the layout
 * viewport for the keyboard (interactive-widget=resizes-content) leaves it at 0px.
 */
export function keyboardInset(
  shellBottom: number,
  viewport: { innerHeight: number; offsetTop: number; height: number }
): number {
  const keyboard = viewport.innerHeight - viewport.offsetTop - viewport.height;
  if (keyboard < KEYBOARD_MIN) return 0;
  const covered = shellBottom - (viewport.offsetTop + viewport.height);
  return Math.round(Math.min(Math.max(covered, 0), keyboard));
}

function useKeyboardInset(root: HTMLElement | null) {
  useEffect(() => {
    const vv = typeof window === "undefined" ? null : window.visualViewport;
    if (!root || !vv) return;
    const update = () => {
      const inset = keyboardInset(root.getBoundingClientRect().bottom, {
        innerHeight: window.innerHeight,
        offsetTop: vv.offsetTop,
        height: vv.height,
      });
      root.style.setProperty("--hn-shell-keyboard", `${inset}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [root]);
}

function MenuIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function BackIcon() {
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
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

const HEADER_CONTROL = cx(
  "inline-flex min-h-hn-target min-w-hn-target shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-hn-md text-hn-ink-muted no-underline",
  "hover:bg-hn-surface-raised hover:text-hn-ink-primary",
  focusRing
);

/**
 * The header's menu button: opens the nav drawer. Shown under 768 px of shell width, where the
 * nav column is folded away. The shell draws it first in the header; it renders nothing in full
 * or without a nav.
 */
export function ShellMenuButton({ className }: { className?: string }) {
  const { hasNav, navOpen, setNavOpen, locale } = useShell();
  if (!hasNav) return null;
  const label = SHELL_COPY[locale].openNav;
  return (
    <button
      type="button"
      data-shell-control="menu"
      aria-haspopup="dialog"
      aria-expanded={navOpen}
      aria-label={label}
      title={label}
      onClick={() => setNavOpen(true)}
      className={cx(HEADER_CONTROL, "@3xl:hidden", className)}
    >
      <MenuIcon />
    </button>
  );
}

function BackLink({ back, locale }: { back: ShellBack; locale: StateLocale }) {
  const label = back.label ?? SHELL_COPY[locale].back;
  const props = {
    href: back.href,
    onClick: back.onNavigate,
    "data-shell-control": "back",
    className: cx(HEADER_CONTROL, "px-2 text-sm"),
  };
  const face = (
    <>
      <BackIcon />
      <span>{label}</span>
    </>
  );
  const Link = back.link;
  return Link ? <Link {...props}>{face}</Link> : <a {...props}>{face}</a>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The session layout keeps focus inside the shell: Tab past the last stop wraps to the first,
 * Shift+Tab before the first to the last. A dialog open in the shell traps its own.
 */
function trapTab(root: HTMLElement, e: KeyboardEvent) {
  if (e.key !== "Tab") return;
  const stops = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest('[role="dialog"], [role="alertdialog"]') && el.getClientRects().length > 0
  );
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !root.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

function ShellBase({
  layout = "work",
  nav,
  header,
  children,
  main,
  footer,
  aside,
  contextPane,
  back,
  measure = "text",
  commands = [],
  palette,
  commandHotkey = "k",
  commandOpen: commandOpenProp,
  defaultCommandOpen = false,
  onCommandOpenChange,
  asideOpen: asideOpenProp,
  defaultAsideOpen,
  onAsideOpenChange,
  contextOpen,
  defaultContextOpen,
  onContextOpenChange,
  locale = "en",
  navLabel,
  asideLabel,
  contextLabel,
  commandLabel,
  pageOwnsMain = false,
  className,
}: ShellProps) {
  const copy = SHELL_COPY[locale];
  const mainId = useId();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const width = useShellWidth(root);
  useKeyboardInset(root);
  const [commandOpen, setCommandOpen] = useControllable(
    commandOpenProp,
    defaultCommandOpen,
    onCommandOpenChange
  );
  const asideDefault = defaultAsideOpen ?? defaultContextOpen;
  const [asideOpen, setAsideOpen, setOwnAside] = useControllable(
    asideOpenProp ?? contextOpen,
    asideDefault ?? layout === "work",
    onAsideOpenChange ?? onContextOpenChange
  );
  // A page that switches layout without a default of its own gets that layout's aside: open in
  // work, folded in focus. Skipped on the first render, where the initial state already says so.
  const firstLayout = useRef(true);
  useEffect(() => {
    if (firstLayout.current) {
      firstLayout.current = false;
      return;
    }
    if (asideDefault === undefined) setOwnAside(layout === "work");
  }, [layout, asideDefault, setOwnAside]);

  const [navOpen, setNavOpen] = useState(false);
  const [asideSheetOpen, setAsideSheetOpen] = useState(false);
  const slot = children ?? main;
  const side = aside ?? contextPane;
  const session = layout === "session";
  const hasNav = layout !== "full" && !session && nav !== undefined && nav !== null;
  const hasAside = !session && side !== undefined && side !== null;
  const asideColumn = hasAside && layout !== "full";
  const showColumn = asideColumn && asideOpen;
  const hasCommand = palette !== undefined || commands.length > 0;
  const columnNow = asideColumn && width === "wide";

  // An overlay that stands in for a column closes once the column is back.
  useEffect(() => {
    if (width !== "compact") setNavOpen(false);
    if (columnNow) setAsideSheetOpen(false);
  }, [width, columnNow]);
  useEffect(() => {
    if (!hasNav) setNavOpen(false);
    if (!hasAside) setAsideSheetOpen(false);
  }, [hasNav, hasAside]);

  useEffect(() => {
    if (!session || !root) return;
    const onKey = (e: KeyboardEvent) => trapTab(root, e);
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [session, root]);

  useEffect(() => {
    if (!hasCommand || commandHotkey === false) return;
    const onKey = (e: KeyboardEvent) => {
      if (!isCommandShortcut(e, commandHotkey)) return;
      e.preventDefault();
      setCommandOpen(!commandOpen);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hasCommand, commandHotkey, commandOpen, setCommandOpen]);

  const toggleAside = useCallback(() => {
    if (columnNow) setAsideOpen(!asideOpen);
    else setAsideSheetOpen((open) => !open);
  }, [columnNow, asideOpen, setAsideOpen]);

  const state = useMemo<ShellState>(
    () => ({
      locale,
      layout,
      measure,
      width,
      hasNav,
      navOpen,
      setNavOpen,
      hasAside,
      asideOpen,
      setAsideOpen,
      asideSheetOpen,
      asideShown: columnNow ? asideOpen : asideSheetOpen,
      toggleAside,
      hasContext: hasAside,
      contextOpen: asideOpen,
      setContextOpen: setAsideOpen,
      hasCommand,
      commandOpen,
      setCommandOpen,
      portal: root,
    }),
    [
      locale,
      layout,
      measure,
      width,
      hasNav,
      navOpen,
      hasAside,
      asideOpen,
      setAsideOpen,
      asideSheetOpen,
      columnNow,
      toggleAside,
      hasCommand,
      commandOpen,
      setCommandOpen,
      root,
    ]
  );
  const title = commandLabel ?? STATE_COPY[locale].command.label;
  const MainPanel = pageOwnsMain ? "div" : "main";
  const navName = navLabel ?? copy.nav;
  const asideName = asideLabel ?? contextLabel ?? copy.context;
  const columns = hasNav
    ? asideColumn
      ? COLUMNS.navAside
      : COLUMNS.nav
    : asideColumn
      ? COLUMNS.bareAside
      : COLUMNS.bare;

  return (
    <ShellContext.Provider value={state}>
      <div
        ref={setRoot}
        data-shell=""
        data-layout={layout}
        data-shell-width={width}
        className={cx(
          "@container relative h-full w-full min-h-0 [contain:layout] bg-hn-surface-band font-hn-sans text-hn-ink-primary",
          className
        )}
      >
        <a
          href={`#${mainId}`}
          data-shell-control="skip"
          className={cx(
            "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-hn-md focus:bg-hn-surface-card focus:px-3 focus:py-2 focus:text-hn-ink-primary focus:shadow-hn-overlay",
            focusRing
          )}
        >
          {copy.skip}
        </a>
        <div
          className={cx(
            // Inset, gap, column widths and the seam are the shell recipe (design#152): the
            // defaults float the panels, a flush pack sets inset and gap to 0 and the seam to its
            // border width, so neighbours overlap onto one shared line.
            "flex h-full w-full flex-col gap-(--hn-shell-gap) p-(--hn-shell-inset)",
            "@3xl:grid @3xl:grid-rows-[minmax(0,1fr)]",
            showColumn ? columns : hasNav ? COLUMNS.nav : COLUMNS.bare
          )}
        >
          {hasNav ? (
            <nav
              aria-label={navName}
              data-shell-panel="nav"
              className={cx(
                SHELL_PANEL,
                // `sticky` with no inset renders like `relative` here (the grid never scrolls), but
                // it marks the column as fixed chrome for overlays that dodge the host's fixed and
                // sticky elements, such as the @hansenexus/hud pill (fachwerk#286 e2e).
                "sticky hidden min-h-0 overflow-y-auto @3xl:block"
              )}
            >
              {nav}
            </nav>
          ) : null}
          <div
            data-shell-panel="page"
            className={cx(
              "flex min-h-0 min-w-0 flex-1 flex-col gap-(--hn-shell-gap)",
              hasNav && "@3xl:-ml-(--hn-shell-seam)"
            )}
          >
            <header
              data-shell-panel="header"
              className={cx(
                SHELL_PANEL,
                "sticky top-0 z-10 flex min-h-12 shrink-0 items-center gap-2 px-2 py-1.5 @3xl:gap-3 @3xl:px-4 @3xl:py-2"
              )}
              data-session={session ? "" : undefined}
            >
              {hasNav ? <ShellMenuButton /> : null}
              {layout === "full" && back ? <BackLink back={back} locale={locale} /> : null}
              {header}
            </header>
            <MainPanel
              id={mainId}
              tabIndex={-1}
              data-shell-panel="main"
              className={cx(
                MAIN_PANEL,
                "relative -mt-(--hn-shell-seam) min-h-0 flex-1 overflow-y-auto outline-none",
                !pageOwnsMain && "p-4 @3xl:px-8 @3xl:py-6"
              )}
            >
              {session ? (
                <div
                  data-shell-measure={measure}
                  className={cx("mx-auto flex min-h-full w-full flex-col", SHELL_MEASURE[measure])}
                >
                  {slot}
                </div>
              ) : (
                slot
              )}
            </MainPanel>
            {footer !== undefined && footer !== null ? (
              <footer
                data-shell-panel="footer"
                className={cx(
                  SHELL_PANEL,
                  "sticky bottom-0 z-10 -mt-(--hn-shell-seam) flex min-h-14 shrink-0 items-center gap-2 px-3 pt-2",
                  "pb-[max(0.5rem,env(safe-area-inset-bottom))] @3xl:px-4",
                  // Rides above an on-screen keyboard that covers the shell (useKeyboardInset).
                  "translate-y-[calc(var(--hn-shell-keyboard,0px)*-1)]"
                )}
              >
                {footer}
              </footer>
            ) : null}
          </div>
          {showColumn ? (
            <aside
              aria-label={asideName}
              data-shell-panel="aside"
              className={cx(
                SHELL_PANEL,
                "relative hidden min-h-0 overflow-y-auto p-5",
                "@7xl:-ml-(--hn-shell-seam) @7xl:block"
              )}
            >
              {side}
            </aside>
          ) : null}
        </div>
        {hasNav ? (
          <ShellOverlay
            edge="left"
            open={navOpen}
            onOpenChange={setNavOpen}
            container={root}
            title={navName}
            closeLabel={copy.close}
            swipeToClose
          >
            <nav aria-label={navName} data-shell-drawer="">
              {nav}
            </nav>
          </ShellOverlay>
        ) : null}
        {hasAside && !columnNow ? (
          <ShellOverlay
            edge="aside"
            open={asideSheetOpen}
            onOpenChange={setAsideSheetOpen}
            container={root}
            title={asideName}
            closeLabel={copy.close}
          >
            <div className="p-5">{side}</div>
          </ShellOverlay>
        ) : null}
        {hasCommand ? (
          <CommandContainer
            open={commandOpen}
            onOpenChange={setCommandOpen}
            container={root}
            title={title}
          >
            <PaletteBody
              sets={commands}
              palette={palette}
              close={() => setCommandOpen(false)}
              label={commandLabel}
              locale={locale}
            />
          </CommandContainer>
        ) : null}
      </div>
    </ShellContext.Provider>
  );
}

declare module "@hansenexus/ui" {
  interface SkinSlots {
    shell: ShellProps;
  }
}

/** The app shell: the work, focus, full and session layouts over nav, header, slot, footer and aside. */
export const Shell = skinnable("shell", ShellBase);

function PanelIcon() {
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
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

/**
 * Shows and hides the aside (aria-expanded): the column from 1280 px of shell width in work and
 * focus, the sheet below that and in full. Renders nothing when the shell has no aside.
 */
export function ShellAsideToggle({
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick" | "children">) {
  const { hasAside, asideShown, toggleAside, locale } = useShell();
  if (!hasAside) return null;
  const label = asideShown ? SHELL_COPY[locale].hideContext : SHELL_COPY[locale].showContext;
  return (
    <Button
      variant="ghost"
      data-shell-control="aside"
      aria-label={label}
      title={label}
      aria-expanded={asideShown}
      onClick={toggleAside}
      className={cx("px-2", className)}
      {...props}
    >
      <PanelIcon />
    </Button>
  );
}

/** @deprecated 0.2's name for ShellAsideToggle. */
export const ShellContextToggle = ShellAsideToggle;

/**
 * Opens the ⌘K container: a search field look with the shortcut from 768 px of shell width, an
 * icon button below. Renders nothing when the shell has no commands and no palette.
 */
export function ShellCommandTrigger({
  label,
  className,
  ...props
}: Omit<ComponentProps<"button">, "onClick" | "children"> & { label?: string }) {
  const { hasCommand, setCommandOpen, locale } = useShell();
  if (!hasCommand) return null;
  const text = label ?? SHELL_COPY[locale].openCommand;
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={text}
      title={text}
      onClick={() => setCommandOpen(true)}
      className={cx(
        "inline-flex min-h-hn-target min-w-hn-target cursor-pointer items-center justify-center gap-2 rounded-hn-md text-hn-ink-muted",
        "hover:bg-hn-surface-raised hover:text-hn-ink-primary",
        focusRing,
        "@3xl:h-8 @3xl:w-64 @3xl:justify-start @3xl:border-(length:--hn-border-width) @3xl:border-hn-line-subtle @3xl:bg-hn-surface-page @3xl:px-2.5",
        className
      )}
      {...props}
    >
      <SearchIcon />
      <span className="hidden min-w-0 flex-1 truncate text-left text-[13px] @3xl:inline">
        {text}
      </span>
      <span aria-hidden="true" className="hidden gap-0.5 @3xl:flex">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}
