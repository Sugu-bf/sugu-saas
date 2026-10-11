import { expect, test, type APIResponse, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { pngFile } from "../catalog/pictures";

// Signed-in acceptance run of the seller catalogue (V2.1) on a DEPLOYED
// staging portal. It needs an account of the QA seeder (QaProPortalSeeder,
// addresses in @qa.sugu.test), which exists on staging only: another account
// is refused before anything is typed. Never production (the config refuses
// its address). Without credentials every test is skipped.
//
//   STAGING_URL=https://pro-zk47m.sugu.pro
//   STAGING_VENDOR_EMAIL=...@qa.sugu.test   STAGING_VENDOR_PASSWORD=...
//   STAGING_ALLOW_MUTATIONS=1   required for the tests that write
//   STAGING_KEEP_PRODUCT=1      leaves the product of the run in the QA catalogue, to look at it by hand
//   STAGING_SHOTS=...           where the captures go (default docs/captures/v2.1-staging)
//
//   npx playwright test -c playwright.staging.config.ts vendor-catalog
//
// Tests that write are tagged [write] and stay skipped without
// STAGING_ALLOW_MUTATIONS=1. They create two QA products, submit one to
// moderation and delete both. Nothing here prints the credentials; the
// config records no trace.

const env = process.env;
const email = env.STAGING_VENDOR_EMAIL ?? "";
const hasAccount = Boolean(email && env.STAGING_VENDOR_PASSWORD);
const isQaAccount = /@qa\.sugu\.test$/i.test(email);
const mayWrite = env.STAGING_ALLOW_MUTATIONS === "1";
const keepProduct = env.STAGING_KEEP_PRODUCT === "1";

const SHOTS = env.STAGING_SHOTS ?? join(__dirname, "..", "..", "docs", "captures", "v2.1-staging");
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });

/** Unique per run: the product is found again by its name, and never mistaken for a seeded one. */
const STAMP = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const PRODUCT_NAME = `QA V2.1 ${STAMP} boubou brodé`;
const PROBE_NAME = `QA V2.1 ${STAMP} sonde de statut`;

const grid = (page: Page) => page.getByRole("list", { name: "Produits" }).locator("> li");
const status = (page: Page) => page.locator("main header").first();
const stepper = (page: Page) => page.getByRole("navigation", { name: /^Étapes de la/ });
const next = (page: Page) => page.getByRole("button", { name: "Suivant" });
const description = (page: Page) => page.getByRole("textbox", { name: "Description" });
const overflow = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, main ? main.scrollWidth - main.clientWidth : 0);
  });

