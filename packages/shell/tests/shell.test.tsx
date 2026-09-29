import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import pkg from "../package.json";
import * as shell from "../src";
import {
  commandGroups,
  findCommand,
  navCommands,
  navVisible,
  PaletteBody,
  runCommand,
  SHELL_PANEL,
  Shell,
  type ShellCommandSet,
  ShellCommandTrigger,
  ShellContextToggle,
  ShellNav,
  type ShellNavItem,
  type ShellPalette,
  visibleNavItems,
} from "../src";

const ROOT = resolve(import.meta.dir, "..");
const UI = resolve(ROOT, "../ui");

const NAV: ShellNavItem[] = [
  { id: "machines", label: "Machines", href: "/machines", icon: <svg />, trailing: 6 },
  { id: "map", label: "Map", href: "/map", requires: ["infra"] },
  { id: "terminal", label: "Terminal", href: "/terminal", requires: ["desktop"] },
  { id: "gateway", label: "Gateway", href: "/gateway", requires: ["infra", "gateway"] },
];

const SETS: ShellCommandSet[] = [
  { id: "nav", heading: "Go to", commands: [{ id: "map", label: "Map", run: () => {} }] },
  {
    id: "addon",
    heading: "Actions",
    commands: [{ id: "map", label: "Redraw map", run: () => {} }],
  },
];

function render(node: ReactNode) {
  return renderToStaticMarkup(node);
}

describe("package", () => {
  test("one entry and the stylesheet, built with the production JSX runtime", () => {
    expect(pkg.name).toBe("@hansenexus/shell");
    expect(Object.keys(pkg.exports).sort()).toEqual([".", "./styles.css"]);
    const js = readFileSync(resolve(ROOT, "dist/index.js"), "utf8");
    expect(js).not.toMatch(/jsx-dev-runtime|jsxDEV/);
    expect(existsSync(resolve(ROOT, "dist/index.d.ts"))).toBe(true);
    expect(readFileSync(resolve(ROOT, "dist/styles.css"), "utf8")).toContain("@container");
  });

  test("exports the shell, its slots' helpers and the ⌘K mechanics", () => {
    for (const name of [
      "Shell",
      "ShellNav",
      "ShellContextToggle",
      "ShellCommandTrigger",
      "useShell",
      "navVisible",
      "navCommands",
      "commandGroups",
      "runCommand",
    ])
      expect(typeof (shell as Record<string, unknown>)[name]).toBe("function");
  });
});

// The rule of apps/kommandant/src/app-shell/nav-visibility.ts, with the capabilities named.
describe("navVisible", () => {
  test("a row is visible when every capability it requires is on", () => {
    const none = { infra: false, gateway: false, desktop: false };
    expect(navVisible(undefined, none)).toBe(true);
    expect(navVisible([], none)).toBe(true);
    expect(navVisible(["infra"], none)).toBe(false);
    expect(navVisible(["infra"], { ...none, infra: true })).toBe(true);
    expect(navVisible(["infra", "gateway"], { ...none, infra: true })).toBe(false);
    expect(navVisible(["desktop"], {})).toBe(false);
  });

  test("the nav and its command set hide the same rows", () => {
    const caps = { infra: true };
    expect(visibleNavItems(NAV, caps).map((i) => i.id)).toEqual(["machines", "map"]);
    const set = navCommands(NAV, { navigate: () => {}, capabilities: caps });
    expect(set.commands.map((c) => c.id)).toEqual(["machines", "map"]);
  });
});

