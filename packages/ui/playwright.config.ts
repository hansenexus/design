import { defineConfig } from "@playwright/test";

const PORT = 4410;

// Baselines at 390 and 1280 px, dark and light (the mode is a test parameter).
// Run through scripts/screenshots.sh, which pins the Linux image the baselines were made in.
export default defineConfig({
  testDir: "screenshots",
  snapshotPathTemplate: "{testDir}/baselines/{arg}{ext}",
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    colorScheme: "dark",
    deviceScaleFactor: 1,
  },
  expect: {
    toHaveScreenshot: { animations: "disabled", caret: "hide", maxDiffPixels: 0 },
  },
  projects: [
    { name: "390", use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: "1280", use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `bun scripts/gallery.ts --serve --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/gallery/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
