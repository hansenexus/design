import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { check, emptyBaseline, readBaseline, readConfig } from "../src";
import { app, run } from "./fixture";

const at = (dir: string, rule: string) =>
  check(dir, emptyBaseline(), { rules: [rule] }).new.map((v) => `${v.file}:${v.line}`);

// ---------------------------------------------------------------------------------------------
// convex-query

const IMPORT = `import { useQuery } from "convex/react";\nimport { api } from "../convex/_generated/api";\n`;
const component = (body: string, head = IMPORT) => `${head}export function Posts() {\n${body}\n}\n`;
const queries = (files: Record<string, string>) => at(app(files), "convex-query");

describe("convex-query: violations", () => {
  test("a result rendered straight away is a violation, reported on its declaration", () => {
    const src = component(
      "  const posts = useQuery(api.posts.list);\n  return <ul>{posts.map((p) => <li key={p._id}>{p.title}</li>)}</ul>;"
    );
    const r = check(app({ "src/posts.tsx": src }), emptyBaseline(), { rules: ["convex-query"] });
    expect(r.new.map((v) => `${v.file}:${v.line}`)).toEqual(["src/posts.tsx:4"]);
    expect(r.new[0]?.message).toContain('"posts" is used without its loading branch');
    expect(r.stats).toMatchObject({ queries: 1, handled: 0 });
  });

  test("a fallback is not a loading branch: ?? [], || [] and ?.", () => {
    for (const use of ["(posts ?? [])", "(posts || [])", "posts?"]) {
      const src = component(
        `  const posts = useQuery(api.posts.list);\n  return <ul>{${use}.map((p) => <li key={p._id}>{p.title}</li>)}</ul>;`
      );
      expect(queries({ "src/posts.tsx": src })).toEqual(["src/posts.tsx:4"]);
    }
    // `posts?.length ? … : <Empty />` shows the empty state while loading.
    const empty = component(
      "  const posts = useQuery(api.posts.list);\n  return posts?.length ? <List posts={posts} /> : <Empty />;"
    );
    expect(queries({ "src/posts.tsx": empty })).toHaveLength(1);
  });

  test("destructuring the result always fails", () => {
    const src = component(
      "  const { page } = useQuery(api.posts.paged) ?? {};\n  const [first] = useQuery(api.posts.list);\n  return <p>{String(page)}{String(first)}</p>;"
    );
    const r = check(app({ "src/posts.tsx": src }), emptyBaseline(), { rules: ["convex-query"] });
    // `?? {}` is a fallback too, so both lines fail; the second as a destructure.
    expect(r.new.map((v) => v.line)).toEqual([4, 5]);
    expect(r.new[1]?.message).toContain("destructured");
  });

  test("an inline result is a violation", () => {
    const src = component("  return <List posts={useQuery(api.posts.list)} />;");
    expect(queries({ "src/posts.tsx": src })).toEqual(["src/posts.tsx:4"]);
  });

  test("aliased and namespace imports are tracked", () => {
    const alias = component(
      "  const posts = useConvexQuery(api.posts.list);\n  return <List posts={posts} />;",
      `import { useQuery as useConvexQuery } from "convex/react";\n\n`
    );
    const ns = component(
      "  const posts = C.useQuery(api.posts.list);\n  return <List posts={posts} />;",
      `import * as C from "convex/react";\n\n`
    );
    const helpers = component(
      "  const posts = useQuery(api.posts.list);\n  return <List posts={posts} />;",
      `import { useQuery } from "convex-helpers/react/cache";\n\n`
    );
    expect(queries({ "a.tsx": alias, "b.tsx": ns, "c.tsx": helpers })).toEqual([
      "a.tsx:4",
      "b.tsx:4",
      "c.tsx:4",
    ]);
  });
});

