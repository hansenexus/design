// design#223: the Illustrations scene plays the animated motifs of the active set under the
// active motion set, draws them still under reduced motion, and keeps them out of the bare
// render the screenshot baselines take.
import { describe, expect, test } from "bun:test";
import { STATE_MOTIFS } from "@hansenexus/illustrations/sets";
import { IllustrationSetProvider } from "@hansenexus/illustrations/state";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Illustrations } from "../gallery/illustrations-scene";
import { BareContext, ViewProvider } from "../gallery/preview";
import { DEFAULT_VIEW, type View } from "../gallery/view";

function render(view: View, { bare = false, set }: { bare?: boolean; set?: string } = {}) {
  const tree: ReactNode = (
    <BareContext.Provider value={bare}>
      <ViewProvider view={view}>
        <IllustrationSetProvider set={set}>
          <Illustrations />
        </IllustrationSetProvider>
      </ViewProvider>
    </BareContext.Provider>
  );
  return renderToStaticMarkup(tree as never);
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("animated motifs in the Illustrations scene (design#223)", () => {
  test("plays the eight states of the active set, timed by the active motion set", () => {
    const html = render({ ...DEFAULT_VIEW, motionSet: "calm" });
    expect(count(html, "data-animated-motif=")).toBe(STATE_MOTIFS.length);
    // The motifs' attribute, not the stylesheet's selectors ([data-hn-motion="…"]).
    expect(count(html, ' data-hn-motion="')).toBe(STATE_MOTIFS.length);
    expect(html).toContain('data-motion-set="calm"');
    expect(html).toContain("Calm");
    for (const state of STATE_MOTIFS) expect(html).toContain(`data-hn-motion="estate/${state}"`);
  });

  test("follows the illustration set", () => {
    const html = render(DEFAULT_VIEW, { set: "school" });
    expect(html).toContain('data-animated-set="school"');
    expect(html).toContain('data-hn-motion="school/empty"');
  });

  test("reduced motion draws the still motifs", () => {
    const html = render({ ...DEFAULT_VIEW, motion: "reduced" });
    expect(count(html, "data-animated-motif=")).toBe(STATE_MOTIFS.length);
    expect(html).not.toContain("data-hn-motion=");
    expect(html).toContain("reduced motion, the still motifs");
  });

  test("stays out of the bare render", () => {
    const html = render(DEFAULT_VIEW, { bare: true });
    expect(html).not.toContain("data-animated-motif=");
    expect(count(html, "data-motif=")).toBe(STATE_MOTIFS.length);
  });
});
