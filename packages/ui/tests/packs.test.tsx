import { describe, expect, test } from "bun:test";
import { themes } from "@hansenexus/tokens";
import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEMOS } from "../gallery/demos";
import { levelOf } from "../gallery/levels";
import { PACKS, packFor } from "../gallery/packs";
import { GALLERY_THEMES, PACK_THEMES } from "../gallery/themes";
import { type Skins, skinSlots, ThemePack, type ThemePackDefinition } from "../src";

// The theme-pack contract of design#143, over every pack the gallery ships (themes/<app>/):
// a pack renders every atom, skins only slots above the atoms, and every slot it leaves out
// renders exactly the default. Contrast over every pack direction is @hansenexus/tokens'
// contrast check (allThemes()); the screenshots hold each pack's look.

const render = (name: string, pack?: ThemePackDefinition) => {
  const demo = DEMOS[name];
  if (!demo) throw new Error(`no demo for ${name}`);
  const node = demo();
  return renderToStaticMarkup(pack ? <ThemePack pack={pack}>{node}</ThemePack> : node);
};

const items = Object.keys(DEMOS).sort();
const atoms = items.filter((name) => levelOf(name) === "atom");
/** The item a slot belongs to: "card.header" is card's. */
const itemOf = (slot: string) => slot.split(".")[0] ?? slot;

/** Renders Base and a marker: a demo whose markup holds it reaches one of the pack's slots. */
const Probe = ({ Base, ...props }: { Base: ComponentType<object> }) => (
  <>
    <Base {...props} />
    <i data-skin-probe="" />
  </>
);
const probeOf = (pack: ThemePackDefinition): ThemePackDefinition => ({
  id: `${pack.id}-probe`,
  skins: Object.fromEntries(Object.keys(pack.skins ?? {}).map((slot) => [slot, Probe])) as Skins,
});

describe("theme packs (design#143)", () => {
  test("the gallery ships packs and offers each direction as a theme", () => {
    expect(PACKS.map((p) => p.id)).toContain("fachwerk");
    for (const pack of PACKS) {
      expect(GALLERY_THEMES).toContain(pack.id);
      expect(packFor(pack.id)).toBe(pack);
    }
    expect(packFor("hansenexus").skins).toBeUndefined();
    const unbundled = PACKS.map((p) => p.id).filter(
      (id) => !(themes as readonly string[]).includes(id)
    );
    expect(PACK_THEMES).toEqual(unbundled);
  });

  for (const pack of PACKS) {
    describe(pack.id, () => {
      test("renders every atom", () => {
        expect(atoms.length).toBeGreaterThan(20);
        for (const name of atoms) expect(render(name, pack).length, name).toBeGreaterThan(0);
      });

      test("skins only registered slots above the atoms", () => {
        const slots = skinSlots();
        for (const slot of Object.keys(pack.skins ?? {})) {
          expect(slots, slot).toContain(slot);
          expect(levelOf(itemOf(slot)), slot).not.toBe("atom");
        }
      });

      test("a demo that reaches none of its skins renders the default", () => {
        const probe = probeOf(pack);
        const plain = items.filter((name) => !render(name, probe).includes("data-skin-probe"));
        expect(plain.length).toBeGreaterThan(atoms.length);
        for (const name of plain) expect(render(name, pack), name).toBe(render(name));
      });

      test("an item it skins renders differently", () => {
        for (const slot of Object.keys(pack.skins ?? {})) {
          const name = itemOf(slot);
          if (DEMOS[name]) expect(render(name, pack), slot).not.toBe(render(name));
        }
      });
    });
  }
});
