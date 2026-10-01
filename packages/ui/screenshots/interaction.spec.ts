import { expect, test } from "@playwright/test";
import { SCENES } from "../gallery/view";

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
  await expect(nav.getByRole("link")).toHaveCount(SCENES.length);
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

test("compare: every card renders once per theme, side by side", async ({ page }) => {
  await page.goto("/gallery/?scene=loading");
  await page
    .getByRole("toolbar", { name: "Gallery view" })
    .getByLabel("Compare")
    .selectOption("on");
  await expect(page).toHaveURL(/compare=on/);
  const card = page.locator('[data-preview="spinner"]');
  const panels = card.locator("[data-compare]");
  await expect(panels).toHaveCount(4);
  for (const theme of ["hansenexus", "kommandant", "portal", "lexilink"])
    await expect(card.locator(`[data-compare="${theme}"]`)).toHaveAttribute("data-theme", theme);
  // Side by side where they fit (260 px each); at phone width they stack.
  const [a, b] = [await panels.nth(0).boundingBox(), await panels.nth(1).boundingBox()];
  const wide = (page.viewportSize()?.width ?? 0) >= 1280;
  expect(a && b && (wide ? Math.abs(a.y - b.y) < 1 && b.x > a.x : b.y > a.y)).toBe(true);
});

test("speed and motion scale the motion variables at the root and on compare panels", async ({
  page,
}) => {
  await page.goto("/gallery/?scene=loading&speed=0.25&compare=on");
  const read = (selector: string, name: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el, n) => getComputedStyle(el).getPropertyValue(n), name);
  expect(await read("html", "--hn-delay-pending")).toBe("800ms");
  expect(await read('[data-compare="portal"]', "--hn-spin-duration")).toBe("3200ms");
  await page
    .getByRole("toolbar", { name: "Gallery view" })
    .getByLabel("Motion")
    .selectOption("reduced");
  expect(await read("html", "--hn-pulse-duration")).toBe("0ms");
  expect(await read('[data-compare="portal"]', "--hn-min-visible-pending")).toBe("0ms");
  await page
    .getByRole("toolbar", { name: "Gallery view" })
    .getByLabel("Motion")
    .selectOption("full");
  await page.getByRole("toolbar", { name: "Gallery view" }).getByLabel("Speed").selectOption("1");
  expect(await read("html", "--hn-delay-pending")).toBe("200ms");
});

test("auto-loop: the QueryState card cycles loading, empty, error and success", async ({
  page,
}) => {
  await page.goto("/gallery/?scene=states");
  const card = page.locator('[data-preview="query-state"]');
  await card.getByRole("button", { name: /^Auto-loop/ }).click();
  // The QueryState container; ErrorState inside it carries a data-state of its own.
  const state = card.locator("[data-loop] [data-state]").first();
  for (const status of ["loading", "empty", "error", "data", "loading"])
    await expect(state).toHaveAttribute("data-state", status, { timeout: 5000 });
});

test("motion scene: every token group with a curve and a demo that replays", async ({ page }) => {
  await page.goto("/gallery/?scene=motion");
  for (const group of ["delay", "min-visible", "pulse", "shimmer", "spin", "duration"])
    await expect(page.locator(`[data-group="${group}"] [data-curve]`)).toHaveCount(1);
  await expect(page.locator("[data-token]")).toHaveCount(8);
  const card = page.locator('[data-preview="tokens"]').filter({ hasText: "pulse" });
  await expect(card.locator("[data-demo]")).toHaveAttribute("data-moved", "true");
  await card.getByRole("button", { name: /^Replay/ }).click();
  await expect(card.locator("[data-run]")).toHaveAttribute("data-run", "1");
  await expect(card.locator("[data-demo]")).toHaveAttribute("data-moved", "true");
});

