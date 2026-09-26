// Fixture apps are written to a scratch directory per test, so the fake Next.js code never meets
// the repo's lint, typecheck or raw-palette ratchet.
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { check, emptyBaseline, readBaseline, toBaseline } from "../src";

const CLI = resolve(import.meta.dir, "../src/cli.ts");

function app(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "hn-state-check-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

function run(dir: string, ...args: string[]) {
  const p = Bun.spawnSync(["bun", CLI, "--app", dir, ...args], { cwd: dir });
  return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString() };
}

const violations = (dir: string, authHelpers?: string[]) =>
  check(dir, emptyBaseline(), { authHelpers }).new.map((v) => `${v.file}:${v.line}`);

const STATIC = `export default function Page() {\n  return <h1>Hi</h1>;\n}\n`;
const AWAITS = `export default async function Page() {\n  const posts = await getPosts();\n  return <ul>{posts.length}</ul>;\n}\n`;
const PARAM = `export default function Post({ params }: { params: { slug: string } }) {\n  return <h1>{params.slug}</h1>;\n}\n`;
const SUSPENSE = `import { Suspense } from "react";\nexport default async function Post({ params }) {\n  const { slug } = await params;\n  return (\n    <Suspense fallback={<p>…</p>}>\n      <Body slug={slug} />\n    </Suspense>\n  );\n}\n`;

describe("next-route: what is dynamic", () => {
  test("a static RSC page is exempt", () => {
    const dir = app({ "app/page.tsx": STATIC, "app/about/page.tsx": STATIC });
    const r = check(dir, emptyBaseline());
    expect(r.ok).toBe(true);
    expect(r.stats).toMatchObject({ pages: 2, dynamic: 0 });
  });

  test("a [param] directory makes the segment dynamic", () => {
    expect(violations(app({ "app/blog/[slug]/page.tsx": PARAM }))).toEqual([
      "app/blog/[slug]/page.tsx:1",
    ]);
    expect(violations(app({ "src/app/docs/[...path]/page.tsx": PARAM }))).toEqual([
      "src/app/docs/[...path]/page.tsx:1",
    ]);
    expect(violations(app({ "app/shop/[[...rest]]/page.tsx": PARAM }))).toHaveLength(1);
  });

  test("a [param] prerendered by generateStaticParams is static", () => {
    const gsp = `export function generateStaticParams() {\n  return [{ locale: "de" }];\n}\n`;
    const awaitsParams = `export default async function Page({ params }) {\n  const { locale } = await params;\n  return <h1>{locale}</h1>;\n}\n`;
    // In a layout of the segment (next-intl's [locale]), for every page below it.
    const viaLayout = app({
      "src/app/[locale]/layout.tsx": gsp,
      "src/app/[locale]/(marketing)/impressum/page.tsx": awaitsParams,
    });
    expect(check(viaLayout, emptyBaseline()).stats).toMatchObject({ pages: 1, dynamic: 0 });
    // In the page itself.
    const viaPage = app({ "app/blog/[slug]/page.tsx": `${gsp}${PARAM}` });
    expect(violations(viaPage)).toEqual([]);
    // A layout above the param segment does not generate it.
    const above = app({ "app/layout.tsx": gsp, "app/[id]/page.tsx": PARAM });
    expect(violations(above)).toEqual(["app/[id]/page.tsx:1"]);
    // Nor does one param's generator cover another param further down.
    const nested = app({ "app/[locale]/layout.tsx": gsp, "app/[locale]/p/[id]/page.tsx": PARAM });
    expect(check(nested, emptyBaseline()).new[0]?.message).toContain("[id] segment");
  });

  test("await searchParams makes a page dynamic, await params alone does not", () => {
    const search = `export default async function Page({ searchParams }) {\n  const { q } = await searchParams;\n  return <p>{q}</p>;\n}\n`;
    expect(violations(app({ "app/search/page.tsx": search }))).toEqual(["app/search/page.tsx:1"]);
  });

  test("an await in the page makes it dynamic, and is reported with file:line", () => {
    const dir = app({ "app/news/page.tsx": `// news\n\n${AWAITS}` });
    const [v] = check(dir, emptyBaseline()).new;
    expect(v).toMatchObject({ rule: "next-route", file: "app/news/page.tsx", line: 3 });
    expect(v?.message).toContain("await (line 4)");
  });

  test("an await at module top level makes it dynamic", () => {
    const src = `const data = await load();\nexport default function Page() {\n  return <p>{data}</p>;\n}\n`;
    expect(violations(app({ "app/page.tsx": src }))).toEqual(["app/page.tsx:2"]);
  });

  test("a same-file helper that reads cookies() makes the page dynamic", () => {
    const src = `async function getUser() {\n  const c = await cookies();\n  return c.get("u");\n}\nexport default function Page() {\n  const u = getUser();\n  return <p>{String(u)}</p>;\n}\n`;
    const [v] = check(app({ "app/me/page.tsx": src }), emptyBaseline()).new;
    expect(v?.message).toContain("cookies() (line 2)");
  });

  test("cookies(), headers() and auth helpers make it dynamic", () => {
    const cookie = `import { cookies } from "next/headers";\nexport default function Page() {\n  const c = cookies();\n  return <p>{c.size}</p>;\n}\n`;
    const header = `export default function Page() {\n  return <p>{String(headers())}</p>;\n}\n`;
    const session = `export default function Page() {\n  const s = getServerSession();\n  return <p>{String(s)}</p>;\n}\n`;
    const custom = `export default function Page() {\n  const s = requirePageSession();\n  return <p>{String(s)}</p>;\n}\n`;
    expect(violations(app({ "app/a/page.tsx": cookie }))).toHaveLength(1);
    expect(violations(app({ "app/b/page.tsx": header }))).toHaveLength(1);
    expect(violations(app({ "app/c/page.tsx": session }))).toHaveLength(1);
    expect(violations(app({ "app/d/page.tsx": custom }))).toHaveLength(0);
    expect(violations(app({ "app/d/page.tsx": custom }), ["requirePageSession"])).toHaveLength(1);
  });

  test('export const dynamic = "force-dynamic" makes it dynamic', () => {
    const src = `export const dynamic = "force-dynamic";\n${STATIC}`;
    expect(violations(app({ "app/page.tsx": src }))).toEqual(["app/page.tsx:2"]);
    const other = `export const dynamic = "force-static";\n${STATIC}`;
    expect(violations(app({ "app/page.tsx": other }))).toEqual([]);
  });

  test("route groups and parallel slots are transparent, private folders are not routes", () => {
    const dir = app({
      "app/(marketing)/page.tsx": STATIC,
      "app/@modal/page.tsx": STATIC,
      "app/_components/page.tsx": AWAITS,
    });
    const r = check(dir, emptyBaseline());
    expect(r.ok).toBe(true);
    expect(r.stats.pages).toBe(2);
  });

  test("arrow and named default exports are found", () => {
    const arrow = `export default async () => {\n  await x();\n  return null;\n};\n`;
    const named = `const Page = async () => {\n  await x();\n  return null;\n};\nexport default Page;\n`;
    expect(violations(app({ "app/page.tsx": arrow }))).toEqual(["app/page.tsx:1"]);
    expect(violations(app({ "app/page.tsx": named }))).toEqual(["app/page.tsx:5"]);
  });
});

