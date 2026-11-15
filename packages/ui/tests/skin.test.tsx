import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { loadRegistry } from "../scripts/registry";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  type Skin,
  skinSlots,
  ThemePack,
  type ThemePackDefinition,
} from "../src";

// The skin contract of design#143: a pack overrides molecules, organisms and templates through
// typed slots; without a pack, or for a slot the pack leaves out, the default renders unchanged.

const card = (
  <Card>
    <CardHeader>
      <CardTitle>Pegel</CardTitle>
    </CardHeader>
    <CardBody>3,2 m</CardBody>
  </Card>
);

const RULED: Skin<"card.header"> = ({ Base, className, ...props }) => (
  <Base {...props} className={["ruled", className].filter(Boolean).join(" ")} />
);

const pack = (skins: ThemePackDefinition["skins"]): ThemePackDefinition => ({ id: "t", skins });

describe("skins (design#143)", () => {
  test("a ThemePack without skins renders the default markup", () => {
    const plain = renderToStaticMarkup(card);
    expect(renderToStaticMarkup(<ThemePack pack={{ id: "t" }}>{card}</ThemePack>)).toBe(plain);
    expect(renderToStaticMarkup(<ThemePack pack={pack({})}>{card}</ThemePack>)).toBe(plain);
  });

  test("a slot the pack leaves out falls back to the default", () => {
    const html = renderToStaticMarkup(
      <ThemePack pack={pack({ "card.header": RULED })}>{card}</ThemePack>
    );
    expect(html).toContain(' ruled"');
    // card, title and body have no skin here: they render exactly as without a pack.
    const plain = renderToStaticMarkup(card);
    expect(html.replace(" ruled", "")).toBe(plain);
  });

  test("a skin receives the props and Base, and may replace Base outright", () => {
    const seen: string[] = [];
    const Empty: Skin<"empty-state"> = ({ Base, title, ...props }) => {
      seen.push(String(title));
      expect(typeof Base).toBe("function");
      return <Base {...props} title={title} />;
    };
    renderToStaticMarkup(
      <ThemePack pack={pack({ "empty-state": Empty })}>
        <EmptyState title="Nichts da" />
      </ThemePack>
    );
    expect(seen).toEqual(["Nichts da"]);

    const html = renderToStaticMarkup(
      <ThemePack pack={pack({ alert: ({ title }) => <aside>{title}</aside> })}>
        <Alert title="Achtung" />
      </ThemePack>
    );
    expect(html).toBe("<aside>Achtung</aside>");
  });

  test("an inner ThemePack replaces the outer one's skins for its subtree", () => {
    const outer = pack({ "card.header": RULED });
    const html = renderToStaticMarkup(
      <ThemePack pack={outer}>
        <ThemePack pack={{ id: "inner" }}>{card}</ThemePack>
      </ThemePack>
    );
    expect(html).toBe(renderToStaticMarkup(card));
  });

  test("a skin for one slot leaves every other slot alone", () => {
    const html = renderToStaticMarkup(<ErrorState />);
    expect(
      renderToStaticMarkup(
        <ThemePack pack={pack({ alert: () => null })}>{<ErrorState />}</ThemePack>
      )
    ).toBe(html);
  });

  test("every slot belongs to a molecule, organism or template: atoms never take a skin", () => {
    const level = new Map(loadRegistry().items.map((i) => [i.name, i.meta?.level]));
    const slots = skinSlots();
    expect(slots).toEqual(
      expect.arrayContaining(["alert", "card", "card.header", "empty-state", "error-state"])
    );
    for (const slot of slots) {
      const item = slot.split(".")[0] ?? slot;
      expect([slot, level.get(item)]).not.toEqual([slot, "atom"]);
      expect(["molecule", "organism", "template"]).toContain(level.get(item) as string);
    }
  });
});
