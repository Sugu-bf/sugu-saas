import { expect, test } from "@playwright/test";
import { cards, choose, confirmation, dialog, open, outage, pageAlert, received, rows, table } from "./helpers";

// Deliveries of an agency: the list (groups, filters, sort, pages), what each
// row asks for, the changes made to a selection, and the page of one delivery.
// Data: e2e/agency/mock-agency.mjs — 34 shipments, with the rules of Laravel.

const LIST = "/agency/deliveries";
const kpi = (page: import("@playwright/test").Page, name: string) => page.getByRole("region", { name: "Livraisons par situation" }).getByRole("button", { name });
const heading = (page: import("@playwright/test").Page) => page.getByRole("heading", { level: 2, name: /livraison/ });

test.describe("deliveries list", () => {
  test("counts every group, and each figure is the size of the list its card filters", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 1440 });
    await expect(heading(page)).toHaveText("34 livraisons");
    await expect(rows(page, "Livraisons")).toHaveCount(10);

    const groups = page.getByRole("region", { name: "Livraisons par situation" });
    await expect(groups).toContainText("À assigner5");
    await expect(groups).toContainText("En cours12");
    await expect(groups).toContainText("Échecs3");
    await expect(groups).toContainText("En retard3");
    // Six delivered today against three yesterday: the comparison is said in words, without an indicator beside the figure.
    await expect(groups).toContainText("Livrées aujourd'hui6Hier : 3");
    await expect(groups).not.toContainText("%");

    await kpi(page, "En retard").click();
    await expect(heading(page)).toHaveText("3 livraisons");
    await expect(kpi(page, "En retard")).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/scope=late/);
    // Each late row says so, next to its status.
    await expect(rows(page, "Livraisons").first()).toContainText("En retard");

    await kpi(page, "En retard").click();
    await expect(heading(page)).toHaveText("34 livraisons");
    await expect(page).not.toHaveURL(/scope=/);
  });

  test("points at the requests that wait for a decision, and lists them", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 1440 });
    const banner = pageAlert(page).filter({ hasText: "3 demandes attendent votre décision" });
    await banner.getByRole("button", { name: "Voir ces demandes" }).click();
    await expect(heading(page)).toHaveText("3 livraisons");
    await expect(page.getByLabel("Statut")).toHaveValue("to_accept");
    await expect(rows(page, "Livraisons")).toHaveCount(3);
    for (const row of await rows(page, "Livraisons").all()) await expect(row).toContainText("À accepter");
    // The banner has said what it had to.
    await expect(banner).toBeHidden();
  });

  test("searches on the server, filters by status, date, zone, courier and priority, and remembers it in the address", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 1440 });

    await page.getByRole("searchbox", { name: "N° de course, client, téléphone ou livreur" }).fill("sankara");
    await page.keyboard.press("Enter");
    await expect(heading(page)).toHaveText("3 livraisons");
    await expect(page).toHaveURL(/q=sankara/);
    await page.getByRole("button", { name: "Effacer la recherche" }).click();
    await expect(heading(page)).toHaveText("34 livraisons");

    await page.getByLabel("Statut").selectOption("in_transit");
    await expect(heading(page)).toHaveText("5 livraisons");
    await page.getByLabel("Zone").selectOption({ label: "Centre (9)" });
    await expect(page).toHaveURL(/status=in_transit.*zone=zone-centre/);

    // Courier and priority sit behind "Filtres avancés".
    await page.getByRole("button", { name: /Filtres avancés/ }).click();
    await dialog(page).getByLabel("Livreur").selectOption({ label: "Moussa Kaboré" });
    await dialog(page).getByRole("button", { name: "Voir les résultats" }).click();
    await expect(page).toHaveURL(/courier=user-1/);
    await expect(page.getByRole("button", { name: /Filtres avancés/ })).toContainText("1");

    // A reload lands on the same list. Its count is read once the filtered answer is shown: read too soon, it is still the count it replaces.
    await page.waitForLoadState("networkidle");
    const count = await heading(page).textContent();
    await page.reload();
    await expect(heading(page)).toHaveText(count ?? "");
    await expect(page.getByLabel("Statut")).toHaveValue("in_transit");

    await page.getByRole("button", { name: "Tout afficher" }).first().click();
    await expect(heading(page)).toHaveText("34 livraisons");
    await expect(page).toHaveURL(new RegExp(`${LIST}$`));
  });

  test("sorts on the server and pages with numbers, ten, twenty-five or fifty rows at a time", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 1440 });
    const pagination = page.getByRole("navigation", { name: "Pagination" });
    await expect(pagination).toContainText("Affichage de 1 à 10 sur 34 livraisons");

    await pagination.getByRole("button", { name: "Page 4" }).click();
    await expect(pagination).toContainText("Affichage de 31 à 34 sur 34 livraisons");
    await expect(rows(page, "Livraisons")).toHaveCount(4);
    await expect(page).toHaveURL(/page=4/);

    await pagination.getByLabel("Nombre de lignes par page").selectOption("25");
    await expect(pagination).toContainText("Affichage de 1 à 25 sur 34 livraisons");
    await expect(rows(page, "Livraisons")).toHaveCount(25);

    await table(page, "Livraisons").getByRole("button", { name: "Montant" }).click();
    await expect(page).toHaveURL(/sort=shipping_amount&dir=asc/);
    await expect(rows(page, "Livraisons").first()).toContainText("1 000 FCFA");
    await table(page, "Livraisons").getByRole("button", { name: "Montant" }).click();
    await expect(rows(page, "Livraisons").first()).toContainText("4 000 FCFA");
  });

  test("offers each row what it asks for first: a decision, a courier, a new attempt, or to be followed", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 1440 });
    const row = (number: string) => rows(page, "Livraisons").filter({ hasText: number });

    // A request: accept it. Until then no courier can be chosen for it.
    await row("SU-2026-078452").getByRole("button", { name: "Accepter" }).click();
    await expect(confirmation(page)).toContainText("Accepter la livraison SU-2026-078452 ?");
    await confirmation(page).getByRole("button", { name: "Accepter la livraison" }).click();
    await expect(page.getByText("Livraison SU-2026-078452 acceptée.")).toBeVisible();
    await expect(row("SU-2026-078452")).toContainText("À assigner");

    // Accepted: give it to a courier. Who cannot take it is listed, and cannot be chosen.
    await row("SU-2026-078452").getByRole("button", { name: "Assigner" }).click();
    await expect(dialog(page)).toContainText("Assigner la livraison SU-2026-078452");
    await expect(dialog(page).getByRole("radio", { name: /Mamadou Sanou/ })).toBeDisabled();
    await expect(dialog(page).getByRole("radio", { name: /Cheick Zongo/ })).toBeDisabled();
    await expect(dialog(page).getByRole("button", { name: "Assigner" })).toBeDisabled();
    await choose(dialog(page), /Awa Ilboudo/);
    await dialog(page).getByRole("button", { name: "Assigner" }).click();
    await expect(page.getByText("Livraison SU-2026-078452 confiée à Awa Ilboudo.")).toBeVisible();
    await expect(row("SU-2026-078452")).toContainText("À ramasser");
    await expect(row("SU-2026-078452")).toContainText("Awa Ilboudo");
    // In this column a courier is written « Awa I. »; the link still carries the whole name, to his page.
    await expect(row("SU-2026-078452").getByRole("link", { name: "Awa Ilboudo" })).toHaveText(/Awa I\./);
    await expect(row("SU-2026-078452").getByRole("link", { name: "Awa Ilboudo" })).toHaveAttribute("href", /\/agency\/drivers\//);
    // With a courier, the row is followed.
    await expect(row("SU-2026-078452").getByRole("link", { name: "Suivi" })).toHaveAttribute("href", /\/agency\/deliveries\/ship-01$/);

    expect((await received(page)).filter((entry) => entry.path.includes("ship-01"))).toEqual([
      { path: "/shipments/ship-01/accept", body: {} },
      { path: "/shipments/ship-01/assign", body: { courier_id: "user-7" } },
    ]);
  });

  test("moves a delivery through the statuses the server allows, and says why when it refuses", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}?status=in_transit`, { width: 1440 });
    const row = (number: string) => rows(page, "Livraisons").filter({ hasText: number });

    // Delivered: confirmed first, then done.
    await row("SU-2026-078437").getByRole("button", { name: /Autres actions/ }).click();
    await page.getByRole("menuitem", { name: "Marquer comme remise" }).click();
    await expect(confirmation(page)).toContainText("Vous confirmez que le colis a été remis au client.");
    await confirmation(page).getByRole("button", { name: "Marquer comme remise" }).click();
    await expect(page.getByText("Livraison SU-2026-078437 remise au client.")).toBeVisible();
    await expect(row("SU-2026-078437")).toHaveCount(0);

    // The customer never confirmed with the delivery code: the refusal is a sentence, not a code.
    await row("SU-2026-078434").getByRole("button", { name: /Autres actions/ }).click();
    await page.getByRole("menuitem", { name: "Marquer comme remise" }).click();
    await confirmation(page).getByRole("button", { name: "Marquer comme remise" }).click();
    await expect(page.getByText("le client n'a pas encore confirmé la réception avec son code de livraison")).toBeVisible();
    await expect(page.getByText(/SUGU-/)).toHaveCount(0);
    // The dialog stays open for a retry, and the row has not moved.
    await confirmation(page).getByRole("button", { name: "Annuler" }).click();
    await expect(row("SU-2026-078434")).toContainText("En livraison");

    // A failure asks why; the reason goes to the notes.
    await row("SU-2026-078434").getByRole("button", { name: /Autres actions/ }).click();
    await page.getByRole("menuitem", { name: "Déclarer un échec" }).click();
    await dialog(page).getByLabel("Motif de l'échec").fill("Client absent");
    await dialog(page).getByRole("button", { name: "Déclarer un échec" }).click();
    await expect(page.getByText("Livraison SU-2026-078434 déclarée en échec.")).toBeVisible();
    expect((await received(page)).at(-1)).toEqual({ path: "/shipments/ship-19/status", body: { status: "delivery_failed", memo: "Client absent" } });
  });

  test("refuses a request with a reason, and removes it from the list", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}?scope=awaiting_decision`, { width: 1440 });
    await rows(page, "Livraisons").filter({ hasText: "SU-2026-078451" }).getByRole("button", { name: /Autres actions/ }).click();
    await page.getByRole("menuitem", { name: "Refuser la livraison" }).click();

    // No reason, no refusal.
    await dialog(page).getByRole("button", { name: "Refuser la livraison" }).click();
    await expect(dialog(page)).toContainText("Indiquez le motif du refus");
    await dialog(page).getByLabel(/Motif du refus/).fill("Zone non desservie");
    await dialog(page).getByRole("button", { name: "Refuser la livraison" }).click();
    await expect(page.getByText("Livraison SU-2026-078451 refusée.")).toBeVisible();
    await expect(heading(page)).toHaveText("2 livraisons");
    expect((await received(page)).at(-1)).toEqual({ path: "/shipments/ship-02/refuse", body: { reason: "Zone non desservie" } });
  });

  test("assigns a selection, and reports one by one what the server refused", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 1440 });
    // On the first page: a request not accepted yet, one to assign, one already with a courier.
    for (const number of ["SU-2026-078452", "SU-2026-078449", "SU-2026-078443"]) {
      await rows(page, "Livraisons").filter({ hasText: number }).getByRole("checkbox").check();
    }
    await expect(page.getByText("3 sélectionnés")).toBeVisible();
    await page.getByRole("button", { name: "Assigner", exact: true }).first().click();
    await expect(dialog(page)).toContainText("Assigner 3 livraisons");
    await choose(dialog(page), /Awa Ilboudo/);
    await dialog(page).getByRole("button", { name: "Assigner" }).click();

    const report = dialog(page).filter({ hasText: "Certaines livraisons n'ont pas été modifiées" });
    await expect(report).toContainText("2 livraisons confiées à Awa Ilboudo.");
    await expect(report.getByRole("listitem")).toHaveCount(1);
    await expect(report.getByRole("listitem")).toContainText("SU-2026-078452");
    await expect(report.getByRole("listitem")).toContainText("Acceptez d'abord cette livraison");
    await report.getByRole("button", { name: "Compris" }).click();
    // What was refused stays selected, to be handled otherwise.
    await expect(page.getByText("1 sélectionné", { exact: true })).toBeVisible();
    await expect(rows(page, "Livraisons").filter({ hasText: "SU-2026-078449" })).toContainText("Awa Ilboudo");
  });

  test("changes the status of a selection only where a single change would be allowed", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}?status=assigned`, { width: 1440 });
    await table(page, "Livraisons").getByRole("checkbox", { name: "Sélectionner toutes les lignes de cette page" }).check();
    await expect(page.getByText("4 sélectionnés")).toBeVisible();
    await page.getByRole("button", { name: "Changer le statut" }).click();
    await page.getByRole("menuitem", { name: "En livraison" }).click();
    await expect(page.getByText("4 livraisons : en livraison.")).toBeVisible();
    await expect(heading(page)).toHaveText("0 livraison");
    expect((await received(page)).length).toBe(0);
  });

  test("exports what the list shows, built by the server", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}?scope=failed`, { width: 1440 });
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exporter", exact: true }).click()]);
    expect(download.suggestedFilename()).toMatch(/^livraisons-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = (await (await download.createReadStream()).toArray()).join("");
    expect(csv).toContain("Commande,Client,Téléphone,Adresse,Zone,Livreur,Statut,Paiement,Montant (FCFA)");
    // Three failed deliveries, and no other.
    expect(csv.trim().split("\n")).toHaveLength(4);
    expect(csv).toContain('"Échec"');
    await expect(page.getByText("Export des livraisons téléchargé.")).toBeVisible();
  });

  test("says that the list could not be loaded, and loads it on a retry", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/settings", { width: 1280 });
    await outage(page, baseURL, true);
    await page.goto(LIST);
    await expect(pageAlert(page).filter({ hasText: "Les livraisons n'ont pas pu être chargées" })).toBeVisible({ timeout: 30_000 });
    // An outage is not an empty list.
    await expect(page.getByText("Aucune livraison pour le moment")).toHaveCount(0);
    await outage(page, baseURL, false);
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(heading(page)).toHaveText("34 livraisons");
  });

  test("on a phone, each delivery is a card with its action under it", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 390, height: 844 });
    await expect(table(page, "Livraisons")).toBeHidden();
    const first = cards(page, "Livraisons").first();
    await expect(first).toContainText("SU-2026-078452");
    await expect(first).toContainText("Amadou Diallo");
    await expect(first).toContainText("À accepter");
    await expect(first.getByRole("button", { name: "Accepter" })).toBeVisible();
    // Payment and time are one tap away, not dropped.
    await first.getByRole("button", { name: "Voir plus" }).click();
    await expect(first).toContainText("Paiement");
    await expect(first).toContainText("15:48");
    // Every filter is in one sheet.
    await page.getByRole("button", { name: "Filtres" }).click();
    for (const label of ["Statut", "Date de création", "Zone", "Livreur", "Priorité"]) await expect(dialog(page).getByLabel(label)).toBeVisible();
  });
});

