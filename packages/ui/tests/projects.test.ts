import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { packIllustrations } from "../gallery/packs";
import {
  applyProject,
  findProject,
  PROJECT_IDS,
  PROJECTS_MANIFEST,
  projectApp,
  readProject,
  validateProjects,
} from "../gallery/projects";
import { DEFAULT_VIEW, readView, writeView } from "../gallery/view";
import {
  isBehind,
  latestVersions,
  projectsSource,
  readCatalogs,
  readProjectsManifest,
  resolveRange,
  scanDependencies,
  scanProjects,
} from "../scripts/projects";

// The projects manifest, its scan and the ?project= view param of design#222.

function tree(files: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "hn-projects-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), JSON.stringify(body));
  }
  return root;
}

const LATEST = { "@hansenexus/tokens": "0.11.0", "@hansenexus/ui": "0.5.0" };

describe("projects manifest", () => {
  test("the committed manifest holds its schema", () => {
    expect(validateProjects(PROJECTS_MANIFEST)).toEqual([]);
    expect(() => readProjectsManifest()).not.toThrow();
  });

  test("the first entries are there, names and roles only", () => {
    for (const id of ["kommandant", "fachwerk", "lexilink", "portal", "hansenexus", "design-ops"])
      expect(PROJECT_IDS).toContain(id);
    // Nothing beyond the schema's fields: a private repo contributes its name, not its content.
    const fields = new Set(Object.values(PROJECTS_MANIFEST.projects).flatMap(Object.keys));
    for (const f of fields)
      expect([
        "label",
        "repo",
        "path",
        "roles",
        "theme",
        "illustrations",
        "motion",
        "app",
      ]).toContain(f);
  });

  test("broken entries are named", () => {
    const problems = validateProjects(
      {
        projects: {
          Bad_Id: { label: "x", repo: "a/b", roles: ["consumer"] },
          nolabel: { label: "", repo: "nope", roles: [] },
          role: { label: "r", repo: "a/b", roles: ["owner"], secret: 1 },
          pack: { label: "p", repo: "a/b", roles: ["offers-pack"], theme: "kommandant" },
          screens: { label: "s", repo: "a/b", roles: ["offers-screens"] },
          app: { label: "s", repo: "a/b", roles: ["consumer"], app: "ghost" },
          theme: { label: "t", repo: "a/b", roles: ["consumer"], theme: "neon" },
          path: { label: "t", repo: "a/b", path: "../up", roles: ["consumer"] },
        },
      },
      { appIds: ["example"] }
    );
    const has = (text: string) => expect(problems.some((p) => p.includes(text))).toBe(true);
    has("Bad_Id: the id is not kebab-case");
    has("nolabel: needs a label");
    has("nolabel: repo must be owner/name");
    has("nolabel: needs at least one role");
    has("role: unknown role owner");
    has("role: unknown field secret");
    has("pack: offers-pack needs a theme from its pack");
    has("screens: offers-screens and app go together");
    has("app: app ghost is not in workbench/apps.json");
    has("theme: theme neon is no theme of this build");
    has("path: path must be relative inside the repo");
    expect(validateProjects({})).toHaveLength(1);
  });
});

