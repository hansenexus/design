// The app shell: the floating-panels layout the owner chose in the shell-layout vote
// (packages/ui/decisions/shell-layout.json, 2026-09-29), glass off. Nav, header, main and the
// optional context pane are separate panels inset from the edge, each an opaque card with the one
// neutral lift and no blur (dec_2026-09-25_kommandant-visual-flat-lime-only).
// The layout follows the shell's own width, not the viewport's (container queries), so it is
// right wherever it is mounted: from 768 px the nav is a column on the left, below that a tab bar
// at the bottom; the context pane shows from 1024 px.
import {
  Button,
  cx,
  focusRing,
  isCommandShortcut,
  Kbd,
  STATE_COPY,
  type StateLocale,
} from "@hansenexus/ui";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CommandContainer, PaletteBody, type ShellCommandSet, type ShellPalette } from "./command";
import { SHELL_COPY } from "./copy";

/** The slots. Only the context pane is optional. */
export type ShellSlots = {
  /**
   * The app's navigation, inside the nav landmark: a column on the left from 768 px of shell
   * width, a bottom tab bar below. ShellNav draws both.
   */
  nav: ReactNode;
  /** The top bar over main: page title, breadcrumbs, actions, the ⌘K trigger. */
  header: ReactNode;
  /** The page. It scrolls inside its own panel; the rest of the shell stays put. */
  main: ReactNode;
  /**
   * The detail of what main has selected (lexilink's pattern), a pane on the right from 1024 px
   * of shell width. Below that it is not drawn: a narrow app shows the detail as a page or a
   * Sheet of its own. Toggle it with ShellContextToggle or `contextOpen`.
   */
  contextPane?: ReactNode;
};

export type ShellProps = ShellSlots & {
  /** Command sets for the ⌘K container: the nav (navCommands), an addon's actions, a preset. */
  commands?: readonly ShellCommandSet[];
  /**
   * A whole palette body instead of the default list, e.g. Lotse's CommandBar as the ops preset.
   * The shell keeps the shortcut, the modal and the focus handling.
   */
  palette?: ShellPalette;
  /** The ⌘K / Ctrl+K key; `false` for no shortcut (a second shell on the page). Default "k". */
  commandHotkey?: string | false;
  commandOpen?: boolean;
  defaultCommandOpen?: boolean;
  onCommandOpenChange?: (open: boolean) => void;
  contextOpen?: boolean;
  /** Default true. */
  defaultContextOpen?: boolean;
  onContextOpenChange?: (open: boolean) => void;
  /** The shell's own copy and the default palette's. Default "en". */
  locale?: StateLocale;
  /** Landmark names; the defaults come from SHELL_COPY. */
  navLabel?: string;
  contextLabel?: string;
  /** The palette's accessible name; the default comes from STATE_COPY.command.label. */
  commandLabel?: string;
  className?: string;
};

/** A panel: an opaque card, inset, the one neutral lift, no blur. */
export const SHELL_PANEL =
  "rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card shadow-hn-lift";

export type ShellState = {
  locale: StateLocale;
  /** A context pane was passed. */
  hasContext: boolean;
  contextOpen: boolean;
  setContextOpen: (open: boolean) => void;
  /** Commands or a palette were passed, so there is a ⌘K container to open. */
  hasCommand: boolean;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
};

const ShellContext = createContext<ShellState | null>(null);

/** The shell's state, for controls inside its slots. Throws outside a Shell. */
export function useShell(): ShellState {
  const state = useContext(ShellContext);
  if (!state) throw new Error("useShell: not inside a <Shell>");
  return state;
}

function useControllable(
  value: boolean | undefined,
  initial: boolean,
  onChange?: (next: boolean) => void
): [boolean, (next: boolean) => void] {
  const [own, setOwn] = useState(initial);
  const set = useCallback(
    (next: boolean) => {
      if (value === undefined) setOwn(next);
      onChange?.(next);
    },
    [value, onChange]
  );
  return [value ?? own, set];
}

