import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { skinSlots, ThemePack } from "@hansenexus/ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import pkg from "../package.json";
import * as shell from "../src";
import {
  activeNavId,
  commandGroups,
  findCommand,
  keyboardInset,
  navCommands,
  navVisible,
  PaletteBody,
  runCommand,
  SHELL_BREAKPOINTS,
  SHELL_PANEL,
  Shell,
  ShellAsideToggle,
  type ShellCommandSet,
  ShellCommandTrigger,
  ShellContextToggle,
  ShellMenuButton,
  ShellNav,
  type ShellNavItem,
  type ShellNavLink,
  type ShellPalette,
  shellWidthOf,
  visibleNavItems,
} from "../src";
import { swipedClosed } from "../src/overlay";

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

type PackEntry = { files: { path: string }[] };

function isPackEntry(value: unknown): value is PackEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { files?: unknown }).files)
  );
}

// `npm pack --json` prints an array of entries up to npm 11 and, from npm 12 (the release
// workflow installs npm@latest, issue 101), an object keyed by package name. Both are accepted.
function packedFiles(json: unknown): string[] {
  const entries = Array.isArray(json)
    ? json
    : typeof json === "object" && json !== null
      ? isPackEntry(json)
        ? [json]
        : Object.values(json)
      : [];
  const entry = entries.find(isPackEntry);
  if (!entry)
    throw new Error(
      `npm pack --json: expected an array of {files} or an object of them, got ${JSON.stringify(json)?.slice(0, 200)}`
    );
  return entry.files.map((f) => f.path);
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

  // 0.1.0 went to npm unbuilt, without dist/ (#90): the tarball must carry what exports names.
  test("the npm tarball carries the built entry, its declarations and the stylesheet", () => {
    const proc = Bun.spawnSync(["npm", "pack", "--dry-run", "--json", "--ignore-scripts"], {
      cwd: ROOT,
    });
    expect(proc.exitCode).toBe(0);
    const files = packedFiles(JSON.parse(proc.stdout.toString()));
    for (const path of ["dist/index.js", "dist/index.d.ts", "dist/styles.css"])
      expect(files).toContain(path);
  });

  test("exports the shell, its slots' helpers and the ⌘K mechanics", () => {
    for (const name of [
      "Shell",
      "ShellNav",
      "ShellContextToggle",
      "ShellAsideToggle",
      "ShellMenuButton",
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
    children: <p>Main slot</p>,
  };

  test("nav, header and slot in their landmarks, each a panel", () => {
    const html = render(<Shell {...slots} />);
    expect(html).toContain('<nav aria-label="App" data-shell-panel="nav"');
    expect(html).toMatch(/<header data-shell-panel="header"[^>]*>.*Header slot/);
    expect(html).toMatch(/<main id="[^"]+" tabindex="-1" data-shell-panel="main"[^>]*>.*Main slot/);
    expect(html).not.toContain("<aside");
    expect(html).not.toContain("<footer");
    expect(html.match(/data-shell-panel=/g)).toHaveLength(4); // nav, page, header, main
    // design#152: main's fill is panel.main alone; a second bg utility would win by sort order.
    const mainTag = html.match(/<main [^>]*data-shell-panel="main"[^>]*>/)?.[0] ?? "";
    expect(mainTag).toContain("bg-hn-panel-main");
    expect(mainTag).not.toContain("bg-hn-surface-card");
    // fachwerk#286: the nav column and the header are sticky, so the dev HUD pill dodges them.
    const navTag = html.match(/<nav aria-label="App" data-shell-panel="nav"[^>]*>/)?.[0] ?? "";
    const headerTag = html.match(/<header data-shell-panel="header"[^>]*>/)?.[0] ?? "";
    expect(navTag).toMatch(/\bsticky\b/);
    expect(headerTag).toMatch(/\bsticky\b/);
    expect(mainTag).not.toMatch(/\bsticky\b/);
  });

  test("0.2's main prop still fills the slot", () => {
    const html = render(<Shell nav={slots.nav} header={slots.header} main={<p>Old main</p>} />);
    expect(html).toMatch(/data-shell-panel="main"[^>]*>.*Old main/);
  });

  test("the shell is the template slot of a theme pack (design#143)", () => {
    expect(skinSlots()).toContain("shell");
    const plain = render(<Shell {...slots} />);
    const empty = render(
      <ThemePack pack={{ id: "t" }}>
        <Shell {...slots} />
      </ThemePack>
    );
    expect(empty).toBe(plain);
    const framed = render(
      <ThemePack
        pack={{
          id: "t",
          skins: {
            shell: ({ Base, ...props }) => (
              <div data-pack-frame="">
                <Base {...props} />
              </div>
            ),
          },
        }}
      >
        <Shell {...slots} />
      </ThemePack>
    );
    expect(framed).toBe(`<div data-pack-frame="">${plain}</div>`);
  });

  test("a skip link to the slot comes first", () => {
    const html = render(<Shell {...slots} />);
    const id = html.match(/<main id="([^"]+)"/)?.[1];
    expect(id).toBeDefined();
    const skip = html.match(/<a href="#([^"]+)" data-shell-control="skip"[^>]*>([^<]+)</);
    expect(skip?.[1]).toBe(id);
    expect(skip?.[2]).toBe("Skip to content");
    expect(html.indexOf('data-shell-control="skip"')).toBeLessThan(html.indexOf("<nav"));
    // sr-only needs a positioned ancestor, or it scrolls the page sideways (vote 390 lesson).
    expect(html).toMatch(/^<div data-shell=""[^>]*class="[^"]*\brelative\b/);
    expect(render(<Shell {...slots} locale="de" />)).toContain("Zum Inhalt springen");
  });

  test("the footer bar is a contentinfo landmark under the slot, docked and safe-area aware", () => {
    const html = render(<Shell {...slots} footer={<button type="button">Save</button>} />);
    const footer = html.match(/<footer data-shell-panel="footer"[^>]*>/)?.[0] ?? "";
    expect(footer).not.toBe("");
    expect(html.indexOf("<footer")).toBeGreaterThan(html.indexOf("</main>"));
    // Not inside main, aside, nav or a section, so it maps to contentinfo.
    expect(html.slice(html.indexOf("</main>"), html.indexOf("<footer"))).not.toMatch(
      /<(main|aside|section|article|nav)\b/
    );
    expect(footer).toContain("env(safe-area-inset-bottom)");
    expect(footer).toContain("--hn-shell-keyboard");
    expect(footer).toContain("shrink-0");
  });

  test("work: the aside is a column, open by default, and can start closed", () => {
    const open = render(<Shell {...slots} aside={<p>Detail</p>} />);
    expect(open).toMatch(/<aside aria-label="Context" data-shell-panel="aside"[^>]*>.*Detail/);
    expect(open).toContain('data-layout="work"');
    const closed = render(<Shell {...slots} aside={<p>Detail</p>} defaultAsideOpen={false} />);
    expect(closed).not.toContain("Detail");
    // 0.2's names still work.
    expect(render(<Shell {...slots} contextPane={<p>Old</p>} />)).toMatch(/<aside[^>]*>.*Old/);
    expect(
      render(<Shell {...slots} contextPane={<p>Old</p>} defaultContextOpen={false} />)
    ).not.toContain("Old");
  });

  test("focus: the aside starts folded and the toggle offers to show it", () => {
    const html = render(
      <Shell {...slots} layout="focus" header={<ShellAsideToggle />} aside={<p>Detail</p>} />
    );
    expect(html).toContain('data-layout="focus"');
    expect(html).not.toContain("<aside");
    expect(html).toContain('aria-label="Show context panel"');
    expect(html).toContain('aria-expanded="false"');
    // The nav column stays.
    expect(html).toContain('data-shell-panel="nav"');
    const opened = render(
      <Shell {...slots} layout="focus" aside={<p>Detail</p>} defaultAsideOpen />
    );
    expect(opened).toMatch(/<aside[^>]*>.*Detail/);
  });

  test("full: no nav column, no menu button, its own back link first in the header", () => {
    const html = render(
      <Shell
        {...slots}
        layout="full"
        back={{ href: "/space/quiz", label: "Quizzes" }}
        aside={<p>Detail</p>}
      />
    );
    expect(html).toContain('data-layout="full"');
    expect(html).not.toContain("<nav");
    expect(html).not.toContain('data-shell-control="menu"');
    expect(html).not.toContain("<aside");
    expect(html).toMatch(
      /<header[^>]*><a href="\/space\/quiz" data-shell-control="back"[^>]*>.*Quizzes<\/span><\/a><span>Header slot/
    );
    expect(html).toContain("@3xl:grid-cols-[minmax(0,1fr)]");
    // The default label, and a router's Link.
    const Link: ShellNavLink = ({ href, ...props }) => <a data-router="" href={href} {...props} />;
    const de = render(
      <Shell {...slots} layout="full" locale="de" back={{ href: "/", link: Link }} />
    );
    expect(de).toMatch(/<a data-router="" href="\/"[^>]*data-shell-control="back"[^>]*>.*Zurück/);
    // Work and focus ignore back.
    expect(render(<Shell {...slots} back={{ href: "/x" }} />)).not.toContain(
      'data-shell-control="back"'
    );
  });

  test("the menu button opens the nav drawer under 768 px of shell width", () => {
    const html = render(<Shell {...slots} />);
    const menu = html.match(/<button[^>]*data-shell-control="menu"[^>]*>/)?.[0] ?? "";
    expect(menu).toContain('aria-haspopup="dialog"');
    expect(menu).toContain('aria-expanded="false"');
    expect(menu).toContain('aria-label="Open navigation"');
    expect(menu).toContain("@3xl:hidden");
    // First in the header, before the page's own content.
    expect(html).toMatch(/<header[^>]*><button[^>]*data-shell-control="menu"/);
    // No nav, no menu.
    expect(render(<Shell header={slots.header}>x</Shell>)).not.toContain(
      'data-shell-control="menu"'
    );
  });

  test("German landmark names", () => {
    const html = render(<Shell {...slots} aside={<p>Detail</p>} locale="de" />);
    expect(html).toContain('aria-label="Kontext"');
    expect(html).toContain('aria-label="Navigation öffnen"');
  });

  // dec_2026-09-25_kommandant-visual-flat-lime-only: flat panels, the one lift, no glass.
  test("flat: opaque panels with the one lift, no blur, no translucent surface", () => {
    expect(SHELL_PANEL).toContain("shadow-hn-panel"); // the elevation.panel recipe, the one lift by default
    expect(SHELL_PANEL).toContain("bg-hn-surface-card");
    const html = render(<Shell {...slots} aside={<p>Detail</p>} footer="Bar" />);
    expect(html).not.toMatch(/blur|bg-[a-z-]+\/\d/);
  });

  test("the layout follows the shell's width (container queries), not the viewport's", () => {
    const html = render(<Shell {...slots} aside={<p>Detail</p>} />);
    expect(html).toContain("@container");
    expect(html).toContain("@3xl:grid");
    expect(html).toContain("@7xl:block");
    expect(html).toContain(
      "@7xl:grid-cols-[var(--hn-shell-rail)_minmax(0,1fr)_var(--hn-shell-context)]"
    );
    expect(html).not.toMatch(/\b(?:sm|md|lg|xl):/);
  });

  test("shellWidthOf: compact under 768, medium to 1280, wide from there", () => {
    expect(shellWidthOf(390)).toBe("compact");
    expect(shellWidthOf(767)).toBe("compact");
    expect(shellWidthOf(768)).toBe("medium");
    expect(shellWidthOf(1279)).toBe("medium");
    expect(shellWidthOf(1280)).toBe("wide");
    expect(SHELL_BREAKPOINTS).toEqual({ medium: 768, wide: 1280 });
  });

  test("keyboardInset: lifts the footer only by the keyboard that covers the shell", () => {
    // No keyboard: the visual viewport is the layout viewport.
    expect(keyboardInset(844, { innerHeight: 844, offsetTop: 0, height: 844 })).toBe(0);
    // A shell taller than the window (a gallery card) with no keyboard is not lifted.
    expect(keyboardInset(1600, { innerHeight: 844, offsetTop: 0, height: 844 })).toBe(0);
    // iOS: a 300 px keyboard over a full-height shell.
    expect(keyboardInset(844, { innerHeight: 844, offsetTop: 0, height: 544 })).toBe(300);
    // The shell ends above the keyboard: nothing to lift.
    expect(keyboardInset(500, { innerHeight: 844, offsetTop: 0, height: 544 })).toBe(0);
  });

  test("swipedClosed: a leftward swipe of 48 px closes the drawer, a scroll does not", () => {
    expect(swipedClosed({ x: 200, y: 100 }, { x: 140, y: 110 })).toBe(true);
    expect(swipedClosed({ x: 200, y: 100 }, { x: 170, y: 100 })).toBe(false);
    expect(swipedClosed({ x: 200, y: 100 }, { x: 140, y: 200 })).toBe(false);
    expect(swipedClosed({ x: 100, y: 100 }, { x: 200, y: 100 })).toBe(false);
  });

  test("the overlays are reduced-motion safe and read the shell recipe", () => {
    const source = readFileSync(resolve(ROOT, "src/overlay.tsx"), "utf8");
    expect(source).toContain("motion-reduce:transition-none");
    for (const token of ["--hn-shell-rail", "--hn-shell-context", "--hn-shell-radius"])
      expect(source).toContain(token);
    expect(source).toContain("env(safe-area-inset-bottom)");
  });

  test("ShellNav draws one rail, active row and capabilities applied", () => {
    const html = render(<ShellNav items={NAV} activeId="map" capabilities={{ infra: true }} />);
    expect(html).toContain('data-shell-nav="rail"');
    expect(html).not.toContain('data-shell-nav="tabs"');
    expect(html.match(/href="\/map"/g)).toHaveLength(1);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).not.toContain("/terminal");
    expect(html).not.toContain("/gateway");
  });

  test("the controls render only when the shell has what they control", () => {
    const header = [<ShellCommandTrigger key="k" />, <ShellAsideToggle key="c" />];
    const bare = render(<Shell {...slots} header={header} />);
    expect(bare).not.toContain('aria-label="Search or run a command"');
    expect(bare).not.toContain('data-shell-control="aside"');
    const full = render(<Shell {...slots} header={header} aside={<p>Detail</p>} commands={SETS} />);
    expect(full).toContain('aria-label="Search or run a command"');
    expect(full).toMatch(/data-shell-control="aside"[^>]*aria-expanded="true"/);
    expect(full).toContain('aria-label="Hide context panel"');
    // 0.2's name is the same control.
    expect(ShellContextToggle).toBe(ShellAsideToggle);
  });

  test("useShell outside a Shell throws", () => {
    expect(() => render(<ShellAsideToggle />)).toThrow(/not inside a <Shell>/);
    expect(() => render(<ShellMenuButton />)).toThrow(/not inside a <Shell>/);
  });
});