describe("slots", () => {
  const slots = {
    nav: <ShellNav items={NAV} activeId="machines" />,
    header: <span>Header slot</span>,
    main: <p>Main slot</p>,
  };

  test("nav, header and main in their landmarks, each a panel", () => {
    const html = render(<Shell {...slots} />);
    expect(html).toContain('<nav aria-label="App" data-shell-panel="nav"');
    expect(html).toMatch(/<header data-shell-panel="header"[^>]*>.*Header slot/);
    expect(html).toMatch(/<main data-shell-panel="main"[^>]*>.*Main slot/);
    expect(html).not.toContain("<aside");
    expect(html.match(/data-shell-panel=/g)).toHaveLength(3);
  });

  test("the context pane is optional, open by default and can start closed", () => {
    const open = render(<Shell {...slots} contextPane={<p>Detail</p>} />);
    expect(open).toMatch(/<aside aria-label="Context" data-shell-panel="context"[^>]*>.*Detail/);
    const closed = render(
      <Shell {...slots} contextPane={<p>Detail</p>} defaultContextOpen={false} />
    );
    expect(closed).not.toContain("Detail");
  });

  test("German landmark names", () => {
    const html = render(<Shell {...slots} contextPane={<p>Detail</p>} locale="de" />);
    expect(html).toContain('aria-label="Kontext"');
  });

  // dec_2026-09-25_kommandant-visual-flat-lime-only: flat panels, the one lift, no glass.
  test("flat: opaque panels with the one lift, no blur, no translucent surface", () => {
    expect(SHELL_PANEL).toContain("shadow-hn-lift");
    expect(SHELL_PANEL).toContain("bg-hn-surface-card");
    const html = render(<Shell {...slots} contextPane={<p>Detail</p>} />);
    expect(html).not.toMatch(/blur|bg-[a-z-]+\/\d/);
  });

  test("the layout follows the shell's width (container queries), not the viewport's", () => {
    const html = render(<Shell {...slots} contextPane={<p>Detail</p>} />);
    expect(html).toContain("@container");
    expect(html).toContain("@3xl:grid");
    expect(html).toContain("@5xl:block");
    expect(html).not.toMatch(/\b(?:sm|md|lg|xl):/);
  });

  test("ShellNav draws the rail and the tab bar, active row and capabilities in both", () => {
    const html = render(<ShellNav items={NAV} activeId="map" capabilities={{ infra: true }} />);
    expect(html).toContain('data-shell-nav="rail"');
    expect(html).toContain('data-shell-nav="tabs"');
    expect(html.match(/href="\/map"/g)).toHaveLength(2);
    expect(html.match(/aria-current="page"/g)).toHaveLength(2);
    expect(html).not.toContain("/terminal");
    expect(html).not.toContain("/gateway");
  });

  test("the controls render only when the shell has what they control", () => {
    const bare = render(
      <Shell
        {...slots}
        header={[<ShellCommandTrigger key="k" />, <ShellContextToggle key="c" />]}
      />
    );
    expect(bare).not.toContain("aria-haspopup");
    expect(bare).not.toContain("aria-pressed");
    const full = render(
      <Shell
        {...slots}
        header={[<ShellCommandTrigger key="k" />, <ShellContextToggle key="c" />]}
        contextPane={<p>Detail</p>}
        commands={SETS}
      />
    );
    expect(full).toContain('aria-haspopup="dialog"');
    expect(full).toContain('aria-label="Search or run a command"');
    expect(full).toContain('aria-pressed="true"');
    expect(full).toContain('aria-label="Hide context panel"');
  });

  test("useShell outside a Shell throws", () => {
    expect(() => render(<ShellContextToggle />)).toThrow(/not inside a <Shell>/);
  });
});

