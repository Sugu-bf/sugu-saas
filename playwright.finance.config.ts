import { defineConfig } from "@playwright/test";

/**
 * Money smoke (V5: overview, history, requests, withdrawal, payout methods,
 * for the vendor, the agency and the courier) against the PRODUCTION build,
 * with the stand-in API of the shell smoke extended by
 * e2e/finance/mock-finance.mjs. No real backend is contacted: what the real
 * one does is checked by e2e/staging/finance.staging.spec.ts.
 *
 *   npx next build --webpack
 *   npx playwright test -c playwright.finance.config.ts
 */
const APP_PORT = 3270;
const API_PORT = 4080;

export default defineConfig({
  testDir: "./e2e/finance",
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
      env: { MOCK_API_PORT: String(API_PORT), MOCK_API_EXTENSION: "e2e/finance/mock-finance.mjs", MOCK_APP_ORIGIN: `http://localhost:${APP_PORT}` },
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
