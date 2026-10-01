// The shell-layout vote (hansenexus/design#63): four app shells for @hansenexus/shell, at level
// template. Decided for floating panels, glass off; the winner now draws the package itself
// (#64), and the estate app below is what gallery/shell.tsx mounts in it. Each fixture is a Screen
// of fixed size: each theme at 1280 × 800 and at 390 × 844, scaled down to its cell. The Screen
// sets data-theme itself, so all four themes sit on one page. Web stays flat
// (dec_2026-09-25_kommandant-visual-flat-lime-only); the glass toggle stays for comparison, off
// by default. Names are an invented estate.
import { type Theme, themes } from "@hansenexus/tokens";
import { type ReactNode, useContext, useLayoutEffect, useRef, useState } from "react";
import {
  Button,
  cx,
  HansenexusMark,
  Meter,
  type Status,
  StatusBadge,
  StatusGlyph,
} from "../../../src";
import { Bell, Key, MapIcon, More, Restart, Server } from "../../icons";
import { ViewContext } from "../../preview";
import { viewAttributes } from "../../view";
import type { CategorySpec, Fixture, Variant } from "../types";

export type Screen = "desktop" | "phone";

export const SCREENS: Record<Screen, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  phone: { width: 390, height: 844 },
};

export type ShellProps = { screen: Screen };

/** A shell-layout variant: one app shell, drawn at both screen sizes. */
export type ShellLayout = Variant & { Shell: (props: ShellProps) => ReactNode };

export type NavEntry = { id: string; label: string; icon: ReactNode; count?: number };

export const NAV: NavEntry[] = [
  { id: "machines", label: "Machines", icon: <Server />, count: 6 },
  { id: "map", label: "Map", icon: <MapIcon /> },
  { id: "watch", label: "Watch", icon: <Bell />, count: 2 },
  { id: "audit", label: "Audit", icon: <Key /> },
  { id: "settings", label: "Settings", icon: <More /> },
];

export type Machine = { name: string; status: Status; role: string; cpu: number; mem: number };

export const MACHINES: Machine[] = [
  { name: "kran-01", status: "ok", role: "k3s server", cpu: 34, mem: 58 },
  { name: "kran-02", status: "busy", role: "k3s agent, rolling out", cpu: 71, mem: 64 },
  { name: "pegel", status: "warn", role: "metrics", cpu: 22, mem: 88 },
  { name: "lotsen-api", status: "crit", role: "gateway", cpu: 97, mem: 91 },
  { name: "speicher-web", status: "ok", role: "static site", cpu: 8, mem: 21 },
  { name: "kran-03", status: "off", role: "k3s agent", cpu: 0, mem: 0 },
];

/** The machine the context pane (or detail view) shows. */
export const SELECTED = MACHINES[3] as Machine;

const STATUS_WORD: Record<Status, string> = {
  ok: "Healthy",
  busy: "Busy",
  warn: "Warning",
  crit: "Critical",
  off: "Off",
  unknown: "Unknown",
};

const TONE = {
  ok: "ok",
  busy: "busy",
  warn: "warn",
  crit: "crit",
  off: "ok",
  unknown: "ok",
} as const;

/** The mark and the app name, the head of every nav. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2 text-hn-ink-primary">
      <HansenexusMark variant="lime" size={20} aria-hidden="true" />
      {compact ? null : (
        <span className="text-[13px] font-semibold tracking-tight">kommandant</span>
      )}
    </span>
  );
}

/** The page title and its one primary action. */
export function PageHeader({ screen, trailing }: { screen: Screen; trailing?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-col">
        <span className="font-hn-display text-2xl leading-tight font-semibold">Machines</span>
        <span className="text-[13px] text-hn-ink-muted">6 machines, 1 critical, 1 off</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {trailing}
        <Button variant="secondary" aria-label={screen === "phone" ? "Poll now" : undefined}>
          <Restart />
          {screen === "phone" ? null : "Poll now"}
        </Button>
      </div>
    </div>
  );
}

