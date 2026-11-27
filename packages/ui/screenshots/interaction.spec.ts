import { expect, type Page, test } from "@playwright/test";
import { BUILD_THEMES } from "../gallery/themes";
import { SCENES } from "../gallery/view";

// Keyboard and ARIA behaviour of the overlay and navigation set, driven through the live
// triggers of the gallery's overlays and navigation scenes. No pixel baselines here.

/**
 * Show a workbench pane (design#162) before using it. Below 768 px the panes are tabs. From 768 px
 * the tree and canvas always show and the inspector starts closed: an overlay below 1536 px, a
 * column from there.
 */
async function openPane(page: Page, name: "Scenes" | "Canvas" | "Inspect") {
  const width = page.viewportSize()?.width ?? 1280;
  if (width < 768) {
    await page
      .getByRole("navigation", { name: "Panes" })
      .getByRole("button", { name, exact: true })
      .click();
    return;
  }
  const toggle = page.locator('button[aria-label="Inspector"]');
  await toggle.waitFor();
  const open = (await toggle.getAttribute("aria-pressed")) === "true";
  if (name === "Inspect" ? !open : name === "Canvas" && width < 1536 && open) await toggle.click();
}

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

test("scene tree: every scene linked, the current one marked, links resolve, bare hides it", async ({
  page,
}) => {
  await page.goto("/gallery/?scene=states");
  await openPane(page, "Scenes");
  const nav = page.getByRole("navigation", { name: "Gallery scenes" });
  const scene = (id: string) => nav.locator(`[data-scene="${id}"]`);
  await expect(nav.locator("[data-scene]")).toHaveCount(SCENES.length);
  await expect(nav.locator('[data-scene][aria-current="page"]')).toHaveAttribute(
    "data-scene",
    "states"
  );
  await expect(scene("kit")).toHaveAttribute("href", "./");
  await scene("forms").click();
  await expect(page).toHaveURL(/\/gallery\/\?scene=forms$/);
  // A link loads the page anew; on a phone that lands on the canvas tab.
  await openPane(page, "Scenes");
  await expect(nav.locator('[data-scene][aria-current="page"]')).toHaveAttribute(
    "data-scene",
    "forms"
  );
  // The open scene lists its registry items; an item link opens the item page.
  await nav.locator('[data-item="checkbox"]').click();
  await expect(page).toHaveURL(/\/gallery\/\?item=checkbox$/);
  await openPane(page, "Scenes");
  await expect(nav.locator('[data-item="checkbox"]')).toHaveAttribute("aria-current", "page");
  await scene("kit").click();
  await expect(page).toHaveURL(/\/gallery\/$/);
  await openPane(page, "Scenes");
  await expect(nav.locator('[data-scene][aria-current="page"]')).toHaveAttribute(
    "data-scene",
    "kit"
  );

  await page.goto("/gallery/?scene=states&bare=1");
  await expect(page.locator('[role="progressbar"]')).toHaveCount(3);
  await expect(nav).toHaveCount(0);
});

test("scene tree: the filter keeps matching scenes and items, and says when nothing matches", async ({
  page,
}) => {
  await page.goto("/gallery/?scene=forms");
  await openPane(page, "Scenes");
  const nav = page.getByRole("navigation", { name: "Gallery scenes" });
  const filter = page.getByLabel("Filter scenes and items");
  await filter.fill("badge");
  await expect(nav.locator("[data-scene]")).toHaveCount(1);
  await expect(nav.locator('[data-item="status-badge"]')).toBeVisible();
  await filter.fill("zzz");
  await expect(nav.locator("[data-scene]")).toHaveCount(0);
  await expect(nav).toContainText("Nothing matches");
});

test("workbench: the inspector toggles, and the panes stay usable over a modal dialog", async ({
  page,
}) => {
  // From 1536 px the inspector is a column and starts open; below it overlays the canvas.
  await page.setViewportSize({ width: 1600, height: 900 });
  // The dialog scene holds a modal open, which hides the rest of the page from the ARIA tree,
  // so the chrome is found by its attributes here.
  await page.goto("/gallery/?scene=dialog");
  const inspector = page.locator('aside[aria-label="Inspector"]');
  const toggle = page.locator('button[aria-label="Inspector"]');
  await expect(inspector).toBeVisible();
  await toggle.click();
  await expect(inspector).toBeHidden();
  await toggle.click();
  await expect(inspector).toBeVisible();
  // The tree still takes the click over the modal.
  await page.locator('[data-workbench] [data-scene="menu"]').click();
  await expect(page).toHaveURL(/\?scene=menu$/);
});

