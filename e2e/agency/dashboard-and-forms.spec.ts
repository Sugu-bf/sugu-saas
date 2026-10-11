import { expect, test, type Page } from "@playwright/test";
import { choose, confirmation, open, outage, pageAlert, received, rows } from "./helpers";

// The day of the agency, and the three forms: a delivery it enters itself, a
// courier it adds, a courier it edits. Data: e2e/agency/mock-agency.mjs.

const panel = (page: Page, title: string) => page.locator("section").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
const stepper = (page: Page) => page.getByRole("navigation", { name: /^Étapes/ });
const next = (page: Page) => page.getByRole("button", { name: "Suivant" });
const summary = (page: Page) => pageAlert(page).filter({ hasText: /champs? à corriger/ });

test.describe("dashboard", () => {
  test("greets the agency by its name and counts its day as the lists count it", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/dashboard", { width: 1440 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bonjour, Faso Express !");

    const figures = page.getByRole("region", { name: "Chiffres du jour" });
    await expect(figures).toContainText("À assigner5");
    await expect(figures).toContainText("En cours12");
    await expect(figures).toContainText("Livrées aujourd'hui6");
    await expect(figures).toContainText("Échecs2Tentatives échouées aujourd'hui");
    // No small indicator beside a figure: the cards say a number and what it counts.
    await expect(figures).not.toContainText("%");
    await expect(figures).toContainText("Revenus du jour15 500 FCFA");
    await expect(figures).toContainText("Sur 6 livraisons");

    // A figure that is the size of a list opens that list.
    await figures.getByRole("button", { name: "En cours" }).click();
    await expect(page).toHaveURL(/\/agency\/deliveries\?scope=on_the_way$/);
    await expect(page.getByRole("heading", { level: 2, name: /livraison/ })).toHaveText("12 livraisons");
  });

  test("says what is late and what waits for a decision, each with its way to the list", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/dashboard", { width: 1440 });
    const late = pageAlert(page).filter({ hasText: "3 livraisons en retard" });
    await expect(late.getByRole("link", { name: "Voir les livraisons" })).toHaveAttribute("href", "/agency/deliveries?scope=late");
    const requests = page.getByRole("status").filter({ hasText: "3 demandes attendent votre décision" });
    await expect(requests.getByRole("link", { name: "Voir les demandes" })).toHaveAttribute("href", "/agency/deliveries?scope=awaiting_decision");

    // Put away for the visit; the situation itself has not changed.
    await late.getByRole("button", { name: "Masquer ce message" }).click();
    await expect(late).toBeHidden();
    await page.reload();
    await expect(pageAlert(page).filter({ hasText: "3 livraisons en retard" })).toBeVisible();
  });

  test("lists the deliveries that need the agency first, the late ones on top, and acts on them", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/dashboard", { width: 1440 });
    const priority = rows(page, "Livraisons prioritaires");
    await expect(page.getByRole("heading", { name: /Livraisons prioritaires/ })).toContainText("13");
    await expect(priority).toHaveCount(8);
    await expect(page.getByText("Les 8 plus pressantes, sur 13")).toBeVisible();
    // The three late ones first, oldest first; then the requests to accept.
    for (const index of [0, 1, 2]) await expect(priority.nth(index)).toContainText("En retard");
    await expect(priority.nth(3)).toContainText("À accepter");

    await priority.nth(3).getByRole("button", { name: "Accepter" }).click();
    await confirmation(page).getByRole("button", { name: "Accepter la livraison" }).click();
    await expect(page.getByText(/Livraison SU-2026-\d+ acceptée\./)).toBeVisible();
    // One request less to accept, one delivery more to assign.
    await expect(page.getByRole("region", { name: "Chiffres du jour" })).toContainText("À assigner6");
    await expect(page.getByRole("status").filter({ hasText: "2 demandes attendent votre décision" })).toBeVisible();
  });

  test("exports and opens every pressing delivery: the thirteen it counts, not only the eight it lists", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/dashboard", { width: 1440 });

    // The file is built by the server, over the thirteen.
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exporter", exact: true }).click()]);
    const csv = (await (await download.createReadStream()).toArray()).join("");
    expect(csv.trim().split("\n")).toHaveLength(14);
    await expect(page.getByText("Export des livraisons prioritaires téléchargé.")).toBeVisible();

    // Behind the first action of a row, the others. Here a late delivery, on the road: it can still be remitted or fail.
    const first = rows(page, "Livraisons prioritaires").first();
    await expect(first.getByRole("link", { name: "Voir le suivi" })).toHaveAttribute("href", /\/agency\/deliveries\/ship-\d+$/);
    await first.getByRole("button", { name: /^Autres actions pour la livraison/ }).click();
    await expect(page.getByRole("menuitem")).toHaveText(["Ouvrir la livraison", "Appeler le client", "Marquer comme remise", "Déclarer un échec"]);
    await page.keyboard.press("Escape");

    // "Voir toutes" is the list of these thirteen, where they are filtered, sorted and handled together.
    await page.getByRole("link", { name: "Voir toutes" }).click();
    await expect(page).toHaveURL(/\/agency\/deliveries\?scope=needs_action$/);
    await expect(page.getByRole("heading", { level: 2, name: /livraison/ })).toHaveText("13 livraisons");
    await expect(page.getByLabel("Statut")).toHaveValue("needs_action");
    await page.getByLabel("Statut").selectOption("");
    await expect(page.getByRole("heading", { level: 2, name: /livraison/ })).toHaveText("34 livraisons");
  });

  test("draws the day hour by hour, with its figures for who cannot see the bars, and who is on the road", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/dashboard", { width: 1440 });
    const activity = panel(page, "Activité du jour");
    await expect(activity.getByRole("img")).toHaveAccessibleName(/Aujourd'hui, de 08 h à 20 h : 6 livraisons et 2 tentatives échouées\./);
    await expect(activity.getByRole("table")).toContainText("Livraisons et tentatives échouées d'aujourd'hui, par heure");

    const live = panel(page, "Suivi en direct");
    await expect(live.getByRole("listitem")).toHaveCount(5);
    // On the road first, then who is free.
    await expect(live.getByRole("listitem").first()).toContainText("En livraison");
    await expect(live.getByRole("listitem").last()).toContainText("Awa IlboudoEn attente d'une course");
    await expect(live.getByRole("link", { name: "Voir les livreurs" })).toHaveAttribute("href", "/agency/drivers");
  });

  test("says that the day could not be loaded, and loads it on a retry", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/settings", { width: 1280 });
    await outage(page, baseURL, true);
    await page.goto("/agency/dashboard");
    await expect(pageAlert(page).filter({ hasText: "Le tableau de bord n'a pas pu être chargé" })).toBeVisible({ timeout: 30_000 });
    await outage(page, baseURL, false);
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.getByRole("region", { name: "Chiffres du jour" })).toContainText("À assigner5");
  });
});

