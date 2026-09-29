// Floating panels: nav and content as separate panels inset from the window edge, each lifted by
// the one neutral shadow. Flat by default (dec_2026-09-25_kommandant-visual-flat-lime-only): an
// opaque card surface, inset, shadow.lift, no blur. The glass toggle is only for the vote; glass
// winning needs a ruling that supersedes the flat one before any glass ships.
import { useState, useSyncExternalStore } from "react";
import { cx, RailItem, Switch } from "../../../src";
import {
  Brand,
  IconButton,
  MachineContext,
  MachinesPage,
  NAV,
  type ShellLayout,
  type ShellProps,
} from "./category";

// One switch for every fixture of this variant. ?glass=on starts with it on (for a linked view).
let glass =
  typeof location !== "undefined" && new URLSearchParams(location.search).get("glass") === "on";
const listeners = new Set<() => void>();

export function setGlass(on: boolean) {
  glass = on;
  for (const l of listeners) l();
}

function useGlass(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => glass,
    () => glass
  );
}

/** Flat: opaque card, the one lift. Glass: translucent card over a backdrop blur. */
export function panelClass(on: boolean): string {
  return cx(
    "rounded-hn-lg border border-hn-line-subtle shadow-hn-lift",
    on ? "bg-hn-surface-card/60 backdrop-blur-xl" : "bg-hn-surface-card"
  );
}

function Controls() {
  const on = useGlass();
  return (
    <Switch
      label="Glass (vote only; off is the flat ruling)"
      checked={on}
      onCheckedChange={setGlass}
    />
  );
}

/** Only under glass: soft token-coloured shapes behind the panels, so the blur has something to show. */
function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-24 left-1/4 size-96 rounded-full bg-hn-action-primary/30 blur-3xl" />
      <div className="absolute right-0 bottom-0 size-80 rounded-full bg-hn-status-busy/25 blur-3xl" />
    </div>
  );
}

function ContextIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </svg>
  );
}

function Shell({ screen }: ShellProps) {
  const on = useGlass();
  const [context, setContext] = useState(true);
  const panel = panelClass(on);

  if (screen === "phone") {
    return (
      <div
        data-glass={on ? "on" : "off"}
        className="relative flex h-full w-full flex-col gap-3 bg-hn-surface-band p-3"
      >
        {on ? <Backdrop /> : null}
        <div className={cx(panel, "relative flex h-12 shrink-0 items-center px-3")}>
          <Brand />
        </div>
        <div className={cx(panel, "relative min-h-0 flex-1 overflow-y-auto p-4")}>
          <MachinesPage screen={screen} />
        </div>
        <nav aria-label="App" className={cx(panel, "relative grid h-14 shrink-0 grid-cols-5")}>
          {NAV.map((n, i) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              onClick={(e) => e.preventDefault()}
              aria-current={i === 0 ? "page" : undefined}
              className="flex items-center justify-center text-hn-ink-muted aria-[current=page]:text-hn-action-text"
            >
              <span aria-hidden="true">{n.icon}</span>
              <span className="sr-only">{n.label}</span>
            </a>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div
      data-glass={on ? "on" : "off"}
      className="relative flex h-full w-full gap-3 bg-hn-surface-band p-3"
    >
      {on ? <Backdrop /> : null}
      <nav aria-label="App" className={cx(panel, "relative flex w-52 shrink-0 flex-col gap-1 p-3")}>
        <div className="mb-3 flex h-8 items-center px-2">
          <Brand />
        </div>
        {NAV.map((n, i) => (
          <RailItem
            key={n.id}
            href={`#${n.id}`}
            onClick={(e) => e.preventDefault()}
            icon={n.icon}
            active={i === 0}
            trailing={n.count}
          >
            {n.label}
          </RailItem>
        ))}
      </nav>
      <div className={cx(panel, "relative min-w-0 flex-1 overflow-y-auto px-8 py-6")}>
        <MachinesPage
          screen={screen}
          trailing={
            <IconButton
              label={context ? "Hide context panel" : "Show context panel"}
              pressed={context}
              onClick={() => setContext((c) => !c)}
            >
              <ContextIcon />
            </IconButton>
          }
        />
      </div>
      {context ? (
        <aside
          aria-label="Context"
          className={cx(panel, "relative w-72 shrink-0 overflow-y-auto p-5")}
        >
          <MachineContext />
        </aside>
      ) : null}
    </div>
  );
}

export const variant: ShellLayout = {
  label: "Floating panels",
  summary:
    "Nav, content and context as panels inset from the edge, each with the one neutral lift. Flat by default; the glass toggle shows the translucent alternative the vote can pick.",
  Shell,
  Controls,
};
