// Rail + collapsible sidebar: kommandant's app shell (apps/kommandant/src/app-shell), promoted.
// A labelled sidebar that collapses to an icon rail; at 390 px it becomes a drawer behind a
// menu button. Flat: the sidebar is a band, not a panel.
import { useState } from "react";
import { cx, RailItem } from "../../../src";
import {
  Brand,
  IconButton,
  MachinesPage,
  NAV,
  type ShellLayout,
  type ShellProps,
} from "./category";

function MenuIcon({ open }: { open: boolean }) {
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
      {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
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
      <path d="M9 4v16" />
      <path d={collapsed ? "m13 10 2 2-2 2" : "m15 10-2 2 2 2"} />
    </svg>
  );
}

function Sidebar({ collapsed, className }: { collapsed: boolean; className?: string }) {
  return (
    <nav
      aria-label="App"
      className={cx(
        "flex shrink-0 flex-col gap-1 border-hn-line-subtle border-r bg-hn-surface-band p-3",
        "transition-[width] duration-(--hn-duration-base) motion-reduce:transition-none",
        collapsed ? "w-16" : "w-52",
        className
      )}
    >
      <div className={cx("mb-3 flex h-8 items-center", collapsed ? "justify-center" : "px-2")}>
        <Brand compact={collapsed} />
      </div>
      {NAV.map((n, i) => (
        <RailItem
          key={n.id}
          href={`#${n.id}`}
          onClick={(e) => e.preventDefault()}
          icon={n.icon}
          active={i === 0}
          title={collapsed ? n.label : undefined}
          trailing={collapsed ? undefined : n.count}
          className={collapsed ? "justify-center px-0" : undefined}
        >
          {collapsed ? <span className="sr-only">{n.label}</span> : n.label}
        </RailItem>
      ))}
    </nav>
  );
}

function Shell({ screen }: ShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  if (screen === "phone") {
    return (
      <div className="relative flex h-full w-full flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 border-hn-line-subtle border-b bg-hn-surface-band px-2">
          <IconButton
            label={open ? "Close navigation" : "Open navigation"}
            pressed={open}
            onClick={() => setOpen((o) => !o)}
          >
            <MenuIcon open={open} />
          </IconButton>
          <Brand />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <MachinesPage screen={screen} />
        </div>
        {open ? (
          <>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="absolute inset-0 top-14 bg-hn-surface-page/70"
            />
            <Sidebar collapsed={false} className="absolute top-14 bottom-0 left-0 w-64" />
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      <div className="flex shrink-0 flex-col bg-hn-surface-band">
        <Sidebar collapsed={collapsed} className="flex-1 border-r-0" />
        <div
          className={cx(
            "flex border-hn-line-subtle border-t p-2",
            collapsed ? "justify-center" : "justify-end"
          )}
        >
          <IconButton
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            pressed={collapsed}
            onClick={() => setCollapsed((c) => !c)}
          >
            <CollapseIcon collapsed={collapsed} />
          </IconButton>
        </div>
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto border-hn-line-subtle border-l px-8 py-6">
        <MachinesPage screen={screen} />
      </div>
    </div>
  );
}

export const variant: ShellLayout = {
  label: "Rail + collapsible sidebar",
  summary:
    "kommandant's shell today: a labelled sidebar that folds to a 64 px icon rail, a drawer at 390 px. Familiar and dense; the nav always costs a column.",
  Shell,
};
