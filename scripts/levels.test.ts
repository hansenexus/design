import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  checkLevels,
  checkSkins,
  exportedNames,
  type Input,
  type Item,
  load,
  namedImports,
  previewCardItems,
  siblingImports,
} from "./levels";

const ROOT = resolve(import.meta.dir, "..");

const fixture = (over: Partial<Input> = {}): Input => ({
  items: [
    { name: "cx", meta: { level: "atom" }, files: [{ path: "src/cx.ts" }] },
    { name: "button", meta: { level: "atom" }, files: [{ path: "src/button.tsx" }] },
    { name: "field", meta: { level: "molecule" }, files: [{ path: "src/field.tsx" }] },
  ],
  sources: {
    "src/cx.ts": "export const cx = () => '';",
    "src/button.tsx": 'import { cx } from "./cx";',
    "src/field.tsx": 'import { Button } from "./button";\nimport { cx } from "./cx";',
  },
  gallery: { "gallery/main.tsx": '<PreviewCard title="Button" item="button">' },
  scenes: { cx: "kit", button: "kit", field: "forms" },
  ...over,
});

describe("levels (#58)", () => {
  test("the committed registry passes: every item has a level, nothing imports upward", () => {
    expect(checkLevels(load(ROOT))).toEqual([]);
  });

  test("every registry item carries a level and a scene", () => {
    const { items, scenes } = load(ROOT);
    expect(items.length).toBeGreaterThan(40);
    for (const item of items) {
      expect(["atom", "molecule", "organism", "template"]).toContain(item.meta?.level as string);
      expect(scenes[item.name]).toBeDefined();
    }
  });

  test("the classification from the issue is committed", () => {
    const level = Object.fromEntries(load(ROOT).items.map((i) => [i.name, i.meta?.level]));
    for (const n of ["button", "input", "badge", "kbd", "spinner", "status-glyph", "rail-item"])
      expect(level[n]).toBe("atom");
    for (const n of ["field", "combobox", "date-picker", "breadcrumb", "pagination", "empty-state"])
      expect(level[n]).toBe("molecule");
    for (const n of ["data-table", "command", "sheet", "query-state"])
      expect(level[n]).toBe("organism");
  });

  test("a clean fixture passes", () => {
    expect(checkLevels(fixture())).toEqual([]);
  });

  test("an item without a level fails and names it", () => {
    const f = fixture();
    f.items[1] = { name: "button", files: [{ path: "src/button.tsx" }] };
    expect(checkLevels(f)).toEqual([
      "packages/ui/registry.json: button has no level; set meta.level to one of atom|molecule|organism|template",
    ]);
  });

  test("an unknown level counts as missing", () => {
    const f = fixture();
    f.items[0] = { name: "cx", meta: { level: "quark" }, files: [{ path: "src/cx.ts" }] };
    expect(checkLevels(f)[0]).toContain("cx has no level");
  });

  test("an atom importing a molecule fails with both files", () => {
    const f = fixture();
    f.sources["src/button.tsx"] = 'import { cx } from "./cx";\nimport { Field } from "./field";';
    expect(checkLevels(f)).toEqual([
      "packages/ui/src/button.tsx (atom) imports packages/ui/src/field.tsx (molecule): a file at level atom imports only atom",
    ]);
  });

  test("an upward import in a real file is caught", () => {
    const f = load(ROOT);
    f.sources["src/button.tsx"] =
      `${f.sources["src/button.tsx"]}\nimport { DataTable } from "./data-table";`;
    expect(checkLevels(f)).toEqual([
      "packages/ui/src/button.tsx (atom) imports packages/ui/src/data-table.tsx (organism): a file at level atom imports only atom",
    ]);
  });

  test("meta.uses (a package item, #64) follows the same rule and names real items", () => {
    const f = fixture();
    f.items.push({ name: "shell", meta: { level: "template", uses: ["field", "button"] } });
    f.scenes.shell = "shell";
    expect(checkLevels(f)).toEqual([]);
    f.items[0] = {
      name: "cx",
      meta: { level: "atom", uses: ["field", "gone"] },
      files: [{ path: "src/cx.ts" }],
    };
    expect(checkLevels(f)).toEqual([
      "packages/ui/registry.json: cx (atom) uses field (molecule): a atom uses only atom",
      "packages/ui/registry.json: cx uses gone, which is not a registry item",
    ]);
  });

  test("an import of a file no item owns fails", () => {
    const f = fixture();
    f.sources["src/cx.ts"] = 'import { x } from "./stray";';
    expect(checkLevels(f)).toEqual([
      "packages/ui/src/cx.ts imports packages/ui/src/stray, which no registry item owns",
    ]);
  });

  test("a preview card naming an unknown item fails", () => {
    const f = fixture({ gallery: { "gallery/data.tsx": '<PreviewCard wide item="nope">' } });
    expect(checkLevels(f)).toEqual([
      'packages/ui/gallery/data.tsx: preview card item "nope" is not a registry item',
    ]);
  });

  test("an item without a scene, and a scene without an item, fail", () => {
    const f = fixture({ scenes: { cx: "kit", button: "kit", gone: "kit" } });
    expect(checkLevels(f)).toEqual([
      "packages/ui/gallery/levels.ts: field has no scene in ITEM_SCENES",
      "packages/ui/gallery/levels.ts: gone is not a registry item",
    ]);
  });

  test("siblingImports resolves relative to the file, previewCardItems reads the item prop", () => {
    expect(siblingImports("src/a.tsx", 'import { b } from "./b";\nimport "./c.css";')).toEqual([
      "src/b",
      "src/c.css",
    ]);
    expect(
      previewCardItems('<PreviewCard title="x" item="skeleton" wide>\n<PreviewCard item="spinner">')
    ).toEqual(["skeleton", "spinner"]);
  });
});

