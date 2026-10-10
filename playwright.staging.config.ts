import { defineConfig } from "@playwright/test";

/**
 * Read-only checks of a deployed portal (no account, no mutation).
 * Never part of CI: it needs STAGING_URL and talks to a real environment.
 *
 *   STAGING_URL=https://pro-zk47m.sugu.pro npx playwright test -c playwright.staging.config.ts
 */
const url = process.env.STAGING_URL;
if (!url) throw new Error("STAGING_URL is required, e.g. https://pro-zk47m.sugu.pro");
if (/^https:\/\/pro\.sugu\.pro/.test(url)) throw new Error("These checks are not meant for production.");

export default defineConfig({
  testDir: "./e2e/staging",
  testMatch: /.*\.staging\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: { baseURL: url, browserName: "chromium", viewport: { width: 1440, height: 900 } },
});
