# @hansenexus/state-check

The hansenexus frontend state contract as a deterministic check. v0 knows one rule, `next-route`:
a dynamic Next.js App Router segment must be covered by a `loading.tsx` or a `<Suspense>`
boundary. It runs as a ratchet: a per-app baseline lists the violations that already exist, a new
one fails CI.

The check is primitive-agnostic. It verifies that a loading state exists, never which library
renders it, so an app on Bauhaus skeletons passes the same way as one on `@hansenexus/ui`.

## Install

Until the npm trusted publisher is attached (design#6), install the release tarball:

```sh
bun add -d https://github.com/hansenexus/design/releases/download/state-check-v0.1.0/hansenexus-state-check-0.1.0.tgz
```

## Use

```sh
state-check --app apps/hansenexus                     # CI: fails on violations beyond the baseline
state-check --app apps/hansenexus --update-baseline   # rewrite the baseline to the current state
state-check --app apps/hansenexus --json              # machine-readable report
```

| Flag | |
| --- | --- |
| `--app <dir>` | the Next.js app; its router is `<dir>/src/app` or `<dir>/app` |
| `--baseline <file>` | default `<app>/state-coverage.baseline.json`; a missing file is an empty baseline |
| `--json` | print the report as JSON (`ok`, `stats`, `new`, `baselined`, `shrink`, `ignored`, `invalidIgnores`) |
| `--update-baseline` | rewrite the baseline to the current violations |
| `--auth-helper <name>` | a call that reads the session, on top of the built-in list; repeatable |

Exit 0 when nothing is beyond the baseline, 1 on a new violation or an ignore without a reason,
2 on bad usage or an unreadable baseline.

## The rule: `next-route`

Every routable `page.{tsx,jsx,ts,js}` under the router is classified. Route groups `(group)` and
parallel slots `@slot` are transparent; `_private` folders are not routes.

A page is **dynamic** when any of these holds:

- a `[param]`, `[...param]` or `[[...param]]` directory in its path, unless the page or a layout at
  or below that segment exports `generateStaticParams` (those params are prerendered at build time,
  as next-intl's `[locale]` is);
- an `await` in the default-exported page component or at module top level (`await params` only
  unwraps the route input and does not count; `await searchParams` does);
- a call to `cookies()`, `headers()`, `draftMode()`, `connection()` or an auth helper (`auth`,
  `currentUser`, `getServerSession`, `convexAuthNextjsToken`, `isAuthenticatedNextjs`, plus
  `--auth-helper`), in the page or in a same-file function it calls;
- `export const dynamic = "force-dynamic"`.

Static RSC pages have none of these and are exempt.

A dynamic page is **covered** by a `loading.*` in its segment or any ancestor segment, or by a
`<Suspense>` (or `<React.Suspense>`) in the page file. A `<Suspense>` only covers work below it: when
the page component itself awaits data or reads the request in its own body, only a `loading.tsx`
covers it.

Limits in v0: helpers are followed within the page file only, and any `<Suspense>` in the page file
counts as covering its async children.

## Opting out

```tsx
// state-coverage-ignore: renders a static JSON import, nothing to wait for
export default function Page({ params }: Props) {
```

The directive covers a violation on its own line or the line below; a route violation is reported on
the `export default` line. The reason is mandatory: `// state-coverage-ignore` without one fails
and cannot be baselined. Every suppression is listed and counted in the report.

## Baseline

`state-coverage.baseline.json` holds allowed counts per rule and file, not lines, so moving code
around does not fail CI:

```json
{
  "version": 1,
  "violations": {
    "next-route": { "src/app/[locale]/blog/[slug]/page.tsx": 1 }
  }
}
```

A file over its count fails with `file:line`. A file under it passes and prints `shrink the
baseline`; run `--update-baseline` and commit the smaller file.

## Library

```ts
import { check, readBaseline } from "@hansenexus/state-check";
const report = check("apps/hansenexus", readBaseline("apps/hansenexus/state-coverage.baseline.json"));
```

Rules implement `Rule` (`id`, `description`, `check(ctx) → { violations, stats }`) and are listed in
`RULES`; later rule sets (Convex queries, pending actions) plug in as opt-ins.

## Release

Push a `state-check-v<version>` tag matching `package.json`. The `release-state-check` workflow
runs the tests, packs the tarball and attaches it to a GitHub release.