test("workbench: below 768 px the panes are tabs", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/gallery/?scene=kit");
  const panes = page.getByRole("navigation", { name: "Panes" });
  const tree = page.getByRole("complementary", { name: "Scenes and items" });
  const inspector = page.getByRole("complementary", { name: "Inspector" });
  await expect(tree).toBeHidden();
  await expect(inspector).toBeHidden();
  await panes.getByRole("button", { name: "Scenes" }).click();
  await expect(tree).toBeVisible();
  await panes.getByRole("button", { name: "Inspect" }).click();
  await expect(tree).toBeHidden();
  await expect(inspector.getByRole("toolbar", { name: "Gallery view" })).toBeVisible();
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
  await openPane(page, "Inspect");
  const toolbar = page.getByRole("toolbar", { name: "Gallery view" });
  await toolbar.getByLabel("Direction").selectOption("portal");
  await toolbar.getByLabel("Density").selectOption("touch");
  await toolbar.getByLabel("Mode").selectOption("light");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "portal");
  await expect(html).toHaveAttribute("data-density", "touch");
  await expect(html).toHaveAttribute("data-mode", "light");
  await expect(page).toHaveURL(/theme=portal&density=touch&mode=light/);
  await expect(page.locator('[data-scene="states"]')).toHaveAttribute("href", /theme=portal/);
});

test("view toolbar: a fixed viewport renders the scene in an iframe of that width", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "390",
    "the viewport switch sits on the canvas toolbar, from 768 px"
  );
  await page.goto("/gallery/?scene=loading");
  await page
    .getByRole("radiogroup", { name: "Viewport" })
    .getByRole("radio", { name: "390", exact: true })
    .click();
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
  await openPane(page, "Inspect");
  const toolbar = page.getByRole("toolbar", { name: "Gallery view" });
  await toolbar.locator("summary", { hasText: "Compare" }).click();
  await toolbar
    .getByRole("group", { name: "Compare with" })
    .getByLabel("every theme of this build")
    .check();
  await expect(page).toHaveURL(/compare=on/);
  const card = page.locator('[data-preview="spinner"]');
  const panels = card.locator("[data-compare]");
  // Every theme of this build, the theme packs' directions included (design 143), no live copies.
  expect(BUILD_THEMES).toEqual(["hansenexus", "kommandant", "portal", "lexilink", "fachwerk"]);
  await expect(panels).toHaveCount(BUILD_THEMES.length);
  for (const theme of BUILD_THEMES)
    await expect(card.locator(`[data-compare="${theme}"]`)).toHaveAttribute("data-theme", theme);
  await openPane(page, "Canvas");
  // Side by side where they fit (260 px each); at phone width they stack.
  const [a, b] = [await panels.nth(0).boundingBox(), await panels.nth(1).boundingBox()];
  // The grid's own width decides, not the viewport's: two panels and the 12 px gap.
  const grid = await panels.first().locator("..").boundingBox();
  const wide = (grid?.width ?? 0) >= 2 * 260 + 12;
  expect(a && b && (wide ? Math.abs(a.y - b.y) < 1 && b.x > a.x : b.y > a.y)).toBe(true);
});

test("pack switcher: a pack picks its first direction, its live copy is a direction (design#149)", async ({
  page,
}) => {
  await page.goto("/gallery/?scene=loading");
  await openPane(page, "Inspect");
  const toolbar = page.getByRole("toolbar", { name: "Gallery view" });
  await toolbar.getByLabel("Pack").selectOption("fachwerk");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "fachwerk");
  await expect(toolbar.getByLabel("Direction").locator("option")).toHaveText([
    "fachwerk",
    /^fachwerk \(live, .+\)$/,
  ]);
  await toolbar.getByLabel("Direction").selectOption("fachwerk@live");
  await expect(html).toHaveAttribute("data-theme", "fachwerk@live");
  await expect(page).toHaveURL(/theme=fachwerk%40live/);
  // The live copy carries the pack's tokens.
  const border = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--hn-border-width").trim()
  );
  expect(border).toBe("2px");
});

