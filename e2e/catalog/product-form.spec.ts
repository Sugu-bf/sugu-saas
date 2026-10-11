import { expect, test, type Page } from "@playwright/test";
import {
  PHONE,
  TOUCH_TARGET,
  WIDTHS,
  actionBar,
  blockingViolations,
  box,
  categoryList,
  categorySearch,
  chooseCategory,
  currentStep,
  description,
  descriptionPictureInput,
  goToStep,
  open,
  photoInput,
  received,
  sidewaysOverflow,
  stepper,
} from "./helpers";
import { heavyPng, pngFile } from "./pictures";

// The product form (creation and edition), in four steps, on the production
// build. What the form sends is read back from the stand-in API: a draft is
// always created as a draft, publication is never decided by the seller.

const next = (page: Page) => page.getByRole("button", { name: "Suivant" });
const saveDraft = (page: Page) => page.getByRole("button", { name: "Enregistrer le brouillon" });
const saveChanges = (page: Page) => page.getByRole("button", { name: "Enregistrer les modifications" });
const submit = (page: Page) => page.getByRole("button", { name: "Soumettre à validation" });
const category = (page: Page) => page.locator("#product-category");
const price = (page: Page) => page.getByRole("textbox", { name: /^Prix de vente/ });
/** The panel beside the steps, on a page wide enough for it. */
const panel = (page: Page) => page.getByRole("complementary", { name: "Aperçu du produit" });
const photos = (page: Page) => page.getByRole("list", { name: "Photos du produit" }).locator("> li:has(img)");
const status = (page: Page) => page.locator("main header").first();
const tool = (page: Page, name: string) => page.getByRole("toolbar", { name: "Mise en forme de la description" }).getByRole("button", { name, exact: true });

/** Fills what a draft needs to be accepted by moderation, step after step, and stops on the summary. */
async function fillReadyProduct(page: Page, name: string) {
  await page.getByLabel("Nom du produit").fill(name);
  await chooseCategory(page, "Textile");
  await description(page).click();
  await page.keyboard.type("Brodé à la main à Bobo-Dioulasso.");
  await next(page).click();
  await photoInput(page).setInputFiles([pngFile("face.png"), pngFile("dos.png")]);
  await expect(photos(page)).toHaveCount(2);
  await next(page).click();
  await price(page).fill("12500");
  await page.getByLabel("Stock", { exact: true }).fill("8");
  await next(page).click();
  await expect(currentStep(page)).toContainText("Récapitulatif");
}

