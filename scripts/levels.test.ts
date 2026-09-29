import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { checkLevels, type Input, load, previewCardItems, siblingImports } from "./levels";

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