test("compare: a list of themes, the candidate next to its live copy (design#149)", async ({
  page,
}) => {
  await page.goto("/gallery/?scene=loading&theme=fachwerk");
  await openPane(page, "Inspect");
  const toolbar = page.getByRole("toolbar", { name: "Gallery view" });
  await toolbar.locator("summary", { hasText: "Compare" }).click();
  const options = toolbar.getByRole("group", { name: "Compare with" });
  await expect(options.locator('[data-compare-option="fachwerk"]')).toBeDisabled();
  await options.locator('[data-compare-option="fachwerk@live"]').check();
  await options.locator('[data-compare-option="lexilink"]').check();
  await expect(page).toHaveURL(/compare=fachwerk%40live%2Clexilink/);
  const card = page.locator('[data-preview="spinner"]');
  await expect(card.locator("[data-compare]")).toHaveCount(3);
  for (const theme of ["fachwerk", "fachwerk@live", "lexilink"])
    await expect(card.locator(`[data-compare="${theme}"]`)).toHaveAttribute("data-theme", theme);
});

test("matrix: an app screen per compared theme, light and dark at 1280 and 390 (design#149)", async ({
  page,
}) => {
  await page.goto(
    "/gallery/?scene=screens&screen=example/machines&theme=fachwerk&compare=lexilink,fachwerk@live"
  );
  await openPane(page, "Inspect");
  await page.getByRole("toolbar", { name: "Gallery view" }).getByLabel("Matrix").selectOption("on");
  await expect(page).toHaveURL(/matrix=on/);
  await openPane(page, "Canvas");
  const matrix = page.locator("[data-matrix]");
  await expect(matrix).toHaveAttribute("data-matrix", "fachwerk,lexilink,fachwerk@live");
  await expect(matrix.locator("iframe")).toHaveCount(12);
  const cells = [
    ["fachwerk", "light", 1280],
    ["lexilink", "dark", 390],
    ["fachwerk@live", "dark", 1280],
  ] as const;
  for (const [theme, mode, width] of cells) {
    const frame = matrix.locator(
      `[data-matrix-column="${theme}"] iframe[title="${theme}, ${mode}, ${width} px"]`
    );
    await expect(frame).toHaveAttribute("width", String(width));
    await frame.scrollIntoViewIfNeeded();
    const inner = frame.contentFrame();
    await expect(inner.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(inner.locator("html")).toHaveAttribute("data-mode", mode);
    await expect(inner.locator("[data-screen][data-ready]")).toBeVisible();
    await expect(inner.getByRole("toolbar", { name: "Gallery view" })).toHaveCount(0);
  }
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
  await openPane(page, "Inspect");
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

test("the reduced-motion switch applies motion-reduce: styles whatever the OS says (#91)", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/gallery/?scene=loading");
  const ring = page.locator('[data-preview="spinner"] svg[role="status"]').first();
  const animation = () => ring.evaluate((el) => getComputedStyle(el).animationName);
  expect(await animation()).toBe("hn-spin");
  await openPane(page, "Inspect");
  const motion = page.getByRole("toolbar", { name: "Gallery view" }).getByLabel("Motion");
  await motion.selectOption("reduced");
  await expect(page.locator("html")).toHaveAttribute("data-reduced-motion", "");
  expect(await animation()).toBe("none");
  await motion.selectOption("full");
  await expect(page.locator("html")).not.toHaveAttribute("data-reduced-motion");
  expect(await animation()).toBe("hn-spin");
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
  const groups = ["delay", "min-visible", "pulse", "shimmer", "spin", "enter", "exit"];
  for (const group of [...groups, "stagger", "emphasis", "duration"])
    await expect(page.locator(`[data-group="${group}"] [data-curve]`)).toHaveCount(1);
  await expect(page.locator("[data-token]")).toHaveCount(12);
  const card = page.locator('[data-preview="tokens"]').filter({ hasText: "pulse" });
  await expect(card.locator("[data-demo]")).toHaveAttribute("data-moved", "true");
  await card.getByRole("button", { name: /^Replay/ }).click();
  await expect(card.locator("[data-run]")).toHaveAttribute("data-run", "1");
  await expect(card.locator("[data-demo]")).toHaveAttribute("data-moved", "true");
});

test("motion set: the picker sets data-motion and the query, the scene and compare follow (design#221)", async ({
  page,
}) => {
  await page.goto("/gallery/?scene=motion");
  const read = (selector: string, name: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el, n) => getComputedStyle(el).getPropertyValue(n), name);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "default");
  expect(await read("html", "--hn-duration-base")).toBe("200ms");
  await openPane(page, "Inspect");
  await page
    .getByRole("toolbar", { name: "Gallery view" })
    .getByLabel("Animation set")
    .selectOption("calm");
  await expect(page).toHaveURL(/motionSet=calm/);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
  expect(await read("html", "--hn-duration-base")).toBe("300ms");
  expect(await read("html", "--hn-enter-easing")).toBe("cubic-bezier(0.25, 0.1, 0.25, 1)");
  await openPane(page, "Canvas");
  await expect(page.locator("[data-active-set]")).toHaveAttribute("data-active-set", "calm");
  const compare = page.locator("[data-motion-compare]");
  await expect(compare.locator('[data-compare-set="calm"]')).toHaveCount(1);
  await compare.getByLabel("Compare with").selectOption("snappy");
  expect(await read('[data-compare-set="snappy"]', "--hn-enter-duration")).toBe("140ms");
  expect(await read('[data-compare-set="calm"]', "--hn-enter-duration")).toBe("320ms");
  await expect(page.locator('[data-choreo-row="kran-01"]').first()).toHaveAttribute(
    "data-shown",
    "true"
  );
  // Linked: a fresh load of the query lands on the same set.
  await page.goto("/gallery/?scene=motion&motionSet=snappy&speed=0.5");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "snappy");
  expect(await read("html", "--hn-duration-base")).toBe("280ms");
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

test("shell: the layout follows the shell's width, not the viewport's", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/gallery/?scene=shell");
  const story = (id: string) => page.locator(`[data-story="${id}"] [data-shell]`);
  const [desktop, tablet, phone] = [
    story("work-desktop"),
    story("work-tablet"),
    story("work-phone"),
  ];
  const box = async (shell: typeof desktop, panel: string) =>
    (await shell.locator(`[data-shell-panel="${panel}"]`).boundingBox()) ?? { x: 0, y: 0 };

  // Phone: header, slot, footer bar at the bottom; no nav column, no aside column.
  await expect(phone).toHaveAttribute("data-shell-width", "compact");
  await expect(phone.locator('[data-shell-panel="nav"]')).toBeHidden();
  await expect(phone.locator('[data-shell-panel="aside"]')).toBeHidden();
  await expect(phone.getByRole("button", { name: "Open navigation" })).toBeVisible();
  expect((await box(phone, "main")).y).toBeGreaterThan((await box(phone, "header")).y);
  expect((await box(phone, "footer")).y).toBeGreaterThan((await box(phone, "main")).y);

  // Tablet: the nav column, the aside as a sheet.
  await expect(tablet).toHaveAttribute("data-shell-width", "medium");
  await expect(tablet.locator('[data-shell-nav="rail"]').first()).toBeVisible();
  await expect(tablet.getByRole("button", { name: "Open navigation" })).toBeHidden();
  await expect(tablet.locator('[data-shell-panel="aside"]')).toBeHidden();

  // Desktop: nav column left of the page, the aside right of it, and the toggle folds it.
  await expect(desktop).toHaveAttribute("data-shell-width", "wide");
  await expect(desktop.locator('[data-shell-panel="aside"]')).toBeVisible();
  expect((await box(desktop, "nav")).x).toBeLessThan((await box(desktop, "main")).x);
  expect((await box(desktop, "aside")).x).toBeGreaterThan((await box(desktop, "main")).x);
  await desktop.getByRole("button", { name: "Hide context panel" }).click();
  await expect(desktop.locator('[data-shell-panel="aside"]')).toHaveCount(0);
});

