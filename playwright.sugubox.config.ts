import { defineConfig } from "@playwright/test";

/**
 * Sugu Box smoke (V6: overview, stock, receptions, expeditions, movements
 * and the two detail pages of the vendor) against the PRODUCTION build,
 * with the stand-in API of the shell smoke extended by
 * e2e/sugubox/mock-sugubox.mjs. No real backend is contacted: what the real
 * one does is checked by e2e/staging/sugubox.staging.spec.ts.
 *
 *   npx next build --webpack
 *   npx playwright test -c playwright.sugubox.config.ts
 */
const APP_PORT = 3280;
// Not 4190: `fetch` refuses that port. Not 4054 to 4153 either: Windows reserves them once Docker runs.
const API_PORT = 4170;

export default defineConfig({
  testDir: "./e2e/sugubox",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 4,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node e2e/shell/mock-api.mjs",
      url: `http://127.0.0.1:${API_PORT}/api/v1/__log`,
      env: { MOCK_API_PORT: String(API_PORT), MOCK_API_EXTENSION: "e2e/sugubox/mock-sugubox.mjs", MOCK_APP_ORIGIN: `http://localhost:${APP_PORT}` },
      reuseExistingServer: false,
    },
    {
      command: `npx next start -p ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}/login`,
      // Server-side only: the BFF relays to the stand-in API.
      env: { API_BASE_URL: `http://127.0.0.1:${API_PORT}/api/v1` },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
