import { expect, test } from "@playwright/test";
import { confirmation, customerPays, dialog, mission, open, outage, pageAlert, received, toast } from "./helpers";

// The missions of a courier, on a phone (the screen they are made for):
// what the home counts, the three lists, the page of a mission and its
// steps, from the acceptance to the delivery. The stand-in API holds the
// rules of Laravel; each test has its own data set.

test.describe("home", () => {
  test("counts what the lists hold and shows the mission to deal with first", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/dashboard");

    await expect(page.getByRole("heading", { level: 1, name: "Bonjour, Moussa" })).toBeVisible();
    await expect(page.getByText("En ligne")).toBeVisible();

    const figures = page.getByRole("region", { name: "Vos missions en chiffres" });
    for (const [label, value] of [["À accepter", "4"], ["En cours", "4"], ["Terminées", "12"], ["Échecs", "2"], ["Total cette semaine", "2"]]) {
      await expect(figures.locator("a, div").filter({ hasText: label }).last()).toContainText(value);
    }

    const next = mission(page, "SU-2026-000206");
    await expect(next).toContainText("À collecter");
    await expect(next).toContainText("Boutique Awa");
    await expect(next).toContainText("Ousmane Zongo");
    await expect(next).toContainText("12 500 FCFA");
    await expect(next).toContainText("À encaisser (COD)");

    await next.getByRole("link", { name: "Voir les détails" }).click();
    await expect(page).toHaveURL(/\/driver\/deliveries\/mission-206$/);
  });

  test("a figure opens the list it counts", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/dashboard");
    await page.getByRole("link", { name: /À accepter/ }).click();
    await expect(page).toHaveURL(/liste=disponibles/);
    await expect(page.getByRole("tab", { name: /Disponibles/ })).toHaveAttribute("aria-selected", "true");
  });

  test("says so when it cannot be loaded, and loads again", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/profile");
    await outage(page, baseURL, true);
    await page.goto("/driver/dashboard");
    // The read is tried again before it is given up.
    await expect(pageAlert(page)).toContainText("Impossible de charger votre accueil", { timeout: 30_000 });
    // Never an empty home passed off as a quiet day.
    await expect(page.getByText("Aucune mission pour le moment")).toHaveCount(0);

    await outage(page, baseURL, false);
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(mission(page, "SU-2026-000206")).toBeVisible();
  });
});

test.describe("lists", () => {
  test("three lists, their counters from the server, and the address says which one is shown", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries");

    await expect(page.getByRole("tab", { name: /En cours/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: /Disponibles/ })).toContainText("4");
    await expect(page.getByRole("tab", { name: /En cours/ })).toContainText("4");
    await expect(page.locator("[data-mission]")).toHaveCount(4);

    await page.getByRole("tab", { name: /Disponibles/ }).click();
    await expect(page).toHaveURL(/liste=disponibles/);
    await expect(page.locator("[data-mission]")).toHaveCount(4);
    await expect(mission(page, "SU-2026-000209")).toContainText("Disponible");
    await expect(mission(page, "SU-2026-000208")).toContainText("À accepter");

    await page.getByRole("tab", { name: /Terminées/ }).click();
    await expect(page.locator("[data-mission]")).toHaveCount(10);
    await expect(page.getByRole("navigation", { name: "Pagination" })).toContainText("sur 14");

    // A reload finds the same list again.
    await page.reload();
    await expect(page.getByRole("tab", { name: /Terminées/ })).toHaveAttribute("aria-selected", "true");
  });

  test("a mission in hand is filtered by what remains to do, on the server", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries");
    await page.getByRole("button", { name: "Collecte", exact: true }).click();
    await expect(page.locator("[data-mission]")).toHaveCount(1);
    await expect(mission(page, "SU-2026-000206")).toBeVisible();

    await page.getByRole("button", { name: "Livraison", exact: true }).click();
    await expect(page.locator("[data-mission]")).toHaveCount(3);
    await expect(mission(page, "SU-2026-000206")).toHaveCount(0);
  });

  test("searches on the server, says when nothing matches, and gives the list back", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries?liste=terminees");
    await page.getByRole("searchbox", { name: "Rechercher une mission" }).fill("000185");
    await expect(page.locator("[data-mission]")).toHaveCount(1);
    await expect(page).toHaveURL(/q=000185/);

    await page.getByRole("searchbox", { name: "Rechercher une mission" }).fill("introuvable-zzz");
    await expect(page.getByText("Aucune mission ne correspond")).toBeVisible();
    await page.getByRole("button", { name: "Tout afficher" }).click();
    await expect(page.locator("[data-mission]")).toHaveCount(10);
  });

  test("a card says what is to be collected, and never a distance nobody measured", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries?liste=disponibles");

    // Measured by the server: written.
    await expect(mission(page, "SU-2026-000209")).toContainText("3,2 km");
    await expect(mission(page, "SU-2026-000209")).toContainText("8 500 FCFA");
    // Not measured: nothing, not « 0 km ».
    await expect(mission(page, "SU-2026-000210")).not.toContainText("km");
    // Paid online: nothing to take at the door, and no amount that would look like one.
    await expect(mission(page, "SU-2026-000208")).toContainText("Payée en ligne : rien à encaisser");
    await expect(mission(page, "SU-2026-000208")).not.toContainText("FCFA");
    // A COD Mixte is never « à encaisser »: the customer pays by mobile money.
    await expect(mission(page, "SU-2026-000207")).toContainText("COD Mixte");
    await expect(mission(page, "SU-2026-000207")).not.toContainText("À encaisser");
  });

  test("accepts a mission once, even on a double tap, then opens it", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries?liste=disponibles");
    await mission(page, "SU-2026-000209").getByRole("button", { name: "Accepter" }).dblclick();

    await expect(page).toHaveURL(/\/driver\/deliveries\/mission-209$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mission SU-2026-000209");
    await expect(page.locator("main").getByText("À collecter").first()).toBeVisible();

    expect((await received(page)).filter((request) => request.path.endsWith("/accept"))).toHaveLength(1);
  });

  test("says so when the list cannot be loaded, instead of an empty list", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/profile");
    await outage(page, baseURL, true);
    await page.goto("/driver/deliveries");
    await expect(pageAlert(page)).toContainText("Impossible de charger vos missions", { timeout: 30_000 });
    await expect(page.getByText("Aucune mission en cours")).toHaveCount(0);
  });
});