describe("projects scan", () => {
  test("latest is this repository's published package versions", () => {
    const latest = latestVersions();
    expect(latest["@hansenexus/tokens"]).toMatch(/^\d+\.\d+\.\d+/);
    expect(latest["@hansenexus/ui"]).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("a range is behind when it does not admit the latest", () => {
    expect(isBehind("0.8.0", "0.11.0")).toBe(true);
    expect(isBehind("^0.4.0", "0.11.0")).toBe(true);
    expect(isBehind("^0.11.0", "0.11.0")).toBe(false);
    expect(isBehind(">=0.2.0", "0.11.0")).toBe(false);
    expect(isBehind("workspace:*", "0.11.0")).toBe(false);
    expect(isBehind("^1.0.0", null)).toBe(false);
  });

  test("catalog ranges resolve through the root's catalogs, bun and pnpm style", () => {
    const root = tree({
      "package.json": {
        catalog: { "@hansenexus/ui": "^0.5.0" },
        workspaces: {
          catalog: { "@hansenexus/tokens": "^0.4.0" },
          catalogs: { next: { "@hansenexus/tokens": "^0.11.0" } },
        },
      },
    });
    const catalogs = readCatalogs(root);
    expect(resolveRange("@hansenexus/tokens", "catalog:", catalogs)).toBe("^0.4.0");
    expect(resolveRange("@hansenexus/ui", "catalog:", catalogs)).toBe("^0.5.0");
    expect(resolveRange("@hansenexus/tokens", "catalog:next", catalogs)).toBe("^0.11.0");
    expect(resolveRange("@hansenexus/tokens", "0.2.0", catalogs)).toBe("0.2.0");
  });

  test("records this repository's packages only, deduplicated, outside node_modules", () => {
    const root = tree({
      "package.json": { workspaces: { catalog: { "@hansenexus/tokens": "^0.4.0" } } },
      "apps/a/package.json": {
        dependencies: { "@hansenexus/tokens": "catalog:", "@hansenexus/hud": "0.7.0", react: "19" },
        devDependencies: { "@hansenexus/ui": "^0.5.0" },
      },
      "apps/b/package.json": { dependencies: { "@hansenexus/tokens": "catalog:" } },
      "apps/a/node_modules/x/package.json": { dependencies: { "@hansenexus/ui": "0.1.0" } },
    });
    expect(scanDependencies(join(root, "apps"), LATEST, root)).toEqual([
      { package: "@hansenexus/tokens", range: "^0.4.0", latest: "0.11.0", behind: true },
      { package: "@hansenexus/ui", range: "^0.5.0", latest: "0.5.0", behind: false },
    ]);
  });

  test("a checkout from WORKBENCH_<PROJECT> or WORKBENCH_<REPO>, else unscanned", () => {
    const mono = tree({
      "apps/portal/package.json": { dependencies: { "@hansenexus/tokens": "0.2.0" } },
    });
    const solo = tree({ "package.json": { dependencies: { "@hansenexus/ui": "0.4.0" } } });
    const manifest = {
      projects: {
        portal: {
          label: "p",
          repo: "o/hn-monorepo",
          path: "apps/portal",
          roles: ["consumer" as const],
        },
        solo: { label: "s", repo: "o/solo", roles: ["consumer" as const] },
        gone: { label: "g", repo: "o/gone", roles: ["consumer" as const] },
      },
    };
    const scan = scanProjects(manifest, {
      env: { WORKBENCH_HN_MONOREPO: mono, WORKBENCH_SOLO: solo },
      latest: LATEST,
      repo: tree({}),
    });
    expect(scan).toEqual([
      {
        id: "portal",
        scanned: true,
        via: "WORKBENCH_HN_MONOREPO",
        deps: [{ package: "@hansenexus/tokens", range: "0.2.0", latest: "0.11.0", behind: true }],
      },
      {
        id: "solo",
        scanned: true,
        via: "WORKBENCH_SOLO",
        deps: [{ package: "@hansenexus/ui", range: "0.4.0", latest: "0.5.0", behind: true }],
      },
      {
        id: "gone",
        scanned: false,
        reason: "no checkout: set WORKBENCH_GONE to a local checkout of o/gone",
      },
    ]);
    // Only the scan reaches the gallery: no paths of the checkout.
    expect(projectsSource(scan, LATEST)).not.toContain(mono);
  });
});

describe("?project= view param", () => {
  test("a known project round-trips, an unknown one is none", () => {
    expect(DEFAULT_VIEW.project).toBe("");
    expect(readProject("fachwerk")).toBe("fachwerk");
    expect(readProject("ghost")).toBe("");
    const view = readView(new URLSearchParams("project=fachwerk&theme=fachwerk"));
    expect(view.project).toBe("fachwerk");
    // The project's theme and set are the defaults under it: the link is the one param.
    expect(writeView(new URLSearchParams(), view).toString()).toBe("project=fachwerk");
    const bare = readView(new URLSearchParams("project=fachwerk"));
    expect(bare).toMatchObject({ theme: "fachwerk", illustrations: "school" });
    // An override under a project is written out, the default view's value included.
    const back = { ...bare, theme: DEFAULT_VIEW.theme, illustrations: "auto" };
    const query = writeView(new URLSearchParams(), back);
    expect(query.get("theme")).toBe(DEFAULT_VIEW.theme);
    expect(query.get("illustrations")).toBe("auto");
    expect(readView(query)).toEqual(back);
    expect(readView(new URLSearchParams("project=ghost")).project).toBe("");
    expect(writeView(new URLSearchParams(), DEFAULT_VIEW).toString()).toBe("");
  });

  test("picking a project sets its theme and illustration set in one step; none clears it", () => {
    const picked = applyProject(DEFAULT_VIEW, "fachwerk");
    expect(picked).toEqual({
      ...DEFAULT_VIEW,
      project: "fachwerk",
      theme: "fachwerk",
      illustrations: "school",
    });
    expect(applyProject(picked, "")).toEqual({ ...picked, project: "" });
    expect(applyProject(picked, "lexilink")).toMatchObject({ illustrations: "estate" });
    // A project without a theme keeps the current one; without a set it goes back to auto.
    expect(applyProject(picked, "design-ops")).toEqual({
      ...picked,
      project: "design-ops",
      illustrations: "auto",
    });
    expect(applyProject({ ...DEFAULT_VIEW, illustrations: "school" }, "kommandant")).toMatchObject({
      illustrations: "auto",
    });
  });

  test("a project's illustration set matches its pack's default and is a known set", () => {
    for (const id of ["fachwerk", "lexilink"])
      expect(findProject(id)?.illustrations).toBe(packIllustrations(id));
    expect(
      validateProjects({
        projects: { x: { label: "x", repo: "a/b", roles: ["consumer"], illustrations: "ghost" } },
      })
    ).toEqual(["projects.json: x: illustrations ghost is no set (estate, school)"]);
  });

  test("a project that offers screens narrows the screens scene to its app", () => {
    expect(projectApp({ project: "example" })).toBe("example");
    expect(projectApp({ project: "fachwerk" })).toBe("fachwerk");
    expect(projectApp({ project: "kommandant" })).toBeNull();
    expect(projectApp({ project: "" })).toBeNull();
  });
});
