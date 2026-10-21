import { expect, test } from "@playwright/test";
import { TOKEN, open, received, toast } from "./helpers";

// SUGU Lanaya (Lot 1) against the stand-in API: what the portal shows of
// the server's answers, and what it sends. The rules themselves are the
// server's (e2e/staging/lanaya.staging.spec.ts checks the real one).

test("an admitted Lanabaga: the board of the server, no badge, no amount", async ({ page, baseURL }) => {
  await open(page, baseURL, "/lanabaga/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bonjour, Aïssata");
  const figures = page.getByRole("region", { name: "Votre activité" });
  await expect(figures).toContainText("1 / 5");
  const sellers = page.getByRole("table", { name: "Mes vendeurs" });
  // Entrusted (DEC-29), awaiting its seller, or only introduced: one row per store, the server's state.
  await expect(sellers.getByRole("row").filter({ hasText: "Boutique Awa" })).toContainText("Confiée");
  await expect(sellers.getByText("+226 70 00 01 01")).toBeVisible();
  await expect(sellers.getByRole("row").filter({ hasText: "Quincaillerie Zongo" })).toContainText("Accord du vendeur attendu");
  await expect(sellers.getByRole("row").filter({ hasText: "Boutique Awa" })).toHaveCount(1);
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

test("entrusted stores and followed orders: the server's states, no amount, no buyer", async ({ page, baseURL }) => {
  await open(page, baseURL, "/lanabaga/sellers");
  const entrusted = page.getByRole("table", { name: "Boutiques confiées" });
  await expect(entrusted.getByRole("row").filter({ hasText: "Boutique Awa" })).toContainText("Active");
  await expect(entrusted.getByRole("row").filter({ hasText: "Quincaillerie Zongo" })).toContainText("En attente de l'accord du vendeur");
  await expect(page.getByText(/Ets Sawadogo \(terminée\)/)).toBeVisible();

  await page.getByRole("navigation", { name: "Navigation principale" }).first().getByRole("link", { name: "Commandes suivies" }).click();
  await expect(page).toHaveURL(/\/lanabaga\/orders$/);
  const orders = page.getByRole("table", { name: "Commandes suivies" });
  await expect(orders.getByRole("row").filter({ hasText: "SG-2026-004812" })).toContainText("En préparation");
  await expect(orders.getByRole("row").filter({ hasText: "SG-2026-004790" })).toContainText("Boutique Awa");
  await expect(page.locator("main").getByText(/FCFA|XOF/)).toHaveCount(0);
});

test("a seller answers SUGU's proposal: the box is theirs to tick, the replacement is said", async ({ page, baseURL }) => {
  await open(page, baseURL, "/vendor/lanaya", { account: "seller", scenario: "replacing" });
  await expect(page.getByRole("heading", { name: "Proposition d'accompagnement" })).toBeVisible();
  const proposal = page.locator("main");
  await expect(proposal.getByText(/Aïssata Kaboré remplacera Issouf Zongo/)).toBeVisible();
  const consent = proposal.getByRole("checkbox", { name: /Lanabaga principal de ma boutique/ });
  await expect(consent).not.toBeChecked();
  await proposal.getByRole("button", { name: "Accepter ce Lanabaga" }).click();
  await expect(proposal.getByText("Cochez la case pour confirmer votre accord.")).toBeVisible();
  expect((await received(page)).some((entry) => entry.path.endsWith("/accept"))).toBe(false);

  await consent.check();
  await proposal.getByRole("button", { name: "Accepter ce Lanabaga" }).click();
  await expect(toast(page, "Votre Lanabaga principal est enregistré.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proposition d'accompagnement" })).toHaveCount(0);
  await expect(page.getByText(/Lanabaga principal de .+ depuis le/)).toBeVisible();
  const accept = (await received(page)).find((entry) => entry.path.endsWith("/accept"))!;
  expect(accept).toEqual({ path: "POST /sellers/lanaya/assignments/asg-p/accept", body: { consent: true } });
});

test("a seller declines SUGU's proposal, then ends an accompaniment: confirmed first each time", async ({ page, baseURL }) => {
  await open(page, baseURL, "/vendor/lanaya", { account: "seller", scenario: "replacing" });
  await page.getByRole("button", { name: /^Refuser la proposition pour / }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Refuser la proposition", exact: true }).click();
  await expect(toast(page, "Proposition refusée.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proposition d'accompagnement" })).toHaveCount(0);

  await page.getByRole("button", { name: "Mettre fin à l'accompagnement" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Mettre fin" }).click();
  await expect(toast(page, "L'accompagnement de votre boutique est terminé.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mettre fin à l'accompagnement" })).toHaveCount(0);
  const paths = (await received(page)).map((entry) => entry.path);
  expect(paths).toEqual(expect.arrayContaining(["POST /sellers/lanaya/assignments/asg-p/decline", "POST /sellers/lanaya/assignments/asg-a/end"]));
  expect(paths.some((entry) => entry.endsWith("/accept"))).toBe(false);
});

test("an invitation and a proposal on the same page: each refusal says what it refuses", async ({ page, baseURL }) => {
  await open(page, baseURL, `/vendor/lanaya?invitation=${TOKEN}`, { account: "seller", scenario: "proposed" });
  await expect(page.getByRole("heading", { name: "Décision du vendeur" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proposition d'accompagnement" })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(2);
  for (const box of await page.getByRole("checkbox").all()) await expect(box).not.toBeChecked();
  await page.getByRole("button", { name: "Refuser", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Refuser l'invitation" }).click();
  await expect(page).toHaveURL(/\/vendor\/lanaya$/);
  // The invitation is answered; SUGU's proposal is still waiting for the seller.
  await expect(page.getByRole("heading", { name: "Proposition d'accompagnement" })).toBeVisible();
  const paths = (await received(page)).map((entry) => entry.path);
  expect(paths.some((entry) => entry.endsWith("/decline") && entry.includes("/lanaya/invitations/"))).toBe(true);
  expect(paths.some((entry) => entry.includes("/assignments/"))).toBe(false);
});

test("a Lanabaga talks with the seller of an entrusted store: the notice first, a number never passed on", async ({ page, baseURL }) => {
  await open(page, baseURL, "/lanabaga/messages");
  const list = page.getByRole("navigation", { name: "Navigation principale" }).first();
  await expect(list.getByRole("link", { name: /Messages/ })).toBeVisible();
  await page.getByRole("link", { name: /Boutique Awa/ }).first().click();
  await expect(page).toHaveURL(/\/lanabaga\/messages\/conv-awa$/);
  const thread = page.getByLabel("Conversation : Boutique Awa");
  await expect(thread.getByText("Merci, je refais les trois premières fiches.")).toBeVisible();
  await expect(thread.getByText(/les numéros de téléphone, e-mails et liens externes ne sont pas transmis/)).toBeVisible();

  const field = page.getByRole("textbox", { name: "Écrire à Boutique Awa" });
  await field.fill("Appelez-moi au 70 11 22 33 demain.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(thread.getByText("Appelez-moi au [numéro masqué] demain.")).toBeVisible();
  await expect(thread.getByText("· Coordonnées masquées")).toBeVisible();
  const sent = (await received(page)).find((entry) => entry.path === "POST /lanaya/me/conversations/conv-awa/messages")!;
  expect(sent.body.body).toBe("Appelez-moi au 70 11 22 33 demain.");
});

test("« Écrire » on an entrusted store opens its conversation", async ({ page, baseURL }) => {
  await open(page, baseURL, "/lanabaga/sellers");
  await page.getByRole("table", { name: "Boutiques confiées" }).getByRole("button", { name: "Écrire au vendeur de Boutique Awa" }).click();
  await expect(page).toHaveURL(/\/lanabaga\/messages\/conv-awa$/);
  // A store awaiting its seller's answer has no conversation yet.
  await page.goto("/lanabaga/sellers");
  await expect(page.getByRole("table", { name: "Boutiques confiées" }).getByRole("button", { name: "Écrire au vendeur de Quincaillerie Zongo" })).toHaveCount(0);
});

test("a Lanabaga writes to the programme: a theme, no store, the team's answer as a team", async ({ page, baseURL }) => {
  await open(page, baseURL, "/lanabaga/support");
  await expect(page.getByRole("link", { name: /Date de fin de ma convention/ })).toBeVisible();
  await page.getByRole("link", { name: /Date de fin de ma convention/ }).click();
  await expect(page.getByText("Elle est valable onze mois encore.")).toBeVisible();
  await expect(page.getByText("Équipe Lanaya").first()).toBeVisible();

  await page.goto("/lanabaga/support?new=1");
  const form = page.getByRole("form", { name: "Nouveau ticket" });
  await expect(form.getByText(/N'envoyez jamais votre pièce d'identité ici/)).toBeVisible();
  await form.getByRole("textbox", { name: /^Sujet/ }).fill("Un vendeur me demande de l'argent");
  await form.getByRole("combobox", { name: /^Thème/ }).selectOption("conduct");
  await form.getByRole("textbox", { name: /^Description/ }).fill("Il veut que je lui paie ses frais.");
  await form.getByRole("button", { name: "Créer le ticket" }).click();
  await expect(toast(page, /créé/)).toBeVisible();
  const created = (await received(page)).find((entry) => entry.path === "POST /lanaya/me/tickets")!;
  expect(created.body).toEqual({ subject: "Un vendeur me demande de l'argent", description: "Il veut que je lui paie ses frais.", topic: "conduct" });
});

test("a candidate writes to the programme too, and has no messages", async ({ page, baseURL }) => {
  await open(page, baseURL, "/lanabaga/support", { account: "candidate" });
  await expect(page).toHaveURL(/\/lanabaga\/support$/);
  const menu = page.getByRole("navigation", { name: "Navigation principale" }).first();
  await expect(menu.getByRole("link", { name: "Mes demandes" })).toBeVisible();
  await expect(menu.getByRole("link", { name: /^Messages/ })).toHaveCount(0);
  await page.goto("/lanabaga/messages");
  await expect(page).toHaveURL(/\/lanabaga\/application$/);
});

test("a seller writes to their main Lanabaga from « Programme Lanaya »", async ({ page, baseURL }) => {
  await open(page, baseURL, "/vendor/lanaya", { account: "seller", scenario: "active" });
  await page.getByRole("button", { name: "Écrire à Aïssata Kaboré" }).click();
  await expect(page).toHaveURL(/\/vendor\/messages\/01JCONVLANAYA0000000000001$/);
  expect((await received(page)).some((entry) => entry.path === "POST /sellers/lanaya/conversation")).toBe(true);
});

