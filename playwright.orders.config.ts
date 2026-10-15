import { defineConfig } from "@playwright/test";

/**
 * Seller orders smoke (V1) against the PRODUCTION build, with the stand-in
 * API of the shell smoke extended by e2e/orders/mock-orders.mjs.
 * No real backend is contacted.
 *
 *   npx next build --webpack
 *   npx playwright test -c playwright.orders.config.ts
 */
// Overridable: Windows reserves port ranges that move from one boot to the next.
const APP_PORT = Number(process.env.E2E_APP_PORT ?? 3210);
const API_PORT = Number(process.env.E2E_API_PORT ?? 4020);

export default defineConfig({
  testDir: "./e2e/orders",
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
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: [
    {
      command: "node e2e/shell/mock-api.mjs",
      url: `http://127.0.0.1:${API_PORT}/api/v1/__log`,
      env: { MOCK_API_PORT: String(API_PORT), MOCK_API_EXTENSION: "e2e/orders/mock-orders.mjs" },
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
