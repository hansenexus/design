# @hansenexus/shell

The hansenexus app shell: the floating-panels layout the owner chose in the shell-layout vote
(`packages/ui/decisions/shell-layout.json`, 2026-09-29), with the glass off. Nav, header, main and
an optional context pane are separate panels inset from the edge. Each panel is an opaque card
with the one neutral lift and no blur (`dec_2026-09-25_kommandant-visual-flat-lime-only`).
A ⌘K container takes command sets from outside, or a whole palette body. Nav rows are shown or
hidden by the app's capabilities. The command palette and nav visibility are promoted from
kommandant's app shell (`dec_2026-09-29_global-design-shell-gallery-atomic`).

Styling uses the semantic tokens of `@hansenexus/tokens` only, in dark and light and every theme.
The primitives come from `@hansenexus/ui`.

```sh
bun add @hansenexus/shell @hansenexus/ui @hansenexus/tokens react react-dom
```

## Slots

| Prop | Type | What goes there |
| --- | --- | --- |
| `nav` | `ReactNode` | The navigation, inside the nav landmark. `ShellNav` fills it. |
| `header` | `ReactNode` | The top bar over main: title, breadcrumbs, actions, `ShellCommandTrigger`, `ShellContextToggle` |
| `main` | `ReactNode` | The page. It scrolls inside its own panel. |
| `contextPane` | `ReactNode`, optional | The detail of what main has selected. |

`pageOwnsMain` is for an app whose pages render their own `<main>` landmark and padding: the main
panel is then a plain, unpadded `<div>`, so the page has one main landmark, not two.

The layout follows the shell's own width, not the viewport's (container queries). The shell looks
right wherever it is mounted, including a gallery card:

| Shell width | Layout |
| --- | --- |
| below 768 px | header on top, main, the nav as a bottom tab bar (icons, labels for assistive tech); no context pane |
| from 768 px | the nav as a column on the left, header over main |
| from 1024 px | plus the context pane on the right, when there is one and it is open |

Below 1024 px the context pane is not drawn. A narrow app shows that detail as a page or a Sheet of
its own. `contextOpen`/`defaultContextOpen` (default `true`)/`onContextOpenChange` control it, and
`ShellContextToggle` toggles it.

Give the shell a parent with the height it should fill, e.g. `<div className="h-dvh">`. Its root is
`h-full`, and a height in `className` does not override that: Tailwind v4 emits `h-full` after
`h-dvh`, so the shell would take its content's height and main would never scroll.

Inset, gap, column widths, corner and seam are the `shell.*` recipe tokens (design#152,
`@hansenexus/tokens` README, Recipes). The defaults float three cards apart; a flush pack such as
fachwerk sets inset and gap to 0 and the seam to its border width, so neighbouring panels overlap
onto one shared beam. No prop changes the layout: the pack does.

```tsx
import {
  navCommands,
  Shell,
  ShellCommandTrigger,
  ShellContextToggle,
  ShellNav,
  type ShellNavItem,
  activeNavId,
} from "@hansenexus/shell";

const NAV: ShellNavItem[] = [
  { id: "machines", label: "Machines", href: "/machines", icon: <ServerIcon /> },
  { id: "map", label: "Map", href: "/map", icon: <MapIcon />, requires: ["infra"] },
  { id: "terminal", label: "Terminal", href: "/terminal", icon: <TermIcon />, requires: ["desktop"] },
];

export function App() {
  const [location, navigate] = useLocation();
  const caps = { infra: fleetConfigured, desktop: inTauri };
  return (
    <Shell
      nav={
        <ShellNav
          items={NAV}
          capabilities={caps}
          activeId={activeNavId(NAV, location)}
          brand={<Brand />}
          onNavigate={(item, e) => {
            e.preventDefault();
            navigate(item.href);
          }}
        />
      }
      header={
        <>
          <PageTitle />
          <span className="ml-auto flex items-center gap-1">
            <ShellCommandTrigger />
            <ShellContextToggle />
          </span>
        </>
      }
      main={<Routes />}
      contextPane={selected ? <MachineDetail machine={selected} /> : undefined}
      commands={[navCommands(NAV, { navigate, capabilities: caps }), ...addonCommandSets]}
    />
  );
}
```

## Nav visibility

A row lists the capabilities it `requires`. It is shown only when every one of them is on in
`capabilities`, and otherwise hidden rather than disabled. `navVisible(requires, capabilities)` is
the rule itself. `ShellNav` and `navCommands` both apply it, so a hidden page is offered in neither
the nav nor the palette.

