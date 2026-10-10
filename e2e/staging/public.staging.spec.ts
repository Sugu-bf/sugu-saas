import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Read-only checks of a DEPLOYED portal, without any account: nothing here
// signs in or sends a mutation. Run on purpose only:
//
//   STAGING_URL=https://pro-zk47m.sugu.pro npx playwright test -c playwright.staging.config.ts
//
// The signed-in acceptance run is described in docs/PRO_DASHBOARD_RECON.md (U.5).

const SHOTS = join(__dirname, "..", "..", "docs", "captures", "v1.1-staging");
mkdirSync(SHOTS, { recursive: true });

for (const width of [375, 1440]) {
  test(`login page renders at ${width}px without error, overflow or blocking a11y issue`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const offOrigin: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (/mysugu\.com$/.test(url.hostname) && url.protocol.startsWith("http")) offOrigin.push(request.url());
    });

    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /Se connecter/ })).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(axe.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? "")).map((v) => v.id)).toEqual([]);

    // The browser talks to the portal only: no direct call to the API host.
    expect(offOrigin).toEqual([]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: join(SHOTS, `login-${width}.png`) });
  });
}

test("a visitor without session is sent to the login page and back-link is kept", async ({ page }) => {
  await page.goto("/vendor/orders");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fvendor%2Forders$/);
  await expect(page.getByRole("button", { name: /Se connecter/ })).toBeVisible();
});

test("a wrong password is refused with a plain message and sets no session cookie", async ({ page, context }) => {
  await page.goto("/login");
  await page.locator('input[type="email"], input[name="email"]').first().fill("qa-probe-inexistant@sugu.invalid");
  await page.locator('input[type="password"]').first().fill("not-a-real-password");
  await page.getByRole("button", { name: /Se connecter/ }).click();

  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  const cookies = await context.cookies();
  expect(cookies.filter((cookie) => cookie.name.startsWith("sugu_"))).toEqual([]);
  expect(await page.evaluate(() => document.cookie)).not.toContain("sugu_");
  await page.screenshot({ path: join(SHOTS, "login-refused-1440.png") });
});
