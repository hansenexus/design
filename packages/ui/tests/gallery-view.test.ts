import { describe, expect, test } from "bun:test";
import {
  DEFAULT_VIEW,
  frameQuery,
  installCommand,
  readView,
  viewAttributes,
  writeView,
} from "../gallery/view";

describe("gallery view (#57)", () => {
  test("an empty query is the default view, kommandant dark", () => {
    expect(readView(new URLSearchParams())).toEqual(DEFAULT_VIEW);
  });

  test("unknown values fall back to the default, known ones are kept", () => {
    const view = readView(new URLSearchParams("theme=nope&density=touch&mode=light&viewport=390"));
    expect(view).toEqual({ theme: "kommandant", density: "touch", mode: "light", viewport: "390" });
  });

  test("writeView round-trips, drops defaults and keeps the scene", () => {
    const view = { ...DEFAULT_VIEW, theme: "portal" as const, viewport: "1280" as const };
    const q = writeView(new URLSearchParams("scene=loading&mode=light"), view);
    expect(q.toString()).toBe("scene=loading&theme=portal&viewport=1280");
    expect(readView(q)).toEqual(view);
  });

  test("the iframe query is framed, not bare, and has no viewport of its own", () => {
    const view = { ...DEFAULT_VIEW, mode: "light" as const, viewport: "390" as const };
    const q = frameQuery(new URLSearchParams("scene=loading&viewport=390"), view);
    expect(q.get("viewport")).toBeNull();
    expect(q.get("bare")).toBeNull();
    expect(q.get("frame")).toBe("1");
    expect(q.get("mode")).toBe("light");
    expect(q.get("scene")).toBe("loading");
  });

  test("density auto leaves data-density unset so the theme picks it", () => {
    expect(viewAttributes(DEFAULT_VIEW)).toEqual({
      theme: "kommandant",
      mode: "dark",
      density: null,
    });
    expect(viewAttributes({ ...DEFAULT_VIEW, density: "compact" }).density).toBe("compact");
  });

  test("the install command names the registry item", () => {
    expect(installCommand("skeleton")).toBe("/design add skeleton");
  });
});