test.describe("new delivery", () => {
  test("is reached from the sidebar, and goes one step at a time", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/dashboard", { width: 1440 });
    await page.locator("#shell-sidebar").getByRole("link", { name: "Nouvelle course" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nouvelle course");
    await expect(stepper(page)).toContainText("Colis");

    // A step is left once it is right: what is missing is said, each line a link to its field.
    await next(page).click();
    await expect(summary(page)).toContainText("2 champs à corriger");
    await expect(summary(page).getByRole("link", { name: /Expéditeur/ })).toHaveAttribute("href", "#delivery-vendor-name");
    await expect(page.getByLabel(/Expéditeur/)).toHaveAttribute("aria-invalid", "true");

    await page.getByLabel(/Expéditeur/).fill("Pressing Le Baobab");
    await page.getByLabel(/Valeur des articles/).fill("6 000");
    await next(page).click();
    await expect(summary(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Collecte" })).toBeVisible();
  });

  test("creates a delivery assigned at once, with what the endpoint expects, and opens its page", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/deliveries/new", { width: 1440 });
    await page.getByLabel(/Expéditeur/).fill("Pressing Le Baobab");
    await page.getByLabel(/Nombre d'articles/).fill("2");
    await page.getByLabel(/Valeur des articles/).fill("6 000");
    await page.getByRole("radio", { name: /Déjà payée/ }).check();
    await page.getByLabel("Mode de paiement").selectOption("orange_money");
    await next(page).click();

    await page.getByLabel(/Adresse de collecte/).fill("Avenue Yennenga, face à la gare");
    await page.getByLabel(/Adresse de livraison/).fill("Ouaga 2000, cité Azimmo, villa 27");
    await page.getByLabel(/Point de repère/).fill("Portail noir, après la pharmacie");
    await page.getByLabel(/Nom du destinataire/).fill("Awa Ndiaye");
    await page.getByLabel(/Téléphone du destinataire/).fill("+226 70 12 34 56");
    await next(page).click();

    // Enter in the courier search follows the typing; it does not move to the next step.
    await page.getByRole("searchbox", { name: "Rechercher un livreur" }).fill("awa");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Livreur", exact: true })).toBeVisible();
    await choose(page, /Awa Ilboudo/);
    await page.getByRole("radio", { name: /Urgente/ }).check();
    await page.getByLabel(/Prix de la livraison/).fill("1500");
    await page.getByLabel(/Date de livraison/).fill("2026-10-12");
    await page.getByLabel(/Début du créneau/).fill("14:00");
    await page.getByLabel(/Fin du créneau/).fill("16:00");
    await next(page).click();

    // The recap says what will be sent, and lets any part be changed.
    await expect(panel(page, "Le colis")).toContainText("Pressing Le Baobab");
    await expect(panel(page, "Le colis")).toContainText("Déjà payée · Orange Money");
    await expect(panel(page, "Livreur et options")).toContainText("Awa Ilboudo");
    await expect(panel(page, "Livreur et options")).toContainText("12 octobre 2026, 14:00 – 16:00");
    await panel(page, "Adresses et destinataire").getByRole("button", { name: "Modifier" }).click();
    await expect(page.getByLabel(/Nom du destinataire/)).toHaveValue("Awa Ndiaye");
    await next(page).click();
    await next(page).click();

    await page.getByRole("button", { name: "Créer la course" }).click();
    await expect(page.getByText(/Course AG-NEW\d+ créée\./)).toBeVisible();
    await expect(page).toHaveURL(/\/agency\/deliveries\/ship-new-1$/);
    // Entered by the agency: no decision to wait for, and already with its courier.
    await expect(page.getByRole("region", { name: "Avancement de la livraison" })).toContainText("Colis à ramasser");
    await expect(page.getByRole("region", { name: "Avancement de la livraison" }).getByRole("listitem")).toHaveText([/Course créée/, /Livreur assigné/, /Colis collecté/, /En livraison/, /Livrée/]);

    expect((await received(page))[0]).toEqual({
      path: "/shipments",
      body: {
        vendor_name: "Pressing Le Baobab",
        items_count: 2,
        order_total: 6000,
        payment_status: "paid",
        payment_method: "orange_money",
        pickup_address: "Avenue Yennenga, face à la gare",
        delivery_address: "Ouaga 2000, cité Azimmo, villa 27",
        delivery_instructions: "Portail noir, après la pharmacie",
        client_name: "Awa Ndiaye",
        client_phone: "+226 70 12 34 56",
        courier_id: "user-7",
        priority: 20,
        shipping_amount: 1500,
        delivery_date: "2026-10-12",
        time_slot_from: "14:00",
        time_slot_to: "16:00",
      },
    });
  });

  test("finds a shop of the marketplace by its name, and takes its address and phone for the pickup", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/deliveries/new", { width: 1440 });
    const sender = page.getByLabel(/Expéditeur/);
    const shops = page.getByRole("list", { name: "Boutiques SUGU à ce nom" });

    // As the public listing answers them: a shop without an address says so, and is still a shop.
    await sender.fill("Maison");
    await expect(shops.getByRole("button")).toHaveText([/Maison Sika.*Avenue Kwame Nkrumah, Ouagadougou, Kadiogo/, /Maison du Karité.*Adresse non renseignée par la boutique/]);

    await shops.getByRole("button", { name: /Maison Sika/ }).click();
    await expect(sender).toHaveValue("Maison Sika");
    await expect(page.getByRole("status").filter({ hasText: "Boutique SUGU" })).toHaveText(/son adresse et son téléphone sont repris pour la collecte/);
    await expect(shops).toHaveCount(0);

    await page.getByLabel(/Valeur des articles/).fill("12 000");
    await next(page).click();
    await expect(page.getByLabel(/Adresse de collecte/)).toHaveValue("Avenue Kwame Nkrumah, Ouagadougou, Kadiogo");
    await expect(page.getByLabel(/Téléphone de l'expéditeur/)).toHaveValue("+22625301122");

    // A sender who is no shop of the marketplace is whoever was typed: nothing is offered,
    // and what the shop had filled in leaves with its name.
    await page.getByRole("button", { name: "Précédent" }).click();
    await sender.fill("Pressing Le Baobab");
    await expect(page.getByRole("status").filter({ hasText: "Boutique SUGU" })).toHaveCount(0);
    await expect(shops).toHaveCount(0);
    await next(page).click();
    await expect(page.getByLabel(/Adresse de collecte/)).toHaveValue("");
    await expect(page.getByLabel(/Téléphone de l'expéditeur/)).toHaveValue("");
  });

  test("can leave the courier for later: the delivery then waits among those to assign", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/deliveries/new", { width: 1440 });
    await page.getByLabel(/Expéditeur/).fill("Boutique Sika");
    await page.getByLabel(/Valeur des articles/).fill("0");
    await next(page).click();
    await page.getByLabel(/Adresse de collecte/).fill("Marché Rood-Woko");
    await page.getByLabel(/Adresse de livraison/).fill("Tampouy, rue 23.17");
    await page.getByLabel(/Nom du destinataire/).fill("Oumar Sy");
    await page.getByLabel(/Téléphone du destinataire/).fill("70 44 55 66");
    await next(page).click();
    // A slot without a day is not a promise.
    await page.getByLabel(/Fin du créneau/).fill("16:00");
    await next(page).click();
    await expect(summary(page)).toContainText("Date de livraison : Un créneau demande une date de livraison.");
    await page.getByLabel(/Fin du créneau/).fill("");
    await next(page).click();
    await expect(panel(page, "Livreur et options")).toContainText("À assigner plus tard");
    await page.getByRole("button", { name: "Créer la course" }).click();
    await expect(page.getByRole("region", { name: "Avancement de la livraison" })).toContainText("Livreur à assigner");
    const body = (await received(page))[0].body as Record<string, unknown>;
    expect(body.courier_id).toBeUndefined();
    expect(body.shipping_amount).toBeUndefined();
    expect(body.priority).toBe(100);
  });
});

test.describe("new courier", () => {
  test("registers a courier in three steps, and opens his page: to verify, as the server makes him", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/drivers/new", { width: 1440 });
    await next(page).click();
    await expect(summary(page)).toContainText("3 champs à corriger");

    await page.getByLabel(/Prénom/).fill("Rasmané");
    await page.getByLabel(/^Nom/).fill("Tiendrébéogo");
    await page.getByLabel(/^Téléphone/).fill("+226 71 22 33 44");
    await page.getByLabel(/E-mail/).fill("rasmane@example.test");
    await page.getByLabel(/Quartier/).fill("Tanghin");
    await next(page).click();

    // A vehicle must be chosen.
    await next(page).click();
    await expect(summary(page)).toContainText("Type de véhicule : Choisissez son véhicule.");
    await page.getByRole("radio", { name: /Tricycle/ }).check();
    await page.getByLabel(/Immatriculation/).fill("11 TR 9001");
    await next(page).click();

    // No SMS is promised: the server sends none. An e-mail invitation is, since an address was typed.
    await expect(page.getByText(/SMS/)).toHaveCount(0);
    await page.getByRole("checkbox", { name: /invitation par e-mail/ }).check();
    await page.getByRole("button", { name: "Enregistrer le livreur" }).click();

    await expect(page.getByText("Rasmané Tiendrébéogo est enregistré. Son compte est à vérifier.")).toBeVisible();
    await expect(page).toHaveURL(/\/agency\/drivers\/courier-9$/);
    const header = page.locator("header").filter({ has: page.getByRole("heading", { level: 1 }) });
    await expect(header).toContainText("Rasmané Tiendrébéogo");
    await expect(header).toContainText("À vérifier");
    await expect(page.locator("section").filter({ has: page.getByRole("heading", { name: "Véhicule", exact: true }) })).toContainText("Tricycle");

    expect((await received(page))[0]).toEqual({
      path: "/couriers/register",
      body: {
        first_name: "Rasmané",
        last_name: "Tiendrébéogo",
        phone: "+226 71 22 33 44",
        email: "rasmane@example.test",
        quartier: "Tanghin",
        vehicle_type: "tricycle",
        vehicle_plate: "11 TR 9001",
        send_email: true,
        send_sms: false,
      },
    });
  });

  test("shows on its field what the server refuses, on the step that holds it", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/drivers/new", { width: 1440 });
    await page.getByLabel(/Prénom/).fill("Moussa");
    await page.getByLabel(/^Nom/).fill("Kaboré");
    // The phone of a courier the agency already has.
    await page.getByLabel(/^Téléphone/).fill("+226 70 10 20 30");
    await next(page).click();
    await page.getByRole("radio", { name: /Moto/ }).check();
    await next(page).click();
    await page.getByRole("button", { name: "Enregistrer le livreur" }).click();

    await expect(summary(page)).toContainText("Téléphone : Ce numéro de téléphone est déjà associé à un compte.");
    await expect(stepper(page).locator('[aria-current="step"]')).toContainText("Identité");
    await expect(page.getByLabel(/^Téléphone/)).toHaveAttribute("aria-invalid", "true");
    // What was typed is still there.
    await expect(page.getByLabel(/Prénom/)).toHaveValue("Moussa");
  });

  test("sends the documents joined once the account exists", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/drivers/new", { width: 1440 });
    await page.getByLabel(/Prénom/).fill("Salimata");
    await page.getByLabel(/^Nom/).fill("Ouattara");
    await page.getByLabel(/^Téléphone/).fill("+226 75 00 11 22");
    await next(page).click();
    await page.getByRole("radio", { name: /Vélo/ }).check();
    await next(page).click();

    await page.getByRole("button", { name: "Joindre une pièce" }).click();
    const piece = page.getByRole("group", { name: "Pièce 1" });
    await piece.getByLabel("Numéro").fill("B 2000111");
    // A file the server would refuse is said before anything is created.
    await piece.getByLabel("Fichier").setInputFiles({ name: "cnib.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
    await expect(piece).toContainText("Formats acceptés : JPG, PNG ou PDF.");
    await page.getByRole("button", { name: "Enregistrer le livreur" }).click();
    expect(await received(page)).toEqual([]);

    await piece.getByLabel("Fichier").setInputFiles({ name: "cnib.jpg", mimeType: "image/jpeg", buffer: Buffer.from("jpeg") });
    await page.getByRole("button", { name: "Enregistrer le livreur" }).click();
    await expect(page).toHaveURL(/\/agency\/drivers\/courier-9#pieces$/);
    const sent = await received(page);
    expect(sent.map((entry) => entry.path)).toEqual(["/couriers/register", "/couriers/courier-9/kyc-documents"]);
    expect(sent[1]).toMatchObject({ fields: { document_type: "id_card", document_name: "Pièce d'identité", document_number: "B 2000111" }, files: ["cnib.jpg"] });
    await expect(page.locator("section").filter({ has: page.getByRole("heading", { name: "Pièces justificatives" }) }).getByRole("listitem")).toHaveCount(1);
  });
});

test.describe("edit courier", () => {
  test("starts from his record, saves what changed, and empties what was emptied", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/drivers/courier-1/edit", { width: 1440 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Modifier Moussa Kaboré");
    await expect(page.getByLabel(/Prénom/)).toHaveValue("Moussa");
    await expect(page.getByLabel(/^Nom/)).toHaveValue("Kaboré");
    await expect(page.getByLabel(/Quartier/)).toHaveValue("Gounghin");
    await expect(page.getByRole("radio", { name: /Moto/ })).toBeChecked();
    await expect(page.getByLabel(/Couleur/)).toHaveValue("Noir");
    // A birth date and a gender are taken at registration only: the edit does not show fields it cannot save.
    await expect(page.getByLabel(/Date de naissance/)).toHaveCount(0);

    await page.getByLabel(/Quartier/).fill("Tampouy");
    await page.getByLabel(/Couleur/).fill("");
    await page.getByLabel(/Personne à prévenir/).fill("Aïcha Kaboré");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Fiche du livreur enregistrée.")).toBeVisible();
    await expect(page).toHaveURL(/\/agency\/drivers\/courier-1$/);

    expect((await received(page))[0]).toEqual({
      path: "/couriers/courier-1",
      body: {
        first_name: "Moussa",
        last_name: "Kaboré",
        phone: "+226 70 10 20 30",
        email: "lv-001@faso-express.test",
        quartier: "Tampouy",
        address: "Gounghin, Ouagadougou",
        emergency_contact_name: "Aïcha Kaboré",
        emergency_contact_phone: "",
        vehicle_type: "moto",
        vehicle_make: "Yamaha YBR 125",
        vehicle_plate: "11 KK 4521",
        vehicle_color: "",
        vehicle_year: "2022",
      },
    });
  });

  test("refuses what is wrong before sending, and cancels back to the page", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/drivers/courier-1/edit", { width: 1440 });
    await page.getByLabel(/Prénom/).fill("M");
    await page.getByLabel(/E-mail/).fill("pas-une-adresse");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(summary(page)).toContainText("2 champs à corriger");
    expect(await received(page)).toEqual([]);
    await page.getByRole("link", { name: "Annuler" }).click();
    await expect(page).toHaveURL(/\/agency\/drivers\/courier-1$/);
  });
});
