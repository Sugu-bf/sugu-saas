import { expect, test } from "@playwright/test";
import { TOUCH_TARGET, WIDTHS, blockingViolations, box, dialog, open, sidewaysOverflow, type Courier } from "./helpers";

// The courier screens at the six widths: what must be read is on screen,
// nothing is cut, covered or dragged sideways, a finger hits what it aims
// at, and no serious accessibility violation. A phone is the screen these
// are made for.

const SCREENS: { name: string; path: string; courier?: Courier; shows: (string | RegExp)[] }[] = [
  { name: "home", path: "/driver/dashboard", shows: ["Bonjour, Moussa", "À accepter", "Total cette semaine", "Prochaine mission", "SU-2026-000206", "12 500 FCFA"] },
  { name: "missions offered", path: "/driver/deliveries?liste=disponibles", shows: ["Disponibles", "En cours", "Terminées", "SU-2026-000209", "8 500 FCFA", "À encaisser (COD)"] },
  { name: "missions in hand", path: "/driver/deliveries", shows: ["SU-2026-000206", "SU-2026-000204", "Collecte", "Livraison"] },
  { name: "mission", path: "/driver/deliveries/mission-205", shows: ["Mission SU-2026-000205", "En transit", "Assignée", "Livrée", "Informations", "8 500 FCFA", "Contacter"] },
  { name: "mission COD Mixte", path: "/driver/deliveries/mission-203", shows: ["Paiement COD Mixte", "Frais de livraison", "1 500 FCFA", "5 000 FCFA"] },
  { name: "steps", path: "/driver/deliveries/mission-204/update", shows: ["Mettre à jour la mission", "SU-2026-000204", "Confirmer la collecte", "Remettre le colis", "Échec de livraison"] },
  { name: "history", path: "/driver/history", shows: ["Historique des missions", "(14 missions)", "SU-2026-000190", "5 750 FCFA"] },
  { name: "profile", path: "/driver/profile", shows: ["Mon profil", "Moussa Kaboré", "Vérification de compte", "Informations personnelles", "Se déconnecter"] },
  { name: "documents", path: "/driver/documents", shows: ["Mes documents", "Pièce d'identité", "Permis de conduire", "Carte grise", "Ajouter un document"] },
  { name: "add a document", path: "/driver/documents/new", shows: ["Ajouter un document", "Type de document", "Cliquez pour sélectionner un fichier", "Envoyer le document"] },
  { name: "file to complete", path: "/driver/documents", courier: "incomplete", shows: ["Dossier incomplet", "Vérifier mon statut", "Permis de conduire"] },
];

for (const { name, path, courier, shows } of SCREENS) {
  for (const width of WIDTHS) {
    test(`${name} at ${width}: everything is on screen, nothing is cut`, async ({ page, baseURL }) => {
      await open(page, baseURL, path, { width, courier });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");

      for (const text of shows) {
        // A list is drawn once as a table and once as cards: the one on screen is the one that counts.
        await expect(page.locator("main").getByText(text).filter({ visible: true }).first(), `« ${text} » is shown`).toBeVisible();
      }
      expect(await sidewaysOverflow(page), "nothing is dragged sideways").toBe(0);

      // No text of the page is clipped by its box: a figure or a name cut with an ellipsis is caught here.
      const clipped = await page.locator("main").evaluate((main) =>
        [...main.querySelectorAll<HTMLElement>("h1, h2, h3, [data-mission] *, [data-step] *, [data-document] *")]
          .filter((element) => element.children.length === 0 && element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).overflow !== "visible")
          .map((element) => element.textContent?.trim())
          .filter(Boolean),
      );
      // Addresses and names of a card are allowed their one line; a number or an amount never is.
      expect(clipped.filter((text) => /\d{3}|FCFA|SU-/.test(text ?? "")), "no number, amount or reference is cut").toEqual([]);
    });
  }

  test(`${name}: no serious accessibility violation`, async ({ page, baseURL }) => {
    await open(page, baseURL, path, { width: 390, courier });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await blockingViolations(page)).toEqual([]);
  });
}

