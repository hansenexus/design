import { expect, test } from "@playwright/test";
import { listCategories } from "../scripts/variants";

// The vote scenes carry no pixel baselines: a board lives only until the owner decides, then
// its losers are deleted. These checks hold the layout instead, at 390 and 1280, dark and light.
const MODES = ["dark", "light"] as const;

for (const category of listCategories()) {
  for (const mode of MODES) {
    test(`vote ${category.id} ${mode}`, async ({ page }, info) => {
      await page.goto(`/gallery/?scene=vote&category=${category.id}&mode=${mode}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("h1")).toBeVisible();
      await expect(
        page.locator(`[data-vote="${category.decision ? "decided" : "open"}"]`)
      ).toBeVisible();

      // Every fixture draws every variant.
      const fixtures = page.locator("[data-fixture]");
      const count = await fixtures.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const cells = fixtures.nth(i).locator("[data-vote-variant]");
        await expect(cells).toHaveCount(category.variants.length);
      }

      // The page itself never scrolls sideways; at 390 only the fixture rows do.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);

      // Side by side: at 1280 a fixture's variants share one row; at 390 they sit in one
      // horizontal strip, the second peeking in from the right edge.
      const boxes = await fixtures
        .first()
        .locator("[data-vote-variant]")
        .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
      const tops = new Set(boxes.map((b) => Math.round(b.top)));
      expect(tops.size).toBe(1);
      if (info.project.name === "390" && boxes.length > 1) {
        expect(boxes[1]?.left ?? 0).toBeLessThan(390);
      }
    });
  }
}
