import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DECIDE_PATH,
  decideProblem,
  decideTarget,
  issueBody,
  issueUrl,
  REPO,
} from "../gallery/decide";
import { serve } from "../scripts/gallery";
import { listCategories } from "../scripts/variants";

/** A throwaway package root with one open category and one decided one. */
function board(): string {
  const root = mkdtempSync(join(tmpdir(), "hn-decide-"));
  for (const [category, variants] of [
    ["shell-layout", ["command-first", "rail-sidebar", "three-pane"]],
    ["skeleton-style", ["pulse"]],
  ] as const) {
    const dir = join(root, "gallery/variants", category);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "category.tsx"), "export const category = {};\n");
    for (const v of variants) writeFileSync(join(dir, `${v}.tsx`), "export const variant = {};\n");
  }
  mkdirSync(join(root, "decisions"));
  writeFileSync(
    join(root, "decisions/skeleton-style.json"),
    JSON.stringify({
      category: "skeleton-style",
      winner: "pulse",
      date: "2026-09-27",
      rationale: "calm",
      considered: ["pulse", "static"],
    })
  );
  writeFileSync(join(root, "hello.txt"), "hi\n");
  return root;
}

describe("POST /api/decide on the local server (#76)", () => {
  const root = board();
  let rebuilds = 0;
  let failRebuild = false;
  const server = serve(0, {
    root,
    rebuild: async () => {
      rebuilds++;
      if (failRebuild) throw new Error("tailwind failed");
    },
  });
  const base = `http://127.0.0.1:${server.port}`;
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    fetch(base + DECIDE_PATH, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });

  beforeAll(() => {
    expect(server.hostname).toBe("127.0.0.1");
  });
  afterAll(() => server.stop(true));

  test("still serves files, and refuses other methods on them", async () => {
    expect(await (await fetch(`${base}/hello.txt`)).text()).toBe("hi\n");
    const res = await fetch(`${base}/hello.txt`, { method: "POST", body: "x" });
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD");
  });

  test("refuses GET, a foreign Origin, a non-JSON body and a body of the wrong shape", async () => {
    const get = await fetch(base + DECIDE_PATH);
    expect(get.status).toBe(405);
    expect(get.headers.get("allow")).toBe("POST");

    const foreign = await post(
      { category: "shell-layout", winner: "rail-sidebar", rationale: "why" },
      { origin: "https://evil.example" }
    );
    expect(foreign.status).toBe(403);
    expect((await foreign.json()).error).toContain("origin https://evil.example");

    const text = await post("not json");
    expect(text.status).toBe(400);
    expect((await text.json()).error).toBe("the body is not JSON");

    const shape = await post({ category: "shell-layout", winner: 3 });
    expect(shape.status).toBe(400);
    expect((await shape.json()).error).toContain("category, winner and rationale");

    expect(rebuilds).toBe(0);
    expect(listCategories(root)[0]?.variants).toEqual([
      "command-first",
      "rail-sidebar",
      "three-pane",
    ]);
  });

  test("an empty rationale, an unknown variant and a decided category are decide()'s refusals", async () => {
    const empty = await post({ category: "shell-layout", winner: "rail-sidebar", rationale: "  " });
    expect(empty.status).toBe(400);
    expect((await empty.json()).error).toBe("a decision needs a rationale");

    const unknown = await post({ category: "shell-layout", winner: "glass", rationale: "why" });
    expect(unknown.status).toBe(400);
    expect((await unknown.json()).error).toMatch(/shell-layout has no variant glass/);

    const decided = await post({ category: "skeleton-style", winner: "pulse", rationale: "why" });
    expect(decided.status).toBe(409);
    expect((await decided.json()).error).toBe("skeleton-style is already decided for pulse");

    const missing = await post({ category: "nope", winner: "pulse", rationale: "why" });
    expect(missing.status).toBe(400);
    expect((await missing.json()).error).toMatch(/no category nope/);

    expect(rebuilds).toBe(0);
    expect(existsSync(join(root, "decisions/shell-layout.json"))).toBe(false);
  });

  test("records the decision as decide() does, deletes the losers and rebuilds once", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await post(
      { category: "shell-layout", winner: "rail-sidebar", rationale: "  the shell we ship today " },
      { origin: base }
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      category: "shell-layout",
      winner: "rail-sidebar",
      date: today,
      deleted: ["command-first", "three-pane"],
    });
    expect(rebuilds).toBe(1);

    expect(JSON.parse(readFileSync(join(root, "decisions/shell-layout.json"), "utf8"))).toEqual({
      category: "shell-layout",
      winner: "rail-sidebar",
      date: today,
      rationale: "the shell we ship today",
      considered: ["command-first", "rail-sidebar", "three-pane"],
    });
    const dir = join(root, "gallery/variants/shell-layout");
    expect(existsSync(join(dir, "rail-sidebar.tsx"))).toBe(true);
    expect(existsSync(join(dir, "command-first.tsx"))).toBe(false);
    expect(existsSync(join(dir, "three-pane.tsx"))).toBe(false);
    expect(listCategories(root).find((c) => c.id === "shell-layout")?.decision?.winner).toBe(
      "rail-sidebar"
    );

    // A second press is refused, with nothing rebuilt.
    const again = await post({ category: "shell-layout", winner: "rail-sidebar", rationale: "x" });
    expect(again.status).toBe(409);
    expect(rebuilds).toBe(1);
  });

  test("a failed rebuild still reports the recorded decision", async () => {
    const dir = join(root, "gallery/variants/late");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "category.tsx"), "export const category = {};\n");
    for (const v of ["a", "b"])
      writeFileSync(join(dir, `${v}.tsx`), "export const variant = {};\n");
    failRebuild = true;
    try {
      const res = await post({ category: "late", winner: "a", rationale: "why" });
      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe(
        "late is decided for a, but rebuilding the gallery failed: tailwind failed. Restart the server."
      );
      expect(existsSync(join(root, "decisions/late.json"))).toBe(true);
    } finally {
      failRebuild = false;
    }
  });
});