test.describe("page of a mission", () => {
  test("shows where it stands, the two places, the amount, and the one thing to do now", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries/mission-205");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mission SU-2026-000205");
    await expect(page.locator("header").getByText("En transit")).toBeVisible();
    await expect(page.getByText("Acceptée à 10:15")).toBeVisible();

    const journey = page.getByRole("list", { name: "Avancement de la mission" }).getByRole("listitem");
    await expect(journey).toHaveText([/Assignée : fait/, /Collectée : fait/, /En transit : en cours/, /Livrée : à venir/]);

    await expect(page.getByRole("img", { name: /Carte de l'adresse de livraison/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir l'itinéraire" })).toHaveAttribute("href", /google\.com\/maps\/dir\/.*destination=/);

    const informations = page.locator("main").getByText("Informations").locator("..");
    await expect(informations).toContainText("Restaurant Le Cèdre");
    await expect(informations).toContainText("Fatoumata Compaoré");
    await expect(informations).toContainText("8 500 FCFA");
    await expect(informations).toContainText("À encaisser (COD)");

    await expect(page.getByRole("button", { name: "Confirmer l'arrivée" })).toBeVisible();
    // The steps of the order, as the server projects them.
    await expect(page.getByRole("list", { name: "Étapes de la commande" })).toContainText("Colis collecté");
  });

  test("draws no map when the server has no coordinates, and keeps the way to the address", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries/mission-204");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mission SU-2026-000204");
    await expect(page.locator("main").getByRole("img", { name: /^Carte/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Itinéraire vers le client" })).toHaveAttribute("href", /destination=Secteur%2023/);
  });

  test("never shows a code: the courier types what the boutique and the customer tell", async ({ page, baseURL }) => {
    const answers: string[] = [];
    page.on("response", async (response) => {
      if (response.url().includes("/api/proxy/courier/")) answers.push(await response.text().catch(() => ""));
    });
    await open(page, baseURL, "/driver/deliveries/mission-206");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Confirmer la collecte" }).click();
    await expect(dialog(page).getByLabel("Code de collecte")).toHaveValue("");

    // The codes of the fixture (mock-driver.mjs) are in no answer and nowhere on the page.
    for (const code of ["BTQ0206", "DLV0206"]) {
      await expect(page.locator("body")).not.toContainText(code);
      expect(answers.join("\n")).not.toContain(code);
    }
  });

  test("walks a mission from the collection to the delivery", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries/mission-206");

    // The parcel is collected against the code of the boutique: a wrong one is refused, in the dialog.
    await page.getByRole("button", { name: "Confirmer la collecte" }).click();
    await dialog(page).getByLabel("Code de collecte").fill("FAUX0000");
    await dialog(page).getByRole("button", { name: "Confirmer la collecte" }).click();
    await expect(dialog(page).getByRole("alert")).toContainText("Code de collecte invalide pour cette boutique.");

    await dialog(page).getByLabel("Code de collecte").fill("btq0206");
    await dialog(page).getByRole("button", { name: "Confirmer la collecte" }).click();
    await expect(toast(page, "Collecte confirmée.")).toBeVisible();
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.locator("header").getByText("Collectée")).toBeVisible();

    await page.getByRole("button", { name: "Démarrer la livraison" }).click();
    await expect(page.locator("header").getByText("En transit")).toBeVisible();

    await page.getByRole("button", { name: "Confirmer l'arrivée" }).click();
    await expect(page.locator("header").getByText("Arrivé")).toBeVisible();

    // The delivery is closed against the code of the customer.
    await page.getByRole("button", { name: "J'ai livré le colis" }).click();
    await expect(dialog(page)).toContainText("12 500 FCFA");
    await expect(dialog(page)).toContainText("À encaisser (COD)");
    await expect(dialog(page).getByRole("button", { name: "Valider la livraison" })).toBeDisabled();
    await dialog(page).getByLabel("Code de livraison").fill("FAUX0000");
    await dialog(page).getByRole("button", { name: "Valider la livraison" }).click();
    await expect(dialog(page).getByRole("alert")).toContainText("Le code de sécurité est invalide.");

    await dialog(page).getByLabel("Code de livraison").fill("DLV0206");
    await dialog(page).getByRole("button", { name: "Valider la livraison" }).click();
    await expect(toast(page, "Colis remis")).toBeVisible();
    await expect(page.locator("header").getByText("Terminée")).toBeVisible();
    // Over: nothing left to do, and nothing offered.
    await expect(page.getByRole("button", { name: "Contacter" })).toHaveCount(0);

    expect((await received(page)).map((request) => request.path.split("/").at(3))).toEqual(["confirm-collection", "confirm-collection", "start-transit", "mark-arrived", "mark-delivered", "mark-delivered"]);
  });

  test("COD Mixte: the parcel does not leave before the customer has paid the delivery, and says why", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries/mission-203");

    await expect(pageAlert(page)).toContainText("Le client n'a pas encore réglé les frais de livraison");
    await expect(page.getByRole("button", { name: "Démarrer la livraison" })).toHaveCount(0);

    const payment = page.locator("main").getByText("Paiement COD Mixte").locator("../..");
    await expect(payment).toContainText("Vous n'encaissez rien en espèces.");
    await expect(payment).toContainText("Frais de livraison");
    await expect(payment).toContainText("1 500 FCFA");
    await expect(payment).toContainText("Produits");
    await expect(payment).toContainText("5 000 FCFA");
    await expect(payment.getByText("En attente du client")).toHaveCount(2);
    // Never « à encaisser » for what is paid by mobile money.
    await expect(page.locator("main")).not.toContainText("À encaisser");

    await customerPays(page, baseURL, "mission-203");
    await page.reload();
    await expect(page.getByRole("button", { name: "Démarrer la livraison" })).toBeVisible();
    await expect(payment.getByText("En attente du client")).toHaveCount(1);
  });

  test("COD Mixte: the delivery is not closed while the goods are unpaid, even with the right code", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries/mission-203");
    await customerPays(page, baseURL, "mission-203");
    await page.reload();
    await page.getByRole("button", { name: "Démarrer la livraison" }).click();
    await page.getByRole("button", { name: "Confirmer l'arrivée" }).click();

    await expect(pageAlert(page)).toContainText("Le client n'a pas encore tout réglé");
    await expect(page.getByRole("button", { name: "J'ai livré le colis" })).toHaveCount(0);

    await customerPays(page, baseURL, "mission-203", true);
    await page.reload();
    await page.getByRole("button", { name: "J'ai livré le colis" }).click();
    await expect(dialog(page)).toContainText("Payée par mobile money");
    await dialog(page).getByLabel("Code de livraison").fill("DLV0203");
    await dialog(page).getByRole("button", { name: "Valider la livraison" }).click();
    await expect(page.locator("header").getByText("Terminée")).toBeVisible();
  });

  test("a failure is reported with its reason, once, and the page says it", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries/mission-204");
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Signaler un échec" }).click();

    await expect(dialog(page).getByRole("button", { name: "Signaler un échec" })).toBeDisabled();
    await dialog(page).getByLabel("Que s'est-il passé ?").selectOption({ label: "Le client refuse le colis" });
    await dialog(page).getByLabel("Précisions").fill("Colis ouvert, le client n'en veut plus.");
    await dialog(page).getByRole("button", { name: "Signaler un échec" }).dblclick();

    await expect(pageAlert(page)).toContainText("Livraison en échec");
    await expect(pageAlert(page)).toContainText("Le client refuse le colis");
    await expect(pageAlert(page)).toContainText("Colis ouvert, le client n'en veut plus.");

    const sent = (await received(page)).filter((request) => request.path.endsWith("/mark-failed"));
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toEqual({ code: "CLIENT_REFUSED", reason: "Colis ouvert, le client n'en veut plus." });
  });

  test("a mission given by the agency is accepted or refused; a refusal asks first", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries/mission-208");
    await expect(page.getByRole("button", { name: "Accepter" })).toBeVisible();

    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Refuser la mission" }).click();
    await expect(confirmation(page)).toContainText("Elle est rendue à votre agence");
    await confirmation(page).getByRole("button", { name: "Annuler" }).click();
    expect((await received(page)).filter((request) => request.path.endsWith("/refuse"))).toHaveLength(0);

    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Refuser la mission" }).click();
    await confirmation(page).getByRole("button", { name: "Refuser la mission" }).click();
    await expect(toast(page, "Mission refusée")).toBeVisible();
  });

  test("the customer can be called, sent an SMS, written to on WhatsApp or through the messaging", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries/mission-206");
    await page.getByRole("button", { name: "Contacter" }).click();

    await expect(page.getByRole("menuitem", { name: "Appeler Ousmane Zongo" })).toHaveAttribute("href", "tel:+22676445566");
    await expect(page.getByRole("menuitem", { name: "Envoyer un SMS" })).toHaveAttribute("href", "sms:+22676445566");
    await expect(page.getByRole("menuitem", { name: "WhatsApp du client" })).toHaveAttribute("href", "https://wa.me/22676445566");
    await expect(page.getByRole("menuitem", { name: "Écrire au client" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Écrire à Boutique Awa" })).toBeVisible();
  });

  test("somebody else's mission is said not found, without a way to retry it into view", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries/mission-of-somebody-else");
    await expect(pageAlert(page)).toContainText("Mission introuvable");
    await expect(pageAlert(page)).toContainText("n'est plus la vôtre");
    await expect(page.getByRole("button", { name: "Réessayer" })).toHaveCount(0);
  });
});

