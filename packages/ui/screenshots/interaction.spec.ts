import { expect, test } from "@playwright/test";

// Keyboard and ARIA behaviour of the overlay and navigation set, driven through the live
// triggers of the gallery's overlays and navigation scenes. No pixel baselines here.

test("command palette: shortcut, filter, arrow keys, Enter selects and closes", async ({
  page,
}) => {
  await page.goto("/gallery/?scene=overlays");
  await page.locator("body").press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole("combobox");
  await expect(input).toBeFocused();
  await input.fill("kran");
  await expect(dialog.getByRole("option")).toHaveCount(3);
  await expect(dialog.getByRole("status")).toHaveText("3 results");
  const first = await input.getAttribute("aria-activedescendant");
  await input.press("ArrowDown");
  const second = await input.getAttribute("aria-activedescendant");
  expect(second).not.toBe(first);
  await expect(page.locator(`[id="${second}"]`)).toHaveAttribute("aria-selected", "true");
  await input.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("picked")).toHaveText("kran-02");
});

test("command palette: arrows skip disabled items, Escape returns focus", async ({ page }) => {
  await page.goto("/gallery/?scene=overlays");
  const trigger = page.getByTestId("open-palette");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  const input = dialog.getByRole("combobox");
  await input.fill("pegel kran");
  await expect(dialog.getByRole("status")).toHaveText("Nothing matches “pegel kran”.");
  await input.fill("");
  for (let i = 0; i < 3; i++) await input.press("ArrowDown");
  // kran-01, kran-02, kran-04, (pegel is disabled) → Restart deployment
  const active = await input.getAttribute("aria-activedescendant");
  await expect(page.locator(`[id="${active}"]`)).toContainText("Restart deployment");
  await input.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("sheet and popover: open from the trigger, Escape closes, focus returns", async ({ page }) => {
  await page.goto("/gallery/?scene=overlays");
  const sheetTrigger = page.getByTestId("open-sheet");
  await sheetTrigger.click();
  const sheet = page.getByRole("dialog", { name: "kran-01" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Close" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(sheetTrigger).toBeFocused();

  const popTrigger = page.getByTestId("open-popover");
  await popTrigger.click();
  await expect(popTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("dialog", { name: "Snooze alerts", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(popTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(popTrigger).toBeFocused();
});

test("pagination: aria-current moves only after the page loaded", async ({ page }) => {
  await page.goto("/gallery/?scene=navigation");
  const pager = page.getByTestId("live-pager");
  const nav = pager.getByRole("navigation", { name: "Pagination" });
  await nav.getByRole("button", { name: "Page 3" }).click();
  await expect(nav).toHaveAttribute("aria-busy", "true");
  await expect(nav.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
  await expect(nav.locator("[data-pending]")).toHaveCount(1);
  await expect(nav.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
  await expect(nav).not.toHaveAttribute("aria-busy", "true");
  await expect(nav.getByRole("status")).toHaveText("Page 3 of 4");
  await expect(pager.getByRole("listitem").first()).toHaveText("pegel");
  await nav.getByRole("button", { name: "Next" }).click();
  await expect(nav.getByRole("button", { name: "Page 4" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("button", { name: "Next" })).toBeDisabled();
});
