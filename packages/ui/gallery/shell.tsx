// The shell scene (hansenexus/design#64, layouts design#239): @hansenexus/shell as a template.
// Each card mounts the real package on the invented estate of the vote board. One story per
// layout (work, focus, full, session; `?layout=` picks it; session has its own four pages in
// shell-session.tsx) × breakpoint (desktop 1280, tablet 900, phone
// 390 in a phone frame) × theme pack (the toolbar's pack switcher, or `?theme=`).
// The shell lays itself out by its own width (container queries), so each frame shows its
// breakpoint on any viewport; a frame wider than the scene scrolls inside its card.
// The gallery bundles the shell's source with this package's src as @hansenexus/ui
// (scripts/gallery.ts), so a change to an atom shows here without a rebuild.
// Names are an invented estate: no real hostnames, IPs or people in a public repo.
import { type ReactNode, useState } from "react";
import {
  navCommands,
  SHELL_LAYOUTS,
  Shell,
  ShellAsideToggle,
  type ShellCommandSet,
  ShellCommandTrigger,
  type ShellLayout,
  ShellNav,
  type ShellNavItem,
  type ShellPalette,
} from "../../shell/src";
import { Badge, Button, Command, type CommandGroup, cx } from "../src";
import { Restart, Server } from "./icons";
import { PreviewCard } from "./preview";
import { SESSION_KINDS, SessionDemo } from "./shell-session";
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
        className="shadow-hn-overlay"
      />
    </div>
  );
}

/** The estate's app in the shell: nav, header, the machine list, its footer bar and an aside. */
export function DemoShell({
  screen = "desktop",
  layout = "work",
  hotkey = false,
  preset = false,
  className,
}: {
  screen?: Screen;
  layout?: ShellLayout;
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
  const full = layout === "full";
  const here = SHELL_NAV.find((n) => n.id === active)?.label;
  return (
    <Shell
      className={className}
      layout={layout}
      commandHotkey={hotkey ? "k" : false}
      commands={commands}
      palette={palette}
      back={{
        href: "#machines",
        label: "Machines",
        onNavigate: (e) => e.preventDefault(),
      }}
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
          {full ? (
            <span className="min-w-0 truncate font-hn-mono text-[13px]">{selected.name}</span>
          ) : (
            <>
              <span className="@3xl:hidden">
                <Brand />
              </span>
              <span className="hidden text-[13px] text-hn-ink-muted @3xl:inline">
                Estate / {here}
              </span>
            </>
          )}
          <span className="ml-auto flex items-center gap-1">
            <ShellCommandTrigger />
            <ShellAsideToggle />
          </span>
        </>
      }
      footer={
        <>
          <span className="min-w-0 flex-1 truncate text-[13px] text-hn-ink-muted">
            {lastRun ? `Ran: ${lastRun}` : `${selected.name} selected`}
          </span>
          <Button variant="ghost" onClick={() => setLastRun("Drain")}>
            Drain
          </Button>
          <Button onClick={() => setLastRun("Poll now")}>Poll now</Button>
        </>
      }
      aside={<MachineContext machine={selected} />}
    >
      <div className="flex flex-col gap-3">
        {lastRun ? (
          <p data-last-run="" className="m-0 text-[13px] text-hn-ink-muted">
            Ran: {lastRun}
          </p>
        ) : null}
        {full ? (
          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 py-4">
            <MachineContext machine={selected} />
          </div>
        ) : (
          <MachinesPage
            screen={screen}
            selected={selected.name}
            onSelect={(name) => setSelected(MACHINES.find((m) => m.name === name) ?? selected)}
          />
        )}
      </div>
    </Shell>
  );
}

/** The breakpoints a layout is shown at: the shell's own width in each frame. */
export const SHELL_STORIES = [
  { id: "desktop", label: "Desktop, 1280 px", width: 1280, height: 800 },
  { id: "tablet", label: "Tablet, 900 px", width: 900, height: 760 },
  { id: "phone", label: "Phone, 390 px", width: 390, height: 780 },
] as const;

const LAYOUT_NOTE: Record<ShellLayout, string> = {
  work: "Nav column, page column (sticky header, scrolling slot, fixed footer bar) and the aside as a column from 1280 px.",
  focus: "The same with the aside folded away; the header's panel button brings it back.",
  full: "No nav column; the header carries its own back link. Live quiz, presentation, print, auth, onboarding.",
  session:
    "Learning, reading and play: no nav, no app header. A session header (exit, title, progress, status), the slot centred to a reading measure, an optional footer. Escape goes to exit.",
};

