import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { figures, open, openScreen, received, rows, settled, textOf } from "./helpers";

/** Every row of the list holds `text`, once the answer of the server replaced the rows of the previous one. */
async function everyRowHas(page: Page, text: string) {
  await expect(async () => {
    const texts = await rows(page).allInnerTexts();
    expect(texts.length).toBeGreaterThan(0);
    for (const row of texts) expect(row).toContain(text);
  }).toPass();
}

// What the V7 screens ask the server and show of its answer. Nothing here
// writes: the specs that do are in writes.spec.ts.

test.describe("clients", () => {
  test("the figures count the whole store, and each of them filters the list on the server", async ({ page, baseURL }) => {
    await openScreen(page, baseURL, "clients");
    await settled(page);

    const kpis = figures(page, "Vos clients en chiffres");
    await expect(kpis).toContainText("36");
    await expect(kpis.getByRole("button", { name: "Nouveaux (30 jours)" })).toBeVisible();
    // Ten rows of thirty-six: the counters are not those of the page.
    await expect(rows(page)).toHaveCount(10);
    await expect(page.getByText("1 à 10 sur 36 clients")).toBeVisible();

    await kpis.getByRole("button", { name: "Clients VIP" }).click();
    await settled(page);
    await expect(page).toHaveURL(/statut=vip/);
    await expect(rows(page)).toHaveCount(4);
    await everyRowHas(page, "VIP");
  });

  test("a status that only lives on the second page is found: the filter is the server's", async ({ page, baseURL }) => {
    await openScreen(page, baseURL, "clients");
    await settled(page);
    // Sorted by last order, the ten first rows hold no inactive customer…
    await expect(rows(page).filter({ hasText: "Inactif" })).toHaveCount(0);

    // …and the filter still finds the five of the store.
    await page.getByRole("combobox", { name: "Statut" }).selectOption({ label: "Inactif" });
    await settled(page);
    await expect(rows(page)).toHaveCount(5);
    await expect(page.getByText("1 à 5 sur 5 clients")).toBeVisible();
  });

  test("searches by name and by a phone typed with spaces, filters by city, and pages", async ({ page, baseURL }) => {
    await openScreen(page, baseURL, "clients");
    await settled(page);
    const search = page.getByRole("searchbox", { name: /Rechercher un client/ });

    await search.fill("traore");
    await expect(page).toHaveURL(/q=traore/);
    await everyRowHas(page, "Traoré");

    await search.fill("zzzz");
    await expect(page.getByText("Aucun client ne correspond")).toBeVisible();
    await page.getByRole("button", { name: "Tout afficher" }).click();
    await settled(page);
    await expect(rows(page)).toHaveCount(10);

    await page.getByRole("combobox", { name: "Ville" }).selectOption({ label: "Koudougou" });
    await expect(page).toHaveURL(/ville=Koudougou/);
    await everyRowHas(page, "Koudougou");

    await page.goto("/vendor/clients");
    await settled(page);
    const first = await textOf(rows(page).first());
    await page.getByRole("button", { name: "Page 2" }).click();
    await expect(page).toHaveURL(/page=2/);
    await settled(page);
    expect(await textOf(rows(page).first())).not.toBe(first);
  });

  test("sorts on the server, by the amount spent", async ({ page, baseURL }) => {
    await openScreen(page, baseURL, "clients");
    await settled(page);
    await page.getByRole("button", { name: /Total dépensé/ }).click();
    await expect(page).toHaveURL(/tri=spent&sens=asc/);
    await settled(page);
    await expect(rows(page).first()).toContainText("0 FCFA");
    await page.getByRole("button", { name: /Total dépensé/ }).click();
    await expect(page).toHaveURL(/sens=desc/);
    await settled(page);
    await expect(rows(page).first()).toContainText("542 000 FCFA");
  });

  test("a filtered address is found again after a reload", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/clients?statut=loyal&ville=Ouagadougou");
    await settled(page);
    await expect(page.getByRole("combobox", { name: "Statut" })).toHaveValue("loyal");
    await expect(page.getByRole("combobox", { name: "Ville" })).toHaveValue("Ouagadougou");
    await everyRowHas(page, "Fidèle");
  });

  test("opens the sheet of a customer, its orders linked to their detail, and comes back to the filtered list", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/clients?statut=vip");
    await settled(page);
    await rows(page).first().getByRole("button", { name: /Voir la fiche de/ }).click();
    await expect(page).toHaveURL(/statut=vip&client=cust-00/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/\w+ \w+/);

    const kpis = figures(page, "Chiffres du client");
    await expect(kpis).toContainText("Total dépensé");
    await expect(kpis).toContainText("Panier moyen");
    const order = page.locator("main").getByRole("link", { name: /SU-2099-/ }).first();
    await expect(order).toHaveAttribute("href", /\/vendor\/orders\/order-cust-/);
    await expect(page.getByRole("link", { name: "Voir toutes" })).toHaveAttribute("href", /\/vendor\/orders\?q=/);

    // Real means of contact only.
    await page.getByRole("button", { name: "Actions" }).click();
    await expect(page.getByRole("menuitem", { name: "Appeler" })).toHaveAttribute("href", /^tel:\+226/);
    await expect(page.getByRole("menuitem", { name: /WhatsApp|SMS/ })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await page.getByRole("link", { name: "Retour aux clients" }).click();
    await expect(page).toHaveURL(/\/vendor\/clients\?statut=vip$/);
    await expect(rows(page)).toHaveCount(4);
  });

  test("says that a customer of another store does not exist here", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/clients?client=cust-d-une-autre-boutique");
    await expect(page.getByText("Client introuvable")).toBeVisible();
    await expect(page.getByRole("link", { name: "Revenir à la liste" })).toBeVisible();
  });

  test("says a failure of the server without showing a figure of its own", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/clients?q=panne");
    await expect(page.getByText("Clients indisponibles")).toBeVisible();
    await expect(page.getByText(/SQLSTATE/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  });
});