describe("next-route: what covers it", () => {
  test("a loading.tsx in the segment covers it", () => {
    const dir = app({ "app/blog/[slug]/page.tsx": PARAM, "app/blog/[slug]/loading.tsx": STATIC });
    expect(check(dir, emptyBaseline()).stats).toMatchObject({ dynamic: 1, covered: 1 });
  });

  test("a loading.tsx in an ancestor segment covers it", () => {
    const dir = app({
      "src/app/(site)/loading.tsx": STATIC,
      "src/app/(site)/blog/[slug]/page.tsx": AWAITS,
    });
    expect(check(dir, emptyBaseline()).ok).toBe(true);
  });

  test("a loading.tsx in a sibling segment does not", () => {
    const dir = app({ "app/news/loading.tsx": STATIC, "app/blog/page.tsx": AWAITS });
    expect(violations(dir)).toEqual(["app/blog/page.tsx:1"]);
  });

  test("a <Suspense> around the async child in the page covers it", () => {
    expect(violations(app({ "app/blog/[slug]/page.tsx": SUSPENSE }))).toEqual([]);
    const ns = SUSPENSE.replace(
      'import { Suspense } from "react";',
      'import * as React from "react";'
    )
      .replaceAll("<Suspense", "<React.Suspense")
      .replace("</Suspense>", "</React.Suspense>");
    expect(violations(app({ "app/blog/[slug]/page.tsx": ns }))).toEqual([]);
  });

  test("a <Suspense> cannot cover an await in the page's own body", () => {
    const src = `import { Suspense } from "react";\nexport default async function Page() {\n  const data = await getData();\n  return <Suspense fallback={null}><List data={data} /></Suspense>;\n}\n`;
    const [v] = check(app({ "app/page.tsx": src }), emptyBaseline()).new;
    expect(v?.message).toContain("cannot cover it; add a loading.tsx");
  });

  test("the check does not care which library renders the loading state", () => {
    const bauhaus = `import { BauhausSkeleton } from "@/components/bauhaus";\nexport default function Loading() {\n  return <BauhausSkeleton />;\n}\n`;
    const dir = app({ "app/[id]/page.tsx": PARAM, "app/[id]/loading.tsx": bauhaus });
    expect(check(dir, emptyBaseline()).ok).toBe(true);
  });
});

