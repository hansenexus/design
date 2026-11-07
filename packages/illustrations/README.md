# @hansenexus/illustrations

The hansenexus illustrations: SVG motifs as React components, in the geometric style the owner
chose (`packages/ui/decisions/illustration-style.json`). Flat filled shapes in tones of
`currentColor`, one token accent each, cut-outs as holes instead of a surface colour, so a motif
sits on any background and follows dark, light and every theme on its own. Two families: the
eight state motifs for the estate tools at the root, and the `school` family for fachwerk.

| Import path | Component | Accent |
| --- | --- | --- |
| `@hansenexus/illustrations/empty` | `EmptyIllustration` | `action.primary` |
| `@hansenexus/illustrations/no-results` | `NoResultsIllustration` | `action.primary` |
| `@hansenexus/illustrations/error` | `ErrorIllustration` | `status.crit` |
| `@hansenexus/illustrations/404` | `NotFoundIllustration` | `action.primary` |
| `@hansenexus/illustrations/offline` | `OfflineIllustration` | `status.warn` |
| `@hansenexus/illustrations/no-permission` | `NoPermissionIllustration` | `status.warn` |
| `@hansenexus/illustrations/success` | `SuccessIllustration` | `status.ok` |
| `@hansenexus/illustrations/maintenance` | `MaintenanceIllustration` | `status.busy` |

### The school family (design#132, rebuilt in design#134)

