import { defineConfig } from "@playwright/test";

/**
 * Clients, Marketing and Statistics smoke (V7: the customers of a seller,
 * its codes and promotions, its statistics and those of an agency) against
 * the PRODUCTION build,
 * with the stand-in API of the shell smoke extended by
 * e2e/commerce/mock-commerce.mjs. No real backend is contacted: what the real
 * one does is checked by e2e/staging/commerce.staging.spec.ts.
 *
 *   npx next build --webpack
 *   npx playwright test -c playwright.commerce.config.ts
 */
const APP_PORT = 3290;
// Not 4190: `fetch` refuses that port. Not 4054 to 4153 either: Windows reserves them once Docker runs.
const API_PORT = 4180;

export default defineConfig({
  testDir: "./e2e/commerce",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 4,
  reporter: [["list"]],
  timeout: 60_000,
  // A list keeps its previous rows while the next answer loads: an assertion on its content waits for it.
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  // The stand-in keeps what a test creates. The specs that write run once
  // the others are done, one at a time, so no reading test sees their data.
  projects: [
    { name: "read", testIgnore: /writes\.spec\.ts/ },
    { name: "write", testMatch: /writes\.spec\.ts/, dependencies: ["read"], fullyParallel: false },
  ],
  webServer: [
    {
      command: "node e2e/shell/mock-api.mjs",
      url: `http://127.0.0.1:${API_PORT}/api/v1/__log`,
      env: { MOCK_API_PORT: String(API_PORT), MOCK_API_EXTENSION: "e2e/commerce/mock-commerce.mjs", MOCK_APP_ORIGIN: `http://localhost:${APP_PORT}` },
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
