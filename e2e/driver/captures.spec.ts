import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PHONE, WIDTHS, dialog, open, type Courier } from "./helpers";

// Review captures of the courier screens, at the six widths, for the
// comparison with the mock-ups (docs/captures/references/v4-coursier-planche-3.png).
// Not part of the suite: run with CAPTURE=1.
//
//   CAPTURE=1 npx playwright test -c playwright.driver.config.ts e2e/driver/captures.spec.ts
//
// The data is the fixture of e2e/driver/mock-driver.mjs, not real data: the
// captures show the composition, not a courier's day.

const DIR = process.env.CAPTURE_DIR ?? "docs/captures/v4-courier";

const PAGES: { name: string; path: string; courier?: Courier }[] = [
  { name: "accueil", path: "/driver/dashboard" },
  { name: "missions-disponibles", path: "/driver/deliveries?liste=disponibles" },
  { name: "missions-en-cours", path: "/driver/deliveries" },
  { name: "missions-terminees", path: "/driver/deliveries?liste=terminees" },
  { name: "mission-a-collecter", path: "/driver/deliveries/mission-206" },
  { name: "mission-en-transit", path: "/driver/deliveries/mission-205" },
  { name: "mission-cod-mixte", path: "/driver/deliveries/mission-203" },
  { name: "mission-etapes", path: "/driver/deliveries/mission-204/update" },
  { name: "historique", path: "/driver/history" },
  { name: "profil", path: "/driver/profile" },
  { name: "documents", path: "/driver/documents" },
  { name: "documents-ajouter", path: "/driver/documents/new?type=driver_license" },
  { name: "dossier-incomplet", path: "/driver/documents", courier: "incomplete" },
  { name: "dossier-refuse", path: "/driver/documents", courier: "rejected" },
  { name: "compte-suspendu", path: "/driver/profile", courier: "suspended" },
];

/** `CAPTURE_ONLY=accueil,profil` and `CAPTURE_WIDTHS=390,1440` narrow a run while a screen is being composed. */
const only = process.env.CAPTURE_ONLY?.split(",");
const widths = process.env.CAPTURE_WIDTHS ? process.env.CAPTURE_WIDTHS.split(",").map(Number) : WIDTHS;

test.describe("captures", () => {
  test.skip(!process.env.CAPTURE, "set CAPTURE=1 to take the review captures");
  test.beforeAll(() => mkdirSync(DIR, { recursive: true }));

  for (const { name, path, courier } of PAGES.filter((entry) => !only || only.includes(entry.name))) {
    for (const width of widths) {
      test(`${name} at ${width}`, async ({ page, baseURL }) => {
        // The screen as it is seen: one viewport, bars included.
        await open(page, baseURL, path, { width, height: width < PHONE ? 844 : 900, courier });
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

  test("dialogs and menus at 390", async ({ page, baseURL }) => {
    test.skip(Boolean(only), "narrowed run");
    await open(page, baseURL, "/driver/deliveries/mission-206");
    await page.getByRole("button", { name: "Confirmer la collecte" }).click();
    await expect(dialog(page).getByLabel("Code de collecte")).toBeVisible();
    await page.screenshot({ path: `${DIR}/dialogue-collecte-390.png` });
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Contacter" }).click();
    await expect(page.getByRole("menuitem", { name: "Écrire au client" })).toBeVisible();
    await page.screenshot({ path: `${DIR}/menu-contacter-390.png` });
    await page.keyboard.press("Escape");

    await page.goto("/driver/deliveries/mission-204");
    await page.getByRole("button", { name: "J'ai livré le colis" }).click();
    await expect(dialog(page).getByLabel("Code de livraison")).toBeVisible();
    await page.screenshot({ path: `${DIR}/dialogue-remise-390.png` });
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Signaler un échec" }).click();
    await expect(dialog(page).getByLabel("Que s'est-il passé ?")).toBeVisible();
    await page.screenshot({ path: `${DIR}/dialogue-echec-390.png` });
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(dialog(page)).toBeVisible();
    await page.screenshot({ path: `${DIR}/menu-390.png` });
  });
});