## Nav: sections, active row, phone tabs

| Prop | What it does |
| --- | --- |
| `items[].section` + `sections` | Rows carry a section id; `sections` (`{ id, label }[]`) names the ones that get a heading. A heading is drawn before the first visible row of its section, so a section whose rows are all hidden has none. Order the items yourself. |
| `activeId` | The current row. `activeNavId(items, pathname)` picks the longest `href` that is a prefix of the path on a segment boundary, ignoring query and hash: `/space/seating/plans/7` marks `/space/seating/plans`, not `/space`. |
| `link` | A component every row renders through (`ComponentType<ComponentProps<"a"> & { href }>`), e.g. a wrapper around next/link or a locale-aware Link, so routing and prefetch stay the app's. Without it a row is an `<a>`. |
| `tabLimit` | Below 768 px, the most tabs the bar shows. With more visible rows than that, the first `tabLimit - 1` are tabs and the last is More (`moreLabel`, default from `SHELL_COPY`), which opens a bottom Sheet with the whole nav in its sections. More carries `aria-current` when the active row is folded into it. Without `tabLimit` every row is a tab. |

The active rail row and tab take their colours from the `nav.*` tokens and their height, padding,
corner and dividers from `shell.nav-*`, so a pack restyles them without a prop.

## ⌘K container

The shell owns the mechanics: the shortcut (⌘K / Ctrl+K, or another key with `commandHotkey`, or
`false` for none), the modal, focus moving in and back to where it was, and closing on Escape or a
click outside. The content comes from outside, in one of two ways:

- **`commands`**: command sets (`ShellCommandSet`: `id`, `heading`, `commands`), each command an
  `@hansenexus/ui` `CommandItem` plus `run()`. Ids need to be unique only within their set. A
  rejected `run` (a cancelled confirm, a denied grant) is swallowed. `navCommands` turns the nav
  into a set.
- **`palette`**: a render function that replaces the default list with a whole palette body. It
  receives `{ close, sets, run }`. The body brings its own chrome, and its first focusable element
  gets focus on open.

`palette` is how an ops preset mounts. Lotse's `CommandBar` (the paid `@hansenexus/ops` in
design-ops) runs as the ops palette with no change to this package. The shell keeps the shortcut,
so the bar's own hotkey stays off:

```tsx
import { CommandBar } from "@hansenexus/ops";

<Shell
  {...slots}
  commands={sets}
  palette={({ close }) => (
    <CommandBar
      commands={opsCommands}
      hotkey={false}
      alwaysOpen
      onRun={(command) => {
        close();
        runOps(command); // the app routes danger commands through ConfirmAct
      }}
    />
  )}
/>;
```

The container is portalled into the shell's root, which has layout containment. Its overlay
therefore covers the shell (the whole window in an app), and the shell's `data-theme` applies
inside it. `useShell()` exposes `commandOpen`/`setCommandOpen` and the context state to controls
in the slots. `commandOpen`/`defaultCommandOpen`/`onCommandOpenChange` control the container
from outside.

## Styles

Tailwind v4 apps add the package to their sources, next to `@hansenexus/ui`:

```css
@import "@hansenexus/tokens/tailwind.css";
@source "../node_modules/@hansenexus/ui/dist";
@source "../node_modules/@hansenexus/shell/dist";
```

Apps without Tailwind import the prebuilt utilities after the ui ones:

```ts
import "@hansenexus/ui/styles.css";
import "@hansenexus/shell/styles.css";
```

## Copy

`locale="de"` switches the shell's landmark and control names (`SHELL_COPY`) and the default
palette's copy (`STATE_COPY.command` in `@hansenexus/ui`). English is the default.

## In the gallery and the registry

The kit gallery's `shell` scene mounts the package at full width, at 390 px and with a preset in
the palette slot. It has pixel baselines and interaction checks (`packages/ui/screenshots`). The
shell-layout vote board draws it too.

The shadcn registry lists it as item `shell` at level `template`. `/design add shell` installs this
npm package and copies no files. `meta.uses` names the `@hansenexus/ui` items it draws, so each of
those items' "used by" list reaches the shell.

## Release

Push a `shell-v<version>` tag matching `package.json`. The `release-shell` workflow builds, runs
the contrast check and the tests, and publishes to npm with provenance over OIDC trusted
publishing.

## Licence

MIT. The hansenexus name, mark and wordmark are trademarks, not covered by the MIT licence. See
[TRADEMARK.md](../../TRADEMARK.md).
