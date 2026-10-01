// The shell scene (hansenexus/design#64): @hansenexus/shell, the winner of the shell-layout vote,
// as a template. Each card mounts the real package on the invented estate of the vote board.
// The shell lays itself out by its own width (container queries), so the wide card shows the
// desktop layout and the narrow ones the phone layout on any viewport.
// The gallery bundles the shell's source with this package's src as @hansenexus/ui
// (scripts/gallery.ts), so a change to an atom shows here without a rebuild.
// Names are an invented estate: no real hostnames, IPs or people in a public repo.
import { type ReactNode, useState } from "react";
import {
  navCommands,
  Shell,
  type ShellCommandSet,
  ShellCommandTrigger,
  ShellContextToggle,
  ShellNav,
  type ShellNavItem,
  type ShellPalette,
} from "../../shell/src";
import { Badge, Command, type CommandGroup, cx } from "../src";
import { Restart, Server } from "./icons";
import { PreviewCard } from "./preview";
import {
  Brand,
  MACHINES,
  type Machine,
  MachineContext,
  MachinesPage,
  NAV,
  type Screen,
} from "./variants/shell-layout/category";

export const SHELL_NAV: ShellNavItem[] = NAV.map((n) => ({
  id: n.id,
  label: n.label,
  href: `#${n.id}`,
  icon: n.icon,
  trailing: n.count,
}));

/**
 * The command a stand-in preset takes: the props shape of Lotse's CommandBar
 * (hansenexus/design-ops, packages/ops/src/command-bar.tsx), which is private and not in this repo.
 */
type OpsCommand = { id: string; label: string; group?: string; hint?: string; danger?: boolean };

const OPS: OpsCommand[] = [
  { id: "poll", label: "Poll every agent", group: "Estate", hint: "⌘R" },
  { id: "drain", label: "Drain kran-02", group: "Machines", danger: true },
  { id: "restart", label: "Restart lotsen-api", group: "Machines", danger: true },
];

/** A stand-in for Lotse's CommandBar with its props, drawn with Command. */
function OpsPresetBar({
  commands,
  onRun,
}: {
  commands: OpsCommand[];
  onRun: (command: OpsCommand) => void;
  hotkey?: boolean;
  alwaysOpen?: boolean;
}) {
  const groups: CommandGroup[] = [];
  for (const c of commands) {
    const id = c.group ?? "other";
    let group = groups.find((g) => g.id === id);
    if (!group) {
      group = { id, heading: c.group, items: [] };
      groups.push(group);
    }
    group.items.push({ id: c.id, label: c.label, hint: c.danger ? "confirm" : c.hint });
  }
  return (
    <div data-preset="ops" className="flex flex-col gap-2">
      <Badge className="self-start">ops preset</Badge>
      <Command
        groups={groups}
        label="Ops commands"
        placeholder="Run a command or find a machine"
        onSelect={(item) => {
          const found = commands.find((c) => c.id === item.id);
          if (found) onRun(found);
        }}
        autoFocus
        className="shadow-hn-lift"
      />
    </div>
  );
}

/** The estate's app in the shell: nav, header, the machine list and one machine's context. */
export function DemoShell({
  screen = "desktop",
  hotkey = false,
  preset = false,
  className,
}: {
  screen?: Screen;
  /** Bind ⌘K; only one shell on a page may. */
  hotkey?: boolean;
  /** Mount the ops preset stand-in in the palette slot instead of the default list. */
  preset?: boolean;
  className?: string;
}) {
  const [active, setActive] = useState("machines");
  const [selected, setSelected] = useState<Machine>(MACHINES[3] as Machine);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const go = (href: string) => setActive(href.replace(/^#/, ""));
  const commands: ShellCommandSet[] = [
    navCommands(SHELL_NAV, { navigate: go }),
    {
      id: "machines",
      heading: "Machines",
      commands: MACHINES.map((m) => ({
        id: m.name,
        label: m.name,
        icon: <Server />,
        run: () => setSelected(m),
      })),
    },
    {
      id: "act",
      heading: "Actions",
      commands: [
        { id: "poll", label: "Poll now", icon: <Restart />, run: () => setLastRun("Poll now") },
      ],
    },
  ];
  const palette: ShellPalette | undefined = preset
    ? ({ close }) => (
        <OpsPresetBar
          commands={OPS}
          hotkey={false}
          alwaysOpen
          onRun={(c) => {
            close();
            setLastRun(c.label);
          }}
        />
      )
    : undefined;
  return (
    <Shell
      className={className}
      commandHotkey={hotkey ? "k" : false}
      commands={commands}
      palette={palette}
      nav={
        <ShellNav
          items={SHELL_NAV}
          activeId={active}
          brand={<Brand />}
          onNavigate={(item, e) => {
            e.preventDefault();
            go(item.href);
          }}
        />
      }
      header={
        <>
          <span className="@3xl:hidden">
            <Brand />
          </span>
          <span className="hidden text-[13px] text-hn-ink-muted @3xl:inline">
            Estate / {SHELL_NAV.find((n) => n.id === active)?.label}
          </span>
          <span className="ml-auto flex items-center gap-1">
            <ShellCommandTrigger />
            <ShellContextToggle />
          </span>
        </>
      }
      main={
        <div className="flex flex-col gap-3">
          {lastRun ? (
            <p data-last-run="" className="m-0 text-[13px] text-hn-ink-muted">
              Ran: {lastRun}
            </p>
          ) : null}
          <MachinesPage
            screen={screen}
            selected={selected.name}
            onSelect={(name) => setSelected(MACHINES.find((m) => m.name === name) ?? selected)}
          />
        </div>
      }
      contextPane={<MachineContext machine={selected} />}
    />
  );
}

function Frame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cx("overflow-hidden rounded-hn-lg border border-hn-line-subtle", className)}
      data-shell-frame=""
    >
      {children}
    </div>
  );
}

export function ShellScene() {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/shell</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          Shell
        </h1>
        <p className="m-0 max-w-[68ch] text-sm text-hn-ink-body">
          Floating panels, flat: the winner of the shell-layout vote. Slots nav, header, main and an
          optional context pane; a ⌘K container that takes command sets or a whole palette. It lays
          itself out by its own width: from 768 px the nav is a column, below that a tab bar; the
          context pane shows from 1024 px.
        </p>
      </header>
      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
        <PreviewCard title="Full width: nav, header, main, context pane (⌘K)" item="shell" wide>
          <Frame className="h-[720px]">
            <DemoShell hotkey />
          </Frame>
        </PreviewCard>
        <PreviewCard title="390 px: header, main, tab bar; no context pane" item="shell">
          <Frame className="mx-auto h-[720px] w-full max-w-[390px]">
            <DemoShell screen="phone" />
          </Frame>
        </PreviewCard>
        <PreviewCard
          title="The palette slot: an ops preset instead of the default list"
          item="shell"
        >
          <Frame className="mx-auto h-[720px] w-full max-w-[390px]">
            <DemoShell screen="phone" preset />
          </Frame>
        </PreviewCard>
      </div>
    </main>
  );
}
