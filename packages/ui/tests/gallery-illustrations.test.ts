// The illustration-set axis of the gallery view (design#220): ?illustrations= is "auto" (the
// theme pack's default, pack.json "illustrations") or a set id, linkable, and survives the
// viewport iframe and the matrix cells.
import { describe, expect, test } from "bun:test";
import { DEFAULT_SET, SET_IDS } from "@hansenexus/illustrations/sets";
import { packIllustrations } from "../gallery/packs";
import {
  activeIllustrationSet,
  DEFAULT_VIEW,
  frameQuery,
  matrixQuery,
  readView,
  VIEW_OPTIONS,
  writeView,
} from "../gallery/view";

describe("gallery illustration set (design#220)", () => {
  test("the default follows the pack and stays out of the query", () => {
    expect(DEFAULT_VIEW.illustrations).toBe("auto");
    expect(writeView(new URLSearchParams(), DEFAULT_VIEW).has("illustrations")).toBe(false);
  });

  test("the choices are auto and every registered set", () => {
    expect(VIEW_OPTIONS.illustrations).toEqual(["auto", ...SET_IDS]);
    expect(VIEW_OPTIONS.illustrations).toContain("school");
    expect(VIEW_OPTIONS.illustrations).toContain("estate");
  });

  test("a set in the query round-trips; an unknown one falls back to auto", () => {
    const view = readView(new URLSearchParams("illustrations=school&theme=lexilink"));
    expect(view).toEqual({ ...DEFAULT_VIEW, theme: "lexilink", illustrations: "school" });
    const q = writeView(new URLSearchParams("scene=illustrations"), view);
    expect(q.get("illustrations")).toBe("school");
    expect(readView(q)).toEqual(view);
    expect(readView(new URLSearchParams("illustrations=fachwerk")).illustrations).toBe("auto");
  });

  test("the iframe and the matrix cells keep the set", () => {
    const view = { ...DEFAULT_VIEW, illustrations: "school", viewport: "390" as const };
    const query = new URLSearchParams("scene=illustrations");
    expect(frameQuery(query, view).get("illustrations")).toBe("school");
    expect(matrixQuery(query, view, "fachwerk", "light").get("illustrations")).toBe("school");
  });

  test("each pack's default comes from its pack.json; core themes get the default set", () => {
    expect(packIllustrations("fachwerk")).toBe("school");
    expect(packIllustrations("fachwerk@live")).toBe("school");
    expect(packIllustrations("lexilink")).toBe("estate");
    expect(packIllustrations("kommandant")).toBe(DEFAULT_SET);
  });

  test("auto resolves to the pack's default; a picked set wins under any pack", () => {
    expect(activeIllustrationSet({ illustrations: "auto" }, packIllustrations("fachwerk"))).toBe(
      "school"
    );
    expect(activeIllustrationSet({ illustrations: "auto" }, packIllustrations("kommandant"))).toBe(
      "estate"
    );
    expect(
      activeIllustrationSet({ illustrations: "school" }, packIllustrations("kommandant"))
    ).toBe("school");
    expect(activeIllustrationSet({ illustrations: "estate" }, packIllustrations("fachwerk"))).toBe(
      "estate"
    );
  });
});
