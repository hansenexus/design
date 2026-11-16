# Gallery workbench: app screens

The gallery renders the apps' real screens with realistic fixture data under every theme pack, in
light and dark, at 390 and 1280 px (design#148, ruling
`dec_2026-11-15_global-design-theme-packs-gallery-workbench` point 6). An app exports its pure-UI
screens through the screen-fixture contract; this folder says which apps the gallery bundles and
from where.

```
workbench/
  apps.json        the apps whose screens the gallery bundles
  example/         the contract's reference app (36 machines in the shell), in this repo
  .checkouts/      apps from other repositories at their pinned ref (ignored, CI fills it)
```

## The contract: `@hansenexus/ui/workbench`

An app's screens entry default-exports `defineScreens`:

```ts
import { defineScreen, defineScreens } from "@hansenexus/ui/workbench";

export default defineScreens({
  app: "fachwerk",
  screens: [
    defineScreen<ClassHubProps>({
      id: "fachwerk/class-hub", // "<app>/<kebab-name>", unique
      title: "Klassen-Hub",
      level: "template",
      group: "Klassen", // optional nav heading
      viewports: [390, 1280], // optional, default both
      modes: ["light", "dark"], // optional, default both
      height: "viewport", // "viewport" (full page, default) or "content"
      component: ClassHubScreen, // ComponentType<ClassHubProps>
      fixtures: [
        // non-empty, the first is the default
        { id: "full-term", label: "Volles Halbjahr", load: (ctx) => classHubFull(ctx) },
        { id: "new-class", label: "Neue Klasse", load: (ctx) => classHubEmpty(ctx) },
      ],
    }),
  ],
});
```

`load(ctx)` returns the screen's whole props, or a promise of them (a dynamic import keeps a large
fixture out of the first load). `ctx` is the same for every render:

| Field | Value |
| --- | --- |
| `now` | `2026-11-16T07:00:00Z` (`WORKBENCH_NOW`), a fresh copy each time |
| `locale`, `timeZone` | `de-DE`, `Europe/Berlin` |
| `action(name)` | a callback that only reports `name` and its arguments to the gallery's action log |

`validateScreens(app)` lists every broken rule of the shape (ids, level, fixtures, hints); the
gallery shows them on the screens index, and an app can run it in its own tests.

### Rules a screen keeps

- **Pure UI.** Props in, callbacks out. No Convex, no fetch, no router or Next, no auth, no prod
  data. Every date derives from `ctx.now`, nothing is random, so the screenshots hold.
- **Realistic fixtures**, in volume and content, with invented names: the owner could not judge a
  synthetic mockup (kommandant#783).
- **Imports**: relative files inside the screen folders, `react`, `react-dom`, `@hansenexus/*`,
  `radix-ui`, and the aliases of the app's `apps.json` entry. The gallery build fails on anything
  else (`packages/ui/scripts/workbench.ts`); vendor what a screen needs into its folders. The
  allowed packages resolve to the gallery's own copies: one React, one skin context.
- **No theme of its own.** Never set `data-theme` or `data-mode`, never mount `<ThemePack>`: the
  gallery does, so every pack draws the same screen. Style with Tailwind utilities on the semantic
  tokens; the gallery adds the screen folders to Tailwind's sources.
- A `"viewport"` screen is a whole page, the shell included when the app mounts
  `@hansenexus/shell`.

## apps.json

```json
{
  "apps": {
    "example": { "path": "workbench/example", "entry": "index.ts" },
    "fachwerk": {
      "repo": "hansenexus/fachwerk",
      "ref": "<commit sha>",
      "entry": "packages/screens/src/index.ts",
      "aliases": { "@fachwerk/brand": "packages/ui/src/brand" },
      "css": "packages/screens/src/screens.css"
    }
  }
}
```

| Field | Meaning |
| --- | --- |
| `path` | an app in this repository: its folder, repo-relative |
| `repo`, `ref` | an app elsewhere: `owner/name` and the commit the gallery bundles |
| `entry` | the screens entry, relative to the app's root (`path`, or the checkout) |
| `aliases` | bare specifiers the screens import from the app's own packages, root-relative; their files keep the same rules |
| `css` | a stylesheet beyond the Tailwind utilities (optional) |

The screen folders are the entry's folder and the alias targets.

**Nothing private is published.** An app from another repository reaches the gallery at build time:

- **CI** checks each one out at its `ref` into `.checkouts/<app>` with a read-only token, then
  builds the private gallery image (`bun scripts/workbench-checkout.ts` in `packages/ui`, with
  `GH_TOKEN`). The `.git` folder is removed, so no history or credential reaches the image.
- **Locally** `WORKBENCH_<APP>=<absolute checkout>` (e.g. `WORKBENCH_FACHWERK=~/orca/workspaces/fachwerk/<lane>`)
  points the gallery at a working tree, uncommitted edits included.
- **Neither**: the app is skipped and the screens index says why, so a public clone still builds.

## Look at it

```sh
cd packages/ui
bun run gallery -- --serve   # http://127.0.0.1:4410/gallery/?scene=screens
WORKBENCH_FACHWERK=$HOME/repos/fachwerk bun run gallery -- --serve
```

`?scene=screens&screen=<id>&fixture=<id>` shows one screen; the toolbar's theme, mode and viewport
apply as on every scene, and `&bare=1` leaves only the screen for a screenshot.

## Packs side by side (design#149)

The toolbar picks **Pack** (core, lexilink, fachwerk, …) and then its **Direction**; a screen's
own picker in its header picks app and screen, the fixture links the fixture. **Compare** is a
checklist of themes: every card of a scene, or the current page in the matrix, renders once per
checked theme next to the current one. **Matrix** (`&matrix=on`) shows the current page (a
scene, an item page or an app screen with its fixture) once per compared theme, light and dark
at 1280 and 390 px, each cell the page alone in an iframe at its real width.

Every pack direction also exists as **`<id>@live`**, built from `main`'s `themes/`
(`packages/ui/scripts/live.ts`): on a theme-pack branch, compare `fachwerk` with
`fachwerk@live` to see the candidate next to what ships.

- Main comes from `git archive origin/main themes` (override with `WORKBENCH_LIVE_REF=<ref>`),
  extracted into the ignored `workbench/.checkouts/_live`. Fetch main first (`git fetch origin`).
- Without git (the gallery image) an existing `workbench/.checkouts/_live` is used; with neither,
  the live copies are this build's own packs and the Direction picker says so.
- An extracted pack may import only core packages (react, `@hansenexus/*`, radix-ui), as a
  screen may; they resolve to the gallery's own copies.

```sh
# fachwerk, lexilink and main's fachwerk on the example screen, light/dark × 1280/390
http://127.0.0.1:4410/gallery/?scene=screens&screen=example/machines&theme=fachwerk&compare=lexilink,fachwerk@live&matrix=on
```
