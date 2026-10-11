import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PHONE, WIDTHS, dialog, open } from "./helpers";

// Review captures of the agency screens, at the six widths, for the
// comparison with the mock-ups (docs/captures/references/v3-agence-*.png).
// Not part of the suite: run with CAPTURE=1.
//
//   CAPTURE=1 npx playwright test -c playwright.agency.config.ts e2e/agency/captures.spec.ts
//
// The data is the fixture of e2e/agency/mock-agency.mjs, not real data: the
// captures show the composition, not an agency's day.

const DIR = process.env.CAPTURE_DIR ?? "docs/captures/v3-agency";

const PAGES = [
  { name: "tableau-de-bord", path: "/agency/dashboard" },
  { name: "livraisons", path: "/agency/deliveries" },
  { name: "fiche-livraison", path: "/agency/deliveries/ship-16" },
  { name: "fiche-livraison-cod-mixte", path: "/agency/deliveries/ship-15" },
  { name: "nouvelle-course", path: "/agency/deliveries/new" },
  { name: "livreurs", path: "/agency/drivers" },
  { name: "fiche-livreur", path: "/agency/drivers/courier-1" },
  { name: "nouveau-livreur", path: "/agency/drivers/new" },
  { name: "modifier-livreur", path: "/agency/drivers/courier-1/edit" },
] as const;

test.describe("captures", () => {
  test.skip(!process.env.CAPTURE, "set CAPTURE=1 to take the review captures");
  test.beforeAll(() => mkdirSync(DIR, { recursive: true }));

  for (const { name, path } of PAGES) {
    for (const width of WIDTHS) {
      test(`${name} at ${width}`, async ({ page, baseURL }) => {
        // The screen as it is seen: one viewport, bars included.
        await open(page, baseURL, path, { width, height: width < PHONE ? 812 : 900 });
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.waitForLoadState("networkidle");
        await page.screenshot({ path: `${DIR}/${name}-${width}.png` });

        // Then the whole page: the scroller of the pages is made as tall as its content.
        const height = await page.locator("main").evaluate((main) => main.scrollHeight + (main.getBoundingClientRect().top + 8));
        await page.setViewportSize({ width, height: Math.min(Math.max(height, 600), 6000) });
        await page.waitForTimeout(250);
        await page.screenshot({ path: `${DIR}/${name}-${width}-page.png` });
      });
    }
  }

  test("dialogs and menus at 1440", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/deliveries", { width: 1440 });
    await page.getByRole("region", { name: "Livraisons", exact: true }).locator("tbody tr").filter({ hasText: "SU-2026-078449" }).getByRole("button", { name: "Assigner" }).click();
    await expect(dialog(page).getByRole("radio").first()).toBeVisible();
    await page.screenshot({ path: `${DIR}/livraisons-assigner-1440.png` });
    await page.keyboard.press("Escape");

    await page.getByRole("region", { name: "Livraisons", exact: true }).locator("tbody tr").first().getByRole("button", { name: /Autres actions/ }).click();
    await page.screenshot({ path: `${DIR}/livraisons-menu-1440.png` });
    await page.keyboard.press("Escape");

    for (const number of ["SU-2026-078452", "SU-2026-078449"]) await page.getByRole("region", { name: "Livraisons", exact: true }).locator("tbody tr").filter({ hasText: number }).getByRole("checkbox").check();
    await page.screenshot({ path: `${DIR}/livraisons-selection-1440.png` });
  });

  test("the printed slip", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/deliveries/ship-16", { width: 794, height: 1123 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await page.screenshot({ path: `${DIR}/fiche-livraison-bon-imprime.png` });
  });

  test("phone: the filters sheet and a courier card opened", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/deliveries", { width: 390, height: 844 });
    await page.getByRole("button", { name: "Filtres" }).click();
    await expect(dialog(page).getByLabel("Statut")).toBeVisible();
    await page.screenshot({ path: `${DIR}/livraisons-filtres-390.png` });
  });
});