test("shell: the phone drawer traps focus, closes on Escape and a swipe, restores focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/gallery/?scene=shell");
  const phone = page.locator('[data-story="work-phone"] [data-shell]');
  // By its hook, not its role: the open drawer hides the rest of the shell from the a11y tree.
  const menu = phone.locator('[data-shell-control="menu"]');
  await menu.click();
  const drawer = phone.getByRole("dialog", { name: "App" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("navigation", { name: "App" })).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  // Focus stays inside: tabbing past the last row wraps.
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(menu).toBeFocused();

  // A row closes it; a leftward swipe closes it.
  await menu.click();
  await drawer.getByRole("link", { name: /Watch/ }).click();
  await expect(drawer).toBeHidden();
  await menu.click();
  // Measure once the slide-in has settled, so the swipe lands on the drawer, not beside it.
  const shellBox = (await phone.boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 };
  await expect
    .poll(async () => Math.round((await drawer.boundingBox())?.x ?? -1))
    .toBeGreaterThanOrEqual(Math.floor(shellBox.x));
  const rect = (await drawer.boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 };
  const y = rect.y + rect.height / 2;
  await page.mouse.move(rect.x + rect.width - 20, y);
  await page.mouse.down();
  await page.mouse.move(rect.x + 20, y, { steps: 4 });
  await page.mouse.up();
  await expect(drawer).toBeHidden();
});

