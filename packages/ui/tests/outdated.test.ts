import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  compareStamps,
  compareVersions,
  expandHeaders,
  findStamps,
  formatReport,
  indexUrl,
  loadIndex,
  registryConfig,
} from "../scripts/outdated";
import { buildRegistry, NAMESPACE, REGISTRIES, REGISTRY_URL, stamp } from "../scripts/registry";

function consumer(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "hn-consumer-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

describe("outdated (#65)", () => {
  test("finds stamped files and skips node_modules and unstamped files", () => {
    const dir = consumer({
      "components/ui/button.tsx": `${stamp("button", "0.2.0")}\nexport {};\n`,
      "components/ui/dialog.tsx": `${stamp("dialog", "0.3.0")}\n"use client";\n`,
      "components/ui/own.tsx": "export {};\n",
      "node_modules/x/index.tsx": `${stamp("button", "0.1.0")}\n`,
      "README.md": `${stamp("button", "0.1.0")}\n`,
    });
    expect(findStamps(dir)).toEqual([
      { file: "components/ui/button.tsx", item: "button", version: "0.2.0" },
      { file: "components/ui/dialog.tsx", item: "dialog", version: "0.3.0" },
    ]);
  });

  test("orders versions as semver", () => {
    expect(compareVersions("0.2.0", "0.3.0")).toBe(-1);
    expect(compareVersions("0.10.0", "0.9.0")).toBe(1);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.0-rc.1", "1.0.0")).toBe(-1);
    expect(compareVersions("1.0.0-rc.1", "1.0.0-rc.1")).toBe(0);
  });

  test("lists behind, current, ahead and unknown against meta.version", () => {
    const index = {
      items: [
        { name: "button", meta: { version: "0.3.0" } },
        { name: "dialog", meta: { version: "0.3.0" } },
        { name: "tabs", meta: { version: "0.3.0" } },
      ],
    };
    const rows = compareStamps(
      [
        { file: "a.tsx", item: "button", version: "0.2.0" },
        { file: "b.tsx", item: "dialog", version: "0.3.0" },
        { file: "c.tsx", item: "tabs", version: "0.4.0" },
        { file: "d.tsx", item: "gone", version: "0.3.0" },
      ],
      index
    );
    expect(rows.map((r) => [r.item, r.state, r.registry])).toEqual([
      ["button", "behind", "0.3.0"],
      ["dialog", "current", "0.3.0"],
      ["tabs", "ahead", "0.3.0"],
      ["gone", "unknown", null],
    ]);
    const report = formatReport(rows);
    expect(report.split("\n")).toEqual([
      "button  0.2.0 -> 0.3.0  a.tsx",
      "gone  0.3.0 -> (not in registry)  d.tsx",
      "outdated: 1 of 4 blocks behind, 1 unknown",
    ]);
    expect(formatReport([])).toBe("outdated: no stamped blocks found");
  });

  test("compares a consumer with a built registry end to end", async () => {
    const out = mkdtempSync(join(tmpdir(), "hn-registry-"));
    await buildRegistry(out, "2.0.0");
    const dir = consumer({
      "ui/button.tsx": `${stamp("button", "1.0.0")}\n`,
      "ui/dialog.tsx": `${stamp("dialog", "2.0.0")}\n`,
    });
    const rows = compareStamps(findStamps(dir), await loadIndex(out));
    expect(rows.map((r) => [r.item, r.state])).toEqual([
      ["button", "behind"],
      ["dialog", "current"],
    ]);
  });

  test("reads the registry from components.json, else the default, and fills ${VAR} headers", () => {
    const withConfig = consumer({
      "components.json": JSON.stringify({
        registries: {
          [NAMESPACE]: { url: "https://r.example/{name}.json", headers: { "X-Token": "${T}" } },
        },
      }),
    });
    expect(registryConfig(withConfig)).toEqual({
      url: "https://r.example/{name}.json",
      headers: { "X-Token": "${T}" },
    });
    expect(registryConfig(consumer({}))).toBe(REGISTRIES[NAMESPACE]);
    expect(indexUrl(REGISTRY_URL)).toBe("https://design.hansenexus.dev/r/registry.json");

    expect(
      expandHeaders(REGISTRIES[NAMESPACE].headers, {
        HN_REGISTRY_CLIENT_ID: "id",
        HN_REGISTRY_CLIENT_SECRET: "s3cret",
      })
    ).toEqual({ "CF-Access-Client-Id": "id", "CF-Access-Client-Secret": "s3cret" });
    let message = "";
    try {
      expandHeaders(REGISTRIES[NAMESPACE].headers, { HN_REGISTRY_CLIENT_ID: "id" });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("HN_REGISTRY_CLIENT_SECRET is not set");
    expect(message).not.toContain("id");
    expect(message).toContain("op-rw");
  });

  test("the build writes the registries entry to components.json", async () => {
    const out = mkdtempSync(join(tmpdir(), "hn-registry-"));
    await buildRegistry(out);
    const file = await Bun.file(join(out, "components.json")).json();
    expect(file).toEqual({ registries: REGISTRIES });
    const entry = file.registries[NAMESPACE];
    expect(entry.url).toBe(REGISTRY_URL);
    for (const value of Object.values(entry.headers) as string[])
      expect(value).toMatch(/^\$\{HN_REGISTRY_[A-Z_]+\}$/);
  });
});
