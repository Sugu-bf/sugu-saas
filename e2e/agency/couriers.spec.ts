import { expect, test, type Page } from "@playwright/test";
import { cards, choose, confirmation, dialog, open, pageAlert, received, rows, table } from "./helpers";

// Couriers of an agency: the list (groups, filters, alerts, recruitment code),
// what the agency does to an account, and the page of one courier.
// Data: e2e/agency/mock-agency.mjs — 8 couriers, one in each situation.

const LIST = "/agency/drivers";
const kpi = (page: Page, name: string) => page.getByRole("region", { name: "Livreurs par situation" }).getByRole("button", { name });
const row = (page: Page, name: string) => rows(page, "Livreurs").filter({ hasText: name });
const panel = (page: Page, title: string) => page.locator("section").filter({ has: page.getByRole("heading", { name: title, exact: true }) });

test.describe("couriers list", () => {
  test("counts the couriers by what they are doing, and filters on a group", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 1440 });
    const groups = page.getByRole("region", { name: "Livreurs par situation" });
    await expect(groups).toContainText("Actifs6Sur 8 livreurs");
    await expect(groups).toContainText("En livraison4");
    await expect(groups).toContainText("Disponibles1");
    await expect(groups).toContainText("En pause1");
    await expect(groups).toContainText("À vérifier1");
    await expect(rows(page, "Livreurs")).toHaveCount(8);

    await kpi(page, "En pause").click();
    await expect(rows(page, "Livreurs")).toHaveCount(1);
    await expect(row(page, "Aminata Traoré")).toContainText("En pause");
    await expect(page).toHaveURL(/activity=paused/);
    await expect(page.getByLabel("Statut")).toHaveValue("paused");

    await page.getByLabel("Statut").selectOption("suspended");
    await expect(row(page, "Mamadou Sanou")).toContainText("Suspendu");
    await page.getByRole("button", { name: "Tout afficher" }).click();
    await expect(rows(page, "Livreurs")).toHaveCount(8);
  });

  test("filters by zone, searches on the server and sorts by name", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 1440 });
    await page.getByLabel("Zone").selectOption({ label: "Gounghin (2)" });
    await expect(rows(page, "Livreurs")).toHaveCount(2);
    await expect(page).toHaveURL(/quartier=Gounghin/);
    await page.getByLabel("Zone").selectOption("");

    await page.getByRole("searchbox", { name: "Nom, téléphone ou matricule" }).fill("lv-005");
    await page.keyboard.press("Enter");
    await expect(rows(page, "Livreurs")).toHaveCount(1);
    await expect(row(page, "Salif Compaoré")).toContainText("LV-005");
    await page.getByRole("button", { name: "Effacer la recherche" }).click();

    // By name, A to Z, then Z to A.
    await expect(rows(page, "Livreurs").first()).toContainText("Aminata Traoré");
    await table(page, "Livreurs").getByRole("button", { name: "Livreur" }).click();
    await expect(rows(page, "Livreurs").first()).toContainText("Salif Compaoré");
    await expect(page).toHaveURL(/dir=desc/);
  });

  test("shows the day of each courier: deliveries, success rate, amount", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 1440 });
    await expect(row(page, "Moussa Kaboré")).toContainText("En livraison");
    await expect(row(page, "Moussa Kaboré")).toContainText("96,9 %");
    // Two deliveries today, priced 2 500 and 3 000 francs.
    await expect(row(page, "Moussa Kaboré")).toContainText("5 500 FCFA");
    // A courier who has not delivered yet has no rate: a dash, not 0 %.
    await expect(row(page, "Cheick Zongo")).toContainText("—");
    await expect(row(page, "Cheick Zongo")).not.toContainText("0 %");
    await expect(row(page, "Moussa Kaboré").getByRole("link", { name: "+226 70 10 20 30" })).toHaveAttribute("href", "tel:+22670102030");
    // Behind the menu of the row: the same number, to call or to write to.
    await row(page, "Moussa Kaboré").getByRole("button", { name: "Autres actions pour Moussa Kaboré" }).click();
    await expect(page.getByRole("menuitem", { name: "Appeler" })).toHaveAttribute("href", "tel:+22670102030");
    await expect(page.getByRole("menuitem", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/22670102030");
    await page.keyboard.press("Escape");
  });

  test("names who needs attention, each one a link to his page", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 1440 });
    const alerts = panel(page, "Alertes et suivi");
    await expect(alerts.getByRole("heading", { name: "Documents à renouveler" })).toContainText("3");
    await expect(alerts).toContainText("Salif CompaoréPermis");
    await expect(alerts).toContainText("Expiré depuis 3 jours");
    await expect(alerts).toContainText("Fatou SawadogoIdentité");
    await expect(alerts).toContainText("Expire dans 5 jours");
    await expect(alerts).toContainText("72,9 %");
    await expect(alerts).toContainText("Sans livraison");
    await alerts.getByRole("link", { name: /Salif Compaoré/ }).click();
    await expect(page).toHaveURL(/\/agency\/drivers\/courier-5$/);
  });

  test("keeps the recruitment code hidden until asked, and replaces it only after saying what that breaks", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 1440 });
    const code = panel(page, "Code de recrutement");
    await expect(code.getByRole("status", { name: "Code de recrutement" })).toHaveText("FASO••26");
    await code.getByRole("button", { name: "Afficher le code" }).click();
    await expect(code.getByRole("status", { name: "Code de recrutement" })).toHaveText("FASO2026");

    await code.getByRole("button", { name: "Copier le lien d'inscription" }).click();
    await expect(page.getByText("Lien d'inscription copié.")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("https://pro.sugu.pro/signup/driver?code=FASO2026");

    await code.getByRole("button", { name: "Remplacer le code" }).click();
    await expect(confirmation(page)).toContainText("L'ancien code et le lien qui le contient ne fonctionneront plus.");
    await confirmation(page).getByRole("button", { name: "Remplacer le code" }).click();
    await expect(page.getByText("Nouveau code de recrutement généré.")).toBeVisible();
    await expect(code.getByRole("status", { name: "Code de recrutement" })).not.toHaveText("FASO2026");
  });

  test("hands a waiting delivery to a courier who can take one, the oldest first", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 1440 });
    // Paused, to verify, suspended: no delivery can be handed to them.
    await expect(row(page, "Aminata Traoré").getByRole("button", { name: /Confier une course/ })).toHaveCount(0);
    await expect(row(page, "Mamadou Sanou").getByRole("button", { name: /Confier une course/ })).toHaveCount(0);

    await row(page, "Awa Ilboudo").getByRole("button", { name: "Confier une course à Awa Ilboudo" }).click();
    const choices = dialog(page).getByRole("radio");
    await expect(choices).toHaveCount(5);
    await expect(dialog(page).locator("label").first()).toContainText("SU-2026-078445");
    await expect(dialog(page).getByRole("button", { name: "Confier la course" })).toBeDisabled();
    await choose(dialog(page), "SU-2026-078445");
    await dialog(page).getByRole("button", { name: "Confier la course" }).click();
    await expect(page.getByText("Livraison SU-2026-078445 confiée à Awa Ilboudo.")).toBeVisible();
    await expect(row(page, "Awa Ilboudo")).toContainText("En livraison");
    expect((await received(page)).at(-1)).toEqual({ path: "/shipments/ship-08/assign", body: { courier_id: "user-7" } });
  });

  test("pauses, suspends and brings back an account, saying each time what it changes", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 1440 });
    const menu = async (name: string, item: string) => {
      await row(page, name).getByRole("button", { name: `Autres actions pour ${name}` }).click();
      await page.getByRole("menuitem", { name: item }).click();
    };

    await menu("Awa Ilboudo", "Mettre en pause");
    await expect(confirmation(page)).toContainText("Plus aucune course ne lui sera proposée tant que la pause dure.");
    await confirmation(page).getByRole("button", { name: "Mettre en pause" }).click();
    await expect(page.getByText("Awa Ilboudo est en pause.")).toBeVisible();
    await expect(row(page, "Awa Ilboudo")).toContainText("En pause");

    await menu("Awa Ilboudo", "Reprendre l'activité");
    await confirmation(page).getByRole("button", { name: "Reprendre l'activité" }).click();
    await expect(row(page, "Awa Ilboudo")).toContainText("Disponible");

    await menu("Awa Ilboudo", "Suspendre le compte");
    await dialog(page).getByLabel("Motif").fill("Colis non remis");
    await dialog(page).getByRole("button", { name: "Suspendre le compte" }).click();
    await expect(page.getByText("Compte de Awa Ilboudo suspendu.")).toBeVisible();
    await expect(row(page, "Awa Ilboudo")).toContainText("Suspendu");

    await menu("Awa Ilboudo", "Réactiver le compte");
    await confirmation(page).getByRole("button", { name: "Réactiver le compte" }).click();
    await expect(row(page, "Awa Ilboudo")).toContainText("Disponible");

    expect((await received(page)).map((entry) => [entry.path, entry.body])).toEqual([
      ["/couriers/courier-7", { is_active: false }],
      ["/couriers/courier-7", { is_active: true }],
      ["/couriers/courier-7/suspend", { reason: "Colis non remis" }],
      ["/couriers/courier-7/activate", {}],
    ]);
    // No route removes a courier: the list offers none.
    await row(page, "Awa Ilboudo").getByRole("button", { name: "Autres actions pour Awa Ilboudo" }).click();
    await expect(page.getByRole("menuitem", { name: /Retirer|Supprimer/ })).toHaveCount(0);
  });

  test("exports the couriers the list shows", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}?activity=on_delivery`, { width: 1440 });
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exporter", exact: true }).click()]);
    expect(download.suggestedFilename()).toMatch(/^livreurs-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = (await (await download.createReadStream()).toArray()).join("");
    expect(csv).toContain("Matricule,Nom,Téléphone,E-mail,Statut,Quartier");
    expect(csv.trim().split("\n")).toHaveLength(5);
    expect(csv).not.toContain("Aminata");
  });

  test("on a phone, each courier is a card, and the alerts follow the list", async ({ page, baseURL }) => {
    await open(page, baseURL, LIST, { width: 390, height: 844 });
    await expect(table(page, "Livreurs")).toBeHidden();
    const first = cards(page, "Livreurs").first();
    await expect(first).toContainText("Aminata Traoré");
    await expect(first).toContainText("En pause");
    await first.getByRole("button", { name: "Voir plus" }).click();
    await expect(first).toContainText("Gains du jour");
    await expect(panel(page, "Alertes et suivi")).toBeVisible();
  });
});

test.describe("courier page", () => {
  test("shows who he is, what he is on, where he was last seen and what he earned", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/courier-1`, { width: 1440 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Moussa Kaboré");
    const header = page.locator("header").filter({ has: page.getByRole("heading", { level: 1 }) });
    await expect(header).toContainText("Matricule LV-001");
    await expect(header).toContainText("Pièces validées");
    await expect(header).toContainText("Compte actif");
    await expect(header.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/22670102030");
    await expect(header.getByRole("link", { name: "Historique complet" })).toHaveAttribute("href", "/agency/deliveries?courier=user-1");

    const figures = page.getByRole("region", { name: "Chiffres du livreur" });
    await expect(figures).toContainText("Livraisons584");
    await expect(figures).toContainText("Taux de succès96,9 %566 livraisons réussies");
    await expect(figures).toContainText("Temps moyen");

    // Three deliveries in hand: the one that moved last is the mission shown.
    await expect(panel(page, "Mission actuelle")).toContainText("SU-2026-078443");
    await expect(panel(page, "Mission actuelle").getByRole("link", { name: "Voir la course" })).toHaveAttribute("href", "/agency/deliveries/ship-10");

    // A real map of the last position his phone sent, and a way to a full one.
    await expect(page.getByRole("img", { name: "Carte : dernière position connue de Moussa Kaboré" })).toBeVisible();
    await expect(panel(page, "Dernière position")).toContainText("Il y a 3 min");
    await expect(panel(page, "Dernière position").getByRole("link", { name: "Ouvrir la carte" })).toHaveAttribute("href", /query=12\.3657,-1\.5339/);

    // His own rate: three quarters of each delivery fee.
    const earnings = panel(page, "Gains du mois");
    await expect(earnings).toContainText("Courses livrées7 500 FCFA");
    await expect(earnings).toContainText("Part de l'agence1 875 FCFA25 %");
    await expect(earnings).toContainText("Part du livreur5 625 FCFA75 %");
    await expect(earnings).toContainText("Taux propre à ce livreur.");

    await expect(page.getByRole("region", { name: "Dernières livraisons" }).locator("tbody tr")).toHaveCount(5);
  });

  test("handles one of his last deliveries from its menu, without leaving his page", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/courier-1`, { width: 1440 });
    const delivery = rows(page, "Dernières livraisons").filter({ hasText: "SU-2026-078437" });
    await expect(delivery).toContainText("En livraison");

    // On the road: it can be remitted or fail, as on the list of deliveries.
    await delivery.getByRole("button", { name: "Autres actions pour la livraison SU-2026-078437" }).click();
    await expect(page.getByRole("menuitem")).toHaveText(["Ouvrir la livraison", "Appeler le client", "Marquer comme remise", "Déclarer un échec"]);
    await page.getByRole("menuitem", { name: "Marquer comme remise" }).click();
    await confirmation(page).getByRole("button", { name: "Marquer comme remise" }).click();
    await expect(page.getByText("Livraison SU-2026-078437 remise au client.")).toBeVisible();
    // His page follows: the delivery is done, and counted.
    await expect(delivery).toContainText("Livrée");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Moussa Kaboré");
    expect((await received(page)).at(-1)).toEqual({ path: "/shipments/ship-16/status", body: { status: "delivered" } });
  });

  test("folds a long day, and opens it on demand", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/courier-1`, { width: 1440 });
    const day = panel(page, "Activité du jour");
    await expect(day.getByRole("listitem")).toHaveCount(6);
    const more = day.getByRole("button", { name: /Voir toute la journée/ });
    await more.click();
    expect(await day.getByRole("listitem").count()).toBeGreaterThan(6);
    await expect(day.getByRole("button", { name: "Réduire" })).toHaveAttribute("aria-expanded", "true");
  });

  test("validates the documents of a courier, which makes his account active", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/courier-6`, { width: 1440 });
    const header = page.locator("header").filter({ has: page.getByRole("heading", { level: 1 }) });
    await expect(header).toContainText("À vérifier");
    await expect(header).toContainText("Pièces à vérifier");
    // To verify: no delivery can be handed to him yet.
    await expect(page.getByRole("button", { name: "Confier une course" })).toHaveCount(0);

    await header.getByRole("button", { name: "Valider les pièces" }).click();
    await expect(confirmation(page)).toContainText("Son compte devient actif et il peut recevoir des courses.");
    await confirmation(page).getByRole("button", { name: "Valider les pièces" }).click();
    await expect(page.getByText("Pièces de Cheick Zongo validées : son compte est actif.")).toBeVisible();
    await expect(header).toContainText("Disponible");
    await expect(header).toContainText("Pièces validées");
    await expect(header.getByRole("button", { name: "Confier une course" })).toBeVisible();
    expect((await received(page)).at(-1)).toEqual({ path: "/couriers/courier-6/verify-kyc", body: { approved: true } });
  });

  test("adds a document to the file of a courier, refusing what the server would refuse", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/courier-6`, { width: 1440 });
    const documents = panel(page, "Pièces justificatives");
    await expect(documents.getByRole("listitem")).toHaveCount(1);
    await documents.getByRole("button", { name: "Ajouter une pièce" }).click();

    await dialog(page).getByRole("button", { name: "Ajouter la pièce" }).click();
    await expect(dialog(page)).toContainText("Choisissez le fichier de la pièce.");
    await dialog(page).getByLabel(/Fichier/).setInputFiles({ name: "permis.exe", mimeType: "application/octet-stream", buffer: Buffer.from("x") });
    await dialog(page).getByRole("button", { name: "Ajouter la pièce" }).click();
    await expect(dialog(page)).toContainText("Formats acceptés : JPG, PNG ou PDF.");

    await dialog(page).getByLabel("Type de pièce").selectOption("driver_license");
    await dialog(page).getByLabel("Numéro de la pièce").fill("P-77006");
    await dialog(page).getByLabel("Date d'expiration").fill("2030-06-30");
    await dialog(page).getByLabel(/Fichier/).setInputFiles({ name: "permis.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await dialog(page).getByRole("button", { name: "Ajouter la pièce" }).click();
    await expect(page.getByText("Pièce ajoutée. Elle attend votre vérification.")).toBeVisible();
    await expect(documents.getByRole("listitem")).toHaveCount(2);
    await expect(documents).toContainText("Permis de conduire");
    expect((await received(page)).at(-1)).toEqual({
      path: "/couriers/courier-6/kyc-documents",
      fields: { document_type: "driver_license", document_name: "Permis de conduire", document_number: "P-77006", expires_on: "2030-06-30" },
      files: ["permis.pdf"],
    });
  });

  test("sets the share of a courier, and goes back to the rate of the agency", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/courier-1`, { width: 1440 });
    await panel(page, "Gains du mois").getByRole("button", { name: "Modifier le taux" }).click();
    await expect(dialog(page).getByLabel(/Part du livreur/)).toHaveValue("75");
    await dialog(page).getByLabel(/Part du livreur/).fill("140");
    await dialog(page).getByRole("button", { name: "Enregistrer" }).click();
    await expect(dialog(page)).toContainText("Saisissez un pourcentage entre 0 et 100.");
    await dialog(page).getByLabel(/Part du livreur/).fill("80");
    await dialog(page).getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Part de Moussa Kaboré fixée à 80 %.")).toBeVisible();
    await expect(panel(page, "Gains du mois")).toContainText("Part du livreur6 000 FCFA80 %");

    await panel(page, "Gains du mois").getByRole("button", { name: "Modifier le taux" }).click();
    await dialog(page).getByRole("button", { name: "Revenir au taux de l'agence" }).click();
    await expect(panel(page, "Gains du mois")).toContainText("Taux par défaut de l'agence.");
    expect((await received(page)).map((entry) => entry.body)).toEqual([{ rate: 80 }, { rate: null }]);
  });

  test("says what it does not have, instead of drawing it empty", async ({ page, baseURL }) => {
    // Paused, never located, nothing in hand.
    await open(page, baseURL, `${LIST}/courier-4`, { width: 1440 });
    await expect(panel(page, "Mission actuelle")).toContainText("Aucune course en main.");
    await expect(panel(page, "Dernière position")).toContainText("Le téléphone de ce livreur n'a transmis aucune position.");
    await expect(page.getByRole("img", { name: /Carte/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reprendre l'activité" })).toBeVisible();

    await page.goto(`${LIST}/courier-unknown`);
    await expect(pageAlert(page)).toContainText("Ce livreur est introuvable");
  });

  // Found on staging (V3.1): the policy served in front of the portal refuses the tile server.
  test("says that the map could not be loaded when its tiles are refused, without a broken picture", async ({ page, baseURL }) => {
    await open(page, baseURL, `${LIST}/courier-1`, { width: 1440 });
    const position = panel(page, "Dernière position");
    await expect(position.getByRole("img", { name: /Carte/ })).toBeVisible();

    // The same page, the tile server out of reach.
    await page.route(/tile\.openstreetmap\.org/, (route) => route.abort());
    await page.reload();
    await expect(position).toContainText("Le fond de carte n'a pas pu être chargé.");
    await expect(position.locator("img")).toHaveCount(0);
    await expect(position.getByRole("img", { name: /Carte/ })).toHaveCount(0);
    await expect(position).not.toContainText("OpenStreetMap");
    // When he was last seen, and the way to a real map, are still there.
    await expect(position).toContainText("Il y a 3 min");
    await expect(position.getByRole("link", { name: "Ouvrir la carte" })).toHaveAttribute("href", /query=12\.3657,-1\.5339/);
  });
});