describe("⌘K container", () => {
  test("command sets become Command groups, ids namespaced by set", () => {
    const groups = commandGroups([...SETS, { id: "empty", commands: [] }]);
    expect(groups.map((g) => g.id)).toEqual(["nav", "addon"]);
    expect(groups.flatMap((g) => g.items.map((i) => i.id))).toEqual(["nav:map", "addon:map"]);
    expect(groups[0]?.items[0]).not.toHaveProperty("run");
    expect(findCommand(SETS, "addon:map")?.label).toBe("Redraw map");
    expect(findCommand(SETS, "nope:map")).toBeUndefined();
  });

  test("runCommand swallows a rejection and a throw", async () => {
    const ran: string[] = [];
    runCommand({ id: "a", label: "a", run: async () => Promise.reject(new Error("denied")) });
    runCommand({
      id: "b",
      label: "b",
      run: () => {
        throw new Error("boom");
      },
    });
    runCommand({ id: "c", label: "c", run: () => void ran.push("c") });
    await new Promise((r) => setTimeout(r, 0));
    expect(ran).toEqual(["c"]);
  });

  test("navCommands navigates to the row's href", async () => {
    const went: string[] = [];
    const set = navCommands(NAV, { navigate: (href) => went.push(href) });
    const map = set.commands.find((c) => c.id === "machines");
    if (!map) throw new Error("no machines command");
    expect(map.keywords).toContain("machines");
    runCommand(map);
    await new Promise((r) => setTimeout(r, 0));
    expect(went).toEqual(["/machines"]);
  });

  test("the default body is @hansenexus/ui's Command over every set", () => {
    const html = render(<PaletteBody sets={SETS} close={() => {}} />);
    expect(html).toContain('role="combobox"');
    expect(html).toContain("Go to");
    expect(html).toContain("Redraw map");
  });

  // Lotse's CommandBar (hansenexus/design-ops, packages/ops/src/command-bar.tsx) is private, so
  // it is not imported here. This stand-in has its exact props; if it mounts through `palette`
  // with only the shell's public API, the real one mounts the same way, with no change here.
  type Command = {
    id: string;
    label: string;
    group?: string;
    hint?: string;
    keywords?: string[];
    danger?: boolean;
  };
  type CommandBarProps = {
    commands: Command[];
    onRun: (command: Command) => void;
    hotkey?: boolean;
    alwaysOpen?: boolean;
    messages?: Partial<{ placeholder: string; empty: string; label: string }>;
  };
  function CommandBar({ commands, onRun, hotkey = true, alwaysOpen = false }: CommandBarProps) {
    return (
      <div className="lotse-command" data-hotkey={String(hotkey)} data-open={String(alwaysOpen)}>
        <input role="combobox" aria-expanded={alwaysOpen} aria-label="Command" />
        {commands.map((c) => (
          <button key={c.id} type="button" onClick={() => onRun(c)}>
            {c.label}
          </button>
        ))}
      </div>
    );
  }

  test("an ops preset mounts through `palette`: the shell owns ⌘K, the preset its content", () => {
    const ops: Command[] = [
      { id: "restart", label: "Restart lotsen-api", group: "Machines", danger: true },
    ];
    const runs: string[] = [];
    let closed = 0;
    const preset: ShellPalette = ({ close }) => (
      <CommandBar
        commands={ops}
        hotkey={false}
        alwaysOpen
        onRun={(c) => {
          close();
          runs.push(c.id);
        }}
      />
    );
    const html = render(<PaletteBody sets={SETS} palette={preset} close={() => closed++} />);
    expect(html).toContain('class="lotse-command"');
    expect(html).toContain('data-hotkey="false"');
    expect(html).toContain("Restart lotsen-api");
    // The shell's own list is replaced, not added to.
    expect(html).not.toContain("Redraw map");
    const element = preset({ close: () => closed++, sets: SETS, run: () => {} }) as {
      props: CommandBarProps;
    };
    element.props.onRun(ops[0] as Command);
    expect(runs).toEqual(["restart"]);
    expect(closed).toBe(1);
  });

  test("a palette's `run` closes first, then runs the shell command", async () => {
    const order: string[] = [];
    let body: Parameters<ShellPalette>[0] | undefined;
    render(
      <PaletteBody
        sets={SETS}
        close={() => order.push("close")}
        palette={(ctx) => {
          body = ctx;
          return null;
        }}
      />
    );
    expect(body?.sets).toBe(SETS);
    body?.run({ id: "x", label: "x", run: () => void order.push("run") });
    await new Promise((r) => setTimeout(r, 0));
    expect(order).toEqual(["close", "run"]);
  });
});

// The shell is a registry item at level template (packages/ui/registry.json). It installs the npm
// package rather than copying files, and names the @hansenexus/ui items it draws in `meta.uses`,
// so the gallery's blast radius reaches it from each of them.
describe("registry item", () => {
  type Item = {
    name: string;
    type: string;
    files?: { path: string }[];
    dependencies?: string[];
    meta?: { level?: string; uses?: string[] };
  };
  const { items } = JSON.parse(readFileSync(resolve(UI, "registry.json"), "utf8")) as {
    items: Item[];
  };
  const item = items.find((i) => i.name === "shell");

  test("installs this package at level template", () => {
    expect(item?.meta?.level).toBe("template");
    expect(item?.files ?? []).toEqual([]);
    const [major, minor] = pkg.version.split(".");
    expect(item?.dependencies).toEqual([`@hansenexus/shell@^${major}.${minor}.0`]);
  });

  test("meta.uses is exactly the ui items whose exports the shell imports", () => {
    // Which ui source file declares each export, then which item owns that file.
    const declaredIn = new Map<string, string>();
    for (const file of readdirSync(resolve(UI, "src")).filter((f) => /\.tsx?$/.test(f))) {
      const source = readFileSync(resolve(UI, "src", file), "utf8");
      for (const m of source.matchAll(/export (?:function|const|type) (\w+)/g))
        declaredIn.set(m[1] ?? "", `src/${file}`);
    }
    const owner = new Map<string, string>();
    for (const i of items) for (const f of i.files ?? []) owner.set(f.path, i.name);

    const used = new Set<string>();
    for (const file of readdirSync(resolve(ROOT, "src")).filter((f) => /\.tsx?$/.test(f))) {
      const source = readFileSync(resolve(ROOT, "src", file), "utf8");
      for (const m of source.matchAll(/import \{([^}]+)\} from "@hansenexus\/ui"/g)) {
        for (const spec of (m[1] ?? "").split(",")) {
          const name = spec.replace(/^\s*type\s+/, "").trim();
          if (!name) continue;
          const path = declaredIn.get(name);
          if (!path) throw new Error(`${file}: ${name} is not declared in packages/ui/src`);
          const itemName = owner.get(path);
          if (!itemName) throw new Error(`${path} belongs to no registry item`);
          used.add(itemName);
        }
      }
    }
    expect([...(item?.meta?.uses ?? [])].sort()).toEqual([...used].sort());
  });
});