describe("convex-query: false positives", () => {
  test("an explicit undefined branch handles it", () => {
    for (const guard of [
      "if (posts === undefined) return <Skeleton />;",
      "if (undefined === posts) return <Skeleton />;",
      "if (posts == null) return <Skeleton />;",
      'if (typeof posts === "undefined") return <Skeleton />;',
      "if (!posts) return <Skeleton />;",
    ]) {
      const src = component(
        `  const posts = useQuery(api.posts.list);\n  ${guard}\n  return <List posts={posts} />;`
      );
      expect(queries({ "src/posts.tsx": src })).toEqual([]);
    }
  });

  test("a condition handles it: ternary, && and a compound condition", () => {
    for (const ret of [
      "posts ? <List posts={posts} /> : <Skeleton />",
      "posts === undefined ? <Skeleton /> : <List posts={posts} />",
      "<div>{posts && <List posts={posts} />}</div>",
      "ready && posts ? <List posts={posts} /> : null",
    ]) {
      const src = component(
        `  const ready = true;\n  const posts = useQuery(api.posts.list);\n  return ${ret};`
      );
      expect(queries({ "src/posts.tsx": src })).toEqual([]);
    }
  });

  test("<QueryState>, queryStatus() and a configured wrapper handle it", () => {
    const qs = component(
      "  const posts = useQuery(api.posts.list);\n  return <QueryState query={posts}>{(p) => <List posts={p} />}</QueryState>;"
    );
    const status = component(
      '  const posts = useQuery(api.posts.list);\n  const s = queryStatus(posts);\n  return s === "data" ? <List posts={posts} /> : null;'
    );
    const wrapper = component(
      "  const posts = useQuery(api.posts.list);\n  return <BauhausQuery data={posts} render={(p) => <List posts={p} />} />;"
    );
    const dir = app({ "a.tsx": qs, "b.tsx": status, "c.tsx": wrapper });
    const r = check(dir, emptyBaseline(), {
      rules: ["convex-query"],
      queryWrappers: ["BauhausQuery"],
    });
    expect(r.new).toEqual([]);
    expect(r.stats).toMatchObject({ queries: 3, handled: 3 });
    expect(queries({ "c.tsx": wrapper })).toEqual(["c.tsx:4"]);
  });

  test("a custom hook that returns the result hands the branch to its caller", () => {
    const hook = `${IMPORT}export function usePosts() {\n  const posts = useQuery(api.posts.list);\n  return posts;\n}\nexport const useDrafts = () => useQuery(api.posts.drafts);\n`;
    expect(queries({ "src/hooks.ts": hook })).toEqual([]);
    // Returning it from a component is rendering it.
    const comp = `${IMPORT}export function Posts() {\n  return useQuery(api.posts.list);\n}\n`;
    expect(queries({ "src/posts.tsx": comp })).toEqual(["src/posts.tsx:4"]);
  });

  test("useQuery from another library is not Convex's", () => {
    const rq = component(
      "  const { data } = useQuery({ queryKey: ['p'] });\n  return <List posts={data} />;",
      `import { useQuery } from "@tanstack/react-query";\n\n`
    );
    expect(queries({ "src/posts.tsx": rq })).toEqual([]);
  });

  test("an unused or discarded result, tests and stories are ignored", () => {
    const unused = component(
      "  useQuery(api.posts.list);\n  const x = useQuery(api.a.b);\n  return null;"
    );
    const bad = component(
      "  const posts = useQuery(api.posts.list);\n  return <List posts={posts} />;"
    );
    expect(
      queries({ "a.tsx": unused, "a.test.tsx": bad, "a.stories.tsx": bad, "__tests__/b.tsx": bad })
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
// pending-action

const actions = (files: Record<string, string>, pendingComponents?: string[]) =>
  check(app(files), emptyBaseline(), { rules: ["pending-action"], pendingComponents }).new.map(
    (v) => `${v.file}:${v.line}`
  );

const SERVER = `"use server";\nexport async function save(form: FormData) {\n  await db.insert(form);\n}\n`;

describe("pending-action: violations", () => {
  test("a form with a server action and a plain submit button", () => {
    const src = `import { save } from "./actions";\nexport function F() {\n  return (\n    <form action={save}>\n      <button type="submit">Save</button>\n    </form>\n  );\n}\n`;
    const r = check(app({ "app/f/form.tsx": src, "app/f/actions.ts": SERVER }), emptyBaseline(), {
      rules: ["pending-action"],
    });
    expect(r.new.map((v) => `${v.file}:${v.line}`)).toEqual(["app/f/form.tsx:4"]);
    expect(r.new[0]?.message).toContain("form action without a pending indicator");
    expect(r.stats).toMatchObject({ actions: 1, pending: 0 });
  });

  test("a button whose onClick calls a Convex mutation, inline or through a local handler", () => {
    const inline = `export function B() {\n  const remove = useMutation(api.posts.remove);\n  return <Button onClick={() => void remove({ id })}>Delete</Button>;\n}\n`;
    const handler = `export function B() {\n  const remove = useMutation(api.posts.remove);\n  const onDelete = useCallback(async () => {\n    await remove({ id });\n  }, [remove]);\n  return <button onClick={onDelete}>Delete</button>;\n}\n`;
    const direct = `export function B() {\n  const run = useAction(api.ai.run);\n  return <button onClick={run}>Go</button>;\n}\n`;
    expect(actions({ "a.tsx": inline, "b.tsx": handler, "c.tsx": direct })).toEqual([
      "a.tsx:3",
      "b.tsx:6",
      "c.tsx:3",
    ]);
  });

  test("react-query style m.mutate() and a destructured mutate()", () => {
    const obj = `export function B() {\n  const m = useMutation({ mutationFn: del });\n  return <button onClick={() => m.mutate(id)}>Delete</button>;\n}\n`;
    const destr = `export function B() {\n  const { mutate } = useMutation({ mutationFn: del });\n  return <button onClick={() => mutate(id)}>Delete</button>;\n}\n`;
    expect(actions({ "a.tsx": obj, "b.tsx": destr })).toEqual(["a.tsx:3", "b.tsx:3"]);
  });

  test("an onClick calling an imported server action (@/ alias), and formAction", () => {
    const click = `import { save } from "@/lib/actions";\nexport function B() {\n  return <button onClick={() => save(data)}>Save</button>;\n}\n`;
    const formAction = `import { save } from "@/lib/actions";\nexport function B() {\n  return <form><button formAction={save}>Save</button></form>;\n}\n`;
    expect(
      actions({ "src/lib/actions.ts": SERVER, "src/a.tsx": click, "src/b.tsx": formAction })
    ).toEqual(["src/a.tsx:3", "src/b.tsx:3"]);
  });

  test("an async onSubmit, also through handleSubmit(onValid)", () => {
    const async = `export function F() {\n  async function onSubmit(e) {\n    e.preventDefault();\n    await fetch("/api", { method: "POST" });\n  }\n  return <form onSubmit={onSubmit}><button>Send</button></form>;\n}\n`;
    const rhf = `export function F() {\n  const create = useMutation(api.posts.create);\n  const onValid = (v) => create(v);\n  return <form onSubmit={handleSubmit(onValid)}><button>Send</button></form>;\n}\n`;
    expect(actions({ "a.tsx": async, "b.tsx": rhf })).toEqual(["a.tsx:6", "b.tsx:4"]);
  });

  test("disabled that does not track the write is not a pending indicator", () => {
    const src = `export function F({ valid }) {\n  const save = useMutation(api.posts.save);\n  return <button disabled={!valid} onClick={() => save({})}>Save</button>;\n}\n`;
    expect(actions({ "a.tsx": src })).toEqual(["a.tsx:3"]);
  });
});

describe("pending-action: false positives", () => {
  test("a submit button that calls useFormStatus, found in another file", () => {
    const button = `"use client";\nimport { useFormStatus } from "react-dom";\nexport function SubmitButton({ children }) {\n  const { pending } = useFormStatus();\n  return <button disabled={pending}>{children}</button>;\n}\n`;
    const form = `import { save } from "./actions";\nimport { SubmitButton } from "./submit";\nexport function F() {\n  return <form action={save}><SubmitButton>Save</SubmitButton></form>;\n}\n`;
    expect(
      actions({ "app/submit.tsx": button, "app/form.tsx": form, "app/actions.ts": SERVER })
    ).toEqual([]);
  });

  test("a configured pending component (e.g. from a package)", () => {
    const form = `import { SubmitButton } from "@acme/ui";\nexport function F({ save }) {\n  return <form action={save}><SubmitButton>Save</SubmitButton></form>;\n}\n`;
    expect(actions({ "a.tsx": form })).toEqual(["a.tsx:3"]);
    expect(actions({ "a.tsx": form }, ["SubmitButton"])).toEqual([]);
  });

  test("a pending prop, disabled while pending, or a pending child", () => {
    for (const button of [
      "<Button pending={m.isPending} onClick={() => m.mutate(id)}>Delete</Button>",
      "<Button loading={saving} onClick={() => m.mutate(id)}>Delete</Button>",
      "<button disabled={isPending} onClick={() => m.mutate(id)}>Delete</button>",
      "<button disabled={m.isPending || !valid} onClick={() => m.mutate(id)}>Delete</button>",
      '<button onClick={() => m.mutate(id)}>{m.isPending ? "Deleting…" : "Delete"}</button>',
      "<button aria-busy={busy} onClick={() => m.mutate(id)}>Delete</button>",
    ]) {
      const src = `export function B() {\n  const m = useMutation({ mutationFn: del });\n  return ${button};\n}\n`;
      expect(actions({ "a.tsx": src })).toEqual([]);
    }
  });

  test("useActionState's isPending on the submit button covers the form", () => {
    const src = `export function F() {\n  const [state, formAction, isPending] = useActionState(save, null);\n  return (\n    <form action={formAction}>\n      <button disabled={isPending}>Save</button>\n    </form>\n  );\n}\n`;
    expect(actions({ "a.tsx": src })).toEqual([]);
  });

  test("plain clicks, sync submits and URL actions start no write", () => {
    const src = `export function F() {\n  const [q, setQ] = useState("");\n  return (\n    <div>\n      <button onClick={() => setQ("")}>Clear</button>\n      <button onClick={async () => { await navigator.clipboard.writeText(q); }}>Copy</button>\n      <form onSubmit={(e) => { e.preventDefault(); setQ(e.currentTarget.q.value); }}><input name="q" /></form>\n      <form action="/search" method="get"><input name="q" /></form>\n    </div>\n  );\n}\n`;
    const r = check(app({ "a.tsx": src }), emptyBaseline(), { rules: ["pending-action"] });
    expect(r.new).toEqual([]);
    expect(r.stats).toMatchObject({ actions: 0 });
  });

  test("a JSX opt-out with a reason suppresses it", () => {
    const src = `export function B() {\n  const m = useMutation({ mutationFn: del });\n  return (\n    <div>\n      {/* state-coverage-ignore: optimistic update, the row disappears at once */}\n      <button onClick={() => m.mutate(id)}>Delete</button>\n    </div>\n  );\n}\n`;
    const r = check(app({ "a.tsx": src }), emptyBaseline(), { rules: ["pending-action"] });
    expect(r.ok).toBe(true);
    expect(r.ignored[0]?.reason).toBe("optimistic update, the row disappears at once");
  });
});

// ---------------------------------------------------------------------------------------------
// config

const UNHANDLED = component(
  "  const posts = useQuery(api.posts.list);\n  return <List posts={posts} />;"
);
const PARAM_PAGE = `export default function P({ params }) {\n  return <h1>{params.id}</h1>;\n}\n`;

describe("config", () => {
  test("defaults: the route rule on, the others off", () => {
    const dir = app({ "app/[id]/page.tsx": PARAM_PAGE, "app/posts.tsx": UNHANDLED });
    expect(readConfig(dir)).toEqual({ rules: ["next-route"], options: {} });
    const r = run(dir, "--json");
    expect(JSON.parse(r.out).rules).toEqual(["next-route"]);
    expect(JSON.parse(r.out).new.map((v: { rule: string }) => v.rule)).toEqual(["next-route"]);
  });

  test("state-check.config.json turns rule sets on and off (kommandant: no route rule)", () => {
    const dir = app({
      "state-check.config.json": JSON.stringify({
        rules: { "next-route": false, "convex-query": true, "pending-action": true },
      }),
      "app/[id]/page.tsx": PARAM_PAGE,
      "src/posts.tsx": UNHANDLED,
    });
    const r = run(dir);
    expect(r.code).toBe(1);
    expect(r.err).toContain("FAIL src/posts.tsx:4 convex-query:");
    expect(r.err).not.toContain("next-route");
    expect(r.out).toContain("state-check [convex-query, pending-action]: 1 queries, 0 handled");

    expect(run(dir, "--update-baseline").code).toBe(0);
    const baseline = readBaseline(join(dir, "state-coverage.baseline.json"));
    expect(baseline.violations).toEqual({ "convex-query": { "src/posts.tsx": 1 } });
    expect(run(dir).code).toBe(0);
  });

  test('the "state-check" key in package.json, with options', () => {
    const dir = app({
      "package.json": JSON.stringify({
        name: "kommandant",
        "state-check": { rules: { "convex-query": true }, queryWrappers: ["Loader"] },
      }),
      "src/posts.tsx": component(
        "  const posts = useQuery(api.posts.list);\n  return <Loader data={posts} />;"
      ),
    });
    expect(readConfig(dir).rules).toEqual(["next-route", "convex-query"]);
    expect(run(dir).code).toBe(0);
  });

  test("--config points at another file", () => {
    const dir = app({
      "conf/sc.json": JSON.stringify({ rules: { "convex-query": true } }),
      "src/posts.tsx": UNHANDLED,
    });
    expect(run(dir).code).toBe(0);
    expect(run(dir, "--config", join(dir, "conf/sc.json")).code).toBe(1);
  });

  test("a bad config exits 2", () => {
    for (const config of [
      { rules: { "no-such-rule": true } },
      { rules: { "convex-query": "yes" } },
      { rules: ["convex-query"] },
      { typo: true },
      { pendingComponents: "SubmitButton" },
    ]) {
      const dir = app({ "state-check.config.json": JSON.stringify(config) });
      const r = run(dir);
      expect(r.code).toBe(2);
      expect(r.err).toContain("state-check.config.json");
    }
    const both = app({
      "state-check.config.json": "{}",
      "package.json": JSON.stringify({ "state-check": {} }),
    });
    expect(run(both).err).toContain("keep one");
    expect(run(app({}), "--config", "/nonexistent.json").code).toBe(2);
  });
});