test("shell: below 1280 px the aside is a sheet from the header action", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/gallery/?scene=shell");
  const phone = page.locator('[data-story="work-phone"] [data-shell]');
  const toggle = phone.getByRole("button", { name: "Show context panel" });
  await toggle.click();
  const sheet = phone.getByRole("dialog", { name: "Context" });
  await expect(sheet).toBeVisible();
  // A bottom sheet: once it has slid in, it ends at the shell's bottom edge.
  const bottom = async (box: { y: number; height: number } | null) =>
    Math.round((box?.y ?? 0) + (box?.height ?? 0));
  const shellBottom = await bottom(await phone.boundingBox());
  await expect.poll(async () => bottom(await sheet.boundingBox())).toBe(shellBottom);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(toggle).toBeFocused();
});

test("shell: focus folds the aside, full drops the nav for a back link", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/gallery/?scene=shell&layout=focus");
  const focus = page.locator('[data-story="focus-desktop"] [data-shell]');
  await expect(focus).toHaveAttribute("data-layout", "focus");
  await expect(focus.locator('[data-shell-panel="aside"]')).toHaveCount(0);
  await focus.getByRole("button", { name: "Show context panel" }).click();
  await expect(focus.locator('[data-shell-panel="aside"]')).toBeVisible();

  await page.locator('[data-layout-pick="full"]').click();
  const full = page.locator('[data-story="full-desktop"] [data-shell]');
  await expect(full).toHaveAttribute("data-layout", "full");
  await expect(full.locator('[data-shell-panel="nav"]')).toHaveCount(0);
  await expect(full.getByRole("link", { name: "Machines" })).toBeVisible();
  await expect(
    page.locator('[data-story="full-phone"]').getByRole("button", { name: "Open navigation" })
  ).toHaveCount(0);
});

test("shell: a skip link is the first stop and lands on the slot", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/gallery/?scene=shell&bare=1");
  const desktop = page.locator('[data-story="work-desktop"] [data-shell]');
  const skip = desktop.getByRole("link", { name: "Skip to content" });
  await skip.focus();
  await expect(skip).toBeVisible();
  await skip.press("Enter");
  await expect(desktop.locator('[data-shell-panel="main"]')).toBeFocused();
});