describe("state-coverage-ignore", () => {
  test("a reasoned opt-out suppresses and is counted", () => {
    const src = `// state-coverage-ignore: renders from a static JSON import, no fetch\n${PARAM}`;
    const r = check(app({ "app/[id]/page.tsx": src }), emptyBaseline());
    expect(r.ok).toBe(true);
    expect(r.ignored).toHaveLength(1);
    expect(r.ignored[0]?.reason).toBe("renders from a static JSON import, no fetch");
    expect(r.stats.ignored).toBe(1);
  });

  test("an opt-out without a reason fails", () => {
    for (const bare of [
      "// state-coverage-ignore",
      "// state-coverage-ignore:",
      "// state-coverage-ignore:   ",
    ]) {
      const r = check(app({ "app/[id]/page.tsx": `${bare}\n${PARAM}` }), emptyBaseline());
      expect(r.ok).toBe(false);
      expect(r.invalidIgnores).toEqual([{ file: "app/[id]/page.tsx", line: 1, reason: "" }]);
      expect(r.new).toHaveLength(1);
    }
  });

  test("an opt-out two lines above does not reach", () => {
    const src = `// state-coverage-ignore: too far away\n\n${PARAM}`;
    expect(violations(app({ "app/[id]/page.tsx": src }))).toHaveLength(1);
  });
});

describe("baseline", () => {
  const files = { "app/a/[id]/page.tsx": PARAM, "app/b/page.tsx": AWAITS };

  test("listed violations pass, a new one fails", () => {
    const dir = app(files);
    const baseline = toBaseline(check(dir, emptyBaseline()).all);
    expect(baseline.violations["next-route"]).toEqual({
      "app/a/[id]/page.tsx": 1,
      "app/b/page.tsx": 1,
    });
    expect(check(dir, baseline)).toMatchObject({ ok: true, new: [] });

    mkdirSync(join(dir, "app/c/[slug]"), { recursive: true });
    writeFileSync(join(dir, "app/c/[slug]/page.tsx"), PARAM);
    const r = check(dir, baseline);
    expect(r.ok).toBe(false);
    expect(r.new.map((v) => v.file)).toEqual(["app/c/[slug]/page.tsx"]);
    expect(r.baselined).toHaveLength(2);
  });

  test("a removed violation passes and asks to shrink", () => {
    const dir = app(files);
    const baseline = toBaseline(check(dir, emptyBaseline()).all);
    writeFileSync(join(dir, "app/b/loading.tsx"), STATIC);
    const r = check(dir, baseline);
    expect(r.ok).toBe(true);
    expect(r.shrink).toEqual([
      { rule: "next-route", file: "app/b/page.tsx", count: 0, allowed: 1 },
    ]);
  });
});

describe("cli", () => {
  test("fails with file:line on a new violation, passes after --update-baseline", () => {
    const dir = app({ "app/blog/[slug]/page.tsx": PARAM });
    const fail = run(dir);
    expect(fail.code).toBe(1);
    expect(fail.err).toContain("FAIL app/blog/[slug]/page.tsx:1 next-route:");

    const update = run(dir, "--update-baseline");
    expect(update.code).toBe(0);
    const baseline = readBaseline(join(dir, "state-coverage.baseline.json"));
    expect(baseline.violations["next-route"]).toEqual({ "app/blog/[slug]/page.tsx": 1 });
    expect(run(dir).code).toBe(0);
  });

  test("prints 'shrink the baseline' when a violation is gone", () => {
    const dir = app({ "app/blog/[slug]/page.tsx": PARAM });
    run(dir, "--update-baseline");
    writeFileSync(join(dir, "app/blog/[slug]/loading.tsx"), STATIC);
    const r = run(dir);
    expect(r.code).toBe(0);
    expect(r.out).toContain("shrink the baseline");
  });

  test("--baseline and --json", () => {
    const dir = app({ "app/[id]/page.tsx": `// state-coverage-ignore: fixture\n${PARAM}` });
    const r = run(dir, "--baseline", join(dir, "custom.json"), "--json");
    expect(r.code).toBe(0);
    const report = JSON.parse(r.out);
    expect(report).toMatchObject({ ok: true, rules: ["next-route"], new: [], shrink: [] });
    expect(report.ignored[0].reason).toBe("fixture");
    expect(report.stats).toMatchObject({ pages: 1, dynamic: 1, ignored: 1 });
  });

  test("usage errors exit 2", () => {
    expect(Bun.spawnSync(["bun", CLI]).exitCode).toBe(2);
    expect(Bun.spawnSync(["bun", CLI, "--app", "/nonexistent/app"]).exitCode).toBe(2);
    const dir = app({ "state-coverage.baseline.json": "[]" });
    expect(run(dir).code).toBe(2);
  });

  test("the written baseline is stable JSON", () => {
    const dir = app({ "app/[id]/page.tsx": PARAM });
    run(dir, "--update-baseline");
    expect(readFileSync(join(dir, "state-coverage.baseline.json"), "utf8")).toBe(
      `{\n  "version": 1,\n  "violations": {\n    "next-route": {\n      "app/[id]/page.tsx": 1\n    }\n  }\n}\n`
    );
  });
});
