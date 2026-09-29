# @hansenexus/ui

The open hansenexus primitives: React components on [Radix](https://www.radix-ui.com/), styled only
through the semantic tokens of [`@hansenexus/tokens`](../tokens). Dark and light both ship; every
colour follows `data-mode`, `data-theme` and `data-density` on an ancestor.

Button, Badge, StatusBadge, Switch, Dialog, Menu, Tabs, Table, Meter, Sparkline, Kbd, Toast,
Tooltip, Input, Select, RailItem. For forms: Field, Label, FieldHelp, FieldError, Textarea,
Checkbox, RadioGroup and FormAlert. For layout: Card (CardHeader, CardTitle, CardDescription,
CardBody, CardFooter, CardSkeleton), Alert and Banner, Avatar, Separator, Accordion. For dates and
data: Popover, Calendar, DatePicker, Combobox and DataTable. Overlays and navigation: Sheet,
Breadcrumb, Pagination and the command palette (Command, CommandDialog, `useCommandShortcut`). For
loading: Skeleton (block, text, circle), SkeletonGroup,
Spinner and the `useDelayedVisibility` hook. For the other states: EmptyState, ErrorState, Progress
and QueryState, with German and English default copy (`STATE_COPY`). Plus the brand: `HansenexusMark` and `HansenexusWordmark`
(`variant` lime, lime-deep, ink, paper or mono, which is `currentColor` and the default; `size` is
the height; named "hansenexus" unless `aria-label` or `aria-hidden` says otherwise). Usage rules in
[brand/README.md](../../brand/README.md).

```sh
bun add @hansenexus/ui @hansenexus/tokens react react-dom
```

## Styles

With Tailwind v4, let Tailwind see the package's classes:

```css
@import "tailwindcss";
@import "@hansenexus/tokens/tailwind.css";
@source "../node_modules/@hansenexus/ui/dist";
```

Without Tailwind, import the prebuilt utilities (they include the token variables):

```css
@import "@hansenexus/ui/styles.css";
```

## Use

```tsx
import { Button, StatusBadge, Meter } from "@hansenexus/ui";

<Button variant="danger">Scale to 2</Button>
<StatusBadge status="crit">Refused</StatusBadge>
<Meter label="Memory" value={88} tone="warn" />
```

`className` is appended, not merged: to change a look, prefer a variant or wrap the component.

### Loading

```tsx
import { Skeleton, SkeletonGroup, Spinner, useDelayedVisibility } from "@hansenexus/ui";

<SkeletonGroup label="Loading invoices">       {/* role=status, aria-busy="true" */}
  <Skeleton shape="circle" width={32} />
  <Skeleton shape="text" lines={2} />
  <Skeleton height={64} />
</SkeletonGroup>

<Spinner pending={isSaving} label="Saving" />  {/* keep it mounted, flip pending */}
const show = useDelayedVisibility(isSaving);   // your own pending indicator
```

Route skeletons show at once. A Spinner (or anything behind `useDelayedVisibility`) shows only
after `delay.pending` (200 ms), so fast work never flashes it, and then stays at least
`min-visible.pending` (400 ms). Skeletons pulse between `skeleton.base` and
`skeleton.highlight`; under `prefers-reduced-motion: reduce` neither pulses nor spins. The pulse is
the provisional style until the gallery vote (PRD hn-monorepo#2110, slice 5; see Variant votes).

### Empty, error, progress and QueryState

```tsx
import { EmptyState, ErrorState, Progress, QueryState } from "@hansenexus/ui";

const machines = useQuery(api.machines.list);            // undefined while loading
<QueryState query={machines} locale="de" isEmpty={(m) => m.length === 0}
  empty={<EmptyState variant="empty" locale="de" action={<Button>Maschine anlegen</Button>} />}>
  {(rows) => <MachineTable rows={rows} />}
</QueryState>

// app/[id]/error.tsx
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} onRetry={reset} locale="de" />;
}

<Progress value={40} label="Upload" showLabel />   {/* no value: indeterminate */}
```

- **Copy.** `STATE_COPY.de` and `STATE_COPY.en` are plain objects; `locale` picks one and every
  text prop (`title`, `description`, `retryLabel`, `label`, `loadedMessage`) overrides it. No i18n
  library: monorepo apps pass their `states.*` next-intl messages.
- **EmptyState** has two variants: `empty` (nothing exists yet) and `no-results` (the search or
  filter matched nothing). `illustration` is a slot and renders `aria-hidden` in `ink.muted`; fill
  it with a motif from [`@hansenexus/illustrations`](../illustrations), e.g.
  `illustration={<EmptyIllustration />}` from `@hansenexus/illustrations/empty`.
- **ErrorState** takes the same `illustration` slot (`@hansenexus/illustrations/error`) and shows the copy, the `digest` as a reference and a retry button when `onRetry` is
  set. The raw message and stack show only when `NODE_ENV === "development"` (or `dev`); anything
  else, including a browser without a bundler replacement, gets the production view.
- **Progress** is a `progressbar`: determinate with `value` (busy colour, ok once complete),
  indeterminate without; the pulse and the width transition stop under reduced motion.
- **QueryState** reads `undefined` as loading, `null` and `[]` as empty (or your `isEmpty`), an
  `error` prop as failed, and defaults to Skeleton, EmptyState and ErrorState. It imports no data
  library. The container is `aria-busy` while loading, and a polite live region announces when
  the data arrives ("Loaded") or the query fails; it stays silent when the data is already there.

### Forms

```tsx
import { Button, Checkbox, Field, FormAlert, Input, RadioGroup, RadioGroupItem, Spinner } from "@hansenexus/ui";

<form noValidate aria-busy={pending || undefined} onSubmit={submit}>
  {result === "invalid" && <FormAlert kind="invalid" locale="de" />}
  {result === "server-error" && <FormAlert kind="server-error" locale="de" />}
  <fieldset disabled={pending}>                        {/* pending: every control off */}
    <Field label="Maschinenname" help="Kleinbuchstaben und Bindestriche." error={errors.name} required>
      <Input mono name="name" />
    </Field>
    <Field label="Umgebung" error={errors.env} required>
      <RadioGroup name="env" orientation="horizontal">
        <RadioGroupItem value="production" label="Produktion" />
        <RadioGroupItem value="lab" label="Labor" />
      </RadioGroup>
    </Field>
    <Field label="Bereitschaft alarmieren" layout="inline">
      <Checkbox name="page" />
    </Field>
  </fieldset>
  <Button type="submit" disabled={pending}>
    {pending && <Spinner label={STATE_COPY.de.form.pending} />}
    {pending ? STATE_COPY.de.form.pending : "Maschine anlegen"}
  </Button>
</form>
```

- **Field** takes one control and gives it `id`, `aria-labelledby` (the label), `aria-describedby`
  (help, then error, after any the control already has), `aria-invalid` while `error` is set,
  `aria-required` and `disabled`. It works for Input, Textarea, SelectTrigger, Checkbox, Switch
  and RadioGroup. `layout="inline"` puts the control before its label (Checkbox, Switch).
- **Errors** are never colour alone: FieldError and FormAlert carry the crit diamond, and their
  text is `status.crit`, which meets AA as text on every surface.
- **Pending** disables the `fieldset`: native controls and the Radix buttons inside switch off,
  and Label dims with them. Keep the Spinner mounted and flip `pending` (200 ms delay, 400 ms
  minimum).
- **Honest success.** Show FormAlert or a success toast only after the server answered. The
  `server-error` alert keeps the entered values and says nothing was changed.
- **Keyboard.** Checkbox toggles with Space; RadioGroup is one Tab stop, the arrow keys move and
  select.
- **Copy.** `STATE_COPY[locale].form` holds `invalid`, `pending` and `serverError`; the props
  override it.

### Layout

```tsx
import { Alert, Avatar, Banner, Card, CardBody, CardHeader, CardSkeleton, CardTitle } from "@hansenexus/ui";

{machine === undefined ? (
  <CardSkeleton avatar lines={2} locale="de" />             {/* role=status, aria-busy */}
) : (
  <Card pending={isRestarting}>                             {/* aria-busy; disabled = inert */}
    <CardHeader><CardTitle>{machine.name}</CardTitle></CardHeader>
    <CardBody>…</CardBody>
  </Card>
)}

<Banner tone="warning" dismissible locale="de">Wartung heute Abend.</Banner>
<Alert tone="critical" title="Scale refused" action={<Button variant="secondary">View audit</Button>} />
<Avatar name="Ada Lovelace" src={url} />                    {/* initials until the image loads */}
<Avatar name="Ada Lovelace" loading />                      {/* circle skeleton */}
```

- **Card** is the frame; `disabled` dims it and makes it `inert`, `pending` sets `aria-busy`
  without moving anything. Put EmptyState or ErrorState in a CardBody for those states.
- **Alert** tones are info, success, warning and critical, each with its own glyph shape and a
  visually hidden tone word, so none rests on colour. Critical is `role=alert`, the rest
  `role=status`. `dismissible` adds a close button (uncontrolled, or controlled with `open` and
  `onDismiss`). **Banner** is the square, full-width layout for the top of a page or region.
- **Avatar** is one `role=img` named by `name`; the image, the initials (`initials()`) or, with
  `loading`, a circle skeleton.
- **Separator** is decorative unless `decorative={false}`; `tone="strong"` between groups.
- **Accordion** is Radix: Enter/Space toggle, arrows, Home and End move; disabled items are
  skipped. An `AccordionContent` without children shows the locale's empty copy.
- Default copy (tone words, "Dismiss", "Loading", the empty line) is `LAYOUT_COPY.de|en`; every
  string has a prop.

### Dates and data

```tsx
import { Combobox, DataTable, DatePicker, Field, Input } from "@hansenexus/ui";

<Field label="Wartungsfenster" error={errors.day}>
  <DatePicker locale="de" min={today} value={day} onValueChange={setDay} />
</Field>
<Field label="Zeitraum">
  <DatePicker mode="range" locale="de" value={range} onValueChange={setRange} />
</Field>

<Field label="Maschine">
  {/* options: undefined while the search runs; error when it failed */}
  <Combobox locale="de" options={hosts} error={hostsError} onRetry={refetch}
    onQueryChange={setSearch} filter={false} value={host} onValueChange={setHost} />
</Field>

<Input aria-label="Filter" value={query} onChange={(e) => setQuery(e.target.value)} />
<DataTable
  caption="Maschinen"
  locale="de"
  columns={[
    { id: "host", header: "Host", cell: (m) => m.host, sortValue: (m) => m.host, mono: true },
    { id: "cpu", header: "CPU %", cell: (m) => m.cpu, sortValue: (m) => m.cpu, align: "end" },
  ]}
  rows={machines}                       // undefined: loading
  error={error} onRetry={refetch}
  getRowId={(m) => m._id} getRowLabel={(m) => m.host}
  query={query} onClearFilters={() => setQuery("")}
  selectable selection={selected} onSelectionChange={setSelected}
  pending={bulkActionRunning}
/>
```

- **Calendar** is an ARIA grid with one Tab stop: the arrows move by day and week, Home/End to the
  week's ends, PageUp/PageDown by month (Shift: by year), Enter or Space picks. Each day is named
  by its full date, today carries `aria-current="date"`, picked days `aria-selected`. Days outside
  `min`/`max` or `isDateDisabled` stay focusable with `aria-disabled`, struck through. Weeks start
  on Monday (`weekStartsOn={0}` for Sunday). Values are local calendar days at midnight; pass
  `today` for renders that must not depend on the clock.
- **DatePicker** reads like Select and opens the Calendar in a Popover; a single day closes it on
  pick, a range once both ends are set. `de` writes 14.09.2026 and 14.–18.09.2026, `en` is British
  English (14 Sept 2026). States: empty (placeholder), invalid (`aria-invalid` from Field), pending
  (busy, disabled, Spinner after 200 ms) and disabled.
- **Combobox** follows the ARIA combobox pattern: focus stays in the input, the arrows move the
  active option (`aria-activedescendant`), Enter picks, Escape closes, leaving the field restores
  the selection's label. `options={undefined}` shows the loading row, `error` an error row with
  retry (Enter retries too), an empty list says either "no options yet" or "nothing matches
  “query”". Pass `filter={false}` when the server filters.
- **DataTable** keeps the header in every state. Loading draws skeleton rows, empty and no-results
  use EmptyState (no-results offers `onClearFilters`), error uses ErrorState with the digest, and
  `pending` keeps the stale rows, sets `aria-busy`, locks sorting and selection, and dims after
  200 ms. Sortable headers are buttons with `aria-sort` on the sorted column; strings sort by the
  locale's collation with numbers in order (kran-2 before kran-10), empty values last. The header
  checkbox selects or clears the visible rows and goes indeterminate in between. The pure helpers
  (`sortRows`, `filterRows`, `nextSort`, `toggleAll`, `calendarKeyTarget`, `selectInRange`,
  `filterOptions`, `nextOptionIndex`) are exported for server-side use and tests.
- **Copy.** `STATE_COPY[locale].date`, `.combobox` and `.table`; `{query}` and `{row}` are filled
  by `fillCopy`.

### Overlays and navigation

```tsx
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
  CommandDialog, Pagination, Popover, PopoverContent, PopoverTitle, PopoverTrigger,
  Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, SheetTrigger, useCommandShortcut,
} from "@hansenexus/ui";

<Sheet>
  <SheetTrigger asChild><Button variant="secondary">Details</Button></SheetTrigger>
  <SheetContent side="right" locale="de" pending={saving}>   {/* bottom sheet below 640 px */}
    <SheetHeader><SheetTitle>kran-04</SheetTitle></SheetHeader>
    <SheetBody>…</SheetBody>
  </SheetContent>
</Sheet>

<Popover>
  <PopoverTrigger asChild><Button variant="secondary">Snooze</Button></PopoverTrigger>
  <PopoverContent className="w-72 p-4" aria-labelledby="snooze"><PopoverTitle id="snooze">Snooze alerts</PopoverTitle>…</PopoverContent>
</Popover>

<Breadcrumb locale="de">
  <BreadcrumbList>
    <BreadcrumbItem><BreadcrumbLink href="/">Bestand</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbPage>kran-04</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>

<Pagination page={page} pageCount={12} pendingPage={requested} onPageChange={load} />

const [open, setOpen] = useState(false);
useCommandShortcut(() => setOpen((o) => !o));               // ⌘K / Ctrl+K
<CommandDialog open={open} onOpenChange={setOpen} groups={groups} onSelect={run}
  query={q} onQueryChange={setQ} filter={false} loading={searching} error={failed} onRetry={retry} />
```

- **Sheet** is a Radix Dialog from the right, left or bottom edge. A side sheet becomes a bottom
  sheet below 640 px (`bottomOnMobile`, on by default) with a grab handle. `pending` makes it
  `aria-busy` and undismissable (Escape, outside click and the close button are off), so it never
  closes before the server answered. The close button is named from `STATE_COPY[locale].overlay`.
- **Popover** is non-modal, anchored to its trigger, a `dialog` you name with `aria-labelledby`
  (PopoverTitle). It has no padding of its own (Combobox and DatePicker run edge to edge), so
  give free content `p-4`. Escape or an outside click closes it and focus returns to the trigger.
- **Breadcrumb** is a `nav` landmark ("Breadcrumb" / "Seitenpfad") around an `ol`; the current
  page is text with `aria-current="page"`; separators are hidden from assistive tech;
  BreadcrumbEllipsis is a button to put inside `MenuTrigger asChild` for the hidden levels. While
  the current page's name loads, put a text Skeleton in its item.
- **Pagination** shows first, last, the current page with `siblings` around it and an ellipsis per
  gap, always the same number of slots (`paginationRange`). **Loading between pages:** pass the
  requested page as `pendingPage` and move `page` only once its data arrived. The nav is
  `aria-busy`, the requested button shows the Spinner after 200 ms (then at least 400 ms), and
  `aria-current` stays on the page on screen, so it never claims a page that has not loaded. A
  polite live region says "Page 3 of 12" once it has. `href` renders links, `disabled` turns it
  off, fewer than two pages render nothing. Previous and next are icon-only below 640 px.
- **Command** is the palette body (inline) and **CommandDialog** the palette in a modal. The input
  is a `combobox` that owns a `listbox`; the arrow keys move the active option
  (`aria-activedescendant`, disabled items are skipped), Page Up/Down jump to the ends, Enter
  selects, Escape closes and focus goes back to where it was. States: `loading` shows skeleton rows
  until there is something to show, then keeps the results with a delayed Spinner; no results is
  claimed only after loading; `error` shows the crit diamond, the message and a retry. A polite
  live region says the result count. The default filter matches every word against the label and
  `keywords`, ignoring case and accents; `filter={false}` for server-side search.
- **Copy.** `STATE_COPY[locale].overlay`, `.navigation` and `.command`; `{page}`, `{count}` and
  `{query}` are filled by `fillCopy`.

## shadcn registry

The same sources ship as a shadcn registry (`registry.json`; built items in `dist/r/`, also in the
npm package under `@hansenexus/ui/registry/*`). Each item depends on `@hansenexus/tokens`, which adds
the token import to your CSS.

**Version stamp.** Every file an item copies in starts with `"hn-registry: <item>@<version>";`, and
every item in `r/<item>.json` and `r/registry.json` carries the same version as `meta.version`. The
version is this package's (`@hansenexus/ui`), so one release moves every item. `/design outdated` (the
skill in hansenexus/skills) reads the stamps in a consumer repo and lists each one behind
`meta.version`; keep the stamp line when you edit a copied file, it is how the block is found. It is
an (inert) directive rather than a comment because `shadcn add` drops a file's leading comments.

**Hosted.** The kit-gallery image serves `dist/r` next to the gallery, at
`https://design.hansenexus.dev/r/{name}.json` (`no-cache`), behind Cloudflare Access. The shadcn CLI
authenticates with an Access service token as headers; shadcn expands `${VAR}` from the
environment, so the token stays out of `components.json` (the `/design` skill fills the variables
from 1Password). The entry is `REGISTRIES` in `scripts/registry.ts`, and the build writes it to
`dist/r/components.json` (served at `/r/components.json`), so a consumer copies it verbatim:

```json
{
  "registries": {
    "@hansenexus": {
      "url": "https://design.hansenexus.dev/r/{name}.json",
      "headers": {
        "CF-Access-Client-Id": "${HN_REGISTRY_CLIENT_ID}",
        "CF-Access-Client-Secret": "${HN_REGISTRY_CLIENT_SECRET}"
      }
    }
  }
}
```

```sh
bunx shadcn@latest add @hansenexus/button @hansenexus/status-badge
```

**Outdated.** `scripts/outdated.ts` is the check behind `/design outdated`: it finds every stamped
file under a consumer repo, reads the registry from the repo's `components.json` (or the default
above), fetches `/r/registry.json` with the same headers and lists each block whose stamp is behind
`meta.version`, with the registry version next to it. Exit 1 when something is behind, 2 when a
header variable is unset (named, never printed) or the fetch fails.

