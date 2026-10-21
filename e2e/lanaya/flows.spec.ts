import { expect, test } from "@playwright/test";
import { TOKEN, open, received, toast } from "./helpers";

// SUGU Lanaya (Lot 1) against the stand-in API: what the portal shows of
// the server's answers, and what it sends. The rules themselves are the
// server's (e2e/staging/lanaya.staging.spec.ts checks the real one).

test("an admitted Lanabaga: the board of the server, no badge, no amount", async ({ page, baseURL }) => {
  await open(page, baseURL, "/lanabaga/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bonjour, Aïssata");
  const figures = page.getByRole("region", { name: "Votre activité" });
  await expect(figures).toContainText("0 / 5");
  await expect(page.getByRole("table", { name: "Mes vendeurs" }).getByText("Boutique Awa")).toBeVisible();
  await expect(page.getByRole("table", { name: "Mes vendeurs" }).getByText("+226 70 00 01 01")).toBeVisible();
  await expect(page.getByText(/Pas encore ouvert : aucune commission n'est calculée/)).toBeVisible();
  await expect(page.getByText(/^Vérifié$|Badge en revue|FCFA/)).toHaveCount(0);
});

test("a candidate: the network pages send to the application, the menu holds the file only", async ({ page, baseURL }) => {
  await open(page, baseURL, "/lanabaga/prospects", { account: "candidate" });
  await expect(page).toHaveURL(/\/lanabaga\/application$/);
  const menu = page.getByRole("navigation", { name: "Navigation principale" }).first();
  await expect(menu.getByRole("link", { name: "Candidature" })).toBeVisible();
  for (const name of ["Tableau de bord", "Prospects", "Invitations", "Mes vendeurs"]) await expect(menu.getByRole("link", { name })).toHaveCount(0);
});

test("a candidate applies: each step says what is missing, nothing is ticked for them", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  await open(page, baseURL, "/lanabaga/application", { account: "candidate" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Candidature Lanabaga");

  // Profile: the experience is required.
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText("Indiquez vos années d'expérience.")).toBeVisible();
  await page.getByRole("combobox", { name: /Années d'expérience/ }).selectOption("3-5");
  await page.getByRole("button", { name: "Continuer" }).click();

  // Identity: the two pieces of the pilot policy.
  await expect(page.getByRole("heading", { name: "Documents requis" })).toBeVisible();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText("Déposez chacune des pièces obligatoires.")).toBeVisible();
  const pdf = { name: "piece.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") };
  for (const label of ["Pièce d'identité", "Photo professionnelle"]) {
    const row = page.locator("li").filter({ hasText: label });
    const chooser = page.waitForEvent("filechooser");
    await row.getByRole("button", { name: "Télécharger" }).click();
    await (await chooser).setFiles(pdf);
    await expect(row.getByText("À vérifier")).toBeVisible();
  }
  // A file the server would refuse is refused before it is sent.
  const replace = page.locator("li").filter({ hasText: "Pièce d'identité" }).getByRole("button", { name: "Remplacer" });
  const chooser = page.waitForEvent("filechooser");
  await replace.click();
  await (await chooser).setFiles({ name: "piece.docx", mimeType: "application/msword", buffer: Buffer.from("x") });
  await expect(toast(page, "Formats acceptés : PDF, JPG ou PNG.")).toBeVisible();
  await page.getByRole("button", { name: "Continuer" }).click();

  // References: two, complete.
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText("Complétez la référence 1.")).toBeVisible();
  for (const [index, [name, company, phone, relation]] of [
    ["Issa Compaoré", "Tech Market", "70112233", "regular_client"],
    ["Fatou Kaboré", "KaboStore", "70445566", "business_partner"],
  ].entries()) {
    const set = page.locator("fieldset").nth(index);
    await set.getByRole("textbox", { name: /^Nom complet/ }).fill(name);
    await set.getByRole("textbox", { name: /^Entreprise/ }).fill(company);
    await set.getByRole("textbox", { name: /^Téléphone/ }).fill(phone);
    await set.getByRole("combobox", { name: /^Relation/ }).selectOption(relation);
  }
  await page.getByRole("button", { name: "Continuer" }).click();

  // Validation: the consents, one by one, never ticked in advance.
  const boxes = page.getByRole("checkbox");
  await expect(boxes).toHaveCount(2);
  for (const box of await boxes.all()) await expect(box).not.toBeChecked();
  await page.getByRole("button", { name: "Soumettre ma candidature" }).click();
  await expect(page.getByText("Cochez chacun des engagements pour soumettre.")).toBeVisible();
  expect((await received(page)).some((entry) => entry.path.endsWith("/submit"))).toBe(false);
  for (const box of await boxes.all()) await box.check();
  await page.getByRole("button", { name: "Soumettre ma candidature" }).click();
  await expect(page.getByText("Votre candidature est en cours d'examen")).toBeVisible();

  const sent = await received(page);
  const saved = sent.filter((entry) => entry.path === "PUT /lanaya/me/application").at(-1)!.body;
  expect(saved.experience_band).toBe("3-5");
  expect(saved.references).toHaveLength(2);
  expect(sent.filter((entry) => entry.path === "POST /lanaya/me/documents").map((entry) => entry.body.document_type)).toEqual(["identity", "professional_photo"]);
  expect(sent.find((entry) => entry.path.endsWith("/submit"))!.body).toEqual({ consents: { data_processing: true, conduct_code: true } });
});

test("a seller answers an invitation: the box is theirs to tick, the button says what is recorded", async ({ page, baseURL }) => {
  await open(page, baseURL, `/vendor/lanaya?invitation=${TOKEN}`, { account: "seller" });
  await expect(page.getByRole("heading", { name: "Décision du vendeur" })).toBeVisible();
  await expect(page.getByText(/LNB-AB12CD/).first()).toBeVisible();
  await expect(page.getByText(/^Vérifié$|visibilité pour vos produits/)).toHaveCount(0);

  const consent = page.getByRole("checkbox", { name: /présenté SUGU/ });
  await expect(consent).not.toBeChecked();
  await page.getByRole("button", { name: "Accepter la mise en relation" }).click();
  await expect(page.locator("main").getByText("Cochez la case pour confirmer votre accord.")).toBeVisible();
  expect((await received(page)).some((entry) => entry.path.endsWith("/accept"))).toBe(false);

  await consent.check();
  await page.getByRole("button", { name: "Accepter la mise en relation" }).click();
  await expect(page).toHaveURL(/\/vendor\/lanaya$/);
  await expect(page.getByText("Mise en relation acceptée")).toBeVisible();
  const accept = (await received(page)).find((entry) => entry.path.endsWith("/accept"))!;
  expect(accept.body).toEqual({ store_id: "11", consent: true });
});

test("a seller declines: confirmed first, then the invitation is closed", async ({ page, baseURL }) => {
  await open(page, baseURL, `/vendor/lanaya?invitation=${TOKEN}`, { account: "seller" });
  await page.getByRole("button", { name: "Refuser", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Refuser l'invitation" }).click();
  await expect(page).toHaveURL(/\/vendor\/lanaya$/);
  expect((await received(page)).some((entry) => entry.path.endsWith("/decline"))).toBe(true);
});

test("an invitation link that is no longer usable says so", async ({ page, baseURL }) => {
  await open(page, baseURL, `/vendor/lanaya?invitation=${"c".repeat(64)}`, { account: "seller" });
  await expect(page.getByText("Cette invitation n'est plus valable")).toBeVisible();
  await expect(page.getByText(/SUGU-LANAYA/)).toHaveCount(0);
});

test("a prospect: the permission to contact is ticked by the Lanabaga, never for them", async ({ page, baseURL }) => {
  await open(page, baseURL, "/lanabaga/prospects");
  await page.getByRole("button", { name: "Ajouter un prospect" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Ajouter un prospect" });
  await dialog.getByRole("textbox", { name: /^Nom de l'entreprise/ }).fill("Boutique Test");
  await dialog.getByRole("textbox", { name: /^Nom du contact/ }).fill("Contact Test");
  await dialog.getByRole("textbox", { name: /^Téléphone/ }).fill("70998877");
  await dialog.getByRole("textbox", { name: /^Ville/ }).fill("Ouagadougou");
  await dialog.getByRole("combobox", { name: /Comment l'avez-vous connu/ }).selectOption("recommendation");
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await dialog.getByRole("button", { name: "Ajouter le prospect" }).click();
  await expect(dialog.getByText("Confirmez que cette personne accepte d'être contactée.")).toBeVisible();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Ajouter le prospect" }).click();
  await expect(page.getByRole("table", { name: "Prospects" }).getByText("Boutique Test")).toBeVisible();
  const sent = (await received(page)).find((entry) => entry.path === "POST /lanaya/me/leads")!;
  expect(sent.body).toMatchObject({ phone: "70998877", contact_permission: true, declared_source: "recommendation" });
});

test("an invitation: SUGU's text, the link given once", async ({ page, baseURL }) => {
  await open(page, baseURL, "/lanabaga/prospects");
  const form = page.locator("#invitation");
  await expect(form.getByRole("combobox")).toHaveCount(0);
  await form.getByRole("textbox", { name: /^Nom du vendeur/ }).fill("Moussa Ouédraogo");
  await form.getByRole("textbox", { name: /^Téléphone/ }).fill("70554433");
  await form.getByRole("textbox", { name: /^Nom de l'entreprise/ }).fill("Ets Ouédraogo");
  await form.getByRole("textbox", { name: /^Mot personnel/ }).fill("Bonjour, voyez https://exemple.test ou appelez le 70 11 22 33");
  await expect(form.getByText(/\d+\/300/)).toBeVisible();
  await form.getByRole("button", { name: "Créer l'invitation" }).click();
  await expect(form.getByText(/Le lien ne sera plus affiché/)).toBeVisible();
  const text = form.locator("output");
  await expect(text).toContainText("Bonjour, je vous présente SUGU pour Ets Ouédraogo.");
  await expect(text).toContainText(`/invitation/${"b".repeat(64)}`);
  await expect(text).not.toContainText("exemple.test");
  await expect(form.getByRole("link", { name: "Envoyer par WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/22670554433\?text=/);
  // Another invitation: the link of the first is gone from the screen.
  await form.getByRole("button", { name: "Préparer une autre invitation" }).click();
  await expect(page.locator("main").getByText(`/invitation/${"b".repeat(64)}`)).toHaveCount(0);
});

test("an open invitation is revoked after a confirmation", async ({ page, baseURL }) => {
  await open(page, baseURL, "/lanabaga/invitations");
  await page.getByRole("table", { name: "Invitations" }).getByRole("button", { name: "Révoquer" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Révoquer l'invitation" }).click();
  await expect(toast(page, "Invitation révoquée")).toBeVisible();
  await expect(page.getByRole("table", { name: "Invitations" }).getByRole("button", { name: "Révoquer" })).toHaveCount(0);
  expect((await received(page)).some((entry) => /\/invitations\/inv-1\/revoke$/.test(entry.path))).toBe(true);
});