// ─────────────────────────────────────────────────────────────
// Creation
// ─────────────────────────────────────────────────────────────
test.describe("creation", () => {
  test("saves a draft from the first step: a name is enough", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/new");
    await expect(page.getByRole("heading", { level: 1, name: "Nouveau produit" })).toBeVisible();
    await expect(stepper(page).getByRole("button")).toHaveCount(4);
    await expect(currentStep(page)).toContainText("Informations");

    await page.getByLabel("Nom du produit").fill("Panier tressé de Bobo");
    await saveDraft(page).click();

    await expect(page).toHaveURL(/\/vendor\/products\/product-new-1$/);
    await expect(page.getByRole("heading", { level: 1, name: "Panier tressé de Bobo" })).toBeVisible();
    await expect(status(page)).toContainText("Brouillon");

    const requests = await received(page);
    expect(requests).toHaveLength(1);
    expect(requests[0].path).toBe("/sellers/products");
    expect(requests[0].fields.status).toEqual(["draft"]);
    expect(requests[0].fields.name).toEqual(["Panier tressé de Bobo"]);
    expect(JSON.stringify(requests[0].fields)).not.toContain("published");
  });

  test("walks the four steps and submits the product to moderation", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/new");
    const submissions: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/submit")) submissions.push(request.url());
    });

    await fillReadyProduct(page, "Boubou brodé");

    // The summary shows what was entered, and that nothing is missing.
    const main = page.locator("main");
    await expect(main).toContainText("Boubou brodé");
    await expect(main).toContainText("Textile");
    await expect(main).toContainText("Brodé à la main à Bobo-Dioulasso.");
    await expect(page.getByRole("list", { name: "Photos retenues" }).getByRole("listitem")).toHaveCount(2);
    await expect(main).toContainText(/12\s500\sFCFA/);
    await expect(main).toContainText("8 unités");
    await expect(page.getByText("5 sur 5")).toBeVisible();
    // Every step is ticked: none has something missing.
    for (const label of ["Informations", "Photos", "Prix et stock"]) await expect(stepper(page).getByRole("button", { name: new RegExp(label) })).toContainText("(terminée)");

    await submit(page).click();
    await expect(page).toHaveURL(/\/vendor\/products\/product-new-1$/);
    await expect(status(page)).toContainText("En validation");
    await expect(page.getByText("Produit soumis à validation.")).toBeVisible();

    // Created as a draft, then queued: the seller never sets "published".
    const requests = await received(page);
    expect(requests).toHaveLength(1);
    const { fields, files } = requests[0];
    expect(fields.status).toEqual(["draft"]);
    expect(fields.primary_category_id).toEqual(["cat-textile"]);
    expect(fields["category[]"]).toEqual(["cat-textile"]);
    expect(fields.price).toEqual(["12500"]);
    expect(fields.stock).toEqual(["8"]);
    expect(fields.hasVariants).toEqual(["0"]);
    expect(fields.description[0]).toContain("Brodé à la main à Bobo-Dioulasso.");
    // The first picture added is the cover: it travels first.
    expect(files).toEqual(["images[]:face.png", "images[]:dos.png"]);
    expect(submissions).toHaveLength(1);
    expect(submissions[0]).toContain("/sellers/products/product-new-1/submit");
  });

  test("stops at a step with a malformed value, and lists what a submission still needs", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/new");

    // No name: the first step is not left.
    await next(page).click();
    await expect(page.getByText("1 champ à corriger")).toBeVisible();
    await expect(page.getByLabel("Nom du produit")).toHaveAttribute("aria-invalid", "true");
    await expect(currentStep(page)).toContainText("Informations");

    await page.getByLabel("Nom du produit").fill("Panier tressé de Bobo");
    await goToStep(page, "Prix et stock");
    await expect(page.getByText(/champs? à corriger/)).toHaveCount(0);

    // A price that is not a number is fixed where it is typed.
    await price(page).fill("douze mille");
    await stepper(page).getByRole("button", { name: /Récapitulatif/ }).click();
    await expect(page.getByText("Le prix est un nombre, sans espace ni devise.").first()).toBeVisible();
    await expect(currentStep(page)).toContainText("Prix et stock");
    await price(page).fill("");

    // A draft can be incomplete; a submission cannot. The summary says what is missing, step by step.
    await goToStep(page, "Récapitulatif");
    await expect(page.getByText("1 sur 5")).toBeVisible();
    await expect(stepper(page).getByRole("button", { name: /Photos/ })).not.toContainText("(terminée)");
    await submit(page).click();

    await expect(page.getByText("4 champs à corriger")).toBeVisible();
    // The form goes to the first step that holds an error, and marks the others.
    await expect(currentStep(page)).toContainText("Informations");
    for (const label of ["Informations", "Photos", "Prix et stock"]) await expect(stepper(page).getByRole("button", { name: new RegExp(label) })).toContainText("(à corriger)");
    await expect(category(page)).toHaveAttribute("aria-invalid", "true");
    await expect(description(page)).toHaveAttribute("aria-invalid", "true");

    await page.getByRole("button", { name: "Aller à l'étape Photos" }).click();
    await expect(currentStep(page)).toContainText("Photos");
    await expect(page.getByText("Ajoutez au moins une photo : la validation le demande.").first()).toBeVisible();
    // Nothing was sent.
    expect(await received(page)).toHaveLength(0);
  });

  test("categories are searched by name: typed, tapped, or chosen with the keyboard", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/new");
    await page.getByLabel("Nom du produit").fill("Piment séché");
    const field = categorySearch(page);
    const list = categoryList(page);
    const chosen = page.getByRole("list", { name: "Catégories choisies" });
    await expect(field).toHaveAttribute("aria-expanded", "false");

    // 57 categories: too many to scroll through. The first fifty, and a word about the others.
    await field.click();
    await expect(list.getByRole("option")).toHaveCount(50);
    await expect(page.getByText("7 autres : précisez la recherche.")).toBeVisible();

    // Accents and case do not matter; a name that starts with the search comes first.
    await field.fill("EPIC");
    await expect(list.getByRole("option")).toHaveText(["Épicerie", "Condiments et épices"]);
    await list.getByRole("option", { name: "Épicerie" }).click();
    await expect(chosen.getByRole("listitem")).toHaveText([/Épicerie/]);
    // The list closes on a choice and the search is emptied: the rest of the form is back.
    await expect(list).toHaveCount(0);
    await expect(field).toHaveValue("");

    // With the keyboard: a search, an arrow, Enter. The form does not move to its next step.
    await field.fill("chaussures");
    await expect(list.getByRole("option")).toHaveText(["Chaussures enfant", "Chaussures femme", "Chaussures homme"]);
    await field.press("ArrowDown");
    await field.press("Enter");
    await expect(chosen.getByRole("listitem")).toHaveText([/Épicerie.*principale/, /Chaussures femme/]);
    await expect(currentStep(page)).toContainText("Informations");
    await expect(field).toBeFocused();

    // What is chosen is ticked in the list, and taken back from it as from its chip.
    await field.fill("chaussures");
    await expect(list.getByRole("option", { name: "Chaussures femme" })).toHaveAttribute("aria-selected", "true");
    await expect(list.getByRole("option", { name: "Chaussures homme" })).toHaveAttribute("aria-selected", "false");
    await list.getByRole("option", { name: "Chaussures femme" }).click();
    await expect(chosen.getByRole("listitem")).toHaveCount(1);
    await chooseCategory(page, "Condiments et épices");
    await page.getByRole("button", { name: "Retirer la catégorie Épicerie" }).click();
    await expect(chosen.getByRole("listitem")).toHaveText([/Condiments et épices/]);

    // Nothing matches: it is said, and Escape closes the list.
    await field.fill("zzz");
    await expect(page.getByText("Aucun résultat pour « zzz ».")).toBeVisible();
    await field.press("Escape");
    await expect(list).toHaveCount(0);
    await field.press("Escape");
    await expect(field).toHaveValue("");

    await chooseCategory(page, "Boissons");
    await saveDraft(page).click();
    await expect(page).toHaveURL(/\/vendor\/products\/product-new-1$/);
    // Sent as before: every category, the first chosen as the main one.
    const { fields } = (await received(page))[0];
    expect(fields["category[]"]).toHaveLength(2);
    expect(fields.primary_category_id).toEqual([fields["category[]"][0]]);
    await expect(page.locator("main")).toContainText("Condiments et épices");
  });

  test("on a phone, the search goes to the top of the screen, so the list is not under the keyboard", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-variants/edit", { width: 390, height: 844 });
    const field = categorySearch(page);
    await expect(page.getByRole("list", { name: "Catégories choisies" }).getByRole("listitem")).toHaveCount(2);
    expect((await box(field)).y).toBeGreaterThan(300);

    await field.click();
    await expect(categoryList(page)).toBeVisible();
    await expect.poll(async () => (await box(field)).y).toBeLessThan(140);
    // The whole list is on the upper half of the screen, where a keyboard does not reach... nor the tab bar.
    const list = await box(categoryList(page));
    expect(list.y + list.height).toBeLessThanOrEqual(844 - 64);
    for (const option of await categoryList(page).getByRole("option").all()) expect((await box(option)).height).toBeGreaterThanOrEqual(TOUCH_TARGET);

    await field.fill("mais");
    await categoryList(page).getByRole("option", { name: "Maison", exact: true }).click();
    await expect(page.getByRole("list", { name: "Catégories choisies" }).getByRole("listitem")).toHaveCount(3);
    // A tap leaves the field: the phone puts its keyboard away.
    await expect(field).not.toBeFocused();
    // The application itself did not move.
    expect(await page.evaluate(() => document.documentElement.scrollTop)).toBe(0);
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
    expect(await blockingViolations(page)).toEqual([]);
  });

  test("builds variants from options: every combination keeps its own price, stock and reference", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/new");
    await page.getByLabel("Nom du produit").fill("Sandales en cuir");
    await goToStep(page, "Prix et stock");
    await price(page).fill("9000");

    await page.getByRole("switch", { name: "Ce produit a des variantes" }).click();
    await page.getByLabel("Nom de l'option").fill("Pointure");
    await page.getByLabel("Nom de l'option").press("Enter");
    for (const value of ["40", "41", "42"]) {
      await page.getByLabel("Ajouter une valeur à Pointure").fill(value);
      await page.getByLabel("Ajouter une valeur à Pointure").press("Enter");
    }
    // Typing Enter in these fields adds a value: it never leaves the step.
    await expect(currentStep(page)).toContainText("Prix et stock");

    const variants = page.getByRole("list", { name: "Variantes du produit" }).locator("> li");
    await expect(variants).toHaveCount(3);
    await expect(page.getByText("3 variantes", { exact: true })).toBeVisible();
    // The stock is entered per variant: the product has no stock field of its own any more.
    await expect(page.getByLabel("Stock", { exact: true })).toHaveCount(0);

    await page.getByLabel("Même stock pour toutes").fill("5");
    // Second « Appliquer »: the one next to the stock.
    await page.getByRole("button", { name: "Appliquer" }).nth(1).click();
    await expect(page.getByLabel("Stock de 41")).toHaveValue("5");

    // One variant differs from the others.
    await page.getByLabel("Prix de 42").fill("9500");
    await page.getByLabel("Stock de 42").fill("2");
    await page.getByLabel("Référence de 42").fill("SAN-42");
    await page.getByRole("button", { name: "Plus de réglages pour 42" }).click();
    await page.getByLabel("Quantité minimale par commande").fill("2");

    // A value is removed: its variant goes, what was typed for the others stays.
    await page.getByRole("button", { name: "Retirer 40 de Pointure" }).click();
    await expect(variants).toHaveCount(2);
    await expect(page.getByLabel("Prix de 42")).toHaveValue("9500");

    await goToStep(page, "Récapitulatif");
    const summary = page.getByRole("list", { name: "Variantes" });
    await expect(summary.getByRole("listitem")).toHaveCount(2);
    await expect(summary.getByRole("listitem").nth(1)).toContainText(/9\s500\sFCFA/);
    await expect(page.locator("main")).toContainText("7 unités");

    await saveDraft(page).click();
    await expect(page).toHaveURL(/\/vendor\/products\/product-new-1$/);

    const { fields } = (await received(page))[0];
    expect(fields.hasVariants).toEqual(["1"]);
    expect(fields.stock).toBeUndefined();
    expect(fields["variants[0][options][Pointure]"]).toEqual(["41"]);
    expect(fields["variants[0][price]"]).toEqual(["9000"]);
    expect(fields["variants[0][stock]"]).toEqual(["5"]);
    expect(fields["variants[1][options][Pointure]"]).toEqual(["42"]);
    expect(fields["variants[1][price]"]).toEqual(["9500"]);
    expect(fields["variants[1][stock]"]).toEqual(["2"]);
    expect(fields["variants[1][sku]"]).toEqual(["SAN-42"]);
    expect(fields["variants[1][minOrderQuantity]"]).toEqual(["2"]);
    expect(fields["variants[2][price]"]).toBeUndefined();
  });

  test("keeps what was typed when the server fails, and never shows its internals", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/new");
    await page.getByLabel("Nom du produit").fill("Panne serveur au mauvais moment");
    await description(page).click();
    await page.keyboard.type("Texte à ne pas perdre.");
    await saveDraft(page).click();

    const alert = page.getByRole("alert").filter({ hasText: "Enregistrement impossible" }).first();
    await expect(alert).toContainText("Le produit n'a pas été enregistré.");
    await expect(page.locator("main")).not.toContainText("SQLSTATE");
    await expect(page).toHaveURL(/\/vendor\/products\/new$/);
    await expect(page.getByLabel("Nom du produit")).toHaveValue("Panne serveur au mauvais moment");
    await expect(description(page)).toContainText("Texte à ne pas perdre.");

    // Corrected, the same form goes through.
    await page.getByLabel("Nom du produit").fill("Panier tressé de Bobo");
    await saveDraft(page).click();
    await expect(page).toHaveURL(/\/vendor\/products\/product-new-1$/);
  });

  test("saves once when the button is activated twice", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/new");
    let posts = 0;
    await page.route("**/api/proxy/sellers/products", async (route) => {
      if (route.request().method() === "POST") {
        posts += 1;
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      await route.continue();
    });

    await page.getByLabel("Nom du produit").fill("Panier tressé de Bobo");
    await saveDraft(page).click();
    await expect(saveDraft(page)).toBeDisabled();
    await expect(next(page)).toBeDisabled();
    await saveDraft(page).click({ force: true }).catch(() => undefined);
    await expect(page).toHaveURL(/\/vendor\/products\/product-new-1$/);
    expect(posts).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────
// Description
// ─────────────────────────────────────────────────────────────
test.describe("description", () => {
  test("writes titles, a table and a picture; the picture travels inline and comes back hosted", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/new");
    await page.getByLabel("Nom du produit").fill("Boubou brodé");

    await description(page).click();
    await tool(page, "Style du texte").click();
    await page.getByRole("menuitem", { name: "Titre 2" }).click();
    // The menu gives the focus back to the text: typing goes on.
    await page.keyboard.type("Guide des tailles");
    await page.keyboard.press("Enter");
    await tool(page, "Gras").click();
    await page.keyboard.type("Coupe ample.");
    await tool(page, "Gras").click();
    await page.keyboard.press("Enter");

    await tool(page, "Tableau").click();
    await page.getByRole("menuitem", { name: "Insérer un tableau" }).click();
    const cells = ["Taille", "Poitrine", "Longueur", "M", "98 cm", "72 cm", "L", "104 cm", "74 cm"];
    for (const [index, cell] of cells.entries()) {
      await page.keyboard.type(cell);
      if (index < cells.length - 1) await page.keyboard.press("Tab");
    }
    await expect(description(page).locator("th")).toHaveCount(3);
    await expect(description(page).locator("td")).toHaveCount(6);

    // The table is edited from its menu: a column goes, a line comes.
    await description(page).locator("td", { hasText: "72 cm" }).click();
    await tool(page, "Tableau").click();
    await page.getByRole("menuitem", { name: "Supprimer la colonne" }).click();
    await expect(description(page).locator("th")).toHaveCount(2);
    await description(page).locator("td", { hasText: "104 cm" }).click();
    await tool(page, "Tableau").click();
    await page.getByRole("menuitem", { name: "Ajouter une ligne en dessous" }).click();
    await expect(description(page).locator("tr")).toHaveCount(4);
    await description(page).locator("tr").last().locator("td").first().click();
    await page.keyboard.type("XL");

    await page.keyboard.press("Control+End");
    await descriptionPictureInput(page).setInputFiles(pngFile("detail-de-la-broderie.png"));
    const picture = description(page).locator("img");
    await expect(picture).toHaveCount(1);
    await expect(picture).toHaveAttribute("alt", "detail de la broderie");

    // The picture is described for those who do not see it.
    await tool(page, "Image").click();
    await page.getByRole("menuitem", { name: "Décrire l'image…" }).click();
    const describe = page.getByRole("dialog", { name: "Décrire l'image" });
    await describe.getByLabel("Description de l'image").fill("Broderie dorée du col");
    await describe.getByRole("button", { name: "Enregistrer" }).click();
    await expect(picture).toHaveAttribute("alt", "Broderie dorée du col");

    // The summary reads the description without inserting its markup.
    await goToStep(page, "Récapitulatif");
    await expect(page.locator("main table")).toHaveCount(1);
    await expect(page.locator("main")).toContainText("Guide des tailles");

    await saveDraft(page).click();
    await expect(page).toHaveURL(/\/vendor\/products\/product-new-1$/);

    // Sent as the editor wrote it, the picture inlined for Laravel to store.
    const sent = (await received(page))[0].fields.description[0];
    expect(sent).toContain("<h2>Guide des tailles</h2>");
    expect(sent).toContain("<strong>Coupe ample.</strong>");
    expect(sent).toMatch(/<table[\s\S]*<th[^>]*><p>Taille<\/p><\/th>[\s\S]*<td[^>]*><p>XL<\/p><\/td>[\s\S]*<\/table>/);
    expect(sent).toMatch(/<img[^>]*src="data:image\/png;base64,[^"]+"[^>]*alt="Broderie dorée du col"/);

    // Read back on the product page: the table as a table, the picture from where it is stored.
    const stored = page.locator("main").getByRole("img", { name: "Broderie dorée du col" });
    await expect(stored).toHaveAttribute("src", /\/api\/proxy\/__catalog\/description\/product-new-1-1$/);
    await expect.poll(() => stored.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(480);
    await expect(page.locator("main table th")).toHaveText(["Taille", "Poitrine"]);
    await expect(page.locator("main table td")).toHaveText(["M", "98 cm", "L", "104 cm", "XL", ""]);
    await expect(page.locator("main").getByRole("heading", { name: "Guide des tailles" })).toBeVisible();
  });

  test("brings a heavy phone photo down to a size that can be sent, and refuses what is not a picture", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/new");
    await page.getByLabel("Nom du produit").fill("Boubou brodé");
    await description(page).click();

    const heavy = heavyPng();
    // Heavier than what a description picture may weigh once stored.
    expect(heavy.length).toBeGreaterThan(5 * 1024 * 1024);
    await descriptionPictureInput(page).setInputFiles({ name: "photo-du-telephone.png", mimeType: "image/png", buffer: heavy });

    const picture = description(page).locator("img");
    await expect(picture).toHaveCount(1, { timeout: 30_000 });
    const inlined = await picture.evaluate((image: HTMLImageElement) => ({ type: image.src.slice(0, 15), bytes: Math.round((image.src.length * 3) / 4), width: image.naturalWidth }));
    expect(inlined.type).toBe("data:image/webp");
    expect(inlined.bytes).toBeLessThan(5 * 1024 * 1024);
    expect(inlined.width).toBe(1600);

    // A document is not a picture: it is said, and nothing is inserted.
    await descriptionPictureInput(page).setInputFiles({ name: "notice.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: "notice.pdf" })).toContainText("n'est pas une image JPG, PNG, WEBP ou GIF.");
    await expect(picture).toHaveCount(1);
  });

  test("adds a link through a dialog, and refuses an address that is not one", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/new");
    await description(page).click();
    await page.keyboard.type("Voir la boutique");
    await page.keyboard.press("Control+a");

    await tool(page, "Lien").click();
    const dialog = page.getByRole("dialog", { name: "Ajouter un lien" });
    await dialog.getByLabel("Adresse du lien").fill("javascript:alert(1)");
    await dialog.getByRole("button", { name: "Appliquer" }).click();
    await expect(dialog).toContainText("Saisissez une adresse complète");

    await dialog.getByLabel("Adresse du lien").fill("sugu.pro/boutique");
    await dialog.getByLabel("Adresse du lien").press("Enter");
    await expect(dialog).toBeHidden();
    // Enter in the dialog applied the link: it did not move the form to its next step.
    await expect(currentStep(page)).toContainText("Informations");
    const link = description(page).getByRole("link", { name: "Voir la boutique" });
    await expect(link).toHaveAttribute("href", "https://sugu.pro/boutique");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");

    await link.click();
    await expect(page).toHaveURL(/\/vendor\/products\/new$/);
    await tool(page, "Lien").click();
    await page.getByRole("dialog", { name: "Modifier le lien" }).getByRole("button", { name: "Retirer le lien" }).click();
    await expect(description(page).getByRole("link")).toHaveCount(0);
    await expect(description(page)).toContainText("Voir la boutique");
  });

  test("takes pasted text with its formatting, and nothing that could run or that buyers would not see", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/new");
    await page.getByLabel("Nom du produit").fill("Savon au karité");
    await description(page).click();

    await page.evaluate(() => {
      const html =
        '<p onclick="window.__xss = true">Karité <strong>pur</strong></p><script>window.__xss = true</script>' +
        '<img src="https://autre-site.test/photo.jpg" onerror="window.__xss = true">' +
        "<table><tbody><tr><td>Poids</td><td>100 g</td></tr></tbody></table><iframe src=\"https://autre-site.test\"></iframe>";
      const data = new DataTransfer();
      data.setData("text/html", html);
      data.setData("text/plain", "Karité pur");
      document.querySelector("#product-description")?.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    });

    await expect(description(page).locator("strong")).toHaveText("pur");
    await expect(description(page).locator("td")).toHaveText(["Poids", "100 g"]);
    // A picture hosted on another site is not shown by the storefront: it is left out, and said.
    await expect(description(page).locator("img")).toHaveCount(0);
    await expect(page.locator("[data-sonner-toast]")).toContainText("Les images d'un autre site n'ont pas été reprises.");
    for (const selector of ["script", "iframe", "[onclick]", "[onerror]"]) await expect(description(page).locator(selector)).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBeUndefined();

    await saveDraft(page).click();
    await expect(page).toHaveURL(/\/vendor\/products\/product-new-1$/);
    const sent = (await received(page))[0].fields.description[0];
    for (const forbidden of ["<script", "onclick", "onerror", "<iframe", "autre-site.test"]) expect(sent).not.toContain(forbidden);
    await expect(page.locator("main table td")).toHaveText(["Poids", "100 g"]);
    expect(await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBeUndefined();
  });

  test("keeps colours and alignment, from the editor to the product page", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/new");
    await page.getByLabel("Nom du produit").fill("Pagne teint");
    await description(page).click();
    await page.keyboard.type("Teinture naturelle");
    await page.keyboard.press("Control+a");

    await tool(page, "Couleurs").click();
    await page.getByRole("menuitem", { name: "Rouge" }).click();
    await tool(page, "Couleurs").click();
    await page.getByRole("menuitem", { name: "Jaune" }).click();
    await tool(page, "Alignement").click();
    await page.getByRole("menuitem", { name: "Centrer" }).click();

    await saveDraft(page).click();
    await expect(page).toHaveURL(/\/vendor\/products\/product-new-1$/);

    const text = page.locator("main").getByText("Teinture naturelle");
    await expect(text).toBeVisible();
    const look = await text.evaluate((element) => {
      const style = (node: Element | null) => (node ? getComputedStyle(node) : null);
      return {
        color: style(element.closest("span") ?? element)?.color,
        highlight: style(element.closest("mark"))?.backgroundColor,
        align: style(element.closest("p"))?.textAlign,
      };
    });
    expect(look).toEqual({ color: "rgb(220, 38, 38)", highlight: "rgb(254, 240, 138)", align: "center" });
  });
});

// ─────────────────────────────────────────────────────────────
// Edition
// ─────────────────────────────────────────────────────────────
test.describe("edition", () => {
  test("loads a stored product in its four steps, and saves an online product without touching its status", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-variants/edit");
    await expect(page.getByRole("heading", { level: 1, name: "Modifier « Chemise en Faso Dan Fani »" })).toBeVisible();
    await expect(page.getByText("Ce produit est en ligne")).toBeVisible();
    // A complete product: its steps are ticked from the start.
    for (const label of ["Photos", "Prix et stock"]) await expect(stepper(page).getByRole("button", { name: new RegExp(label) })).toContainText("(terminée)");

    await expect(page.getByLabel("Nom du produit")).toHaveValue("Chemise en Faso Dan Fani");
    await expect(page.getByRole("list", { name: "Catégories choisies" }).getByRole("listitem")).toHaveText([/Textile/, /Bijoux/]);
    await expect(description(page)).toContainText("Coton tissé main à Ouagadougou.");
    // What the stored description carried and could run did not.
    expect(await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBeUndefined();

    await goToStep(page, "Photos");
    await expect(photos(page)).toHaveCount(3);
    await goToStep(page, "Prix et stock");
    await expect(price(page)).toHaveValue("7500");
    await expect(page.getByLabel("Prix barré")).toHaveValue("9000");
    await expect(page.getByRole("list", { name: "Variantes du produit" }).locator("> li")).toHaveCount(3);
    await expect(page.getByLabel("Référence de Bleu / L")).toHaveValue("CHM-B-L");

    await page.getByLabel("Prix de Bleu / L").fill("8500");
    await goToStep(page, "Récapitulatif");
    // Online: saved as it is. Sending it to moderation again is not offered.
    await expect(page.getByRole("button", { name: "Soumettre à validation" })).toHaveCount(0);
    await expect(page.getByText("Le statut du produit ne change pas")).toBeVisible();
    await saveChanges(page).click();

    await expect(page).toHaveURL(/\/vendor\/products\/product-variants$/);
    await expect(status(page)).toContainText("En ligne");
    await expect(page.getByText("Modifications enregistrées.")).toBeVisible();

    const { path, fields } = (await received(page))[0];
    expect(path).toBe("/sellers/products/product-variants");
    expect(fields._method).toEqual(["PUT"]);
    expect(fields.status).toBeUndefined();
    expect(fields["variants[1][options][Couleur]"]).toEqual(["Bleu"]);
    expect(fields["variants[1][price]"]).toEqual(["8500"]);
    expect(fields["variants[1][sku]"]).toEqual(["CHM-B-L"]);
    // Three stored variants, three sent: the form does not invent the other combinations.
    expect(fields["variants[3][price]"]).toBeUndefined();
  });

  test("pictures are added, promoted and removed by what is stored, never by an address", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-variants/edit");
    await goToStep(page, "Photos");
    await expect(photos(page)).toHaveCount(3);
    await expect(photos(page).first()).toContainText("Principale");

    await page.getByRole("button", { name: "Actions pour la photo 2" }).click();
    await page.getByRole("menuitem", { name: "Définir comme photo principale" }).click();
    await expect(photos(page).nth(1)).toContainText("Principale");
    await expect(photos(page).first()).not.toContainText("Principale");

    // A removal is announced, and can be taken back until the product is saved.
    await page.getByRole("button", { name: "Actions pour la photo 3" }).click();
    await page.getByRole("menuitem", { name: "Retirer la photo" }).click();
    await expect(photos(page)).toHaveCount(2);
    await expect(page.getByText("1 photo sera retirée à l'enregistrement")).toBeVisible();
    await page.getByRole("button", { name: "Garder" }).click();
    await expect(photos(page)).toHaveCount(3);
    await page.getByRole("button", { name: "Actions pour la photo 3" }).click();
    await page.getByRole("menuitem", { name: "Retirer la photo" }).click();

    await photoInput(page).setInputFiles(pngFile("detail-du-col.png"));
    await expect(photos(page)).toHaveCount(3);

    await goToStep(page, "Récapitulatif");
    await expect(page.getByText("1 photo sera retirée à l'enregistrement.")).toBeVisible();
    await saveChanges(page).click();
    await expect(page).toHaveURL(/\/vendor\/products\/product-variants$/);

    const { fields, files } = (await received(page))[0];
    expect(fields["remove_media_ids[]"]).toHaveLength(1);
    expect(fields.main_media_id).toHaveLength(1);
    expect(fields.main_media_id[0]).toMatch(/^\d+$/);
    expect(fields.main_media_id[0]).not.toBe(fields["remove_media_ids[]"][0]);
    expect(files).toEqual(["gallery[]:detail-du-col.png"]);
    // The product keeps its other pictures: nothing is sent about them.
    expect(JSON.stringify(fields)).not.toContain("data:image");
    await expect(page.getByRole("list", { name: "Photos du produit" }).getByRole("button")).toHaveCount(3);
  });

  test("detouring shows both versions, keeps the original, and a failure loses nothing", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-variants/edit");
    await goToStep(page, "Photos");

    await page.getByRole("button", { name: "Actions pour la photo 2" }).click();
    await page.getByRole("menuitem", { name: "Détourer le fond" }).click();
    const comparison = page.getByRole("group", { name: "Détourage de la photo 2" });
    await expect(comparison.getByRole("img", { name: "Photo d'origine" })).toBeVisible();
    await expect(comparison.getByRole("img", { name: "Photo détourée" })).toBeVisible();
    await expect(comparison).toContainText("l'original reste enregistré avec le produit");

    // Going back to the original is one tap away, before and after the choice.
    await comparison.getByRole("button", { name: "Revenir à l'original" }).click();
    await expect(comparison).toHaveCount(0);
    await page.getByRole("button", { name: "Actions pour la photo 2" }).click();
    await page.getByRole("menuitem", { name: "Détourer le fond" }).click();
    await comparison.getByRole("button", { name: "Garder le détourage" }).click();
    await expect(comparison).toHaveCount(0);
    await page.getByRole("button", { name: "Actions pour la photo 2" }).click();
    await expect(page.getByRole("menuitem", { name: "Revenir à l'original" })).toBeVisible();
    await page.keyboard.press("Escape");

    // A picture the service cannot process: it is said next to the pictures, and the picture stays.
    await photoInput(page).setInputFiles(pngFile("echec.png"));
    await expect(photos(page)).toHaveCount(4);
    await page.getByRole("button", { name: "Actions pour la photo 4" }).click();
    await page.getByRole("menuitem", { name: "Détourer le fond" }).click();
    await expect(page.locator("#product-photos").getByRole("alert")).toContainText("n'a pas pu être détourée");
    await expect(photos(page)).toHaveCount(4);

    await saveChanges(page).click();
    await expect(page).toHaveURL(/\/vendor\/products\/product-variants$/);

    const { fields, files } = (await received(page))[0];
    // The accepted detouring travels as its preview id; the original is not removed.
    expect(fields["background_removal_preview_ids[]"]).toHaveLength(1);
    expect(fields["remove_media_ids[]"]).toBeUndefined();
    expect(fields["preview_ids[]"]).toBeUndefined();
    // The picture whose detouring failed is uploaded as it is.
    expect(files).toEqual(["gallery[]:echec.png"]);
  });

  test("a rejected product shows the reason, is corrected and sent again", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-rejected/edit");
    await expect(page.getByText("Ce produit a été rejeté")).toBeVisible();
    await expect(page.getByText("Motif : La photo principale est floue.")).toBeVisible();
    // Saving does not turn it back into a draft: the button says what it does.
    await expect(saveChanges(page)).toBeVisible();
    await expect(saveDraft(page)).toHaveCount(0);

    await goToStep(page, "Photos");
    await photoInput(page).setInputFiles(pngFile("photo-nette.png"));
    await goToStep(page, "Récapitulatif");
    await expect(page.getByText("garde vos corrections sans les envoyer")).toBeVisible();
    await submit(page).click();

    await expect(page).toHaveURL(/\/vendor\/products\/product-rejected$/);
    await expect(status(page)).toContainText("En validation");
    const { fields, files } = (await received(page))[0];
    expect(fields._method).toEqual(["PUT"]);
    expect(fields.status).toBeUndefined();
    expect(files).toEqual(["gallery[]:photo-nette.png"]);
  });

  test("puts a refusal of the server on its step, with the sentence the server gave", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-variants/edit");
    await goToStep(page, "Prix et stock");
    // A reference already used by another product: only the server knows.
    await page.getByLabel("Référence de Bleu / L").fill("SAC-0042");
    await goToStep(page, "Informations");
    await saveChanges(page).click();

    await expect(page.getByText("1 champ à corriger")).toBeVisible();
    await expect(page.getByText("Cette référence est déjà utilisée par un autre produit.").first()).toBeVisible();
    // The form goes to the step that holds the refused value.
    await expect(currentStep(page)).toContainText("Prix et stock");
    await expect(page).toHaveURL(/\/edit$/);
    await expect(page.getByLabel("Référence de Bleu / L")).toHaveValue("SAC-0042");
  });

  test("leaves without saving through « Annuler », back to where it came from", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-variants/edit");
    await page.getByLabel("Nom du produit").fill("Autre nom");
    await page.getByRole("link", { name: "Annuler", exact: true }).click();
    await expect(page).toHaveURL(/\/vendor\/products\/product-variants$/);
    await expect(page.getByRole("heading", { level: 1, name: "Chemise en Faso Dan Fani" })).toBeVisible();
    expect(await received(page)).toHaveLength(0);

    await page.goto("/vendor/products/new");
    await page.getByRole("link", { name: "Annuler", exact: true }).click();
    await expect(page).toHaveURL(/\/vendor\/products$/);
  });

  test("answers « introuvable » when editing another seller's product", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-foreign/edit");
    await expect(page.getByText("Produit introuvable")).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────
test.describe("layout", () => {
  for (const width of WIDTHS) {
    const phone = width < PHONE;
    const height = phone ? 844 : 900;

    test(`every step is laid out for ${width}px, with the bar of decisions always at hand`, async ({ page, baseURL }) => {
      test.setTimeout(120_000);
      await open(page, baseURL, "/vendor/products/product-variants/edit", { width, height });
      const main = page.locator("main");
      const tabBar = page.getByRole("navigation", { name: "Navigation rapide" });

      for (const label of ["Informations", "Photos", "Prix et stock", "Récapitulatif"]) {
        await goToStep(page, label);
        // A new step starts at its top: the steps are the first thing on screen, the application has not moved.
        expect(await page.evaluate(() => document.documentElement.scrollTop), `${label}: the document`).toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight), `${label}: the document`).toBeLessThanOrEqual(0);
        const steps = await box(stepper(page));
        const scroller = await box(main);
        expect(steps.y, `${label}: the steps`).toBeGreaterThanOrEqual(scroller.y - 0.5);
        expect(steps.y + steps.height, `${label}: the steps`).toBeLessThanOrEqual(scroller.y + scroller.height);
        await main.evaluate((element) => element.scrollTo(0, 0));

        // The bar is on screen, whole, wherever the page is scrolled.
        for (const position of ["top", "end"] as const) {
          if (position === "end") await main.evaluate((element) => element.scrollTo(0, element.scrollHeight));
          const bar = await box(actionBar(page));
          expect(bar.x, `${label}, ${position}`).toBeGreaterThanOrEqual(-0.5);
          expect(bar.x + bar.width, `${label}, ${position}`).toBeLessThanOrEqual(width + 0.5);
          if (phone) {
            // It rests on the tab bar: no strip of the page shows between the two.
            const tabs = await box(tabBar);
            expect(Math.abs(bar.y + bar.height - tabs.y), `${label}, ${position}`).toBeLessThanOrEqual(1.5);
          } else {
            expect(bar.y + bar.height, `${label}, ${position}`).toBeLessThanOrEqual(height + 0.5);
          }
          for (const button of await actionBar(page).locator("a:visible, button:visible").all()) {
            const bounds = await box(button);
            expect(bounds.x, `${label}: a button of the bar`).toBeGreaterThanOrEqual(bar.x - 0.5);
            expect(bounds.x + bounds.width, `${label}: a button of the bar`).toBeLessThanOrEqual(bar.x + bar.width + 0.5);
            if (phone) expect(bounds.height).toBeGreaterThanOrEqual(TOUCH_TARGET);
          }
        }

        if (phone) {
          // At the end of the page, the way out of the form is above the bar, not under it.
          const leave = await box(page.getByRole("link", { name: "Annuler et quitter le formulaire" }));
          expect(leave.y + leave.height, label).toBeLessThanOrEqual((await box(actionBar(page))).y + 0.5);
          for (const marker of await stepper(page).getByRole("button").all()) expect((await box(marker)).height).toBeGreaterThanOrEqual(TOUCH_TARGET);
        }

        expect(await sidewaysOverflow(page), label).toBeLessThanOrEqual(0);
        expect(await blockingViolations(page), label).toEqual([]);
      }
    });
  }

  test("on a wide page the steps share the room with the card of the product and what moderation still needs", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/new", { width: 1440 });
    await expect(panel(page)).toBeVisible();

    // Beside the steps, level with them, inside the page.
    const steps = await box(stepper(page));
    const side = await box(panel(page));
    expect(side.x).toBeGreaterThanOrEqual(steps.x + steps.width);
    expect(Math.abs(side.y - steps.y)).toBeLessThan(2);
    expect(side.x + side.width).toBeLessThanOrEqual(1440 - 32 + 0.5);
    // The fields keep a width one reads comfortably: neither a ribbon nor the whole screen.
    expect(steps.width).toBeGreaterThanOrEqual(640);
    expect(steps.width).toBeLessThanOrEqual(820);

    // Nothing typed yet: the card says what it waits for, and invents nothing.
    for (const text of ["Aucune photo", "Brouillon", "Nom du produit", "Sans catégorie", "Prix à renseigner", "Stock non renseigné"]) await expect(panel(page)).toContainText(text);
    await expect(panel(page).getByText("0 sur 5")).toBeVisible();

    // It follows what is typed.
    await page.getByLabel("Nom du produit").fill("Boubou brodé");
    await expect(panel(page)).toContainText("Boubou brodé");
    await expect(panel(page).getByText("1 sur 5")).toBeVisible();
    await chooseCategory(page, "Textile");
    await expect(panel(page)).toContainText("Textile");

    // "Compléter" leads to the field itself: here on the step already on screen…
    await panel(page).getByRole("button", { name: "Compléter : Une description" }).click();
    await expect(description(page)).toBeFocused();
    await page.keyboard.type("Brodé à la main.");
    await expect(panel(page).getByText("3 sur 5")).toBeVisible();

    // …and through its step when the field is on another one.
    await panel(page).getByRole("button", { name: "Compléter : Un prix de vente" }).click();
    await expect(currentStep(page)).toContainText("Prix et stock");
    await expect(price(page)).toBeFocused();
    await price(page).fill("12500");
    await page.getByLabel("Stock", { exact: true }).fill("8");
    await expect(panel(page)).toContainText(/12\s500\sFCFA/);
    await expect(panel(page)).toContainText("8 en stock");

    await panel(page).getByRole("button", { name: "Compléter : Au moins une photo" }).click();
    await expect(currentStep(page)).toContainText("Photos");
    await photoInput(page).setInputFiles(pngFile("face.png"));
    await expect(panel(page).locator("img")).toHaveCount(1);
    await expect(panel(page).getByText("5 sur 5")).toBeVisible();
    await expect(panel(page).getByRole("button", { name: /^Compléter/ })).toHaveCount(0);

    // The panel stays in view while a long step scrolls.
    await goToStep(page, "Prix et stock");
    await page.getByRole("switch", { name: "Ce produit a des variantes" }).click();
    await page.locator("main").evaluate((main) => main.scrollTo(0, main.scrollHeight));
    const scrolled = await box(panel(page));
    const scroller = await box(page.locator("main"));
    expect(scrolled.y).toBeGreaterThanOrEqual(scroller.y - 0.5);
    expect(scrolled.y).toBeLessThan(scroller.y + 80);

    // The last step lists what is missing itself: the panel keeps the card only.
    await page.getByRole("switch", { name: "Ce produit a des variantes" }).click();
    await goToStep(page, "Récapitulatif");
    await expect(page.getByText("5 sur 5")).toHaveCount(1);
    await expect(panel(page).getByText("Prêt pour la validation ?")).toHaveCount(0);
    await expect(panel(page)).toContainText("Boubou brodé");

    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
    expect(await blockingViolations(page)).toEqual([]);
  });

  test("an online product has no list of what moderation needs: its panel is the card alone", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-variants/edit", { width: 1440 });
    await expect(panel(page)).toContainText("Chemise en Faso Dan Fani");
    await expect(panel(page)).toContainText("CHM-0041 · Textile");
    await expect(panel(page)).toContainText("En ligne");
    await expect(panel(page)).toContainText(/7\s500\sFCFA/);
    // 4 + 3 + 25: every variant the form holds, the deactivated one too.
    await expect(panel(page)).toContainText("32 en stock");
    await expect(panel(page).locator("img")).toHaveCount(1);
    await expect(panel(page).getByText("Prêt pour la validation ?")).toHaveCount(0);
  });

  test("under 1040px of page the form is one column of a readable width", async ({ page, baseURL }) => {
    for (const width of [1024, 1280]) {
      await open(page, baseURL, "/vendor/products/new", { width });
      await expect(currentStep(page)).toContainText("Informations");
      await expect(panel(page)).toBeHidden();
      const steps = await box(stepper(page));
      expect(steps.width, `${width}px`).toBeLessThanOrEqual(768 + 0.5);
      expect(steps.width, `${width}px`).toBeGreaterThanOrEqual(640);
      // Centred in the page: the same margin on both sides.
      const scroller = await box(page.locator("main"));
      expect(Math.abs(steps.x - scroller.x - (scroller.x + scroller.width - (steps.x + steps.width))), `${width}px`).toBeLessThan(2);
    }
  });

  test("a link can open the form on one of its steps; an unknown one opens the first", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-variants/edit?step=pricing");
    await expect(currentStep(page)).toContainText("Prix et stock");
    await expect(price(page)).toHaveValue("7500");
    // The page opens at its top: nothing was scrolled to.
    expect(await page.locator("main").evaluate((main) => main.scrollTop)).toBe(0);

    await page.goto("/vendor/products/product-variants/edit?step=nowhere");
    await expect(currentStep(page)).toContainText("Informations");
  });

  test("on a phone, the bar keeps two decisions on one row and never stacks them", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/new", { width: 375, height: 812 });
    await page.getByLabel("Nom du produit").fill("Panier tressé de Bobo");
    await goToStep(page, "Récapitulatif");

    const draft = await box(saveDraft(page));
    const send = await box(submit(page));
    expect(Math.abs(draft.y - send.y)).toBeLessThan(1);
    expect(send.x).toBeGreaterThan(draft.x + draft.width);
    // The decision that matters takes the room that is left.
    expect(send.width).toBeGreaterThan(draft.width);
    expect((await box(actionBar(page))).height).toBeLessThan(90);
  });

  test("the editor toolbar stays on one row: it scrolls on a phone, and fits on a desk, beside the panel too", async ({ page, baseURL }) => {
    for (const width of [390, 768, 1024, 1280, 1366, 1440]) {
      await open(page, baseURL, "/vendor/products/new", { width });
      const toolbar = page.getByRole("toolbar", { name: "Mise en forme de la description" });
      await expect(toolbar.getByRole("button", { name: "Gras" })).toBeEnabled();
      const tops = await toolbar.getByRole("button").evaluateAll((buttons) => [...new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top)))]);
      expect(tops, `${width}px`).toHaveLength(1);
      if (width >= PHONE) expect(await toolbar.evaluate((element) => element.scrollWidth - element.clientWidth), `${width}px`).toBeLessThanOrEqual(0);
      else expect((await box(toolbar.getByRole("button", { name: "Gras" }))).height).toBeGreaterThanOrEqual(40);
    }
  });
});
