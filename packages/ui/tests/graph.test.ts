import { describe, expect, test } from "bun:test";
import { DEFAULT_VIEW, itemHref } from "../gallery/view";
import registry from "../registry.json";
import { buildGraph, graphSource, loadGraph } from "../scripts/graph";

const item = (name: string, deps: string[] = [], file = `src/${name}.tsx`) => ({
  name,
  registryDependencies: deps.map((d) => `@hansenexus/${d}`),
  files: [{ path: file }],
});

describe("dependency graph (#59)", () => {
  test("dependents are transitive, nearest first, with the shortest chain", () => {
    const graph = buildGraph(
      [
        { name: "tokens" },
        item("cx", ["tokens"]),
        item("button", ["tokens", "cx"]),
        item("dialog", ["tokens", "cx"]),
        item("command", ["dialog"]),
      ],
      {}
    );
    expect(graph.cx?.uses).toEqual(["tokens"]);
    expect(graph.cx?.usedBy).toEqual([
      { name: "button", path: ["button", "cx"] },
      { name: "dialog", path: ["dialog", "cx"] },
      { name: "command", path: ["command", "dialog", "cx"] },
    ]);
    expect(graph.command?.usedBy).toEqual([]);
    expect(graph.tokens?.usedBy.map((d) => d.name)).toEqual(["button", "cx", "dialog", "command"]);
  });

  test("a source import is an edge even when registryDependencies lacks it", () => {
    const graph = buildGraph([item("cx"), item("badge")], {
      "src/badge.tsx": 'import { cx } from "./cx";\n',
    });
    expect(graph.badge?.uses).toEqual(["cx"]);
    expect(graph.cx?.usedBy).toEqual([{ name: "badge", path: ["badge", "cx"] }]);
  });

  test("an edge to something that is not an item fails the build", () => {
    expect(() => buildGraph([item("badge", ["nope"])], {})).toThrow(/unknown @hansenexus\/nope/);
    expect(() =>
      buildGraph([item("badge")], { "src/badge.tsx": 'import { x } from "./gone";' })
    ).toThrow(/no item owns/);
  });

  test("the real registry: every item is a node, tokens reaches all, spinner carries delayed-visibility", () => {
    const graph = loadGraph();
    const names = registry.items.map((i) => i.name);
    expect(Object.keys(graph).sort()).toEqual([...names].sort());
    expect(graph.tokens?.usedBy).toHaveLength(names.length - 1);
    const datePicker = graph["delayed-visibility"]?.usedBy.find((d) => d.name === "date-picker");
    expect(datePicker?.path).toEqual(["date-picker", "spinner", "delayed-visibility"]);
    expect(graphSource(graph)).toStartWith("export const GRAPH = {");
  });
});

describe("item pages (#59)", () => {
  test("every registry item has a demo for its card", async () => {
    const { DEMOS } = await import("../gallery/demos");
    expect(Object.keys(DEMOS).sort()).toEqual(registry.items.map((i) => i.name).sort());
  });

  test("an item link keeps the view", () => {
    expect(itemHref("button", DEFAULT_VIEW)).toBe("?item=button");
    expect(itemHref("cx", { ...DEFAULT_VIEW, mode: "light", compare: "on" })).toBe(
      "?item=cx&mode=light&compare=on"
    );
  });
});
