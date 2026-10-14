import { mkdirSync } from "node:fs";
import { test } from "@playwright/test";
import { PHONE, WIDTHS, failNext, openScreen, resetStandIn, settled, signIn, thread, type Screen } from "./helpers";

// Review captures of the V8 screens, at the six widths, for the comparison
// with their mock-up (docs/captures/references/v8-messagerie-support-planche.png).
// Not part of the suite: run with CAPTURE=1.
//
//   CAPTURE=1 npx playwright test -c playwright.messaging.config.ts e2e/messaging/captures.spec.ts
//
// `CAPTURE_DIR` chooses the folder, `CAPTURE_ONLY=vendeur-conversation,tickets-liste`
// and `CAPTURE_WIDTHS=390,1440` narrow a run. The data is the fixture of
// e2e/messaging/mock-messaging.mjs, every name in it invented: the captures
// show the composition, not an account.

const DIR = process.env.CAPTURE_DIR ?? "docs/captures/v8-messaging-support";
const only = process.env.CAPTURE_ONLY?.split(",");
const widths = process.env.CAPTURE_WIDTHS ? process.env.CAPTURE_WIDTHS.split(",").map(Number) : WIDTHS;

const NAMES: Record<Screen, string> = {
  vendorList: "vendeur-conversations",
  vendorThread: "vendeur-conversation",
  courierList: "coursier-conversations",
  courierThread: "coursier-conversation",
  agencyList: "agence-conversations",
  agencyThread: "agence-conversation",
  tickets: "tickets-liste",
  ticket: "tickets-ticket",
  newTicket: "tickets-nouveau",
};

const wanted = (name: string) => !only || only.includes(name);
const heightOf = (width: number) => (width < PHONE ? 844 : 1024);

test.describe("captures", () => {
  test.skip(!process.env.CAPTURE, "set CAPTURE=1 to take the review captures");
  test.beforeAll(() => mkdirSync(DIR, { recursive: true }));
  test.beforeEach(async ({ page, baseURL }) => {
    await signIn(page, baseURL);
    await resetStandIn(page, baseURL);
  });

  for (const screen of (Object.keys(NAMES) as Screen[]).filter((entry) => wanted(NAMES[entry]))) {
    test(NAMES[screen], async ({ page, baseURL }) => {
      test.setTimeout(120_000);
      await openScreen(page, baseURL, screen, { width: widths[0] });
      await page.waitForLoadState("networkidle");
      await settled(page);

      for (const width of widths) {
        // The screen as it is seen: one viewport, bars included.
        await page.setViewportSize({ width, height: heightOf(width) });
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${DIR}/${NAMES[screen]}-${width}.png` });
      }
    });
  }

  test("vendeur-piece-jointe", async ({ page, baseURL }) => {
    test.skip(!wanted("vendeur-piece-jointe"));
    await openScreen(page, baseURL, "vendorThread", { width: 1440 });
    await page.goto("/vendor/messages/conv-shop-02");
    await settled(page);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: heightOf(width) });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${DIR}/vendeur-piece-jointe-${width}.png` });
    }
  });

  test("vendeur-menu-actions", async ({ page, baseURL }) => {
    test.skip(!wanted("vendeur-menu-actions"));
    for (const width of [390, 1440]) {
      await openScreen(page, baseURL, "vendorThread", { width });
      await settled(page);
      await thread(page).getByRole("button", { name: "Actions de la conversation" }).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${DIR}/vendeur-menu-actions-${width}.png` });
      await page.keyboard.press("Escape");
    }
  });

  test("vendeur-partager-un-produit", async ({ page, baseURL }) => {
    test.skip(!wanted("vendeur-partager-un-produit"));
    for (const width of [390, 1440]) {
      await openScreen(page, baseURL, "vendorThread", { width });
      await settled(page);
      await thread(page).getByRole("button", { name: "Actions de la conversation" }).click();
      await page.getByRole("menuitem", { name: "Partager un produit" }).click();
      await page.getByRole("dialog", { name: "Partager un produit" }).getByRole("listitem").first().waitFor();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${DIR}/vendeur-partager-un-produit-${width}.png` });
      await page.keyboard.press("Escape");
    }
  });

  test("vendeur-etats-des-messages", async ({ page, baseURL }) => {
    test.skip(!wanted("vendeur-etats-des-messages"));
    await openScreen(page, baseURL, "vendorThread", { width: 390 });
    await settled(page);
    // One sent, one that the server did not take: the two states a seller meets.
    await page.locator("[data-composer] textarea").fill("Oui, la taille 43 est en stock.");
    await page.locator("[data-composer] [data-send]").click();
    await thread(page).locator("[data-message]").nth(6).waitFor();
    await failNext(page, baseURL, ["error"]);
    await page.locator("[data-composer] textarea").fill("Je vous envoie la photo.");
    await page.locator("[data-composer] [data-send]").click();
    await thread(page).locator("[data-pending][data-state='failed']").waitFor();
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: heightOf(width) });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${DIR}/vendeur-etats-des-messages-${width}.png` });
    }
  });

  test("tickets-nouveau-erreurs", async ({ page, baseURL }) => {
    test.skip(!wanted("tickets-nouveau-erreurs"));
    await openScreen(page, baseURL, "newTicket", { width: 390 });
    await page.getByRole("form", { name: "Nouveau ticket" }).getByRole("button", { name: "Créer le ticket" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${DIR}/tickets-nouveau-erreurs-390.png` });
  });
});