For fachwerk: the same eight states, drawn for school, and eight domain spots for landing
sections, empty modules and onboarding. Since 0.2.0 the family follows fachwerk's chosen
direction B, "Fachwerk wörtlich" (hansenexus/fachwerk#218): timber framing taken literally.
Straight beams in `currentColor`, posts, rails and 45° braces as the one diagonal, Gefache as
plaster fills of the same ink at 12 % and 28 %, an Andreaskreuz where a cross is needed, no
curve and no round shape, and every motif standing on the family's sill beam. One token accent
per motif from the semantic tier, so the set follows the `fachwerk` theme in every mode; dark
mode is the ink inverted and nothing else. Drawn to read at 96 px in an empty state and at 24 px
in a list row; the gallery's `school` scene shows both sizes.

#### Variants: the recipe engine

A school motif is not a fixed drawing but a composition drawn into a *bay*, and a **recipe**
decides how the bay is built around it (`src/school/variants.ts`). Three axes:

| Axis | Values | What it changes |
| --- | --- | --- |
| `weight` | `4`, `6`, `8` | The beam width in the 160×120 box: a pencil line, the middle, a timber |
| `framing` | `frei`, `gefach`, `haus` | Nothing but the sill; one closed cell to the box edge; walls under a 45° gable |
| `accent` | `gefach`, `strebe`, `none` | Whether the lit Gefach or the accent brace carries the one token colour, or neither |

Named recipes (`SCHOOL_RECIPES`): `gefach-strebe` (the default), `gefach`, `gefach-leicht`,
`gefach-schwer`, `gefach-mono`, `frei`, `haus`, `haus-strebe`. Every school motif takes
`variant`:

```tsx
import { SchoolEmptyIllustration } from "@hansenexus/illustrations/school/empty";
import { SCHOOL_VARIANTS, isSchoolVariant } from "@hansenexus/illustrations/school/variants";

<SchoolEmptyIllustration />                    // DEFAULT_SCHOOL_VARIANT, "gefach-strebe"
<SchoolEmptyIllustration variant="haus" />     // the same composition in a gabled house
```

The rendered `<svg>` carries `data-variant`. Which recipe is the default is a kit decision: the
vote board `packages/ui` → `?scene=vote&category=school-illustration` showed every recipe in an
empty state, an error state, a 24 px list row, a 240 px hero and the whole family at 96 px, and
`packages/ui/decisions/school-illustration.json` records the winner, `gefach-strebe` (design#136);
a kit test holds `DEFAULT_SCHOOL_VARIANT` to it. A new design direction adds a
recipe, not sixteen drawings; a new axis (a second diagonal, a roof pitch) is a change to
`SchoolFrame` in `src/school/frame.tsx` that every motif picks up.

The engine's vocabulary lives in `src/school/frame.tsx`: `SchoolFrame` (builds the bay from the
recipe and hands it to the motif's draw function), `Beam`, `Post`, `Rail`, `Gefach`, `Lit` (the
lit Gefach, painted as the recipe says), `Lattice` (the beams between the cells of a grid),
`Cell` (four beams around a box), `Brace` and `CellBrace` (45°, `accent` for the one that may
carry colour), `Cross` (the Andreaskreuz), `Hatch` (a 45° hairline hatch for an open Gefach), and
the geometry helpers `cells`, `part`, `snap`. `bun test` renders every motif in every recipe and
holds it to the rules: no `circle`, `ellipse`, `polygon` or `polyline`, no `transform`, every
stroke the recipe's beam width or a hatch hairline, every path of absolute `M L H V Z` commands
with each edge horizontal, vertical or at 45°, at least one brace, exactly one token (none in
`gefach-mono`), everything inside the box, and the sill beam last.

| Import path | Component | Accent |
| --- | --- | --- |
| `@hansenexus/illustrations/school/empty` | `SchoolEmptyIllustration` | `action.primary` |
| `@hansenexus/illustrations/school/no-results` | `SchoolNoResultsIllustration` | `action.primary` |
| `@hansenexus/illustrations/school/error` | `SchoolErrorIllustration` | `status.crit` |
| `@hansenexus/illustrations/school/404` | `SchoolNotFoundIllustration` | `action.primary` |
| `@hansenexus/illustrations/school/offline` | `SchoolOfflineIllustration` | `status.warn` |
| `@hansenexus/illustrations/school/no-permission` | `SchoolNoPermissionIllustration` | `status.warn` |
| `@hansenexus/illustrations/school/success` | `SchoolSuccessIllustration` | `status.ok` |
| `@hansenexus/illustrations/school/maintenance` | `SchoolMaintenanceIllustration` | `status.busy` |
| `@hansenexus/illustrations/school/class` | `ClassIllustration` | `action.primary` |
| `@hansenexus/illustrations/school/seating-plan` | `SeatingPlanIllustration` | `action.primary` |
| `@hansenexus/illustrations/school/quiz` | `QuizIllustration` | `action.primary` |
| `@hansenexus/illustrations/school/timetable` | `TimetableIllustration` | `action.primary` |
| `@hansenexus/illustrations/school/vocabulary` | `VocabularyIllustration` | `action.primary` |
| `@hansenexus/illustrations/school/test` | `TestIllustration` | `action.primary` |
| `@hansenexus/illustrations/school/study-group` | `StudyGroupIllustration` | `action.primary` |
| `@hansenexus/illustrations/school/school` | `SchoolIllustration` | `action.primary` |

```sh
bun add @hansenexus/illustrations @hansenexus/tokens react
```

## Use

One import path per motif and no index, so a page ships only the motifs it draws.

```tsx
import { EmptyState, ErrorState } from "@hansenexus/ui";
import { EmptyIllustration } from "@hansenexus/illustrations/empty";
import { ErrorIllustration } from "@hansenexus/illustrations/error";

<EmptyState illustration={<EmptyIllustration />} action={<Button>Add a machine</Button>} />
<ErrorState illustration={<ErrorIllustration />} error={error} onRetry={reset} />
```

- The box is 160 × 120; `width` and `height` scale it (`<EmptyIllustration width={48} height={36} />`).
  Any other SVG attribute passes through.
- Ink comes from `currentColor`: set `color` on an ancestor (the EmptyState/ErrorState slot uses
  `ink.muted`). Accents are `var(--hn-*)`, so load `@hansenexus/tokens` (or `@hansenexus/ui/styles.css`).
- Decorative by default (`aria-hidden`). Give it `aria-label` or `aria-labelledby` and it becomes
  `role="img"` instead.

## Rules the motifs keep

`bun test` (in CI) fails a motif that breaks one:

- Colour only as `none`, `currentColor` or `var(--hn-*)`: no raw values, no gradients, filters,
  `<style>`, `<text>` or raster. The repo ratchet also stays at zero.
- Accents only from the semantic `action.*` and `status.*` tier; a school motif has exactly one
  in every recipe (none in `gefach-mono`), and the school rules above hold for every recipe.
- At most 3 KB gzip each: the rendered SVG, the source and the built `dist/<motif>.js`.
- One file and one `exports` path per motif (`src/<id>.tsx`, `src/school/<id>.tsx`); no barrel.
  The registry is `scripts/motifs.ts`.

Look at them in the kit gallery (`packages/ui`): `bun run gallery -- --serve`, then
`http://127.0.0.1:4410/gallery/?scene=illustrations`, the school family at `?scene=school` and
its recipes side by side at `?scene=vote&category=school-illustration`. The `illustrations`,
`school` and `states` scenes have screenshot baselines at 390 and 1280 px, dark and light.

## Release

Push an `illustrations-v<version>` tag matching `package.json`. The `release-illustrations`
workflow builds, runs the contrast check and the tests, and publishes to npm with provenance over
OIDC trusted publishing.

## Licence

MIT.