test("scripted flow: plays in order, scrubs and replays", async ({ page }) => {
  await page.goto("/gallery/?scene=motion&speed=0.5");
  const flow = page.locator('[data-flow="palette-sheet"]');
  await expect(flow).toHaveAttribute("data-step", "0");
  await flow.getByRole("button", { name: "Play", exact: true }).click();
  for (const step of ["1", "2", "3", "4"])
    await expect(flow).toHaveAttribute("data-step", step, { timeout: 8000 });
  await expect(flow.locator("[data-flow-sheet]")).toBeVisible();
  await expect(flow.getByRole("button", { name: "Play", exact: true })).toBeVisible();

  const scrub = flow.getByRole("slider");
  await scrub.fill("0");
  await expect(flow).toHaveAttribute("data-step", "0");
  await expect(flow.locator("[data-flow-sheet]")).toHaveCount(0);
  await flow.getByRole("button", { name: /^3\. / }).click();
  await expect(flow).toHaveAttribute("data-step", "2");
  await expect(flow.getByRole("combobox")).toHaveValue("kran");

  await flow.getByRole("button", { name: "Play from start" }).click();
  await expect(flow).toHaveAttribute("data-step", "0");
  await expect(flow).toHaveAttribute("data-step", "1", { timeout: 8000 });
});

test("shell: the layout follows the shell's width, not the viewport's", async ({ page }, info) => {
  await page.goto("/gallery/?scene=shell");
  const [wide, phone] = [page.locator("[data-shell]").nth(0), page.locator("[data-shell]").nth(1)];
  const box = async (shell: typeof wide, panel: string) =>
    (await shell.locator(`[data-shell-panel="${panel}"]`).boundingBox()) ?? { x: 0, y: 0 };

  // The narrow frame: header on top, main, the tab bar at the bottom, no context pane.
  await expect(phone.locator('[data-shell-nav="tabs"]')).toBeVisible();
  await expect(phone.locator('[data-shell-nav="rail"]')).toBeHidden();
  await expect(phone.locator('[data-shell-panel="context"]')).toBeHidden();
  await expect(phone.getByRole("button", { name: "Hide context panel" })).toBeHidden();
  expect((await box(phone, "nav")).y).toBeGreaterThan((await box(phone, "main")).y);
  expect((await box(phone, "main")).y).toBeGreaterThan((await box(phone, "header")).y);

  if (info.project.name === "1280") {
    // The full-width card: the nav rail left of main, the context pane right of it.
    await expect(wide.locator('[data-shell-nav="rail"]')).toBeVisible();
    await expect(wide.locator('[data-shell-panel="context"]')).toBeVisible();
    expect((await box(wide, "nav")).x).toBeLessThan((await box(wide, "main")).x);
    expect((await box(wide, "context")).x).toBeGreaterThan((await box(wide, "main")).x);
    await wide.getByRole("button", { name: "Hide context panel" }).click();
    await expect(wide.locator('[data-shell-panel="context"]')).toHaveCount(0);
  }
});

test("shell: ⌘K opens its palette inside the shell, Enter runs the command", async ({ page }) => {
  await page.goto("/gallery/?scene=shell");
  const wide = page.locator("[data-shell]").nth(0);
  await page.locator("body").press("Control+k");
  // Only the shell that binds the shortcut opens, and its palette lives inside it.
  const dialog = wide.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  // The shell contains its overlay: in the gallery card the palette opens over the card.
  const [shellBox, dialogBox] = [await wide.boundingBox(), await dialog.boundingBox()];
  expect(dialogBox?.y ?? 0).toBeGreaterThan(shellBox?.y ?? Number.POSITIVE_INFINITY);
  const input = dialog.getByRole("combobox");
  await expect(input).toBeFocused();
  await input.fill("map");
  await input.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(wide.locator('nav a[href="#map"][aria-current="page"]').first()).toBeAttached();
});

test("shell: an ops preset mounts in the palette slot, the shell keeps focus and closing", async ({
  page,
}) => {
  await page.goto("/gallery/?scene=shell");
  const shell = page.locator("[data-shell]").nth(2);
  const trigger = shell.getByRole("button", { name: "Search or run a command" });
  await trigger.click();
  const dialog = shell.getByRole("dialog");
  await expect(dialog.locator('[data-preset="ops"]')).toBeVisible();
  const input = dialog.getByRole("combobox");
  await expect(input).toBeFocused();
  await input.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await dialog.getByRole("combobox").fill("restart");
  await dialog.getByRole("combobox").press("Enter");
  await expect(dialog).toBeHidden();
  await expect(shell.locator("[data-last-run]")).toHaveText("Ran: Restart lotsen-api");
});