```sh
HN_REGISTRY_CLIENT_ID=… HN_REGISTRY_CLIENT_SECRET=… bun run outdated -- ~/repos/some-app
bun run outdated -- ~/repos/some-app --registry dist/r      # against a local build, no token
bun run outdated -- ~/repos/some-app --json                  # every block with its state
```

## Rules the components keep

- Colour only through semantic tokens. Tailwind's own palette is removed from the build
  (`src/no-palette.css`), and the repo ratchet fails CI on a raw colour outside `packages/tokens`.
- Lime is a flat fill with dark text (`action.primary`) or text (`action.text`). No glow, gradient,
  coloured shadow or sheen; overlays use the one `shadow.lift`.
- Status is never colour alone: StatusGlyph draws ok dot, busy ring, warn triangle, crit diamond,
  off hollow circle, unknown dashed circle. Off and unknown labels use `ink.muted`.
- Targets follow the density: 24 px minimum on desktop, 44 px under `data-density="touch"`.
  Table rows use the density's row height (36 px compact).
- Transitions use the token durations and switch off under `prefers-reduced-motion`.

## Screenshot baselines

`screenshots/baselines/` holds the kit gallery (`gallery/`, every primitive in its states), the
loading scene (Skeleton and Spinner), the states, illustrations, forms, layout, data, overlays and navigation scenes and each overlay at 390 and 1280 px, dark and light. Pixels depend on the OS and browser build, so
`scripts/screenshots.sh` runs Playwright inside the pinned `mcr.microsoft.com/playwright` image,
the same one CI uses. It needs Docker. `screenshots/interaction.spec.ts` drives the live palette, sheet,
popover and pager in the same run (keyboard, focus return, `aria-current` after load).
Every scene carries a top nav linking all the others; the baselines load their scene with
`&bare=1`, which leaves the nav out of the frame.

