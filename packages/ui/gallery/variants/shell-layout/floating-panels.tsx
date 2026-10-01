// Floating panels, the winner (decisions/shell-layout.json): since #64 this is @hansenexus/shell
// itself, the estate app of gallery/shell.tsx in each fixture's screen. Flat as it ships
// (dec_2026-09-25_kommandant-visual-flat-lime-only): opaque card panels, inset, shadow.lift, no
// blur. The glass toggle stays on the board for comparison only; it restyles the panels from
// outside the package, which has no glass, and glass ships only after a ruling that supersedes
// the flat one.
import { useSyncExternalStore } from "react";
import { Switch } from "../../../src";
import { DemoShell } from "../../shell";
import type { ShellLayout, ShellProps } from "./category";

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

/** Glass, for the board only: every shell panel translucent over a backdrop blur. */
export const GLASS =
  "bg-transparent! [&_[data-shell-panel]]:bg-hn-surface-card/60 [&_[data-shell-panel]]:backdrop-blur-xl";

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

function Shell({ screen }: ShellProps) {
  const on = useGlass();
  return (
    <div data-glass={on ? "on" : "off"} className="relative h-full w-full bg-hn-surface-band">
      {on ? <Backdrop /> : null}
      <DemoShell screen={screen} className={on ? GLASS : undefined} />
    </div>
  );
}

export const variant: ShellLayout = {
  label: "Floating panels",
  summary:
    "Nav, header, content and context as panels inset from the edge, each with the one neutral lift. Flat, as @hansenexus/shell ships it; the glass toggle shows the translucent alternative for comparison.",
  Shell,
  Controls,
};
