# @hansenexus/shell

The hansenexus app shell: a layout system every page picks from (design#239). The panels are the
floating cards of the shell-layout vote (`packages/ui/decisions/shell-layout.json`, 2026-09-29),
glass off: opaque, the one neutral lift, no blur (`dec_2026-09-25_kommandant-visual-flat-lime-only`),
unless a pack's shell recipe makes them flush. A ⌘K container takes command sets from outside, or a
whole palette body. Nav rows are shown or hidden by the app's capabilities. The command palette and
nav visibility are promoted from kommandant's app shell
(`dec_2026-09-29_global-design-shell-gallery-atomic`).

Styling uses the semantic tokens of `@hansenexus/tokens` only, in dark and light and every theme.
The primitives come from `@hansenexus/ui`.

```sh
bun add @hansenexus/shell @hansenexus/ui @hansenexus/tokens react react-dom
```

## Layouts

`layout` picks one per page; switching it is a prop change, not a remount.

| `layout` | What it draws | For |
| --- | --- | --- |
| `work` (default) | a nav column; a page column with a sticky header, the scrolling slot and a fixed footer bar; the aside as a right column | lists, boards, anything with a selection to inspect |
| `focus` | the same with the aside folded away; `ShellAsideToggle` brings it back | editors, long forms, reading |
| `full` | no nav column; `back` puts its own back link first in the header; header, slot and footer stay | live quiz, presentation, print, auth, onboarding |
| `session` | no nav, no app header, no aside: the page's `SessionHeader`, the slot centred to a measure, an optional `SessionFooter` | learning, reading, play: a page of its own (§ Session) |

## Slots

| Prop | Type | What goes there |
| --- | --- | --- |
| `nav` | `ReactNode` | The navigation, inside the nav landmark. `ShellNav` fills it. Not drawn in `full`. |
| `header` | `ReactNode` | The sticky top bar: title, actions, `ShellCommandTrigger`, `ShellAsideToggle`. The shell puts its menu button (and in `full` the back link) before it. |
| `children` | `ReactNode` | The page: the slot that scrolls between header and footer, in the `main` landmark. |
| `footer` | `ReactNode`, optional | The fixed footer bar under the slot: the page's primary actions. A `contentinfo` landmark. |
| `aside` | `ReactNode`, optional | The right column: details, an inspector, a roster. A `complementary` landmark. |

`pageOwnsMain` is for an app whose pages render their own `<main>` landmark and padding: the slot
is then a plain, unpadded `<div>`, so the page has one main landmark, not two.

## Session

`layout="session"` is for a page of its own, where the app's chrome would be in the way: a
flashcard review, a reading passage, a timed test, a live quiz host (design#239 addendum). No nav,
no menu button, no aside: the `header` slot takes a `SessionHeader`, the slot is centred to a
measure, and the `footer` slot an optional `SessionFooter`.

```tsx
<Shell
  layout="session"
  measure="text" // or "board": cards, a quiz board
  header={
    <SessionHeader
      title="Deck 3: Strong verbs"
      onExit={() => router.back()}
      confirmExit // ask before progress is lost; or { title, description, leave, stay }
      progress={{ value: 7, max: 20 }} // a bar and 7/20; or a node of your own
      status={<Timer />} // a timer, a streak, a score, the connection
    />
  }
  footer={
    <SessionFooter align="between">
      <Button variant="secondary">Again</Button>
      <Button>Good</Button>
    </SessionFooter>
  }
>
  <Card />
</Shell>
```

- **Header**: exit (×) first, the title, the progress, the status. Under 768 px of shell width it
  stays compact: the title is for screen readers only, exit, progress and status stay.
- **Exit**: the × and Escape both call `onExit`, through the confirm when `confirmExit` is set.
  Escape counts when focus is in the session (or nowhere), and not while a dialog, menu or listbox
  in the shell has it.
- **Footer**: the shell docks it, pads it for the safe area and lifts it above an on-screen
  keyboard. Without one the slot fills the height.
- **Measure**: `text` is `--hn-shell-measure` (default 65ch), `board` is `--hn-shell-board`
  (default 72rem); `SessionFooter` lines up with the same width.
- **Focus** stays in the session: Tab from the last stop wraps to the first.
- **Motion**: the progress bar's width transition is off under reduced motion.

## Breakpoints

The layout follows the shell's own width, not the viewport's (container queries), so the shell
looks right wherever it is mounted, including a gallery card or a phone frame:

| Shell width | Nav | Aside | Footer |
| --- | --- | --- | --- |
| below 768 px | a drawer from the header's menu button (the owner's M2) | a bottom sheet from `ShellAsideToggle` | docked at the bottom, safe-area padded, above an on-screen keyboard |
| 768 to 1279 px | a column on the left | a side sheet from `ShellAsideToggle` | under the slot |
| from 1280 px | a column on the left | a column on the right, when open | under the slot |

The drawer and the sheets are Radix dialogs portalled into the shell's root: focus is trapped,
Escape and a click outside close them, focus goes back to the button that opened them, and the
drawer also closes on a leftward swipe and when a row is picked. They slide in with a transition
that `prefers-reduced-motion` turns off.

`asideOpen`/`defaultAsideOpen` (default: open in `work`, closed in `focus`)/`onAsideOpenChange`
control the aside column. The sheet below 1280 px is the shell's own state.
`useShell()` exposes `width` (`compact`, `medium`, `wide`), `navOpen`, `asideShown` and
`toggleAside` for controls of your own.

## Accessibility

- Landmarks: `nav` (the column and the drawer), `main` (the slot), `complementary` (the aside,
  named by `asideLabel`), `contentinfo` (the footer bar).
- A skip link is the first stop of the keyboard and moves focus to the slot.
- The drawer and the aside sheet are dialogs with a heading and a close button; the menu button
  and the aside toggle carry `aria-expanded`.
- Motion: the overlays' slide is `motion-reduce:transition-none`.
- The words are in `SHELL_COPY` (en, de); `locale` picks them.

Give the shell a parent with the height it should fill, e.g. `<div className="h-dvh">`. Its root is
`h-full`, and a height in `className` does not override that: Tailwind v4 emits `h-full` after
`h-dvh`, so the shell would take its content's height and main would never scroll. For the footer
to ride above the keyboard on Android as well, use `interactive-widget=resizes-content` in the
viewport meta, or leave it to the shell's `--hn-shell-keyboard` (iOS and the rest).

Inset, gap, column widths, corner and seam are the `shell.*` recipe tokens (design#152,
`@hansenexus/tokens` README, Recipes). The defaults float three cards apart; a flush pack such as
fachwerk sets inset and gap to 0 and the seam to its border width, so neighbouring panels overlap
onto one shared beam. No prop changes the layout: the pack does.

```tsx
import {
  navCommands,
  Shell,
  ShellCommandTrigger,
  ShellAsideToggle,
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
            <ShellAsideToggle />
          </span>
        </>
      }
      footer={<SaveBar />}
      aside={selected ? <MachineDetail machine={selected} /> : undefined}
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

## Nav: sections, active row, link

| Prop | What it does |
| --- | --- |
| `items[].section` + `sections` | Rows carry a section id; `sections` (`{ id, label }[]`) names the ones that get a heading. A heading is drawn before the first visible row of its section, so a section whose rows are all hidden has none. Order the items yourself. |
| `activeId` | The current row. `activeNavId(items, pathname)` picks the longest `href` that is a prefix of the path on a segment boundary, ignoring query and hash: `/space/seating/plans/7` marks `/space/seating/plans`, not `/space`. |
| `link` | A component every row renders through (`ComponentType<ComponentProps<"a"> & { href }>`), e.g. a wrapper around next/link or a locale-aware Link, so routing and prefetch stay the app's. Without it a row is an `<a>`. |

The same rail fills the nav column and the phone drawer; a row picked in the drawer closes it.
The active row takes its colours from the `nav.*` tokens and its height, padding, corner and
dividers from `shell.nav-*`, so a pack restyles it without a prop.

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

`locale="de"` switches the shell's landmark and control names, the skip link and the back link
(`SHELL_COPY`) and the default
palette's copy (`STATE_COPY.command` in `@hansenexus/ui`). English is the default.

## In the gallery and the registry

The kit gallery's `shell` scene mounts the package once per layout (`?layout=work|focus|full|session`) ×
breakpoint (desktop 1280 px, tablet 900 px, phone 390 px in a phone frame) × theme pack (the
toolbar's pack switcher or `?theme=`), plus a preset in the palette slot. `session` shows four
pages instead (flashcard review, reading passage, timed test, live quiz host) at desktop and phone. It has pixel baselines
and interaction checks (`packages/ui/screenshots`). The shell-layout vote board draws it too.

## Skinning

A pack skins the shell through its recipe tokens, never through a prop or an app branch:
`shell.inset`, `gap`, `seam`, `rail` (the nav column and the drawer), `context` (the aside column
and side sheet), `radius` (panels, the drawer and sheet corners), the `shell.nav-*` rows,
`border.width`, `elevation.panel`, and the `panel.main` fill. For what the recipes cannot say, the
whole `Shell` is the theme pack's `shell` skin slot (`@hansenexus/ui` `skinnable`). The session
layout's widths read `--hn-shell-measure` and `--hn-shell-board`, with 65ch and 72rem as
fallbacks.

## Migrating from 0.2

0.3 is a minor: every 0.2 prop still works, so a Renovate bump compiles. What changes on screen:

| 0.2 | 0.3 |
| --- | --- |
| the phone nav was a bottom tab bar (`tabLimit`, `moreLabel`, the More sheet) | the nav is a drawer from the header's menu button under 768 px; `tabLimit` and `moreLabel` are accepted and ignored |
| `main` | `children` (`main` still fills the slot) |
| `contextPane`, `contextOpen`, `defaultContextOpen`, `onContextOpenChange`, `contextLabel` | `aside`, `asideOpen`, `defaultAsideOpen`, `onAsideOpenChange`, `asideLabel` (the old names still work) |
| `ShellContextToggle` with `aria-pressed`, hidden below 1024 px | `ShellAsideToggle` (the old name is an alias) with `aria-expanded`, always shown: a column toggle from 1280 px, a sheet below |
| the context pane showed from 1024 px of shell width | the aside column shows from 1280 px; below that it is a sheet |
| `data-shell-panel="context"` | `data-shell-panel="aside"`; new panels `page` and `footer` |
| no footer | `footer`: the fixed primary-action bar |
| one layout | `layout="work"` (the default, same as 0.2), `"focus"`, `"full"` with `back`, `"session"` with `SessionHeader` and `SessionFooter` |

Apps that put their own phone tab bar or detail sheet around the 0.2 shell can drop it. Apps that
test the tab bar (`data-shell-nav="tabs"`) test the menu button and the drawer instead
(`data-shell-control="menu"`, the dialog named by `navLabel`).

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