// design#152: what fachwerk needed to mount the shell instead of its own.
describe("nav: sections, active path, link", () => {
  const ROWS: ShellNavItem[] = [
    { id: "home", label: "Start", href: "/space" },
    { id: "classes", label: "Classes", href: "/space/classes", section: "teach" },
    { id: "quiz", label: "Quiz", href: "/space/quiz", section: "teach" },
    { id: "seating", label: "Seating", href: "/space/seating", section: "teach" },
    { id: "modules", label: "Modules", href: "/space/modules", section: "manage" },
    { id: "admin", label: "Admin", href: "/space/admin", section: "manage", requires: ["op"] },
  ];
  const SECTIONS = [
    { id: "teach", label: "Teaching" },
    { id: "manage", label: "Admin" },
  ];

  test("activeNavId: longest prefix on a segment boundary, query and hash ignored", () => {
    expect(activeNavId(ROWS, "/space")).toBe("home");
    expect(activeNavId(ROWS, "/space/")).toBe("home");
    expect(activeNavId(ROWS, "/space/quiz/host?code=1")).toBe("quiz");
    expect(activeNavId(ROWS, "/space/classes/abc#roster")).toBe("classes");
    expect(activeNavId(ROWS, "/space/quizzes")).toBe("home");
    expect(activeNavId(ROWS, "/settings")).toBeUndefined();
    expect(activeNavId([{ id: "root", href: "/" }], "/anything")).toBe("root");
  });

  test("a section's heading comes before its first visible row; an empty section draws none", () => {
    const html = render(<ShellNav items={ROWS} sections={SECTIONS} activeId="quiz" />);
    expect(html.match(/data-shell-nav-section="teach"/g)).toHaveLength(1);
    expect(html.match(/data-shell-nav-section="manage"/g)).toHaveLength(1);
    expect(html.indexOf("Teaching")).toBeLessThan(html.indexOf('href="/space/classes"'));
    const onlyHome = render(<ShellNav items={ROWS.slice(0, 1)} sections={SECTIONS} />);
    expect(onlyHome).not.toContain("data-shell-nav-section");
  });

  test("0.2's tabLimit is accepted and ignored: every visible row is in the rail", () => {
    const html = render(<ShellNav items={ROWS} tabLimit={3} activeId="modules" />);
    expect(html.match(/<a /g)).toHaveLength(5);
    expect(html).not.toContain('title="More"');
  });

  test("link renders every row through the router's component", () => {
    const Link: ShellNavLink = ({ href, ...props }) => <a data-router="" href={href} {...props} />;
    const html = render(<ShellNav items={ROWS.slice(0, 2)} link={Link} activeId="home" />);
    expect(html.match(/data-router=""/g)).toHaveLength(2);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  test("the layout reads the shell recipe: inset, gap, rail width, seam, panel radius", () => {
    const html = render(
      <Shell nav={<ShellNav items={ROWS} />} header={<h1>Start</h1>} aside={<p>Detail</p>}>
        <p>Body</p>
      </Shell>
    );
    for (const name of ["inset", "gap", "rail", "context", "seam"])
      expect(html).toContain(`--hn-shell-${name}`);
    expect(SHELL_PANEL).toContain("rounded-(--hn-shell-radius)");
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