test.describe("steps of a mission", () => {
  test("each step is read from the server; only the one allowed now has a button", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries/mission-204/update");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mettre à jour la mission");
    await expect(page.locator('[data-step][data-state="done"]')).toHaveCount(4);
    await expect(page.locator('[data-step="confirm_collection"]')).toContainText("09:15");
    await expect(page.locator('[data-step="mark_delivered"]')).toHaveAttribute("data-state", "current");
    // One step to do, and the failure: nothing else can be pressed.
    await expect(page.locator("main").getByRole("button")).toHaveText(["J'ai livré le colis", "Signaler un échec"]);

    await page.getByRole("button", { name: "J'ai livré le colis" }).click();
    await dialog(page).getByLabel("Code de livraison").fill("DLV0204");
    await dialog(page).getByRole("button", { name: "Valider la livraison" }).click();
    await expect(page.locator('[data-step][data-state="done"]')).toHaveCount(5);
    await expect(page.locator("main").getByRole("button")).toHaveCount(0);
  });

  test("a held step says what holds it", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries/mission-203/update");
    await expect(page.locator('[data-step="start_transit"]')).toContainText("Le client n'a pas encore réglé les frais de livraison");
    await expect(page.locator('[data-step="start_transit"]').getByRole("button")).toHaveCount(0);
  });
});