test.describe("marketing", () => {
  test("lists every code with the state the server computed, amounts in francs", async ({ page, baseURL }) => {
    await openScreen(page, baseURL, "codes");
    const table = page.getByRole("table", { name: "Codes promotionnels" });
    await expect(table.getByRole("row")).toHaveCount(7);
    const row = (code: string) => table.getByRole("row").filter({ hasText: code });

    await expect(row("SUGU10")).toContainText("Pourcentage");
    await expect(row("SUGU10")).toContainText("−10 %");
    await expect(row("SUGU10")).toContainText("Min. 10 000 FCFA");
    await expect(row("SUGU10")).toContainText("245 / 500");
    await expect(row("SUGU10")).toContainText("Actif");
    await expect(row("BIENVENUE")).toContainText("−5 000 FCFA");
    await expect(row("ETE2026")).toContainText("À venir");
    await expect(row("FLASH20")).toContainText("Expiré");
    await expect(row("PAUSE")).toContainText("Désactivé");

    const kpis = figures(page, "Vos codes promotionnels en chiffres");
    await expect(kpis).toContainText("Codes actifs");
    await expect(kpis).toContainText("1 257");
    // Nothing the server does not measure.
    await expect(page.getByText(/ROI|clients acquis|chiffre d'affaires généré/i)).toHaveCount(0);
  });

  test("the promotions tab is in the address, with the price the server computed", async ({ page, baseURL }) => {
    await openScreen(page, baseURL, "codes");
    await page.getByRole("tab", { name: /Promotions produits/ }).click();
    await expect(page).toHaveURL(/onglet=promotions/);
    await expect(page.getByRole("button", { name: "Créer une promotion" })).toBeVisible();

    const table = page.getByRole("table", { name: "Promotions produits" });
    const baskets = table.getByRole("row").filter({ hasText: "Baskets Sport" });
    await expect(baskets).toContainText("25 000 FCFA");
    await expect(baskets).toContainText("20 000 FCFA");
    await expect(baskets).toContainText("−20 %");
    await expect(table.getByRole("row").filter({ hasText: "Sac à main" })).toContainText("15 000 FCFA");
    await expect(table.getByRole("row").filter({ hasText: "T-shirt Coton" })).toContainText("À venir");
    await expect(table.getByRole("row").filter({ hasText: "Casque Audio" })).toContainText("Expiré");

    await page.reload();
    await expect(page.getByRole("tab", { name: /Promotions produits/ })).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("statistiques vendeur", () => {
  test("each period is asked of the server and changes the figures and the chart", async ({ page, baseURL }) => {
    await openScreen(page, baseURL, "statistics");
    await settled(page);
    const kpis = figures(page, "Chiffres de la période");
    const chart = page.getByRole("img", { name: /^Ventes du/ });

    await expect(page.locator("[data-period='30j']")).toContainText("13 sept. – 12 oct. 2026");
    await expect(page.getByRole("table", { name: /^Ventes par jour/ }).locator("tbody tr")).toHaveCount(30);
    const month = await textOf(kpis);
    const monthChart = await chart.getAttribute("aria-label");

    await page.getByRole("button", { name: "7 jours" }).first().click();
    await expect(page).toHaveURL(/periode=7j/);
    await expect(page.locator("[data-period='7j']")).toContainText("6 oct. – 12 oct. 2026");
    await settled(page);
    await expect(page.getByRole("table", { name: /^Ventes par jour/ }).locator("tbody tr")).toHaveCount(7);
    expect(await textOf(kpis)).not.toBe(month);
    expect(await chart.getAttribute("aria-label")).not.toBe(monthChart);

    await page.getByRole("button", { name: "90 jours" }).first().click();
    await expect(page.locator("[data-period='90j']")).toBeVisible();
    await settled(page);
    await expect(page.getByRole("table", { name: /^Ventes par jour/ }).locator("tbody tr")).toHaveCount(90);
    // The period before is empty in the fixture: no rate is shown, none is made up.
    await expect(kpis.getByText(/%/)).toHaveCount(0);
    await expect(kpis).toContainText("Avant : 0");

    const asked = (await received(page)).filter((entry) => entry.path === "/sellers/statistics").map((entry) => entry.period);
    expect(asked).toEqual(expect.arrayContaining(["30j", "7j", "90j"]));
  });

  test("takes two dates, and refuses an end before its start", async ({ page, baseURL }) => {
    await openScreen(page, baseURL, "statistics");
    await page.getByRole("button", { name: "Dates" }).first().click();
    const from = page.getByLabel("Du", { exact: true }).first();
    const to = page.getByLabel("Au", { exact: true }).first();

    await from.fill("2026-10-05");
    await to.fill("2026-10-01");
    await expect(page.getByText("La date de fin précède la date de début.").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Appliquer" }).first()).toBeDisabled();

    await from.fill("2026-10-01");
    await to.fill("2026-10-05");
    await page.getByRole("button", { name: "Appliquer" }).first().click();
    await expect(page).toHaveURL(/du=2026-10-01&au=2026-10-05/);
    await expect(page.locator("[data-period='custom']")).toContainText("1 oct. – 5 oct. 2026");
    await expect(page.getByRole("table", { name: /^Ventes par jour/ }).locator("tbody tr")).toHaveCount(5);
  });

  test("a day of the curve is read with the pointer and with the keyboard", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/statistics?periode=7j");
    await settled(page);
    const chart = page.getByRole("img", { name: /^Ventes du/ });
    const box = (await chart.boundingBox())!;
    await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2);
    const readout = page.locator("main").getByRole("status").filter({ hasText: "Chiffre d'affaires" });
    await expect(readout).toContainText("lundi 12 octobre");
    await expect(readout).toContainText("Commandes");

    await chart.focus();
    await page.keyboard.press("Home");
    await expect(readout).toContainText("mardi 6 octobre");
    await page.keyboard.press("ArrowRight");
    await expect(readout).toContainText("mercredi 7 octobre");
  });

  test("shows what was sold, by category and by product, and nothing it used to make up", async ({ page, baseURL }) => {
    await openScreen(page, baseURL, "statistics");
    await settled(page);
    const main = page.locator("main");

    await expect(main.getByRole("heading", { name: "Répartition par catégorie" })).toBeVisible();
    await expect(main.getByText("Mode", { exact: true })).toBeVisible();
    await expect(main.getByText("42 %")).toBeVisible();
    const best = main.getByRole("link", { name: /Baskets Sport/ });
    await expect(best).toHaveAttribute("href", "/vendor/products/product-baskets");
    await expect(best).toContainText(/\d+ ventes/);
    await expect(main.getByRole("heading", { name: "Villes de livraison" })).toBeVisible();

    await expect(main.getByText(/Note moyenne|Taux de conversion|Entonnoir|Catégorie 1|Exporter PDF|avis clients/i)).toHaveCount(0);
    await expect(main.getByText(/4[.,]7|4[.,]5 ?\/ ?5/)).toHaveCount(0);
  });
});

test.describe("statistiques agence", () => {
  test("each period is asked of the server, for this agency, and changes the figures", async ({ page, baseURL }) => {
    await openScreen(page, baseURL, "agency");
    await settled(page);
    const kpis = figures(page, "Chiffres de la période");
    await expect(page.locator("[data-period='30j']")).toBeVisible();
    const month = await textOf(kpis);

    await page.getByRole("button", { name: "7 jours" }).first().click();
    await expect(page.locator("[data-period='7j']")).toContainText("6 oct. – 12 oct. 2026");
    await settled(page);
    expect(await textOf(kpis)).not.toBe(month);
    await expect(page.getByRole("table", { name: /^Livraisons par jour/ }).locator("tbody tr")).toHaveCount(7);

    await page.getByRole("button", { name: "90 jours" }).first().click();
    await expect(page.locator("[data-period='90j']")).toBeVisible();

    const asked = (await received(page)).filter((entry) => entry.path === "/agencies/21/statistics").map((entry) => entry.period);
    expect(asked).toEqual(expect.arrayContaining(["30j", "7j", "90j"]));
  });

  test("shows deliveries, their states and the couriers, and no money", async ({ page, baseURL }) => {
    await openScreen(page, baseURL, "agency");
    await settled(page);
    const main = page.locator("main");

    for (const label of ["Livraisons créées", "Livraisons effectuées", "En cours", "Échouées"]) await expect(figures(page, "Chiffres de la période")).toContainText(label);
    await expect(main.getByRole("heading", { name: "Répartition par statut" })).toBeVisible();
    await expect(main.locator("figcaption").getByText("Effectuées", { exact: true })).toBeVisible();
    await expect(main.getByRole("link", { name: /Moussa Kaboré/ })).toHaveAttribute("href", "/agency/drivers/courier-1");
    await expect(main.getByText(/Taux de réussite : \d/)).toBeVisible();
    await expect(main.getByRole("heading", { name: "Motifs d'échec" })).toBeVisible();

    expect(await main.innerText()).not.toMatch(/FCFA|Livreur du mois|Féliciter|Exporter/);
  });

  test("a seller is not shown the statistics of an agency", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/clients");
    const response = await page.request.get("/api/proxy/agencies/21/statistics?period=30j");
    expect(response.status()).toBe(403);
  });
});