describe("the hosted board's static fallback (#76)", () => {
  const body = {
    category: "shell-layout",
    winner: "rail-sidebar",
    rationale: ' the shell "we" ship today, $5 ',
  };
  const considered = ["command-first", "rail-sidebar", "three-pane"];

  test("the local server is the target only on the loopback", () => {
    expect(decideTarget("127.0.0.1")).toBe("server");
    expect(decideTarget("localhost")).toBe("server");
    expect(decideTarget("[::1]")).toBe("server");
    expect(decideTarget("design.hansenexus.dev")).toBe("issue");
    expect(decideTarget("127.0.0.1.evil.example")).toBe("issue");
  });

  test("an empty rationale is refused before any issue opens, with decide()'s words", () => {
    expect(decideProblem({ ...body, rationale: "   " })).toBe("a decision needs a rationale");
    expect(decideProblem(body)).toBeNull();
  });

  test("the issue is prefilled: title, rationale and the decide command, in hansenexus/design", () => {
    const url = new URL(issueUrl(body, considered));
    expect(url.origin + url.pathname).toBe(`https://github.com/${REPO}/issues/new`);
    expect(url.searchParams.get("title")).toBe("decide shell-layout rail-sidebar");
    expect(url.searchParams.get("labels")).toBe("ready");
    const text = url.searchParams.get("body");
    expect(text).toBe(issueBody(body, considered));
    expect(text).toContain("- Winner: `rail-sidebar`");
    expect(text).toContain("- Considered: `command-first`, `rail-sidebar`, `three-pane`");
    expect(text).toContain('- Rationale: the shell "we" ship today, $5');
    expect(text).toContain(
      'cd packages/ui && bun run decide shell-layout rail-sidebar --rationale "the shell \\"we\\" ship today, \\$5"'
    );
  });
});