test.describe("delivery page", () => {
  test("shows where the delivery stands, dated from what was recorded", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/ship-16`, { width: 1440 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Livraison SU-2026-078437");

    const progress = page.getByRole("region", { name: "Avancement de la livraison" });
    await expect(progress).toContainText("Colis en route");
    await expect(progress).toContainText("Arrivée prévue");
    const steps = progress.getByRole("list", { name: "Étapes de la livraison" }).getByRole("listitem");
    await expect(steps).toHaveText([/Demande reçue : terminée/, /Livreur assigné : terminée/, /Colis collecté : terminée/, /En livraison : en cours/, /Livrée : à venir/]);
    await expect(steps.nth(3)).toHaveAttribute("aria-current", "step");
    // The agency's own assignment writes no event: reached, at a moment nothing recorded.
    await expect(steps.nth(1)).toContainText("Date non enregistrée");

    // Where the parcel was last seen, and how far from the customer.
    await expect(page.getByRole("link", { name: /Le livreur est à 2,1 km du client/ })).toHaveAttribute("href", /query=12\.3657,-1\.5339/);
    await expect(page.getByRole("link", { name: "Appeler le client" })).toHaveAttribute("href", "tel:+22677456789");
    // The courier is one tap away, by phone or on WhatsApp.
    const courier = page.locator("section").filter({ has: page.getByRole("heading", { name: "Livreur assigné" }) });
    await expect(courier.getByRole("link", { name: "+226 70 10 20 30" })).toHaveAttribute("href", "tel:+22670102030");
    await expect(courier.getByRole("link", { name: "Écrire à Moussa Kaboré sur WhatsApp" })).toHaveAttribute("href", "https://wa.me/22670102030");
  });

  test("gives the page its main action, and the others behind it", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/ship-04`, { width: 1440 });
    // Accepted, no courier: the page asks for one.
    await page.getByRole("button", { name: "Assigner un livreur" }).click();
    await choose(dialog(page), /Awa Ilboudo/);
    await dialog(page).getByRole("button", { name: "Assigner" }).click();
    // The exact sentence of the toast: the timeline of the page says "Course confiée à Awa Ilboudo." too.
    await expect(page.getByText("Livraison SU-2026-078449 confiée à Awa Ilboudo.")).toBeVisible();

    // Assigned: the main action is the departure; the courier can still be changed.
    await expect(page.getByRole("button", { name: "Marquer en livraison" })).toBeVisible();
    const courier = page.locator("section").filter({ has: page.getByRole("heading", { name: "Livreur assigné" }) });
    await expect(courier).toContainText("Awa Ilboudo");
    await courier.getByRole("button", { name: "Réassigner" }).click();
    await expect(dialog(page)).toContainText("Les codes de collecte et de remise sont renouvelés");
    // The courier who has it is shown as such, and is not offered again.
    await expect(dialog(page).getByRole("radio", { name: /Awa Ilboudo/ })).toBeDisabled();
    await expect(dialog(page)).toContainText("Livreur actuel");
    await dialog(page).getByRole("button", { name: "Annuler" }).click();

    await page.getByRole("button", { name: "Plus d'actions" }).first().click();
    await expect(page.getByRole("menuitem")).toHaveText(["Remettre à assigner", "Déclarer un échec", "Modifier le prix"]);
  });

  test("changes the price in francs, and shows the refusal of the server as a sentence", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/ship-04`, { width: 1440 });
    await page.getByRole("button", { name: "Plus d'actions" }).first().click();
    await page.getByRole("menuitem", { name: "Modifier le prix" }).click();
    await expect(dialog(page).getByLabel(/Prix de la livraison/)).toHaveValue("2500");

    await dialog(page).getByLabel(/Prix de la livraison/).fill("90000");
    await dialog(page).getByRole("button", { name: "Enregistrer le prix" }).click();
    await expect(page.getByText("Ce montant dépasse de trop le prix annoncé au client.")).toBeVisible();

    await dialog(page).getByLabel(/Prix de la livraison/).fill("3 000");
    await dialog(page).getByRole("button", { name: "Enregistrer le prix" }).click();
    await expect(page.getByText(/Prix de la livraison .* mis à jour/)).toBeVisible();
    // The endpoint counts in centimes.
    expect((await received(page)).at(-1)).toEqual({ path: "/shipments/ship-04/price", body: { amount: 300000 } });
    await expect(page.locator("section").filter({ has: page.getByRole("heading", { name: "Informations de paiement" }) })).toContainText("3 000 FCFA");
  });

  test("keeps the notes of the agency, newest first", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/ship-16`, { width: 1440 });
    const notes = page.locator("section").filter({ has: page.getByRole("heading", { name: "Notes internes" }) });
    await expect(notes.getByRole("listitem")).toHaveCount(1);

    await notes.getByRole("button", { name: "Ajouter une note" }).click();
    await dialog(page).getByRole("button", { name: "Enregistrer la note" }).click();
    await expect(dialog(page)).toContainText("Écrivez la note avant de l'enregistrer.");
    await dialog(page).getByLabel(/Note/).fill("Portail fermé : appeler en arrivant.");
    await dialog(page).getByRole("button", { name: "Enregistrer la note" }).click();
    await expect(page.getByText("Note ajoutée.")).toBeVisible();
    await expect(notes.getByRole("listitem")).toHaveCount(2);
    await expect(notes.getByRole("listitem").first()).toContainText("Portail fermé : appeler en arrivant.");
  });

  test("shows the two fees of a COD Mixte delivery, and what is left to collect", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/ship-15`, { width: 1440 });
    await expect(page.getByRole("heading", { level: 1 }).locator("..")).toContainText("COD mixte");
    const payment = page.locator("section").filter({ has: page.getByRole("heading", { name: "Informations de paiement" }) });
    await expect(payment).toContainText("Frais de livraison1 000 FCFAPayé");
    await expect(payment).toContainText("Produits17 500 FCFAÀ régler");
    await expect(payment).toContainText("Reste à encaisser17 500 FCFA");
    await expect(payment).toContainText("Payé en partie");
  });

  test("leaves the page of a request once it is refused: it is no longer the agency's", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/ship-03`, { width: 1440 });
    await expect(page.getByRole("region", { name: "Avancement de la livraison" })).toContainText("Demande à accepter");
    await page.getByRole("button", { name: "Plus d'actions" }).first().click();
    await page.getByRole("menuitem", { name: "Refuser la livraison" }).click();
    await dialog(page).getByLabel(/Motif du refus/).fill("Aucun livreur disponible");
    await dialog(page).getByRole("button", { name: "Refuser la livraison" }).click();
    await expect(page).toHaveURL(new RegExp(`${LIST}$`));
    await expect(heading(page)).toHaveText("33 livraisons");
  });

  test("says that a delivery does not exist, without offering a retry that cannot help", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/ship-unknown`, { width: 1280 });
    await expect(pageAlert(page)).toContainText("Cette livraison est introuvable");
    await expect(page.getByRole("button", { name: "Réessayer" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Retour aux livraisons" })).toBeVisible();
  });

  test("prints the slip, and nothing of the screen around it", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/ship-16`, { width: 1280 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await expect(page.getByText("Bon de livraison")).toBeVisible();
    await expect(page.getByText("Reçu par (nom et signature)")).toBeVisible();
    // The frame of the portal and the page itself stay on the screen.
    await expect(page.locator("#shell-sidebar")).toBeHidden();
    await expect(page.locator("#shell-topbar")).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toBeHidden();
    await page.emulateMedia({ media: "screen" });
    await expect(page.getByText("Bon de livraison")).toBeHidden();
  });
});