test.describe("history", () => {
  test("lists what is over with the server's counters, filters and pages", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/history", { width: 1280 });

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Historique des missions");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("(14 missions)");
    const rows = page.getByRole("region", { name: "Missions terminées" }).locator("tbody tr");
    await expect(rows).toHaveCount(10);
    await expect(rows.first()).toContainText("SU-2026-000190");
    // Paid online: no cash was taken, and no « 0 FCFA » says otherwise.
    await expect(rows.first()).toContainText("Rien à encaisser");
    await expect(rows.nth(1)).toContainText("5 750 FCFA");

    await page.getByRole("tab", { name: /Échecs/ }).click();
    await expect(page).toHaveURL(/statut=echecs/);
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText("Le client ne répond pas");

    await page.getByRole("tab", { name: /Toutes/ }).click();
    await page.getByRole("button", { name: "Page 2" }).click();
    await expect(rows).toHaveCount(4);

    await rows.first().getByRole("link", { name: /Voir la mission/ }).click();
    await expect(page).toHaveURL(/\/driver\/deliveries\/mission-/);
  });

  test("a range of days is asked of the server, and an impossible one is said so here", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/history", { width: 1280 });
    const today = new Date().toISOString().slice(0, 10);

    await page.getByLabel("Du", { exact: true }).fill(today);
    await expect(page).toHaveURL(new RegExp(`du=${today}`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText("(2 missions)");

    await page.getByLabel("Au", { exact: true }).fill("2020-01-01");
    await expect(pageAlert(page)).toContainText("La date de fin est avant la date de début.");
  });

  test("on a phone, a card per mission with its action", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/history");
    const cards = page.getByRole("list", { name: "Missions terminées" }).locator("> li");
    await expect(cards).toHaveCount(10);
    await expect(cards.first()).toContainText("SU-2026-000190");
    await expect(cards.first().getByRole("link", { name: /Voir la mission/ })).toBeVisible();
  });
});