export function Shell({
  nav,
  header,
  main,
  contextPane,
  commands = [],
  palette,
  commandHotkey = "k",
  commandOpen: commandOpenProp,
  defaultCommandOpen = false,
  onCommandOpenChange,
  contextOpen: contextOpenProp,
  defaultContextOpen = true,
  onContextOpenChange,
  locale = "en",
  navLabel,
  contextLabel,
  commandLabel,
  className,
}: ShellProps) {
  const copy = SHELL_COPY[locale];
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [commandOpen, setCommandOpen] = useControllable(
    commandOpenProp,
    defaultCommandOpen,
    onCommandOpenChange
  );
  const [contextOpen, setContextOpen] = useControllable(
    contextOpenProp,
    defaultContextOpen,
    onContextOpenChange
  );
  const hasCommand = palette !== undefined || commands.length > 0;
  const hasContext = contextPane !== undefined && contextPane !== null;
  const showContext = hasContext && contextOpen;

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

  const state = useMemo<ShellState>(
    () => ({
      locale,
      hasContext,
      contextOpen,
      setContextOpen,
      hasCommand,
      commandOpen,
      setCommandOpen,
    }),
    [locale, hasContext, contextOpen, setContextOpen, hasCommand, commandOpen, setCommandOpen]
  );
  const title = commandLabel ?? STATE_COPY[locale].command.label;

  return (
    <ShellContext.Provider value={state}>
      <div
        ref={setRoot}
        data-shell=""
        className={cx(
          "@container relative h-full w-full min-h-0 [contain:layout] bg-hn-surface-band font-hn-sans text-hn-ink-primary",
          className
        )}
      >
        <div
          className={cx(
            "flex h-full w-full flex-col gap-3 p-3",
            "@3xl:grid @3xl:grid-cols-[13rem_minmax(0,1fr)] @3xl:grid-rows-[auto_minmax(0,1fr)]",
            showContext && "@5xl:grid-cols-[13rem_minmax(0,1fr)_18rem]"
          )}
        >
          <nav
            aria-label={navLabel ?? copy.nav}
            data-shell-panel="nav"
            className={cx(
              SHELL_PANEL,
              "relative order-3 h-14 shrink-0 overflow-hidden",
              "@3xl:order-none @3xl:col-start-1 @3xl:row-span-2 @3xl:row-start-1 @3xl:h-auto @3xl:overflow-y-auto"
            )}
          >
            {nav}
          </nav>
          <header
            data-shell-panel="header"
            className={cx(
              SHELL_PANEL,
              "relative order-1 flex min-h-12 shrink-0 items-center gap-3 px-3 py-2",
              "@3xl:order-none @3xl:col-start-2 @3xl:row-start-1 @3xl:px-4"
            )}
          >
            {header}
          </header>
          <main
            data-shell-panel="main"
            className={cx(
              SHELL_PANEL,
              "relative order-2 min-h-0 flex-1 overflow-y-auto p-4",
              "@3xl:order-none @3xl:col-start-2 @3xl:row-start-2 @3xl:px-8 @3xl:py-6"
            )}
          >
            {main}
          </main>
          {showContext ? (
            <aside
              aria-label={contextLabel ?? copy.context}
              data-shell-panel="context"
              className={cx(
                SHELL_PANEL,
                "relative hidden min-h-0 overflow-y-auto p-5",
                "@5xl:col-start-3 @5xl:row-span-2 @5xl:row-start-1 @5xl:block"
              )}
            >
              {contextPane}
            </aside>
          ) : null}
        </div>
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
 * Shows and hides the context pane (aria-pressed). Hidden below 1024 px of shell width, where the
 * pane is not drawn, and when the shell has no context pane.
 */
export function ShellContextToggle({
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick" | "children">) {
  const { hasContext, contextOpen, setContextOpen, locale } = useShell();
  if (!hasContext) return null;
  const label = contextOpen ? SHELL_COPY[locale].hideContext : SHELL_COPY[locale].showContext;
  // The wrapper hides it: Button's own display would win over a `hidden` on the button.
  return (
    <span className="hidden @5xl:inline-flex">
      <Button
        variant="ghost"
        aria-label={label}
        title={label}
        aria-pressed={contextOpen}
        onClick={() => setContextOpen(!contextOpen)}
        className={cx("px-2", className)}
        {...props}
      >
        <PanelIcon />
      </Button>
    </span>
  );
}

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
        "@3xl:h-8 @3xl:w-64 @3xl:justify-start @3xl:border @3xl:border-hn-line-subtle @3xl:bg-hn-surface-page @3xl:px-2.5",
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
