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

test("scene nav: every scene linked, the current one marked, links resolve, bare hides it", async ({
  page,
}) => {
  await page.goto("/gallery/?scene=states");
  const nav = page.getByRole("navigation", { name: "Gallery scenes" });
  await expect(nav.getByRole("link")).toHaveCount(16);
  await expect(nav.locator('[aria-current="page"]')).toHaveText("states");
  await expect(nav.getByRole("link", { name: "kit", exact: true })).toHaveAttribute("href", "./");
  await nav.getByRole("link", { name: "forms", exact: true }).click();
  await expect(page).toHaveURL(/\/gallery\/\?scene=forms$/);
  await expect(nav.locator('[aria-current="page"]')).toHaveText("forms");
  await nav.getByRole("link", { name: "kit", exact: true }).click();
  await expect(page).toHaveURL(/\/gallery\/$/);
  await expect(nav.locator('[aria-current="page"]')).toHaveText("kit");

  await page.goto("/gallery/?scene=states&bare=1");
  await expect(page.locator('[role="progressbar"]')).toHaveCount(3);
  await expect(nav).toHaveCount(0);
});

test("preview card: replay remounts, the Spinner waits its 200 ms again", async ({ page }) => {
  await page.goto("/gallery/?scene=loading");
  const card = page.locator('[data-preview="spinner"]');
  await expect(card.locator('svg[role="status"]')).toHaveCount(3);
  await card.getByRole("button", { name: /^Replay/ }).click();
  await expect(card.locator("[data-run]")).toHaveAttribute("data-run", "1");
  await expect(card.locator('svg[role="status"]')).toHaveCount(3);
});

test("view toolbar: theme, density and mode land on <html> and in the query", async ({ page }) => {
  await page.goto("/gallery/?scene=loading");
  const toolbar = page.getByRole("toolbar", { name: "Gallery view" });
  await toolbar.getByLabel("Theme").selectOption("portal");
  await toolbar.getByLabel("Density").selectOption("touch");
  await toolbar.getByLabel("Mode").selectOption("light");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "portal");
  await expect(html).toHaveAttribute("data-density", "touch");
  await expect(html).toHaveAttribute("data-mode", "light");
  await expect(page).toHaveURL(/theme=portal&density=touch&mode=light/);
  await expect(page.getByRole("link", { name: "states" })).toHaveAttribute("href", /theme=portal/);
});

test("view toolbar: a fixed viewport renders the scene in an iframe of that width", async ({
  page,
}) => {
  await page.goto("/gallery/?scene=loading");
  await page
    .getByRole("toolbar", { name: "Gallery view" })
    .getByLabel("Viewport")
    .selectOption("390");
  const frame = page.locator("iframe");
  await expect(frame).toHaveAttribute("width", "390");
  const inner = page.frameLocator("iframe");
  await expect(inner.getByRole("toolbar", { name: "Gallery view" })).toHaveCount(0);
  await expect(
    inner.locator('[data-preview="spinner"]').getByRole("button", { name: /^Replay/ })
  ).toBeVisible();
});
