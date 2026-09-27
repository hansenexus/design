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

  test(`forms ${mode}`, async ({ page }, info) => {
    await page.goto(`/gallery/?scene=forms&mode=${mode}`);
    await page.evaluate(() => document.fonts.ready);
    // The pending form's Spinner appears after its 200 ms delay.
    await expect(page.locator('[data-phase="pending"] svg[role="status"]')).toHaveCount(1);
    await expect(page.locator('[role="alert"]')).toHaveCount(2);
    await expect(page).toHaveScreenshot(`forms-${info.project.name}-${mode}.png`, {
      fullPage: true,
    });
  });

  test(`layout ${mode}`, async ({ page }, info) => {
    await page.goto(`/gallery/?scene=layout&mode=${mode}`);
    await page.evaluate(() => document.fonts.ready);
    // Radix Avatar mounts the <img> only once it has loaded; the Spinner shows after 200 ms.
    await expect(page.locator('[role="img"][aria-label="hansenexus"] img')).toBeVisible();
    await expect(page.locator('svg[role="status"]')).toHaveCount(1);
    await expect(page).toHaveScreenshot(`layout-${info.project.name}-${mode}.png`, {
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

test("layout: dismiss closes an alert, the accordion works from the keyboard", async ({ page }) => {
  await page.goto("/gallery/?scene=layout");
  const backup = page.getByRole("status").filter({ hasText: "Backup finished" });
  await expect(backup).toBeVisible();
  await backup.getByRole("button", { name: "Dismiss" }).click();
  await expect(backup).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Schließen" })).toHaveCount(2);

  const pods = page.getByRole("button", { name: /speicher-web/ });
  const events = page.getByRole("button", { name: "Events" });
  await expect(pods).toHaveAttribute("aria-expanded", "true");
  await pods.focus();
  await page.keyboard.press("Enter");
  await expect(pods).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(events).toBeFocused();
  await page.keyboard.press("Space");
  await expect(events).toHaveAttribute("aria-expanded", "true");
  // The disabled item is skipped: End lands on Events, the last enabled header.
  await page.keyboard.press("Home");
  await page.keyboard.press("End");
  await expect(events).toBeFocused();
});
