import { defineConfig } from "@playwright/test";

/**
 * Messaging and support smoke (V8: the conversations of a seller, a courier
 * and an agency, and the tickets of a seller) against the PRODUCTION build,
 * with the stand-in API of the shell smoke extended by
 * e2e/messaging/mock-messaging.mjs. No real backend is contacted: what the
 * real one does is checked by e2e/staging/messaging.staging.spec.ts.
 *
 * The stand-in also opens a WebSocket that speaks the Pusher protocol on the
 * port the build connects to (NEXT_PUBLIC_REVERB_PORT, 8080 with the local
 * `.env`): the browser really joins its private channel through
 * /api/broadcasting/auth and really receives events. Stop a local Reverb
 * before running this suite.
 *
 *   npx next build --webpack
 *   npx playwright test -c playwright.messaging.config.ts
 */
const APP_PORT = 3300;
// Not 4190: `fetch` refuses that port. Not 4054 to 4153 nor 4232 to 4431: Windows reserves them once Docker runs.
const API_PORT = 4210;
const SOCKET_PORT = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080);

export default defineConfig({
  testDir: "./e2e/messaging",
  // One stand-in for every test, and conversations change when they are read
  // or written: the tests run one at a time, each from a fresh data set.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node e2e/shell/mock-api.mjs",
      url: `http://127.0.0.1:${API_PORT}/api/v1/__log`,
      env: { MOCK_API_PORT: String(API_PORT), MOCK_API_EXTENSION: "e2e/messaging/mock-messaging.mjs", MOCK_APP_ORIGIN: `http://localhost:${APP_PORT}`, MOCK_SOCKET_PORT: String(SOCKET_PORT) },
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
