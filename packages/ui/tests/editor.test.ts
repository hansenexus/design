import { afterAll, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { packThemes } from "../../tokens/scripts/resolve";
import {
  DEFAULT_SKIN,
  type Draft,
  draftCss,
  draftSize,
  EDIT_PATH,
  type EditorTheme,
  editedPack,
  editIssueBody,
  editIssueUrl,
  emptyDraft,
  readDraft,
  setSkin,
  setToken,
  writeTarget,
} from "../gallery/edit";
import {
  applyDraft,
  authoredText,
  dtcgValue,
  editorTheme,
  parseSkinsIndex,
  prCommands,
  renderSkinsIndex,
} from "../scripts/edit";
import { serve } from "../scripts/gallery";
import { dropLeafText, setLeafText } from "../scripts/json-text";
import type { ThemePackDefinition } from "../src";

// The live editor (design#151): a draft of a pack direction's tokens, recipes and skins, drawn on
// the canvas and written back into themes/.

const REPO = resolve(import.meta.dir, "../../..");

/** A copy of themes/ to write into, without node_modules. */
function themesCopy(): string {
  const dir = join(realpathSync(mkdtempSync(join(tmpdir(), "design-edit-"))), "themes");
  cpSync(join(REPO, "themes"), dir, {
    recursive: true,
    filter: (src) => !src.includes("node_modules"),
  });
  return dir;
}

const THEME: EditorTheme = {
  id: "fachwerk",
  app: "fachwerk",
  direction: "fachwerk",
  tokens: [
    {
      path: "border.width",
      cssVar: "--hn-border-width",
      type: "dimension",
      scope: "all",
      authored: { dark: "2px", light: "2px" },
      value: { dark: "2px", light: "2px" },
    },
    {
      path: "surface.page",
      cssVar: "--hn-surface-page",
      type: "color",
      scope: "mode",
      authored: { dark: "{palette.fachwerk.night-paper}", light: "{palette.fachwerk.paper}" },
      value: { dark: "#1a1512", light: "#f5f1ea" },
    },
  ],
  refs: {
    dark: { "palette.fachwerk.brick": "#a0402a" },
    light: { "palette.fachwerk.brick": "#b4532a" },
  },
};

describe("the draft (gallery/edit.ts)", () => {
  test("setToken and setSkin add and reset; draftSize counts both", () => {
    let d = emptyDraft("fachwerk");
    d = setToken(d, "all", "border.width", "3px");
    d = setToken(d, "dark", "surface.page", "#000000");
    d = setSkin(d, "card.header", DEFAULT_SKIN);
    expect(draftSize(d)).toBe(3);
    d = setToken(d, "dark", "surface.page", null);
    d = setSkin(d, "card.header", null);
    expect(d.tokens.dark).toEqual({});
    expect(d.skins).toEqual({});
    expect(draftSize(d)).toBe(1);
  });

  test("draftCss lays edits over their theme per mode, references resolved in each", () => {
    let d = emptyDraft("fachwerk");
    d = setToken(d, "all", "control.box", "4px"); // not in the catalog: dropped
    d = setToken(d, "all", "surface.page", "{palette.fachwerk.brick}");
    d = setToken(d, "light", "border.width", "3px");
    d = setToken(d, "dark", "border.width", "bad; }");
    const css = draftCss(d, THEME);
    expect(css).toBe(
      [
        '[data-theme="fachwerk"][data-theme]:not([data-mode="light"]) {',
        "  --hn-surface-page: #a0402a;",
        "}",
        '[data-theme="fachwerk"][data-theme][data-mode="light"] {',
        "  --hn-surface-page: #b4532a;",
        "  --hn-border-width: 3px;",
        "}",
      ].join("\n")
    );
    expect(draftCss(emptyDraft("fachwerk"), THEME)).toBe("");
    expect(draftCss(d, undefined)).toBe("");
  });

  test("editedPack drops a skin for default and borrows another pack's", () => {
    const Own = () => null;
    const Theirs = () => null;
    const packs: Record<string, ThemePackDefinition> = {
      fachwerk: { id: "fachwerk", skins: { "card.header": Own, "empty-state": Own } as never },
      other: { id: "other", skins: { "card.header": Theirs } as never },
    };
    const packFor = (id: string) => packs[id] ?? { id };
    const fachwerk = packFor("fachwerk");
    expect(editedPack(fachwerk, undefined, packFor)).toBe(fachwerk);
    let d = setSkin(emptyDraft("fachwerk"), "card.header", "other");
    d = setSkin(d, "empty-state", DEFAULT_SKIN);
    const skins = editedPack(fachwerk, d, packFor).skins as Record<string, unknown>;
    expect(skins["card.header"]).toBe(Theirs);
    expect("empty-state" in skins).toBe(false);
    // Another theme's draft leaves this pack alone.
    expect(editedPack(packFor("other"), d, packFor)).toBe(packFor("other"));
  });

  test("readDraft takes a draft and names what is wrong with anything else", () => {
    expect(readDraft(null)).toBe("a draft is a JSON object");
    expect(readDraft({ tokens: {} })).toBe("a draft needs a theme");
    expect(readDraft({ theme: "x" })).toBe("a draft needs tokens: { all, dark, light }");
    expect(readDraft({ theme: "x", tokens: { all: { a: 1 } } })).toBe(
      "tokens.all maps paths to strings"
    );
    expect(readDraft({ theme: "x", tokens: { dark: { a: "1" } } })).toEqual({
      theme: "x",
      tokens: { all: {}, dark: { a: "1" }, light: {} },
      skins: {},
    });
  });

  test("on the hosted gallery Write back is a prefilled issue with the draft and the command", () => {
    expect(writeTarget("127.0.0.1")).toBe("server");
    expect(writeTarget("design.hansenexus.dev")).toBe("issue");
    const d = setToken(emptyDraft("fachwerk"), "all", "border.width", "3px");
    const body = editIssueBody(d);
    expect(body).toContain('"border.width": "3px"');
    expect(body).toContain("cd packages/ui && bun run edit apply draft.json --pr");
    const url = new URL(editIssueUrl(d));
    expect(url.pathname).toBe("/hansenexus/design/issues/new");
    expect(url.searchParams.get("title")).toBe("edit fachwerk: 1 change from the live editor");
    expect(url.searchParams.get("body")).toBe(body);
  });
});

describe("DTCG values (scripts/edit.ts)", () => {
  test("text in, DTCG out, and back", () => {
    expect(dtcgValue("fontFamily", '"Bricolage Grotesque", system-ui, sans-serif')).toEqual([
      "Bricolage Grotesque",
      "system-ui",
      "sans-serif",
    ]);
    expect(dtcgValue("shadow", "0px 2px 6px -1px #00000033")).toEqual({
      color: "#00000033",
      offsetX: "0px",
      offsetY: "2px",
      blur: "6px",
      spread: "-1px",
    });
    expect(dtcgValue("shadow", "0px 1px rgb(0 0 0 / 20%)")).toEqual({
      color: "rgb(0 0 0 / 20%)",
      offsetX: "0px",
      offsetY: "1px",
      blur: "0px",
      spread: "0px",
    });
    expect(() => dtcgValue("shadow", "none")).toThrow(/a shadow is/);
    expect(dtcgValue("cubicBezier", "cubic-bezier(0.2, 0, 0, 1)")).toEqual([0.2, 0, 0, 1]);
    expect(dtcgValue("color", "{palette.fachwerk.brick}")).toBe("{palette.fachwerk.brick}");
    expect(dtcgValue("number", "1.5")).toBe(1.5);
    expect(authoredText(["Bricolage Grotesque", "system-ui"])).toBe(
      '"Bricolage Grotesque", system-ui'
    );
    expect(authoredText([0.2, 0, 0, 1])).toBe("cubic-bezier(0.2, 0, 0, 1)");
  });

  test("skins/index.ts parses and renders back to the same file", () => {
    const file = join(REPO, "themes/fachwerk/fachwerk/skins/index.ts");
    const source = readFileSync(file, "utf8");
    const entries = parseSkinsIndex(source);
    expect(entries).toEqual([
      { slot: "card.header", binding: "CardHeader", file: "card.header" },
      { slot: "empty-state", binding: "EmptyState", file: "empty-state" },
    ]);
    expect(renderSkinsIndex(entries)).toBe(source);
  });
});

describe("token files edited as text (scripts/json-text.ts)", () => {
  const source = `{
  "radius": {
    "$type": "dimension",
    "sm": { "$value": "2px" },
    "md": { "$value": "2px", "$description": "kept" }
  },
  "surface": {
    "page": {
      "$value": "{palette.x.paper}"
    }
  }
}
`;

  test("a $value changes in place and every other byte stays", () => {
    expect(setLeafText(source, "radius.md", "4px", "dimension")).toBe(
      source.replace('"md": { "$value": "2px"', '"md": { "$value": "4px"')
    );
    expect(setLeafText(source, "radius.sm", ["a", "b"], "x")).toContain(
      '"sm": { "$value": ["a","b"] }'
    );
  });

  test("a missing leaf is appended to the deepest group, its groups created", () => {
    const out = setLeafText(source, "surface.card", "#fff", "color");
    expect(JSON.parse(out).surface.card).toEqual({ $type: "color", $value: "#fff" });
    const deep = setLeafText(source, "border.width", "3px", "dimension");
    expect(JSON.parse(deep).border).toEqual({ width: { $type: "dimension", $value: "3px" } });
    expect(JSON.parse(setLeafText("{}\n", "a.b", 1, "number"))).toEqual({
      a: { b: { $type: "number", $value: 1 } },
    });
    expect(() => setLeafText(source, "radius", "1px", "dimension")).toThrow(/is a group/);
  });

  test("dropping a leaf removes it and the groups it leaves with only $ keys", () => {
    expect(JSON.parse(dropLeafText(source, "radius.sm")).radius).toEqual({
      $type: "dimension",
      md: { $value: "2px", $description: "kept" },
    });
    const both = dropLeafText(dropLeafText(source, "radius.sm"), "radius.md");
    expect(JSON.parse(both).radius).toBeUndefined();
    expect(JSON.parse(dropLeafText(source, "surface.page"))).toEqual({
      radius: JSON.parse(source).radius,
    });
    expect(dropLeafText(source, "no.such")).toBe(source);
  });
});

describe("the catalog and applyDraft (scripts/edit.ts)", () => {
  test("a direction's catalog: every token but typography, scope from where the pack sets it", async () => {
    const fachwerk = packThemes().find((p) => p.id === "fachwerk");
    if (!fachwerk) throw new Error("no fachwerk pack");
    const theme = await editorTheme(fachwerk);
    const by = (path: string) => theme.tokens.find((t) => t.path === path);
    expect(theme.tokens.some((t) => t.type === "typography")).toBe(false);
    expect(by("border.width")).toMatchObject({ scope: "all", authored: { dark: "2px" } });
    expect(by("surface.page")).toMatchObject({
      scope: "mode",
      authored: { dark: "{palette.fachwerk.night-paper}", light: "{palette.fachwerk.paper}" },
    });
    expect(theme.refs.light["palette.fachwerk.paper"]).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("tokens land in tokens.json or the mode's file, and resolve", async () => {
    const packsDir = themesCopy();
    let d: Draft = emptyDraft("fachwerk");
    d = setToken(d, "all", "border.width", "3px");
    d = setToken(d, "dark", "surface.page", "#120e0b");
    d = setToken(d, "all", "elevation.raised", "0px 1px 2px 0px #00000033");
    const result = await applyDraft(d, { packsDir, repo: join(packsDir, ".."), format: false });
    expect(result.files).toEqual([
      "themes/fachwerk/fachwerk/tokens.dark.json",
      "themes/fachwerk/fachwerk/tokens.json",
    ]);
    const base = JSON.parse(readFileSync(join(packsDir, "fachwerk/fachwerk/tokens.json"), "utf8"));
    expect(base.border.width.$value).toBe("3px");
    expect(base.elevation.raised.$value).toEqual({
      color: "#00000033",
      offsetX: "0px",
      offsetY: "1px",
      blur: "2px",
      spread: "0px",
    });
    const dark = JSON.parse(
      readFileSync(join(packsDir, "fachwerk/fachwerk/tokens.dark.json"), "utf8")
    );
    expect(dark.surface.page.$value).toBe("#120e0b");
    expect(Array.isArray(result.contrast)).toBe(true);
  });

  test("a draft that does not resolve is undone", async () => {
    const packsDir = themesCopy();
    const file = join(packsDir, "fachwerk/fachwerk/tokens.json");
    const before = readFileSync(file, "utf8");
    const d = setToken(emptyDraft("fachwerk"), "all", "border.width", "{no.such.token}");
    await expect(applyDraft(d, { packsDir, format: false })).rejects.toThrow(/undone/);
    expect(readFileSync(file, "utf8")).toBe(before);
    await expect(
      applyDraft(setToken(emptyDraft("fachwerk"), "all", "no.such", "1px"), { packsDir })
    ).rejects.toThrow(/not a token fachwerk can set/);
    await expect(applyDraft(emptyDraft("kommandant"), { packsDir })).rejects.toThrow(
      /not a pack direction/
    );
  });

  test("skins: a borrowed skin is copied in with its helpers and wired; a dropped one deleted", async () => {
    const packsDir = themesCopy();
    const repo = join(packsDir, "..");
    // lexilink has no skins: borrowing fachwerk's card header copies it and _brace, and wires it.
    const lexi = await applyDraft(setSkin(emptyDraft("lexilink"), "card.header", "fachwerk"), {
      packsDir,
      repo,
      format: false,
    });
    expect(lexi.files).toEqual([
      "themes/lexilink/index.ts",
      "themes/lexilink/ledger/skins/_brace.tsx",
      "themes/lexilink/ledger/skins/card.header.tsx",
      "themes/lexilink/ledger/skins/index.ts",
    ]);
    const index = readFileSync(join(packsDir, "lexilink/index.ts"), "utf8");
    expect(index).toContain('import { skins } from "./ledger/skins";');
    expect(index).toContain('{ id: "lexilink", skins }');
    expect(
      parseSkinsIndex(readFileSync(join(packsDir, "lexilink/ledger/skins/index.ts"), "utf8"))
    ).toEqual([{ slot: "card.header", binding: "CardHeader", file: "card.header" }]);

    // fachwerk's empty-state back to the default: its file goes, _brace stays (card.header uses it).
    const fw = await applyDraft(setSkin(emptyDraft("fachwerk"), "empty-state", DEFAULT_SKIN), {
      packsDir,
      repo,
      format: false,
    });
    expect(fw.files).toEqual([
      "themes/fachwerk/fachwerk/skins/empty-state.tsx",
      "themes/fachwerk/fachwerk/skins/index.ts",
    ]);
    const skins = join(packsDir, "fachwerk/fachwerk/skins");
    expect(existsSync(join(skins, "empty-state.tsx"))).toBe(false);
    expect(existsSync(join(skins, "_brace.tsx"))).toBe(true);
    expect(
      parseSkinsIndex(readFileSync(join(skins, "index.ts"), "utf8")).map((e) => e.slot)
    ).toEqual(["card.header"]);
  });

  test("--pr branches off main, commits the files and opens the PR", () => {
    const result = {
      theme: "fachwerk",
      files: ["themes/fachwerk/fachwerk/tokens.json"],
      contrast: [],
    };
    const onMain = prCommands(result, "main", "202611170900");
    expect(onMain[0]).toEqual(["git", "switch", "-c", "editor/fachwerk-202611170900"]);
    expect(onMain.map((c) => c.slice(0, 2).join(" "))).toEqual([
      "git switch",
      "git add",
      "git commit",
      "git push",
      "gh pr",
    ]);
    const inLane = prCommands(result, "lane", "x");
    expect(inLane[0]?.slice(0, 2)).toEqual(["git", "add"]);
    expect(inLane[1]).toEqual([
      "git",
      "commit",
      "-m",
      "feat(theme-fachwerk): live-editor draft for fachwerk",
    ]);
  });
});

describe("POST /api/edit on the local server (design#151)", () => {
  const applied: unknown[] = [];
  let rebuilds = 0;
  const server = serve(0, {
    root: realpathSync(mkdtempSync(join(tmpdir(), "design-edit-root-"))),
    rebuild: async () => {
      rebuilds++;
    },
    apply: async (draft) => {
      applied.push(draft);
      const d = readDraft(draft);
      if (typeof d === "string") throw new Error(`edit: ${d}`);
      return { theme: d.theme, files: ["themes/x/x/tokens.json"], contrast: [] };
    },
  });
  const url = `http://127.0.0.1:${server.port}${EDIT_PATH}`;
  const post = (body: string, headers: Record<string, string> = {}) =>
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
    });
  afterAll(() => server.stop(true));

  test("refuses GET, a foreign Origin, a non-JSON body and a bad draft", async () => {
    expect((await fetch(url)).status).toBe(405);
    const foreign = await post("{}", { origin: "https://evil.example" });
    expect(foreign.status).toBe(403);
    expect((await post("nope")).status).toBe(400);
    const bad = await post("{}");
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe("edit: a draft needs a theme");
    expect(rebuilds).toBe(0);
  });

  test("applies a draft, rebuilds and answers with the files", async () => {
    const res = await post(JSON.stringify(setToken(emptyDraft("x"), "all", "border.width", "3px")));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      theme: "x",
      files: ["themes/x/x/tokens.json"],
      contrast: [],
    });
    expect(rebuilds).toBe(1);
  });
});
