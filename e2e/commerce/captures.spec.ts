import { mkdirSync } from "node:fs";
import { test } from "@playwright/test";
import { ALL, PHONE, WIDTHS, openScreen, settled, type Screen } from "./helpers";

// Review captures of the V7 screens, at the six widths, for the comparison
// with their mock-ups (docs/captures/references/v7-clients-marketing-stats-planche-*.png).
// Not part of the suite: run with CAPTURE=1.
//
//   CAPTURE=1 npx playwright test -c playwright.commerce.config.ts e2e/commerce/captures.spec.ts
//
// `CAPTURE_DIR` chooses the folder, `CAPTURE_ONLY=clients,codes` and
// `CAPTURE_WIDTHS=390,1440` narrow a run. The data is the fixture of
// e2e/commerce/mock-commerce.mjs, not real data: the captures show the
// composition, not an account.

const DIR = process.env.CAPTURE_DIR ?? "docs/captures/v7-clients-marketing-statistics";
const only = process.env.CAPTURE_ONLY?.split(",");
const widths = process.env.CAPTURE_WIDTHS ? process.env.CAPTURE_WIDTHS.split(",").map(Number) : WIDTHS;

const NAMES: Record<Screen, string> = {
  clients: "clients-liste",
  client: "clients-fiche",
  codes: "marketing-codes",
  promotions: "marketing-promotions",
  statistics: "statistiques-vendeur",
  agency: "statistiques-agence",
};

test.describe("captures", () => {
  test.skip(!process.env.CAPTURE, "set CAPTURE=1 to take the review captures");
  test.beforeAll(() => mkdirSync(DIR, { recursive: true }));

  for (const screen of ALL.filter((entry) => !only || only.includes(entry))) {
    test(NAMES[screen], async ({ page, baseURL }) => {
      await openScreen(page, baseURL, screen, { width: widths[0] });
      await page.waitForLoadState("networkidle");
      await settled(page);

      for (const width of widths) {
        // The screen as it is seen: one viewport, bars included.
        await page.setViewportSize({ width, height: width < PHONE ? 844 : 1024 });
        await page.waitForTimeout(250);
        await page.screenshot({ path: `${DIR}/${NAMES[screen]}-${width}.png` });
      }

      // Then the whole page on a phone: the scroller of the pages is made as tall as its content.
      await page.setViewportSize({ width: 390, height: 844 });
      const height = await page.locator("main").evaluate((main) => main.scrollHeight + (main.getBoundingClientRect().top + 8));
      await page.setViewportSize({ width: 390, height: Math.min(Math.max(height + 80, 844), 7000) });
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${DIR}/${NAMES[screen]}-390-page.png` });
    });
  }

  for (const [name, path, button, dialog] of [
    ["marketing-creer-un-code", "codes", "Créer un code", "Créer un code promotionnel"],
    ["marketing-creer-une-promotion", "promotions", "Créer une promotion", "Créer une promotion produit"],
    ["clients-ajouter", "clients", "Ajouter un client", "Ajouter un client"],
  ] as const) {
    test(name, async ({ page, baseURL }) => {
      test.skip(Boolean(only) && !only!.includes("dialogs"), "narrowed run");
      for (const width of [1440, 390]) {
        await openScreen(page, baseURL, path, { width });
        await page.setViewportSize({ width, height: width < PHONE ? 844 : 1024 });
        await page.getByRole("button", { name: button }).first().click();
        const box = page.getByRole("dialog", { name: dialog });
        await box.waitFor();
        if (name === "marketing-creer-une-promotion") {
          await box.getByRole("option", { name: /Baskets Sport/ }).click();
          await box.getByLabel("Valeur").fill("20");
        }
        if (name === "marketing-creer-un-code") {
          await box.getByLabel("Code").fill("SUGU10");
          await box.getByLabel("Valeur").fill("10");
          await box.getByLabel("Commande minimum").fill("10000");
          await box.getByLabel("Limite d'utilisation").fill("500");
        }
        await page.waitForTimeout(250);
        await page.screenshot({ path: `${DIR}/${name}-${width}.png` });
      }
    });
  }
});