describe("theme-pack skins (design#143)", () => {
  const items: Item[] = [
    { name: "cx", meta: { level: "atom" }, files: [{ path: "src/cx.ts" }] },
    { name: "button", meta: { level: "atom" }, files: [{ path: "src/button.tsx" }] },
    { name: "card", meta: { level: "molecule" }, files: [{ path: "src/card.tsx" }] },
    { name: "command", meta: { level: "organism" }, files: [{ path: "src/command.tsx" }] },
    { name: "shell", meta: { level: "template" } },
  ];
  const sources = {
    "src/cx.ts": "export const cx = () => '';",
    "src/button.tsx": "export function Button() {}",
    "src/card.tsx":
      "export const Card = 1;\nexport type CardProps = {};\nexport { CardHeaderBase as CardHeader };",
    "src/command.tsx": "export function Command() {}",
  };
  const dir = "themes/acme/bold/skins";
  const check = (skins: Record<string, string>) => checkSkins(items, sources, skins);

  test("a skin imports its own level and lower", () => {
    expect(
      check({
        [`${dir}/card.header.tsx`]:
          'import { Button, type CardProps, CardHeader, cx } from "@hansenexus/ui";\nimport { Hatch } from "./_motif";',
        [`${dir}/_motif.tsx`]: 'import { cx } from "@hansenexus/ui";',
        [`${dir}/index.ts`]:
          'import { Command } from "@hansenexus/ui";\nimport { Shell } from "@hansenexus/shell";\nimport card from "./card.header";',
      })
    ).toEqual([]);
  });

  test("a molecule skin importing an organism fails and names both", () => {
    expect(check({ [`${dir}/card.tsx`]: 'import { Command } from "@hansenexus/ui";' })).toEqual([
      `${dir}/card.tsx (molecule) imports Command (command) (organism): a skin at level molecule imports only atom|molecule`,
    ]);
  });

  test("a molecule skin importing the shell fails", () => {
    expect(check({ [`${dir}/card.tsx`]: 'import { Shell } from "@hansenexus/shell";' })).toEqual([
      `${dir}/card.tsx (molecule) imports @hansenexus/shell (template): a skin at level molecule imports only atom|molecule`,
    ]);
  });

  test("an atom takes no skin", () => {
    expect(check({ [`${dir}/button.tsx`]: "" })).toEqual([
      `${dir}/button.tsx skins button, an atom: atoms take no skin, change them through recipe tokens`,
    ]);
  });

  test("a skin for an unknown item fails", () => {
    expect(check({ [`${dir}/hero.tsx`]: "" })).toEqual([
      `${dir}/hero.tsx is named for hero, which is not a registry item`,
    ]);
  });

  test("a sibling at a higher level, an outside path and an unknown name fail", () => {
    expect(
      check({
        [`${dir}/_motif.tsx`]:
          'import x from "./card";\nimport y from "../../tokens";\nimport { Nope } from "@hansenexus/ui";',
        [`${dir}/card.tsx`]: "",
      })
    ).toEqual([
      `${dir}/_motif.tsx: @hansenexus/ui exports no Nope from a registry item`,
      `${dir}/_motif.tsx: imports ../../tokens; a skin imports only sibling skins (./<file>)`,
      `${dir}/_motif.tsx (atom) imports ./card (molecule): a skin at level atom imports only atom`,
    ]);
  });

  test("a namespace import of @hansenexus/ui fails", () => {
    expect(check({ [`${dir}/card.tsx`]: 'import * as ui from "@hansenexus/ui";' })).toEqual([
      `${dir}/card.tsx: import names from @hansenexus/ui, not the namespace, so levels can be checked`,
    ]);
  });

  test("checkLevels runs the skins rule; the committed packs pass", () => {
    const f = fixture({ skins: { [`${dir}/button.tsx`]: "" } });
    expect(checkLevels(f)).toEqual([
      `${dir}/button.tsx skins button, an atom: atoms take no skin, change them through recipe tokens`,
    ]);
    const root = load(ROOT);
    expect(checkSkins(root.items, root.sources, root.skins ?? {})).toEqual([]);
  });

  test("names", () => {
    expect(
      exportedNames("export const A = 1;\nexport function B() {}\nexport { c, d as E };")
    ).toEqual(["A", "B", "c", "E"]);
    expect(
      namedImports('import { A, type B, C as D } from "@hansenexus/ui";', "@hansenexus/ui")
    ).toEqual(["A", "B", "C"]);
  });
});
