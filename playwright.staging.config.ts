import { defineConfig } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

/**
 * Checks of a DEPLOYED portal and of the backend behind it. Never part of CI:
 * it needs STAGING_URL and talks to a real environment.
 *
 *   STAGING_URL=https://pro-zk47m.sugu.pro npx playwright test -c playwright.staging.config.ts
 *
 * The signed-in runs need a QA account. Its password never travels on a
 * command line nor through a chat: it is read from the environment, or from
 * `.env.staging.local` at the root of the repository (ignored by Git, like
 * every `.env*`), one `NAME=value` per line:
 *
 *   STAGING_URL=https://pro-zk47m.sugu.pro
 *   STAGING_AGENCY_EMAIL=qa-agence@qa.sugu.test
 *   STAGING_AGENCY_PASSWORD=…
 *
 * A variable already set in the environment wins over the file.
 */
const LOCAL_ENV = ".env.staging.local";
if (existsSync(LOCAL_ENV)) {
  for (const line of readFileSync(LOCAL_ENV, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
}

const url = process.env.STAGING_URL;
if (!url) throw new Error("STAGING_URL is required, e.g. https://pro-zk47m.sugu.pro");
if (/^https:\/\/pro\.sugu\.pro/.test(url)) throw new Error("These checks are not meant for production.");

// What a run creates is named after this stamp. Set here once: a worker that
// restarts after a failure still finds what the run created before it.
process.env.STAGING_RUN_STAMP ??= new Date().toISOString().replace(/\D/g, "").slice(2, 12);

export default defineConfig({
  testDir: "./e2e/staging",
  testMatch: /.*\.staging\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  // No trace, no video: a recording would keep what was typed in the sign-in form.
  use: { baseURL: url, browserName: "chromium", viewport: { width: 1440, height: 900 }, trace: "off", video: "off" },
});
