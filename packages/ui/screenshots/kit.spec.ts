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

  for (const scene of OVERLAYS) {
    test(`${scene} ${mode}`, async ({ page }, info) => {
      await page.goto(`/gallery/?scene=${scene}&mode=${mode}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(`[data-state$="open"]`).last()).toBeVisible();
      await expect(page).toHaveScreenshot(`${scene}-${info.project.name}-${mode}.png`);
    });
  }
}