function Frame({
  width,
  height,
  phone = false,
  children,
}: {
  width: number;
  height: number;
  phone?: boolean;
  children: ReactNode;
}) {
  // The phone frame: a bezel with a status strip and a home indicator around a 390 px shell.
  if (phone)
    return (
      <div
        data-phone-frame=""
        className="mx-auto w-fit rounded-[44px] border-[10px] border-hn-line-strong bg-hn-surface-band shadow-hn-overlay"
      >
        <div className="relative overflow-hidden rounded-[34px]" style={{ width, height }}>
          <div
            aria-hidden="true"
            className="absolute top-2 left-1/2 z-20 h-6 w-28 -translate-x-1/2 rounded-full bg-hn-line-strong"
          />
          <div className="h-full pt-9" data-shell-frame="">
            {children}
          </div>
        </div>
      </div>
    );
  return (
    <div className="overflow-x-auto" data-frame-scroll="">
      <div
        className="overflow-hidden rounded-hn-lg border border-hn-line-subtle"
        data-shell-frame=""
        style={{ width, height, boxSizing: "content-box" }}
      >
        {children}
      </div>
    </div>
  );
}

function readLayout(): ShellLayout {
  if (typeof window === "undefined") return "work";
  const value = new URLSearchParams(window.location.search).get("layout");
  return SHELL_LAYOUTS.find((l) => l === value) ?? "work";
}

export function ShellScene() {
  const [layout, setLayout] = useState<ShellLayout>(readLayout);
  const pick = (next: ShellLayout) => {
    setLayout(next);
    const url = new URL(window.location.href);
    if (next === "work") url.searchParams.delete("layout");
    else url.searchParams.set("layout", next);
    window.history.replaceState(null, "", url);
  };
  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/shell</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          Shell
        </h1>
        <p className="m-0 max-w-[68ch] text-sm text-hn-ink-body">
          Four layouts a page picks from, laid out by the shell's own width. Under 768 px the nav is
          a drawer from the header's menu button, the aside a bottom sheet, the footer bar docked at
          the bottom. The pack switcher skins every frame through the shell recipe.
        </p>
        <fieldset className="relative m-0 mt-2 flex w-fit gap-1 rounded-hn-md border border-hn-line-subtle p-1">
          <legend className="sr-only">Layout</legend>
          {SHELL_LAYOUTS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={l === layout}
              data-layout-pick={l}
              onClick={() => pick(l)}
              className={cx(
                "min-h-hn-target cursor-pointer rounded-hn-sm px-3 font-hn-mono text-[13px]",
                l === layout
                  ? "bg-hn-nav-active text-hn-nav-active-ink"
                  : "text-hn-ink-muted hover:text-hn-ink-primary"
              )}
            >
              {l}
            </button>
          ))}
        </fieldset>
        <p className="m-0 max-w-[68ch] text-[13px] text-hn-ink-muted" data-layout-note="">
          {LAYOUT_NOTE[layout]}
        </p>
      </header>
      {layout === "session" ? (
        <div className="flex flex-col gap-10">
          {SESSION_KINDS.map((kind) =>
            SHELL_STORIES.filter((story) => story.id !== "tablet").map((story) => (
              <PreviewCard
                key={`session-${kind.id}-${story.id}`}
                title={`session · ${kind.label} · ${story.label}`}
                item="shell"
                wide
              >
                <div data-story={`session-${kind.id}-${story.id}`}>
                  <Frame width={story.width} height={story.height} phone={story.id === "phone"}>
                    <SessionDemo kind={kind.id} />
                  </Frame>
                </div>
              </PreviewCard>
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {SHELL_STORIES.map((story) => (
            <PreviewCard
              key={`${layout}-${story.id}`}
              title={`${layout} · ${story.label}`}
              item="shell"
              wide
            >
              <div data-story={`${layout}-${story.id}`}>
                <Frame width={story.width} height={story.height} phone={story.id === "phone"}>
                  <DemoShell
                    layout={layout}
                    screen={story.id === "phone" ? "phone" : "desktop"}
                    hotkey={story.id === "desktop"}
                  />
                </Frame>
              </div>
            </PreviewCard>
          ))}
          {layout === "work" ? (
            <PreviewCard
              title="The palette slot: an ops preset instead of the default list"
              item="shell"
            >
              <div data-story="work-preset">
                <Frame width={390} height={720}>
                  <DemoShell screen="phone" preset />
                </Frame>
              </div>
            </PreviewCard>
          ) : null}
        </div>
      )}
    </main>
  );
}