/** The machine list: rows on a card, the selected one raised. */
export function MachineList({
  selected = SELECTED.name,
  onSelect,
  className,
}: {
  selected?: string | null;
  onSelect?: (name: string) => void;
  className?: string;
}) {
  return (
    <ul
      aria-label="Machines"
      className={cx(
        "m-0 flex list-none flex-col overflow-hidden rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-0",
        className
      )}
    >
      {MACHINES.map((m) => (
        <li key={m.name} className="border-hn-line-subtle border-b last:border-b-0">
          <button
            type="button"
            aria-current={m.name === selected || undefined}
            onClick={() => onSelect?.(m.name)}
            className="flex min-h-hn-target w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-hn-surface-raised aria-[current=true]:bg-hn-surface-raised"
          >
            <StatusGlyph status={m.status} />
            <span className="sr-only">{STATUS_WORD[m.status]}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-hn-mono text-sm text-hn-ink-primary">{m.name}</span>
              <span className="truncate text-xs text-hn-ink-muted">{m.role}</span>
            </span>
            <span className="font-hn-mono text-xs text-hn-ink-muted">{m.cpu}%</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The page body under the header: a summary strip and the list. */
export function MachinesPage({
  screen,
  selected,
  onSelect,
  trailing,
}: {
  screen: Screen;
  selected?: string | null;
  onSelect?: (name: string) => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader screen={screen} trailing={trailing} />
      <div className="grid grid-cols-3 gap-3">
        {(["ok", "warn", "crit"] as const).map((s) => (
          <div
            key={s}
            className="flex flex-col gap-1 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-3"
          >
            <StatusBadge status={s}>{STATUS_WORD[s]}</StatusBadge>
            <span className="font-hn-display text-2xl font-semibold">
              {MACHINES.filter((m) => m.status === s).length}
            </span>
          </div>
        ))}
      </div>
      <MachineList selected={selected} onSelect={onSelect} />
    </div>
  );
}

/** One machine's context: what the context pane, a detail sheet or a panel shows. */
export function MachineContext({ machine = SELECTED }: { machine?: Machine }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="font-hn-mono text-base text-hn-ink-primary">{machine.name}</span>
        <StatusBadge status={machine.status}>{STATUS_WORD[machine.status]}</StatusBadge>
        <span className="text-xs text-hn-ink-muted">{machine.role}</span>
      </div>
      <Meter label="CPU" value={machine.cpu} tone={TONE[machine.status]} />
      <Meter label="Memory" value={machine.mem} tone={machine.mem > 85 ? "warn" : "ok"} />
      <div className="flex flex-col gap-1.5 text-xs text-hn-ink-body">
        <span className="font-semibold text-hn-ink-muted">Events</span>
        <span>15:12 health check failed, 3 of 3</span>
        <span>15:09 scaled to 2 replicas</span>
        <span>14:58 deployed tk_51c1</span>
      </div>
      <Button variant="danger">Restart</Button>
    </div>
  );
}

/**
 * One app screen at a fixed size, scaled to the cell's width (never up). It carries the fixture's
 * theme and the view's mode and density, so the tokens resolve per screen.
 */
export function ScreenFrame({
  theme,
  screen,
  children,
}: {
  theme: Theme;
  screen: Screen;
  children: ReactNode;
}) {
  const { width, height } = SCREENS[screen];
  const { mode, density } = viewAttributes(useContext(ViewContext));
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / width));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);
  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden rounded-hn-lg outline outline-1 outline-hn-line-strong"
      style={{ aspectRatio: `${width} / ${height}`, maxWidth: width }}
    >
      <div
        data-theme={theme}
        data-mode={mode}
        data-density={density ?? undefined}
        data-screen={screen}
        className="absolute top-0 left-0 flex origin-top-left overflow-hidden bg-hn-surface-page font-hn-sans text-hn-ink-primary"
        style={{
          width,
          height,
          transform: `scale(${scale || 1})`,
          visibility: scale ? undefined : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const fixtures: Fixture<ShellLayout>[] = (["desktop", "phone"] as const).flatMap((screen) =>
  themes.map((theme) => ({
    id: `${theme}-${screen}`,
    label: `${theme}, ${SCREENS[screen].width} px`,
    columns: screen === "desktop" ? 2 : 4,
    render: ({ Shell }: ShellLayout) => (
      <ScreenFrame theme={theme} screen={screen}>
        <Shell screen={screen} />
      </ScreenFrame>
    ),
  }))
);

export const category: CategorySpec<ShellLayout> = {
  title: "Shell layout",
  question:
    "Which app shell becomes @hansenexus/shell? Each draws the same app in every theme at 1280 and 390 px. The web stays flat; the floating panels' glass toggle is there to vote on, and glass winning needs a ruling that supersedes the flat one before any glass ships.",
  level: "template",
  fixtures,
};
