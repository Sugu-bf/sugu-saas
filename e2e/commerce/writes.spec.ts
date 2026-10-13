import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { figures, openScreen, received, resetStandIn, rows, settled, toast } from "./helpers";

// The writes of V7: a customer, an export, a code, a promotion. They run
// after the reading specs, one at a time: the stand-in keeps what they create.

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page, baseURL }) => {
  await openScreen(page, baseURL, "clients");
  await resetStandIn(page);
});

test("creates a customer: refusals field by field, then the sheet of the new customer", async ({ page }) => {
  await page.reload();
  await page.getByRole("button", { name: "Ajouter un client" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Ajouter un client" });

  // What the form can tell by itself.
  await dialog.getByRole("button", { name: "Ajouter le client" }).click();
  await expect(dialog.getByText("Indiquez le prénom.")).toBeVisible();
  await expect(dialog.getByText("Indiquez un téléphone ou un e-mail.")).toBeVisible();
  expect((await received(page)).filter((entry) => entry.path === "/sellers/customers")).toHaveLength(0);

  // What only the server knows: this number is already a customer's.
  await dialog.getByLabel("Prénom").fill("Awa");
  await dialog.getByRole("textbox", { name: /^Nom/ }).fill("Doublon");
  await dialog.getByLabel("Téléphone").fill("71 23 45 60");
  await dialog.getByRole("button", { name: "Ajouter le client" }).click();
  await expect(dialog.getByText("Un client de votre boutique a déjà ce numéro.")).toBeVisible();
  await expect(dialog).toBeVisible();

  await dialog.getByRole("textbox", { name: /^Nom/ }).fill("Nikiéma");
  await dialog.getByLabel("Téléphone").fill("65 00 11 22");
  await dialog.getByRole("button", { name: "Ajouter le client" }).click();
  await expect(toast(page, "Awa Nikiéma a été ajouté à vos clients.")).toBeVisible();
  await expect(dialog).toBeHidden();

  // Its sheet opens; back on the list the counters of the store moved.
  await expect(page).toHaveURL(/client=cust-new-1/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Awa Nikiéma");
  await expect(page.locator("main").getByText("+226 65 00 11 22").first()).toBeVisible();
  await page.getByRole("link", { name: "Retour aux clients" }).click();
  await expect(figures(page, "Vos clients en chiffres")).toContainText("37");

  const sent = (await received(page)).filter((entry) => entry.path === "/sellers/customers").at(-1)!.body;
  expect(sent).toEqual({ firstName: "Awa", lastName: "Nikiéma", phone: "65 00 11 22" });
});

test("exports the filtered list as the server's own file", async ({ page }) => {
  await page.goto("/vendor/clients?statut=vip");
  await settled(page);
  await expect(rows(page)).toHaveCount(4);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter" }).first().click();
  const file = await download;
  await expect(toast(page, "Les clients affichés ont été exportés.")).toBeVisible();
  expect(file.suggestedFilename()).toMatch(/^clients-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = readFileSync(await file.path(), "utf8");
  const lines = csv.trim().split("\n");
  expect(lines[0]).toContain("Nom;Téléphone;E-mail;Ville;Statut");
  // The four VIP customers of the store, not the ten rows of a page; a number cannot be run as a formula.
  expect(lines).toHaveLength(5);
  expect(lines[1]).toContain("'+2267");

  const sent = (await received(page)).filter((entry) => entry.path === "/sellers/customers/export").at(-1)!.body;
  expect(sent).toEqual({ segment: "vip", format: "csv" });
});

test("creates a code: an amount typed in francs leaves in centimes, and the server's refusals are shown", async ({ page }) => {
  await page.goto("/vendor/marketing");
  await page.getByRole("button", { name: "Créer un code" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Créer un code promotionnel" });

  await dialog.getByRole("button", { name: "Créer le code" }).click();
  await expect(dialog.getByText("Le code compte au moins 3 caractères.")).toBeVisible();
  await expect(dialog.getByText("Indiquez un pourcentage entier.")).toBeVisible();

  // A code that already exists: only the server knows.
  await dialog.getByLabel("Code").fill("sugu10");
  await expect(dialog.getByLabel("Code")).toHaveValue("SUGU10");
  await dialog.getByLabel("Valeur").fill("10");
  await dialog.getByRole("button", { name: "Créer le code" }).click();
  await expect(dialog.getByText("Ce code est déjà utilisé. Choisissez-en un autre.")).toBeVisible();

  await dialog.getByLabel("Code").fill("RENTREE");
  await dialog.getByLabel("Type de réduction").selectOption({ label: "Montant fixe" });
  await dialog.getByLabel("Valeur").fill("2000");
  await dialog.getByLabel("Commande minimum").fill("15000");
  await dialog.getByLabel("Limite d'utilisation").fill("300");
  await dialog.getByLabel("Limite par client").fill("");
  await dialog.getByLabel("Date de début").fill("2026-10-12");
  await dialog.getByLabel("Date de fin").fill("2026-12-31");
  await expect(dialog.getByText(/2.000.FCFA de réduction sur les articles de votre boutique, dès 15.000.FCFA/)).toBeVisible();
  // No free shipping: the checkout does not apply it.
  await expect(dialog.getByLabel("Type de réduction").locator("option")).toHaveText(["Pourcentage", "Montant fixe"]);
  await dialog.getByRole("button", { name: "Créer le code" }).click();

  await expect(toast(page, "Le code RENTREE est créé.")).toBeVisible();
  const row = page.getByRole("table", { name: "Codes promotionnels" }).getByRole("row").filter({ hasText: "RENTREE" });
  await expect(row).toContainText("−2 000 FCFA");
  await expect(row).toContainText("Min. 15 000 FCFA");
  await expect(row).toContainText("0 / 300");
  await expect(row).toContainText("Actif");

  const sent = (await received(page)).filter((entry) => entry.path === "/sellers/marketing/coupons").at(-1)!.body;
  expect(sent).toEqual({ code: "RENTREE", discount_type: "amount_off", discount_value: 200000, min_subtotal: 1500000, total_usage_limit: 300, per_customer_limit: null, starts_at: "2026-10-12", ends_at: "2026-12-31" });
});

test("switches a code off and on again: the state shown is the one the server answers", async ({ page }) => {
  await page.goto("/vendor/marketing");
  const row = page.getByRole("table", { name: "Codes promotionnels" }).getByRole("row").filter({ hasText: "BIENVENUE" });
  await expect(row).toContainText("Actif");

  await row.getByRole("button", { name: "Actions pour le code BIENVENUE" }).click();
  await page.getByRole("menuitem", { name: "Désactiver" }).click();
  await expect(toast(page, "Le code BIENVENUE est désactivé.")).toBeVisible();
  await expect(row).toContainText("Désactivé");
  await expect(figures(page, "Vos codes promotionnels en chiffres")).toContainText("Codes actifs");

  await row.getByRole("button", { name: "Actions pour le code BIENVENUE" }).click();
  await page.getByRole("menuitem", { name: "Réactiver" }).click();
  await expect(row).toContainText("Actif");
});

test("creates a promotion on a product on sale, previews its price, and refuses a second one", async ({ page }) => {
  await page.goto("/vendor/marketing?onglet=promotions");
  await page.getByRole("button", { name: "Créer une promotion" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Créer une promotion produit" });

  // Only products on sale are offered: the draft is not in the list.
  const products = dialog.getByRole("listbox", { name: "Produits en vente" });
  await expect(products.getByRole("option")).toHaveCount(6);
  await expect(products.getByRole("option", { name: /Sandales cuir/ })).toHaveCount(0);
  await dialog.getByRole("textbox", { name: /^Produit/ }).fill("robe");
  await expect(products.getByRole("option")).toHaveCount(1);
  await products.getByRole("option", { name: /Robe Wax/ }).click();

  await dialog.getByLabel("Valeur").fill("100");
  await dialog.getByRole("button", { name: "Créer la promotion" }).click();
  await expect(dialog.getByText("La réduction doit rester inférieure au prix du produit.")).toBeVisible();

  await dialog.getByLabel("Valeur").fill("20");
  const preview = dialog.getByRole("region", { name: "Aperçu" });
  await expect(preview).toContainText("30 000 FCFA");
  await expect(preview).toContainText("−20 %");
  await expect(preview).toContainText("24 000 FCFA");
  await dialog.getByLabel("Date de fin").fill("2026-12-31");
  await dialog.getByRole("button", { name: "Créer la promotion" }).click();
  await expect(toast(page, "Robe Wax est en promotion.")).toBeVisible();

  const table = page.getByRole("table", { name: "Promotions produits" });
  await expect(table.getByRole("row").filter({ hasText: "Robe Wax" })).toContainText("24 000 FCFA");
  const sent = (await received(page)).filter((entry) => entry.path === "/sellers/marketing/promotions").at(-1)!.body;
  expect(sent).toMatchObject({ product_id: "product-robe", discount_type: "percent_off", discount_value: 20, ends_at: "2026-12-31" });

  // A second promotion on a product that has one: the server's sentence.
  await page.getByRole("button", { name: "Créer une promotion" }).first().click();
  await dialog.getByRole("textbox", { name: /^Produit/ }).fill("baskets");
  await products.getByRole("option", { name: /Baskets Sport/ }).click();
  await dialog.getByLabel("Valeur").fill("10");
  await dialog.getByRole("button", { name: "Créer la promotion" }).click();
  await expect(dialog.getByText(/Ce produit a déjà une promotion active/)).toBeVisible();
});

test("changes a promotion to an amount in francs, switches it off, and removes it after a confirmation", async ({ page }) => {
  await page.goto("/vendor/marketing?onglet=promotions");
  const table = page.getByRole("table", { name: "Promotions produits" });
  const row = table.getByRole("row").filter({ hasText: "Montre Homme" });
  await expect(row).toContainText("28 000 FCFA");

  await row.getByRole("button", { name: "Actions pour la promotion de Montre Homme" }).click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  const dialog = page.getByRole("dialog", { name: "Modifier la promotion" });
  await dialog.getByLabel("Type de réduction").selectOption({ label: "Montant fixe" });
  await dialog.getByLabel("Valeur").fill("5000");
  await expect(dialog.getByRole("region", { name: "Aperçu" })).toContainText("30 000 FCFA");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(toast(page, "La promotion est modifiée.")).toBeVisible();
  await expect(row).toContainText("30 000 FCFA");
  const sent = (await received(page)).filter((entry) => entry.path === "/sellers/marketing/promotions/promo-montre").at(-1)!.body;
  expect(sent).toMatchObject({ discount_type: "amount_off", discount_value: 500000 });

  // Switched off, it stays in the list and can come back.
  await row.getByRole("button", { name: "Actions pour la promotion de Montre Homme" }).click();
  await page.getByRole("menuitem", { name: "Désactiver" }).click();
  await expect(row).toContainText("Désactivé");
  await row.getByRole("button", { name: "Actions pour la promotion de Montre Homme" }).click();
  await expect(page.getByRole("menuitem", { name: "Réactiver" })).toBeVisible();
  await page.keyboard.press("Escape");

  // A finished one cannot be switched back on as it is: the server says why.
  const ended = table.getByRole("row").filter({ hasText: "Casque Audio" });
  await ended.getByRole("button", { name: "Actions pour la promotion de Casque Audio" }).click();
  await page.getByRole("menuitem", { name: "Désactiver" }).click();
  await expect(ended).toContainText("Désactivé");
  await ended.getByRole("button", { name: "Actions pour la promotion de Casque Audio" }).click();
  await page.getByRole("menuitem", { name: "Réactiver" }).click();
  await expect(toast(page, /donnez-lui une nouvelle date de fin/)).toBeVisible();
  await expect(ended).toContainText("Désactivé");

  await row.getByRole("button", { name: "Actions pour la promotion de Montre Homme" }).click();
  await page.getByRole("menuitem", { name: "Supprimer" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("Montre Homme repasse à 35 000 FCFA");
  await confirm.getByRole("button", { name: "Annuler" }).click();
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Actions pour la promotion de Montre Homme" }).click();
  await page.getByRole("menuitem", { name: "Supprimer" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer la promotion" }).click();
  await expect(toast(page, "La promotion de Montre Homme est supprimée.")).toBeVisible();
  await expect(row).toHaveCount(0);
});