```sh
bun run build                 # tokens dist is needed by the gallery
bun run screenshots           # compare (from packages/ui)
bun run screenshots:update    # rewrite after an intended change; review the PNG diff
bun run gallery -- --serve    # look at it: http://127.0.0.1:4410/gallery/?scene=kit&mode=light
bun run gallery -- --out /tmp/kit-site   # the static site the hosted gallery serves (see the root README)
```

## Variant votes

Design-system alternatives are compared in the gallery, not in the monorepo variant preview
(`dec_2026-09-26_global-frontend-state-contract`). A category is a folder
`gallery/variants/<category>/`: `category.tsx` holds the fixtures, and each `<variant>.tsx` is one
alternative drawn in all of them. The vote scene shows them side by side, columns at 1280 px and a
swipe row per fixture at 390 px, in dark and light:

```sh
bun run gallery -- --serve    # http://127.0.0.1:4410/gallery/?scene=vote&category=skeleton-style
bun run variants              # list categories, open or decided; fails on an inconsistent board
bun run decide skeleton-style pulse --rationale "why the owner chose it"
```

`decide` writes `decisions/<category>.json` (`winner`, `date`, `rationale`, `considered`) and
deletes the losing variant files, so a decided category keeps only its winner. Only the owner
decides: a lane prepares the board and stops at "Awaiting decision". Adopting the winner into the
primitive is a separate change.