test("on a phone, what a thumb presses is at least 44px tall", async ({ page, baseURL }) => {
  for (const path of ["/driver/dashboard", "/driver/deliveries?liste=disponibles", "/driver/deliveries/mission-205", "/driver/deliveries/mission-204/update", "/driver/documents"]) {
    await open(page, baseURL, path, { width: 375 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    const small = await page.locator("main").evaluate(
      (main, minimum) =>
        [...main.querySelectorAll<HTMLElement>("button, a[href]")]
          .filter((element) => element.offsetParent !== null)
          .map((element) => ({ text: (element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40), height: Math.round(element.getBoundingClientRect().height) }))
          // A link inside a sentence or a heading is text, not a button.
          .filter((entry) => entry.height < minimum && !["Voir tout", "© OpenStreetMap"].includes(entry.text) && !/^SU-/.test(entry.text)),
      TOUCH_TARGET - 8,
    );
    expect(small, path).toEqual([]);
  }
});

test("the action of a mission rests on the tab bar and covers nothing", async ({ page, baseURL }) => {
  for (const width of [375, 390]) {
    await open(page, baseURL, "/driver/deliveries/mission-205", { width });
    const action = page.getByRole("button", { name: "Confirmer l'arrivée" });
    const tabs = page.getByRole("navigation", { name: "Navigation rapide" });
    await expect(action).toBeVisible();

    const [bar, nav] = [await box(action), await box(tabs)];
    expect(bar.y + bar.height, "above the tab bar").toBeLessThanOrEqual(nav.y + 1);
    expect(bar.y + bar.height, "resting on it").toBeGreaterThan(nav.y - 24);

    // Scrolled to its end, the last line of the page is still above the bar.
    await page.locator("main").evaluate((main) => main.scrollTo(0, main.scrollHeight));
    const last = await box(page.getByRole("link", { name: "Toutes les étapes de la mission" }));
    expect(last.y + last.height).toBeLessThanOrEqual((await box(action)).y + 1);
  }
});

test("buttons and badges are fully rounded, like everywhere in the portal", async ({ page, baseURL }) => {
  await open(page, baseURL, "/driver/deliveries?liste=disponibles", { width: 390 });
  const card = page.locator("[data-mission]").first();
  const radius = (selector: string) => card.locator(selector).first().evaluate((element) => parseFloat(getComputedStyle(element).borderTopLeftRadius));
  expect(await radius("button")).toBeGreaterThanOrEqual(22);
  expect(await radius("[data-status]")).toBeGreaterThanOrEqual(10);
});

test("the three tabs of the missions share the width of a phone, none of them cut", async ({ page, baseURL }) => {
  for (const width of [375, 390]) {
    await open(page, baseURL, "/driver/deliveries", { width });
    for (const name of [/Disponibles/, /En cours/, /Terminées/]) {
      const tab = page.getByRole("tab", { name });
      const bounds = await box(tab);
      expect(bounds.x, "starts on screen").toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width, "ends on screen").toBeLessThanOrEqual(width);
      expect(await tab.evaluate((element) => element.scrollWidth <= element.clientWidth + 1), "its label is whole").toBe(true);
    }
  }
});

test("a dialog fits a phone and keeps its action in view", async ({ page, baseURL }) => {
  await open(page, baseURL, "/driver/deliveries/mission-204", { width: 375, height: 667 });
  await page.getByRole("button", { name: "J'ai livré le colis" }).click();
  const submit = dialog(page).getByRole("button", { name: "Valider la livraison" });
  await submit.scrollIntoViewIfNeeded();
  const bounds = await box(submit);
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(375);
  expect(await blockingViolations(page, '[role="dialog"]')).toEqual([]);
});

test("the history is a table where it has room, cards on a phone", async ({ page, baseURL }) => {
  await open(page, baseURL, "/driver/history", { width: 1024 });
  await expect(page.getByRole("region", { name: "Missions terminées" }).locator("thead th")).toHaveText(["Référence", "Date", "Client", "Statut", "Montant encaissé", "Actions"]);

  await open(page, baseURL, "/driver/history", { width: 390 });
  await expect(page.getByRole("list", { name: "Missions terminées" })).toBeVisible();
});
