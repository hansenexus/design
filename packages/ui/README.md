# @hansenexus/ui

The open hansenexus primitives: React components on [Radix](https://www.radix-ui.com/), styled only
through the semantic tokens of [`@hansenexus/tokens`](../tokens). Dark and light both ship; every
colour follows `data-mode`, `data-theme` and `data-density` on an ancestor.

Button, Badge, StatusBadge, Switch, Dialog, Menu, Tabs, Table, Meter, Sparkline, Kbd, Toast,
Tooltip, Input, Select, RailItem. For forms: Field, Label, FieldHelp, FieldError, Textarea,
Checkbox, RadioGroup and FormAlert. For layout: Card (CardHeader, CardTitle, CardDescription,
CardBody, CardFooter, CardSkeleton), Alert and Banner, Avatar, Separator, Accordion. For loading: Skeleton (block, text, circle), SkeletonGroup,
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

## shadcn registry

The same sources ship as a shadcn registry (`registry.json`; built items in `dist/r/`, also in the
npm package under `@hansenexus/ui/registry/*`). Each item depends on `@hansenexus/tokens`, which adds
the token import to your CSS. Point a namespace at wherever `dist/r` is hosted:

```json
{ "registries": { "@hansenexus": "https://<host>/r/{name}.json" } }
```

```sh
bunx shadcn@latest add @hansenexus/button @hansenexus/status-badge
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
loading scene (Skeleton and Spinner), the states and illustrations scenes and each overlay at 390 and 1280 px, dark and light. Pixels depend on the OS and browser build, so
`scripts/screenshots.sh` runs Playwright inside the pinned `mcr.microsoft.com/playwright` image,
the same one CI uses. It needs Docker.

```sh
bun run build                 # tokens dist is needed by the gallery
bun run screenshots           # compare (from packages/ui)
bun run screenshots:update    # rewrite after an intended change; review the PNG diff
bun run gallery -- --serve    # look at it: http://127.0.0.1:4410/gallery/?scene=kit&mode=light
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
