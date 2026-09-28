import { describe, expect, test } from "bun:test";
import { hashedName } from "../scripts/gallery";

describe("gallery hashedName (#50)", () => {
  test("same bytes give the same name, with the hash before the extension", () => {
    const a = hashedName("main.js", "console.log(1)");
    expect(a).toMatch(/^main\.[0-9a-f]{10}\.js$/);
    expect(hashedName("main.js", "console.log(1)")).toBe(a);
  });

  test("one changed character changes the name", () => {
    expect(hashedName("gallery.css", "a{}")).not.toBe(hashedName("gallery.css", "b{}"));
  });
});