test("shell: ⌘K opens its palette inside the shell, Enter runs the command", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/gallery/?scene=shell");
  const wide = page.locator('[data-story="work-desktop"] [data-shell]');
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
  const shell = page.locator('[data-story="work-preset"] [data-shell]');
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

test("context menu: right click opens it, the sub-menu and radio work from the keyboard", async ({
  page,
}) => {
  await page.goto("/gallery/?scene=controls");
  const target = page.getByTestId("context-target");
  await target.click({ button: "right" });
  const menu = page.getByRole("menu").filter({ hasText: "Open terminal" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitemcheckbox", { name: "Follow logs" })).toHaveAttribute(
    "aria-checked",
    "true"
  );
  const sub = menu.getByRole("menuitem", { name: "Move to quay" });
  await sub.focus();
  await page.keyboard.press("ArrowRight");
  const quays = page
    .getByRole("menu")
    .filter({ has: page.getByRole("menuitemradio") })
    .filter({
      hasText: "Quay 3",
    });
  await expect(quays).toBeVisible();
  await expect(quays.getByRole("menuitemradio", { name: "Quay 4" })).toHaveAttribute(
    "aria-checked",
    "true"
  );
  await expect(quays.getByRole("menuitemradio", { name: "Quay 3" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(quays).toBeHidden();
  await expect(page.getByTestId("context-quay")).toHaveText("3");

  await target.click({ button: "right" });
  await menu.getByRole("menuitem", { name: "Restart machine" }).click();
  await expect(menu).toBeHidden();
  await expect(page.getByTestId("context-picked")).toHaveText("Restart machine");
});

test("menu: the open sub-menu sits beside its trigger, radio marks one choice", async ({
  page,
}) => {
  await page.goto("/gallery/?scene=controls");
  const menus = page.locator("[data-frame] [role=menu]");
  await expect(menus).toHaveCount(2);
  const radios = page.getByRole("menu", { name: "Machine actions" }).getByRole("menuitemradio");
  await expect(radios).toHaveCount(3);
  await expect(page.getByRole("menuitemradio", { name: "Comfortable" })).toHaveAttribute(
    "aria-checked",
    "true"
  );
  const trigger = await page.getByRole("menuitem", { name: "Move to quay" }).boundingBox();
  const sub = await page.getByRole("menu", { name: "Move to quay" }).boundingBox();
  expect(sub && trigger && sub.x >= trigger.x + trigger.width - 8).toBe(true);
});

test("toggle, toggle group, slider: keyboard and ARIA", async ({ page }) => {
  await page.goto("/gallery/?scene=controls");
  const mute = page.getByRole("button", { name: "Mute alerts" }).first();
  await expect(mute).toHaveAttribute("aria-pressed", "false");
  await mute.focus();
  await page.keyboard.press("Space");
  await expect(mute).toHaveAttribute("aria-pressed", "true");

  const view = page.getByRole("radiogroup", { name: "View" });
  const grid = view.getByRole("radio", { name: "Grid" });
  await expect(grid).toHaveAttribute("aria-checked", "true");
  await grid.focus();
  await page.keyboard.press("ArrowRight");
  const list = view.getByRole("radio", { name: "List" });
  await expect(list).toBeFocused();
  await page.keyboard.press("Space");
  await expect(list).toHaveAttribute("aria-checked", "true");
  await expect(grid).toHaveAttribute("aria-checked", "false");

  const statuses = page.getByTestId("status-filter");
  const ok = statuses.getByRole("button", { name: "OK" });
  await ok.click();
  await expect(statuses.locator('[aria-pressed="true"]')).toHaveCount(3);
  // The disabled item is skipped by the arrow keys.
  await page.keyboard.press("ArrowRight");
  await expect(statuses.getByRole("button", { name: "Crit" })).toBeFocused();

  const replicas = page.getByRole("slider", { name: "Replicas" });
  await expect(replicas).toHaveAttribute("aria-valuenow", "3");
  await replicas.focus();
  await page.keyboard.press("ArrowRight");
  await expect(replicas).toHaveAttribute("aria-valuenow", "4");
  await page.keyboard.press("End");
  await expect(replicas).toHaveAttribute("aria-valuenow", "8");
  const min = page.getByRole("slider", { name: "Minimum" });
  await min.focus();
  await page.keyboard.press("Home");
  await expect(min).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByRole("slider", { name: "Maximum" })).toHaveAttribute(
    "aria-valuenow",
    "75"
  );
});