| Category | Winner | Decided | In the kit |
| --- | --- | --- | --- |
| `skeleton-style` | pulse | 2026-09-27 | `Skeleton` pulses by default; reduced motion holds it on skeleton.base |
| `illustration-style` | geometric | 2026-09-27 | All eight motifs of [`@hansenexus/illustrations`](../illustrations); the gallery's `states` scene fills the EmptyState/ErrorState slot with them |

`shell-layout` (level `template`, open) is the first vote of `@hansenexus/shell`
(`dec_2026-09-29_global-design-shell-gallery-atomic`): rail + collapsible sidebar (kommandant's
shell today), 3-pane with context pane, command-first minimal chrome and floating panels. Each
draws the same app in a fixed-size screen, every theme at 1280 × 800 and 390 × 844, scaled to its
cell; the screen sets its own `data-theme`, so the four themes share one board. "Open alone"
(`&variant=<id>&fixture=<id>`) shows one screen at full size. The web stays flat
(`dec_2026-09-25_kommandant-visual-flat-lime-only`): the floating-panels variant has a glass
toggle, off by default (flat: inset, `shadow.lift`, no blur; `&glass=on` starts it on), and glass
winning needs a ruling that supersedes the flat one before any glass ships. A category's `level`
shows on the board and in the gallery's level nav; a fixture's `columns` caps the variants per row
at 1280 px.

The vote scenes
have layout checks (`screenshots/vote.spec.ts`) but no pixel baselines, since a board is temporary.

## Release

Push a `ui-v<version>` tag matching `package.json`. The `release-ui` workflow builds, runs the
contrast check and the tests, and publishes to npm with provenance over OIDC trusted publishing.
`dist/index.js` is bundled with the production JSX runtime (`react/jsx-runtime`); the build and
the `dist` tests fail if it contains `jsx-dev-runtime` or `jsxDEV` (fixed in 0.2.1, design#27).
`@hansenexus/tokens` ships separately on its own `tokens-v<version>` tag (`release.yml`).

## Licence

MIT, except the hansenexus name, mark and wordmark (`brand-geometry`, `HansenexusMark`,
`HansenexusWordmark`): trademarks, not covered by the MIT licence. See
[TRADEMARK.md](../../TRADEMARK.md).
