// 3-pane with context pane: nav, main and an optional context pane on the right (lexilink's
// pattern, the shell's optional context-pane slot). At 390 px the nav moves to a bottom tab bar
// and the context pane becomes a sheet over the list.
import { useState } from "react";
import { cx, RailItem } from "../../../src";
import {
  Brand,
  IconButton,
  MACHINES,
  MachineContext,
  MachinesPage,
  NAV,
  SELECTED,
  type ShellLayout,
  type ShellProps,
} from "./category";

function PaneIcon() {
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

function Shell({ screen }: ShellProps) {
  const [selected, setSelected] = useState<string | null>(SELECTED.name);
  const machine = MACHINES.find((m) => m.name === selected);
  const select = (name: string) => setSelected((s) => (s === name ? null : name));

  if (screen === "phone") {
    return (
      <div className="relative flex h-full w-full flex-col">
        <div className="flex h-14 shrink-0 items-center border-hn-line-subtle border-b px-4">
          <Brand />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <MachinesPage screen={screen} selected={selected} onSelect={select} />
        </div>
        {machine ? (
          <section
            aria-label={`${machine.name} context`}
            className="absolute inset-x-0 bottom-16 max-h-[55%] overflow-y-auto rounded-t-hn-lg border-hn-line-strong border-t bg-hn-surface-card p-4"
          >
            <div className="mb-2 flex justify-end">
              <IconButton label="Close context" onClick={() => setSelected(null)}>
                <PaneIcon />
              </IconButton>
            </div>
            <MachineContext machine={machine} />
          </section>
        ) : null}
        <nav
          aria-label="App"
          className="grid h-16 shrink-0 grid-cols-5 border-hn-line-subtle border-t bg-hn-surface-band"
        >
          {NAV.map((n, i) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              onClick={(e) => e.preventDefault()}
              aria-current={i === 0 ? "page" : undefined}
              className="flex flex-col items-center justify-center gap-1 text-[11px] text-hn-ink-muted no-underline aria-[current=page]:text-hn-action-text"
            >
              <span aria-hidden="true">{n.icon}</span>
              {n.label}
            </a>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      <nav
        aria-label="App"
        className="flex w-52 shrink-0 flex-col gap-1 border-hn-line-subtle border-r bg-hn-surface-band p-3"
      >
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
      <div className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
        <MachinesPage
          screen={screen}
          selected={selected}
          onSelect={select}
          trailing={
            <IconButton
              label={machine ? "Hide context pane" : "Show context pane"}
              pressed={Boolean(machine)}
              onClick={() => setSelected(machine ? null : SELECTED.name)}
            >
              <PaneIcon />
            </IconButton>
          }
        />
      </div>
      <aside
        aria-label="Context"
        className={cx(
          "shrink-0 overflow-y-auto border-hn-line-subtle border-l bg-hn-surface-band",
          machine ? "w-80 p-5" : "w-0"
        )}
      >
        {machine ? <MachineContext machine={machine} /> : null}
      </aside>
    </div>
  );
}

export const variant: ShellLayout = {
  label: "3-pane with context pane",
  summary:
    "Nav, main and a context pane for the selected row, as lexilink does it. Detail without leaving the list; at 1280 px the main column gets narrow, at 390 px the pane is a sheet.",
  Shell,
};
