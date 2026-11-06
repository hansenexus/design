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

### The school family (design#132)

For fachwerk: the same eight states, drawn with school subject matter, and eight domain spots for
landing sections, empty modules and onboarding. One accent each from the semantic tier, so the set
follows the `fachwerk` theme in every mode. This is the first pass in the neutral geometric style;
fachwerk is voting between four directions (hansenexus/fachwerk#218), and the set gets a restyle
pass once the winner is known.

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
- Accents only from the semantic `action.*` and `status.*` tier; a school motif has exactly one.
- At most 3 KB gzip each: the rendered SVG, the source and the built `dist/<motif>.js`.
- One file and one `exports` path per motif (`src/<id>.tsx`, `src/school/<id>.tsx`); no barrel.
  The registry is `scripts/motifs.ts`.

Look at them in the kit gallery (`packages/ui`): `bun run gallery -- --serve`, then
`http://127.0.0.1:4410/gallery/?scene=illustrations`, the school family at `?scene=school`. The
`illustrations`, `school` and `states` scenes have screenshot baselines at 390 and 1280 px, dark
and light.

## Release

Push an `illustrations-v<version>` tag matching `package.json`. The `release-illustrations`
workflow builds, runs the contrast check and the tests, and publishes to npm with provenance over
OIDC trusted publishing.

## Licence

MIT.
