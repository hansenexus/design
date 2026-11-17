import { expect, type Page, test } from "@playwright/test";

// The project picker of design#222: picking a project switches the pack in one step and links it.
// No pixel baselines here.

/** Below 768 px the tree with the picker is the "Scenes" tab. */
async function openScenes(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) < 768)
    await page
      .getByRole("navigation", { name: "Panes" })
      .getByRole("button", { name: "Scenes", exact: true })
      .click();
}

test("picking a project switches the pack and writes ?project=", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/gallery/?scene=projects");
  await expect(page.locator("[data-projects]")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "kommandant");
  await openScenes(page);
  await page.getByLabel("Project", { exact: true }).selectOption("fachwerk");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "fachwerk");
  await expect(page).toHaveURL(/[?&]project=fachwerk/);
  // The project's theme is the default under it, so ?project= is the whole link.
  await expect(page).not.toHaveURL(/[?&]theme=/);
  // The link holds: a reload comes back in the same pack with the project picked.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "fachwerk");
  await openScenes(page);
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue("fachwerk");
  expect(errors).toEqual([]);
});

test("a project that offers screens narrows the screens scene to its app", async ({ page }) => {
  await page.goto("/gallery/?scene=screens&project=example");
  await expect(page.locator("[data-app=example]")).toBeVisible();
  await expect(page.locator("[data-app]")).toHaveCount(1);
});
