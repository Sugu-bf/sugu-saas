import { defineConfig } from "@playwright/test";

/**
 * Design-system gallery checks (/dev/ui): five widths, key interactions,
 * overflow and Axe. Self-contained: the gallery sends no business request.
 *
 *   npx playwright test -c playwright.gallery.config.ts
 */
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e/gallery",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: {
    // Turbopack does not start on every workstation (see recon O.12).
    command: `npx next dev --webpack -p ${PORT}`,
    url: `http://localhost:${PORT}/dev/ui`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
