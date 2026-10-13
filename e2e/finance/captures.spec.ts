import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { ALL, PHONE, PROFILES, WIDTHS, dialog, open, typeAmount, type Profile } from "./helpers";

// Review captures of the money screens, at the six widths, for the
// comparison with the mock-ups (docs/captures/references/v5-finances-planche-4.png).
// Not part of the suite: run with CAPTURE=1.
//
//   CAPTURE=1 npx playwright test -c playwright.finance.config.ts e2e/finance/captures.spec.ts
//
// The data is the fixture of e2e/finance/mock-finance.mjs, not real data: the
// captures show the composition, not an account.

const DIR = process.env.CAPTURE_DIR ?? "docs/captures/v5-finance";

const PAGES = [
  { name: "vue-ensemble", path: "" },
  { name: "historique", path: "/history" },
  { name: "retraits", path: "/withdrawals" },
  { name: "retrait-montant", path: "/withdraw" },
  { name: "methodes", path: "/methods" },
] as const;

/** `CAPTURE_ONLY=vue-ensemble,methodes`, `CAPTURE_PROFILES=vendor` and `CAPTURE_WIDTHS=390,1440` narrow a run. */
const only = process.env.CAPTURE_ONLY?.split(",");
const profiles = (process.env.CAPTURE_PROFILES?.split(",") as Profile[] | undefined) ?? ALL;
const widths = process.env.CAPTURE_WIDTHS ? process.env.CAPTURE_WIDTHS.split(",").map(Number) : WIDTHS;

test.describe("captures", () => {
  test.skip(!process.env.CAPTURE, "set CAPTURE=1 to take the review captures");
  test.beforeAll(() => mkdirSync(DIR, { recursive: true }));

  for (const profile of profiles) {
    for (const { name, path } of PAGES.filter((entry) => !only || only.includes(entry.name))) {
      test(`${profile} ${name}`, async ({ page, baseURL }) => {
        await open(page, baseURL, profile, path, { width: widths[0] });
        if (name === "retrait-montant") await typeAmount(page, profile === "courier" ? "50000" : "150000");
        await page.waitForLoadState("networkidle");

        for (const width of widths) {
          // The screen as it is seen: one viewport, bars included.
          await page.setViewportSize({ width, height: width < PHONE ? 844 : 900 });
          await page.waitForTimeout(150);
          await page.screenshot({ path: `${DIR}/${profile}-${name}-${width}.png` });
        }

        // Then the whole page on a phone: the scroller of the pages is made as tall as its content.
        await page.setViewportSize({ width: 390, height: 844 });
        const height = await page.locator("main").evaluate((main) => main.scrollHeight + (main.getBoundingClientRect().top + 8));
        await page.setViewportSize({ width: 390, height: Math.min(Math.max(height + 80, 844), 6000) });
        await page.waitForTimeout(250);
        await page.screenshot({ path: `${DIR}/${profile}-${name}-390-page.png` });
      });
    }

    test(`${profile} steps, result and dialogs at 390`, async ({ page, baseURL }) => {
      test.skip(Boolean(only), "narrowed run");
      await open(page, baseURL, profile, "/withdraw");
      await typeAmount(page, profile === "courier" ? "50000" : "150000");
      await page.getByRole("button", { name: "Continuer" }).click();
      await expect(page.getByRole("group", { name: "Méthode de paiement" })).toBeVisible();
      await page.screenshot({ path: `${DIR}/${profile}-retrait-methode-390.png` });
      await page.getByRole("button", { name: "Continuer" }).click();
      await expect(page.getByRole("heading", { name: "Vérifiez avant de confirmer" })).toBeVisible();
      await page.screenshot({ path: `${DIR}/${profile}-retrait-validation-390.png` });
      await page.getByRole("button", { name: "Confirmer le retrait" }).click();
      await expect(page.getByRole("heading", { name: "Demande enregistrée" })).toBeVisible();
      await page.screenshot({ path: `${DIR}/${profile}-retrait-enregistre-390.png` });

      await page.goto(`${PROFILES[profile].base}/history`);
      await page.locator("main ul[aria-label]").first().getByRole("button").first().click();
      await expect(dialog(page)).toBeVisible();
      await page.screenshot({ path: `${DIR}/${profile}-operation-detail-390.png` });
      await page.keyboard.press("Escape");

      await page.goto(`${PROFILES[profile].base}/methods`);
      await page.locator("main").getByRole("button", { name: "Ajouter", exact: true }).click();
      await expect(dialog(page)).toBeVisible();
      await page.screenshot({ path: `${DIR}/${profile}-methode-ajouter-390.png` });
    });
  }
});