async function signIn(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(env.STAGING_VENDOR_PASSWORD!);
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await expect(page).toHaveURL(/\/vendor\//, { timeout: 30_000 });
}

async function goToStep(page: Page, label: string) {
  await stepper(page).getByRole("button", { name: new RegExp(label) }).click();
  await expect(stepper(page).getByRole("button", { name: new RegExp(label) })).toHaveAttribute("aria-current", "step");
}

/** A call to the API through the portal, with the session of the page: what a forged request would be. */
function through(page: Page, baseURL: string | undefined) {
  const headers = { Origin: baseURL ?? "", Accept: "application/json" };
  return {
    get: (path: string) => page.request.get(`/api/proxy/${path}`, { headers }),
    post: (path: string, multipart: Record<string, string>) => page.request.post(`/api/proxy/${path}`, { headers, multipart }),
    delete: (path: string) => page.request.delete(`/api/proxy/${path}`, { headers }),
  };
}

const statusCodeOf = async (response: APIResponse): Promise<string | undefined> => (await response.json())?.data?.statusCode;

// Ids of what the run created, for the tests that follow and for the clean-up.
let productId = "";
let probeId = "";
// One session for the whole run: the account signs in once.
let page: Page;

test.describe("V2.1 catalogue acceptance on staging", () => {
  test.skip(!hasAccount, "STAGING_VENDOR_EMAIL / STAGING_VENDOR_PASSWORD not provided");
  test.skip(hasAccount && !isQaAccount, "STAGING_VENDOR_EMAIL is not an account of the QA seeder (@qa.sugu.test)");
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
    page = await context.newPage();
    await signIn(page);
  });
  test.afterAll(async () => {
    await page?.context().close();
  });
  test.beforeEach(async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("1. which backend answers: the contract this portal reads, level by level", async () => {
    // No endpoint gives the API its version: it is told by what it answers.
    const list = page.waitForResponse((response) => /\/api\/proxy\/sellers\/products\?/.test(response.url()) && response.ok(), { timeout: 30_000 });
    const stats = page.waitForResponse((response) => response.url().includes("/api/proxy/sellers/products/stats") && response.ok(), { timeout: 30_000 });
    await page.goto("/vendor/products");
    const rows = (await (await list).json())?.data?.data ?? [];
    const counters = (await (await stats).json())?.data ?? {};

    const level = {
      // V2 (99326fc6, d8179a15): real status next to the legacy one, counters per status and stock.
      listSaysRealStatus: rows.length === 0 ? "no product to tell" : "statusCode" in rows[0],
      countersByStatus: "byStatus" in counters && "byStock" in counters,
      // V2.1 (e5e698fd): the categories of the catalogue. The publication guard (3dfd29a2) is told by test 6.
      countersByCategory: Array.isArray(counters.byCategory),
    };
    test.info().annotations.push({ type: "backend", description: JSON.stringify(level) });
    console.log(`[staging] backend level: ${JSON.stringify(level)}`);

    expect(level.countersByStatus, "V2 backend expected: counters per status and stock level").toBe(true);
    expect.soft(level.countersByCategory, "V2.1 backend expected: `byCategory` in sellers/products/stats (deploy the backend first)").toBe(true);
  });

  test("2. product list: real data in grid and in list, at 1440, 768 and 390px", async () => {
    for (const [width, height] of [
      [1440, 900],
      [768, 1024],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/vendor/products");
      await expect(page.getByRole("heading", { level: 1, name: "Produits" })).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("main [aria-busy='true']")).toHaveCount(0);
      await page.getByRole("group", { name: "Affichage des produits" }).getByRole("button", { name: "Vue en grille" }).click();
      await expect(grid(page).first()).toBeVisible();
      expect(await overflow(page), `grid, ${width}px`).toBeLessThanOrEqual(0);
      // No status of a real product is cut, none is unknown to the portal.
      expect(await grid(page).locator("[data-status] .truncate").evaluateAll((labels) => labels.filter((label) => label.scrollWidth > label.clientWidth).length)).toBe(0);
      await expect(grid(page).locator('[data-status-known="false"]')).toHaveCount(0);
      await shot(page, `staging-produits-grille-${width}`);

      await page.getByRole("group", { name: "Affichage des produits" }).getByRole("button", { name: "Vue en liste" }).click();
      await expect(page.locator("main [aria-busy='true']")).toHaveCount(0);
      expect(await overflow(page), `list, ${width}px`).toBeLessThanOrEqual(0);
      await shot(page, `staging-produits-liste-${width}`);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/vendor/products");
    await page.getByRole("group", { name: "Affichage des produits" }).getByRole("button", { name: "Vue en grille" }).click();

    // The category filter: each count is the size of the list its choice returns.
    const category = page.getByRole("combobox", { name: "Catégorie" });
    test.skip((await category.count()) === 0, "no category filter: the backend does not list the categories, or no product is filed under one");
    const option = category.locator("option").nth(1);
    const label = (await option.textContent()) ?? "";
    const expected = Number(label.match(/\((\d[\d\s  ]*)\)$/)?.[1]?.replace(/\D/g, ""));
    await category.selectOption({ index: 1 });
    await expect(page).toHaveURL(/category=/);
    await expect(page.getByText(new RegExp(`^${expected} produits?$`))).toBeVisible();
    await page.getByRole("button", { name: "Tout afficher" }).first().click();
    await expect(page).not.toHaveURL(/category=/);
  });

  test("3. [write] creates a draft: description with a title, a list, a table and a picture; a photo; variants; price and stock", async () => {
    test.skip(!mayWrite, "STAGING_ALLOW_MUTATIONS=1 not set");
    test.setTimeout(180_000);
    await page.goto("/vendor/products/new");
    await expect(page.getByRole("heading", { level: 1, name: "Nouveau produit" })).toBeVisible({ timeout: 30_000 });

    await page.getByLabel("Nom du produit").fill(PRODUCT_NAME);
    // The first category the search offers: any real one will do.
    await page.getByRole("combobox", { name: /Catégorie/ }).click();
    await page.getByRole("listbox", { name: "Catégories" }).getByRole("option").first().click();
    await expect(page.getByRole("list", { name: "Catégories choisies" }).getByRole("listitem")).toHaveCount(1);

    await description(page).click();
    await page.getByRole("button", { name: "Style du texte" }).click();
    await page.getByRole("menuitem", { name: "Titre 2" }).click();
    await page.keyboard.type("Guide des tailles");
    await page.keyboard.press("Enter");
    await page.getByRole("toolbar", { name: "Mise en forme de la description" }).getByRole("button", { name: "Liste à puces", exact: true }).click();
    await page.keyboard.type("Brodé à la main");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Lavage à la main");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Tableau" }).click();
    await page.getByRole("menuitem", { name: "Insérer un tableau" }).click();
    const cells = ["Taille", "Poitrine", "Longueur", "M", "98 cm", "72 cm", "L", "104 cm", "74 cm"];
    for (const [index, cell] of cells.entries()) {
      await page.keyboard.type(cell);
      if (index < cells.length - 1) await page.keyboard.press("Tab");
    }
    await page.keyboard.press("Control+End");
    await page.getByLabel("Images à ajouter à la description").setInputFiles(pngFile("detail-du-tissage.png"));
    await expect(description(page).locator("img")).toHaveCount(1);
    await expect(description(page).locator("table")).toHaveCount(1);

    await next(page).click();
    await page.locator("#product-photos input[type='file']").setInputFiles(pngFile("face.png"));
    await expect(page.getByRole("list", { name: "Photos du produit" }).locator("> li:has(img)")).toHaveCount(1);

    await next(page).click();
    await page.getByRole("textbox", { name: /^Prix de vente/ }).fill("12500");
    await page.getByRole("switch", { name: "Ce produit a des variantes" }).click();
    await page.getByLabel("Nom de l'option").fill("Taille");
    await page.getByLabel("Nom de l'option").press("Enter");
    for (const value of ["M", "L"]) {
      await page.getByLabel("Ajouter une valeur à Taille").fill(value);
      await page.getByLabel("Ajouter une valeur à Taille").press("Enter");
    }
    await expect(page.getByRole("list", { name: "Variantes du produit" }).locator("> li")).toHaveCount(2);
    await page.getByLabel("Même stock pour toutes").fill("5");
    await page.getByRole("button", { name: "Appliquer" }).last().click();
    await expect(page.getByLabel("Stock de M")).toHaveValue("5");
    await shot(page, "staging-formulaire-prix-stock-1440");

    await goToStep(page, "Récapitulatif");
    await shot(page, "staging-formulaire-recapitulatif-1440");
    await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();

    // Saved as a draft, whatever the product holds: the seller has not asked for anything else.
    await expect(page.getByRole("heading", { level: 1, name: PRODUCT_NAME })).toBeVisible({ timeout: 60_000 });
    // The page of the product, not the form that created it: its address ends with the id.
    await expect(page).toHaveURL(/\/vendor\/products\/(?!new$)[^/?]+$/);
    productId = new URL(page.url()).pathname.split("/").pop() ?? "";
    await expect(status(page)).toContainText("Brouillon");

    // What the server kept: the price in francs, both variants with their stock, the description as written.
    const main = page.locator("main");
    await expect(main).toContainText(/12\s500\sFCFA/);
    await expect(page.getByRole("list", { name: "Variantes du produit" }).getByRole("listitem")).toHaveCount(2);
    await expect(main.getByRole("heading", { name: "Guide des tailles" })).toBeVisible();
    const written = main.locator(".rounded-panel").filter({ has: page.getByRole("heading", { name: "Description", exact: true }) });
    await expect(written.locator("table")).toContainText("98 cm");
    await expect(written.locator("li").filter({ hasText: "Brodé à la main" })).toHaveCount(1);
    // The picture of the description was stored by the server, and loads from where it put it.
    const picture = written.locator("img");
    await expect(picture).toBeVisible();
    expect(await picture.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0 && !image.src.startsWith("data:"))).toBe(true);
    await shot(page, "staging-fiche-brouillon-1440");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await shot(page, "staging-fiche-brouillon-390");
  });

  test("4. [write] the draft opens again in the form with everything that was saved", async () => {
    test.skip(!mayWrite || !productId, "no product created by this run");
    await page.goto(`/vendor/products/${productId}/edit`);
    await expect(page.getByLabel("Nom du produit")).toHaveValue(PRODUCT_NAME, { timeout: 30_000 });
    await expect(description(page).locator("h2")).toHaveText("Guide des tailles");
    await expect(description(page).locator("table")).toHaveCount(1);
    await expect(description(page).locator("img")).toHaveCount(1);

    await goToStep(page, "Photos");
    await expect(page.getByRole("list", { name: "Photos du produit" }).locator("> li:has(img)")).toHaveCount(1);
    await goToStep(page, "Prix et stock");
    await expect(page.getByRole("textbox", { name: /^Prix de vente/ })).toHaveValue("12500");
    await expect(page.getByRole("list", { name: "Variantes du produit" }).locator("> li")).toHaveCount(2);
    await expect(page.getByLabel("Stock de M")).toHaveValue("5");
    await expect(page.getByLabel("Stock de L")).toHaveValue("5");
    await shot(page, "staging-formulaire-edition-1440");
  });

  test("5. [write] submission queues the product for moderation; the list shows it there, not online", async () => {
    test.skip(!mayWrite || !productId, "no product created by this run");
    await page.goto(`/vendor/products/${productId}`);
    await page.getByRole("button", { name: "Soumettre à validation" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Soumettre à validation" }).click();
    await expect(status(page)).toContainText("En validation", { timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Soumettre à validation" })).toHaveCount(0);

    await page.goto(`/vendor/products?status=submitted&q=${encodeURIComponent(PRODUCT_NAME)}`);
    await expect(grid(page)).toHaveCount(1);
    await expect(grid(page).first()).toContainText("En validation");
    await page.goto(`/vendor/products?status=active&q=${encodeURIComponent(PRODUCT_NAME)}`);
    await expect(page.getByText("Aucun produit ne correspond")).toBeVisible();
    await shot(page, "staging-liste-en-validation-1440");
  });

  test("6. [write] a status sent by hand never puts a product online", async ({ baseURL }) => {
    test.skip(!mayWrite, "STAGING_ALLOW_MUTATIONS=1 not set");
    const api = through(page, baseURL);

    // What a forged creation looks like: the form never sends this status.
    const created = await api.post("sellers/products", { name: PROBE_NAME, price: "1000", status: "published" });
    expect(created.status(), "the request is not refused for its status").toBe(201);
    const body = await created.json();
    probeId = String(body?.data?.id ?? "");
    expect(probeId).not.toBe("");

    try {
      expect(body.data.statusCode, "a product is never created online").not.toBe("active");
      // The backend of V2.1 says what it did with the request.
      expect.soft(body.publication?.requested, "V2.1 backend expected: `publication` in the answer").toBe("published");
      expect.soft(body.publication?.applied).toBe(body.data.statusCode);

      // The same on an update: by name, then by the number of the status.
      for (const sent of ["published", "2"]) {
        const updated = await api.post(`sellers/products/${probeId}`, { _method: "PUT", status: sent });
        expect(updated.ok(), `status=${sent}`).toBe(true);
        expect(await statusCodeOf(updated), `status=${sent}`).not.toBe("active");
      }

      // And through the endpoint the mobile application calls: queued or refused, never online.
      const published = await api.post(`products/${probeId}/publish`, {});
      expect([200, 422]).toContain(published.status());
      expect(await statusCodeOf(await api.get(`sellers/products/${probeId}`))).not.toBe("active");
    } finally {
      // Whatever was found, the probe does not stay in the catalogue.
      if (!keepProduct) expect((await api.delete(`sellers/products/${probeId}`)).ok(), "probe deleted").toBe(true);
    }
  });

  test("7. [write] clean-up: the product of the run leaves the QA catalogue", async ({ baseURL }) => {
    test.skip(!mayWrite || !productId || keepProduct, "nothing to remove, or STAGING_KEEP_PRODUCT=1");
    expect((await through(page, baseURL).delete(`sellers/products/${productId}`)).ok()).toBe(true);
    await page.goto(`/vendor/products?q=${encodeURIComponent(PRODUCT_NAME)}`);
    await expect(page.getByText("Aucun produit ne correspond")).toBeVisible({ timeout: 30_000 });
  });
});
