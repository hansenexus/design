import { expect, test } from "@playwright/test";

const MODES = ["dark", "light"] as const;
const OVERLAYS = ["dialog", "menu", "select", "tooltip", "toast"] as const;

for (const mode of MODES) {
  test(`kit ${mode}`, async ({ page }, info) => {
    await page.goto(`/gallery/?scene=kit&mode=${mode}`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page).toHaveScreenshot(`kit-${info.project.name}-${mode}.png`, { fullPage: true });
  });

  test(`brand ${mode}`, async ({ page }, info) => {
    await page.goto(`/gallery/?scene=brand&mode=${mode}`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("h1")).toBeVisible();
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    await expect(page).toHaveScreenshot(`brand-${info.project.name}-${mode}.png`, {
      fullPage: true,
    });
  });

  test(`loading ${mode}`, async ({ page }, info) => {
    await page.goto(`/gallery/?scene=loading&mode=${mode}`);
    await page.evaluate(() => document.fonts.ready);
    // The Spinner in the button appears after its 200 ms delay: wait for all three rings.
    await expect(page.locator('svg[role="status"]')).toHaveCount(3);
    await expect(page).toHaveScreenshot(`loading-${info.project.name}-${mode}.png`, {
      fullPage: true,
    });
  });

  test(`states ${mode}`, async ({ page }, info) => {
    await page.goto(`/gallery/?scene=states&mode=${mode}`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('[role="progressbar"]')).toHaveCount(3);
    await expect(page).toHaveScreenshot(`states-${info.project.name}-${mode}.png`, {
      fullPage: true,
    });
  });

  test(`illustrations ${mode}`, async ({ page }, info) => {
    await page.goto(`/gallery/?scene=illustrations&mode=${mode}`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("[data-motif] svg")).toHaveCount(16);
    await expect(page).toHaveScreenshot(`illustrations-${info.project.name}-${mode}.png`, {
      fullPage: true,
    });
  });

  for (const scene of OVERLAYS) {
    test(`${scene} ${mode}`, async ({ page }, info) => {
      await page.goto(`/gallery/?scene=${scene}&mode=${mode}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(`[data-state$="open"]`).last()).toBeVisible();
      await expect(page).toHaveScreenshot(`${scene}-${info.project.name}-${mode}.png`);
    });
  }
}
