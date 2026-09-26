# @hansenexus/state-check

The hansenexus frontend state contract as a deterministic check. Three rule sets:

| Rule | Default | |
| --- | --- | --- |
| `next-route` | on | a dynamic Next.js App Router segment is covered by a `loading.tsx` or a `<Suspense>` |
| `convex-query` | opt-in | a Convex `useQuery` result is rendered with its `undefined` (loading) branch |
| `pending-action` | opt-in | a form action, submit handler or mutation button shows that it is pending |

It runs as a ratchet: a per-app baseline lists the violations that already exist, a new one fails
CI.

The check is primitive-agnostic. It verifies that a loading state exists, never which library
renders it, so an app on Bauhaus skeletons passes the same way as one on `@hansenexus/ui`.

## Install

Until the npm trusted publisher is attached (design#6), install the release tarball:

```sh
bun add -d https://github.com/hansenexus/design/releases/download/state-check-v0.2.0/hansenexus-state-check-0.2.0.tgz
```

## Use

```sh
state-check --app apps/hansenexus                     # CI: fails on violations beyond the baseline
state-check --app apps/hansenexus --update-baseline   # rewrite the baseline to the current state
state-check --app apps/hansenexus --json              # machine-readable report
```

| Flag | |
| --- | --- |
| `--app <dir>` | the app; for `next-route` its router is `<dir>/src/app` or `<dir>/app` |
| `--config <file>` | rule sets and options (default: see [Config](#config)) |
| `--baseline <file>` | default `<app>/state-coverage.baseline.json`; a missing file is an empty baseline |
| `--json` | print the report as JSON (`ok`, `stats`, `new`, `baselined`, `shrink`, `ignored`, `invalidIgnores`) |
| `--update-baseline` | rewrite the baseline to the current violations |
| `--auth-helper <name>` | a call that reads the session, on top of the built-in list; repeatable |

Exit 0 when nothing is beyond the baseline, 1 on a new violation or an ignore without a reason,
2 on bad usage or an unreadable baseline or config.

## Config

`state-check.config.json` in the app, or else a `"state-check"` key in the app's `package.json`
(both at once is an error). Without either, only `next-route` runs.

```json
{
  "rules": { "next-route": false, "convex-query": true, "pending-action": true },
  "authHelpers": ["requirePageSession"],
  "queryWrappers": ["BauhausQuery"],
  "mutationHooks": ["useSaveDraft"],
  "pendingComponents": ["SubmitButton"]
}
```

`rules` overrides the defaults per rule; a Vite app such as kommandant turns `next-route` off and the
other two on. The lists add to each rule's built-ins: `authHelpers` for `next-route` (the
`--auth-helper` flag adds more), `queryWrappers` for `convex-query`, `mutationHooks` and
`pendingComponents` for `pending-action`. An unknown rule or key exits 2.

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

Limits: helpers are followed within the page file only, and any `<Suspense>` in the page file
counts as covering its async children.

## The rule: `convex-query` (opt-in)

Every `useQuery` imported from Convex (`convex/react`, `convex-helpers/react…`; aliases and
`import * as` included) is checked in every script file of the app except tests and stories. Its
result is handled when, somewhere in the function that holds it:

- it is compared with `undefined` or `null` (`posts === undefined`, `posts != null`, `typeof`);
- it is a condition: `if (posts)`, `if (!posts)`, `posts ? … : …`, `posts && …`;
- it goes to `<QueryState query={posts}>` (or a `queryWrappers` component) or `queryStatus(posts)`;
- a custom hook (`use…`) returns it, which hands the branch to the hook's caller.

A fallback is not a loading branch: `posts ?? []`, `posts || []` and `posts?.length` show the empty
state while the query is still loading, and fail. Destructuring the result (`const { a } =
useQuery(…)`) throws while loading and always fails. The violation is reported on the declaration.

Limits: a guard counts wherever it is in the function, shadowed names are not told apart, and a
custom hook's callers are not followed.

## The rule: `pending-action` (opt-in)

What starts a write:

- `<form action={…}>` with an expression (a server action or a function; a URL string is a native
  navigation and exempt), or `formAction={…}` on any element;
- `<form onSubmit={…}>` whose handler is async, awaits, calls `fetch` or triggers a mutation;
- `onClick={…}` on any element whose handler triggers a mutation.

A mutation is a call to what `useMutation` or `useAction` (plus `mutationHooks`) returned: `save()`,
`m.mutate()`, a destructured `mutate()`. So is a server action imported from a `"use server"`
module of the app (relative, `@/` or `~/` imports). Handlers are followed through same-file
functions, `useCallback` and wrappers like `handleSubmit(onValid)`.

What shows it, anywhere inside the element (the whole form for a form):

- a `pending`, `isPending`, `loading`, `isLoading` or `aria-busy` prop;
- `disabled={…}` reading a pending-like name (pending, loading, submitting, saving, busy, …);
  `disabled={!valid}` does not count;
- a `{…}` child reading one (`{isPending ? "Saving…" : "Save"}`);
- a component that calls `useFormStatus` anywhere in the app, or one of `pendingComponents`.

The violation is reported on the element. Limits: the pending name is matched by spelling, not
traced to `useTransition` or `useFormStatus`, and a handler imported from another file is not
followed.

## Opting out

```tsx
// state-coverage-ignore: renders a static JSON import, nothing to wait for
export default function Page({ params }: Props) {
```

In JSX, write it as `{/* state-coverage-ignore: <reason> */}` above the element. The directive covers
a violation on its own line or the line below; a route violation is reported on the `export
default` line. The reason is mandatory: `// state-coverage-ignore` without one fails
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
import { check, readBaseline, readConfig } from "@hansenexus/state-check";
const app = "apps/hansenexus";
const { rules, options } = readConfig(app);
const report = check(app, readBaseline(`${app}/state-coverage.baseline.json`), { ...options, rules });
```

Rules implement `Rule` (`id`, `description`, `check(ctx) → { violations, stats }`) and are listed in
`RULES`; `DEFAULT_RULES` holds the ones that run without a config.

## Release

Push a `state-check-v<version>` tag matching `package.json`. The `release-state-check` workflow
runs the tests, packs the tarball and attaches it to a GitHub release.
