import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  PHONE,
  TOUCH_TARGET,
  WIDTHS,
  blockingViolations,
  box,
  cards,
  confirmation,
  open,
  rows,
  search,
  sidewaysOverflow,
  tab,
  table,
  viewSwitch,
} from "./helpers";

// Seller catalogue (V2) on the production build: product list (grid and
// list), product page, inventory. The product form has its own spec.
//
// Counts written here are an oracle independent from the app:
// 46 products = 30 active, 8 draft, 6 archived, 1 submitted, 1 rejected;
// by stock: 43 in stock, 2 low, 1 out.

const grid = (page: Page) => cards(page, "Produits");
/** The size of the whole catalogue, next to the page title. */
const catalogueSize = (page: Page) => page.locator("main header").first();
/** What a search or a filter leaves, above the list. Absent while nothing narrows it. */
const resultCount = (page: Page) => page.locator("main p[aria-live='polite']").filter({ hasText: /^\d+ produits?$/ });
const sortSelect = (page: Page) => page.getByLabel("Trier par");

/** Columns of the grid at each width: two on a phone, up to six on a wide desk. */
const GRID_COLUMNS: Record<number, number> = { 375: 2, 390: 2, 768: 4, 1024: 4, 1280: 5, 1440: 6 };

// ─────────────────────────────────────────────────────────────
// Product list
// ─────────────────────────────────────────────────────────────
test.describe("product list", () => {
  test("opens as a grid: the server page, the real counters, server pagination", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");

    await expect(page.getByRole("heading", { level: 1, name: "Produits" })).toBeVisible();
    await expect(viewSwitch(page).getByRole("button", { name: "Vue en grille" })).toHaveAttribute("aria-pressed", "true");
    await expect(grid(page)).toHaveCount(24);
    await expect(catalogueSize(page)).toContainText("(46 produits)");
    await expect(resultCount(page)).toHaveCount(0);

    // Statuses are fully rounded chips, each with its count from the backend: archived is not "the rest".
    await expect(tab(page, /^Tous/)).toHaveAttribute("aria-selected", "true");
    await expect(tab(page, /^Tous/)).toContainText("46");
    await expect(tab(page, /^En ligne/)).toContainText("30");
    await expect(tab(page, /^Brouillon/)).toContainText("8");
    await expect(tab(page, /^En validation/)).toContainText("1");
    // Statuses outside the main tabs get theirs as soon as they hold products.
    await expect(tab(page, /^Archivé/)).toContainText("6");
    await expect(tab(page, /^Rejeté/)).toContainText("1");
    await expect(tab(page, /^Suspendu/)).toHaveCount(0);

    // A card says what the product is, where it stands, its price and its real stock.
    const first = grid(page).first();
    await expect(first.getByRole("link", { name: "Coussin en bogolan" })).toHaveAttribute("href", "/vendor/products/product-to-delete");
    await expect(first).toContainText("COU-0046");
    await expect(first).toContainText("Brouillon");
    await expect(first).toContainText(/2\s250\sFCFA/);
    await expect(first).toContainText("66");
    await expect(first).toContainText("En stock");

    await expect(page.getByText("1–24 sur 46 produits")).toBeVisible();
    await page.getByRole("button", { name: "Page suivante" }).click();
    await expect(page.getByText("25–46 sur 46 produits")).toBeVisible();
    await expect(page).toHaveURL(/page=2/);
    await expect(grid(page)).toHaveCount(22);
  });

  test("the whole card opens the product, and its menu stays reachable", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");
    const card = grid(page).filter({ hasText: "Chemise en Faso Dan Fani" });
    await expect(card).toContainText("3 variantes");

    // The menu sits above the link that covers the card.
    await card.getByRole("button", { name: "Actions pour Chemise en Faso Dan Fani" }).click();
    await expect(page.getByRole("menuitem", { name: "Modifier" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/vendor\/products$/);

    // Anywhere else on the card, the picture included, goes to the product.
    const picture = await box(card.locator("div").first());
    await page.mouse.click(picture.x + picture.width / 2, picture.y + picture.height / 2);
    await expect(page.getByRole("heading", { level: 1, name: "Chemise en Faso Dan Fani" })).toBeVisible();
  });

  test("switches to the list and back, and remembers the choice without touching the URL", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");
    await expect(grid(page)).toHaveCount(24);

    await viewSwitch(page).getByRole("button", { name: "Vue en liste" }).click();
    await expect(rows(page, "Produits")).toHaveCount(24);
    await expect(viewSwitch(page).getByRole("button", { name: "Vue en liste" })).toHaveAttribute("aria-pressed", "true");
    await expect(viewSwitch(page).getByRole("button", { name: "Vue en grille" })).toHaveAttribute("aria-pressed", "false");
    // A way to look at the list, not a state of the list: a shared link stays the same.
    await expect(page).toHaveURL(/\/vendor\/products$/);

    // The same product, the same facts.
    const first = rows(page, "Produits").first();
    await expect(first).toContainText("Coussin en bogolan");
    await expect(first).toContainText("Brouillon");
    await expect(first).toContainText("66");

    // Still the list after a reload, and when coming back from elsewhere.
    await page.reload();
    await expect(rows(page, "Produits")).toHaveCount(24);
    await page.goto("/vendor/inventory");
    await expect(page.getByRole("heading", { level: 1, name: "Inventaire" })).toBeVisible();
    await page.goto("/vendor/products");
    await expect(rows(page, "Produits")).toHaveCount(24);

    await viewSwitch(page).getByRole("button", { name: "Vue en grille" }).click();
    await expect(grid(page)).toHaveCount(24);
    await expect(table(page, "Produits")).toHaveCount(0);
  });

  test("searches on the server: finds a product that is on the last page", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");
    await expect(grid(page)).toHaveCount(24);
    await expect(page.getByRole("list", { name: "Produits" })).not.toContainText("Tabouret Sénoufo");

    const request = page.waitForRequest((candidate) => candidate.url().includes("sellers/products?") && candidate.url().includes("search=tab-0001"));
    await search(page).fill("tab-0001");
    await search(page).press("Enter");
    await request;

    await expect(grid(page)).toHaveCount(1);
    await expect(grid(page).first()).toContainText("Tabouret Sénoufo");
    await expect(page.getByText("1 produit", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/q=tab-0001/);

    await search(page).fill("rien-de-tel");
    await search(page).press("Enter");
    await expect(page.getByText("Aucun produit ne correspond")).toBeVisible();
    await expect(page.getByText("0 produit", { exact: true })).toBeVisible();
    // The way back sits next to the count, and in the empty state.
    await expect(page.getByRole("button", { name: "Tout afficher" })).toHaveCount(2);
    await page.getByRole("button", { name: "Tout afficher" }).first().click();
    await expect(grid(page)).toHaveCount(24);
    await expect(resultCount(page)).toHaveCount(0);
    await expect(search(page)).toHaveValue("");
  });

  test("filters by status and stock level, and keeps the state in the URL", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");

    await tab(page, /^Brouillon/).click();
    await expect(page.getByText("8 produits", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/status=draft/);
    await expect(grid(page)).toHaveCount(8);
    for (const card of await grid(page).all()) await expect(card).toContainText("Brouillon");

    // A product waiting for moderation is not shown as a draft.
    await expect(page.getByRole("list", { name: "Produits" })).not.toContainText("Tunique brodée");
    await tab(page, /^En validation/).click();
    await expect(grid(page)).toHaveCount(1);
    await expect(grid(page).first()).toContainText("Tunique brodée");

    await tab(page, /^Tous/).click();
    await page.getByLabel("Stock").selectOption("low_stock");
    await expect(page.getByText("2 produits", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/stock=low_stock/);
    for (const card of await grid(page).all()) await expect(card).toContainText("Stock faible");

    // Back from a product: same filter.
    await grid(page).first().getByRole("link").click();
    await expect(page.getByRole("heading", { level: 1, name: "Bracelet en bronze" })).toBeVisible();
    await page.goBack();
    await expect(page.getByText("2 produits", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Stock")).toHaveValue("low_stock");
  });

  test("sorts on the server: by name in the grid, by column in the list, one and the same order", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");
    await expect(sortSelect(page)).toHaveValue("created-desc");

    const byPrice = page.waitForRequest((candidate) => candidate.url().includes("sort=price") && candidate.url().includes("direction=asc"));
    await sortSelect(page).selectOption({ label: "Prix croissant" });
    await byPrice;
    await expect(page).toHaveURL(/sort=price&dir=asc/);
    await expect(grid(page)).toHaveCount(24);
    const prices = (await grid(page).allTextContents()).map((text) => Number((text.match(/([\d\s  ]+)\sFCFA/)?.[1] ?? "").replace(/\D/g, "")));
    expect(prices).toHaveLength(24);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    // The list shows the same order on its column, and its headers move the same select.
    await viewSwitch(page).getByRole("button", { name: "Vue en liste" }).click();
    await expect(table(page, "Produits").getByRole("columnheader", { name: "Prix" })).toHaveAttribute("aria-sort", "ascending");

    const byStock = page.waitForRequest((candidate) => candidate.url().includes("sort=stock"));
    await table(page, "Produits").getByRole("button", { name: "Stock" }).click();
    await byStock;
    await expect(sortSelect(page)).toHaveValue("stock-asc");
    await expect(rows(page, "Produits").first()).toContainText("Sac en cuir de Kaya");
    await expect(rows(page, "Produits").first()).toContainText("Rupture");
  });

  test("deletes a product only after an explicit confirmation, and recounts", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");
    await page.getByRole("button", { name: "Actions pour Coussin en bogolan" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();

    await expect(confirmation(page)).toContainText("Coussin en bogolan");
    await confirmation(page).getByRole("button", { name: "Garder le produit" }).click();
    await expect(page.getByRole("list", { name: "Produits" })).toContainText("Coussin en bogolan");

    await page.getByRole("button", { name: "Actions pour Coussin en bogolan" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await confirmation(page).getByRole("button", { name: "Supprimer le produit" }).click();

    await expect(page.getByText(/a été supprimé/)).toBeVisible();
    await expect(page.getByRole("list", { name: "Produits" })).not.toContainText("Coussin en bogolan");
    await expect(catalogueSize(page)).toContainText("(45 produits)");
    await expect(tab(page, /^Brouillon/)).toContainText("7");
  });

  for (const view of ["grid", "list"] as const) {
    test(`shows an outage as an outage, never as an empty catalogue, and recovers (${view})`, async ({ page, baseURL }) => {
      await page.route("**/api/proxy/sellers/products?**", (route) => route.fulfill({ status: 503, contentType: "text/html", body: "<h1>Bad gateway</h1>" }));
      await open(page, baseURL, "/vendor/products", { view });
      await expect(page.getByText("Les produits n'ont pas pu être chargés")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText("Votre catalogue est vide")).toHaveCount(0);
      await expect(page.locator("main")).not.toContainText("Bad gateway");

      await page.unroute("**/api/proxy/sellers/products?**");
      await page.getByRole("button", { name: "Réessayer" }).click();
      await expect(view === "grid" ? grid(page) : rows(page, "Produits")).toHaveCount(24);
    });
  }

  test("on a phone, filters and sort open in a sheet; count, way back and view switch share one row", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products", { width: 390, height: 844 });
    await expect(grid(page)).toHaveCount(24);

    // Title with the size of the catalogue, then the way to add a product, then the status chips.
    const title = await box(page.getByRole("heading", { level: 1, name: "Produits" }));
    const size = await box(page.getByText("(46 produits)"));
    const add = await box(page.getByRole("link", { name: "Nouveau produit" }));
    const chip = await box(tab(page, /^Tous/));
    expect(Math.abs(size.y + size.height / 2 - (title.y + title.height / 2))).toBeLessThan(title.height / 2);
    expect(add.y).toBeGreaterThanOrEqual(title.y + title.height);
    expect(chip.y).toBeGreaterThanOrEqual(add.y + add.height);
    // Fully rounded: the corner radius is at least half the height.
    for (const element of [tab(page, /^Tous/), tab(page, /^Brouillon/), page.getByRole("link", { name: "Nouveau produit" })]) {
      const shape = await element.evaluate((node) => ({ radius: parseFloat(getComputedStyle(node).borderTopLeftRadius), height: node.getBoundingClientRect().height }));
      expect(shape.radius).toBeGreaterThanOrEqual(shape.height / 2);
      expect(shape.height).toBeGreaterThanOrEqual(TOUCH_TARGET);
    }

    // Search and « Filtres » on one row.
    const searchBox = await box(search(page));
    const filters = page.getByRole("button", { name: /^Filtres/ });
    const filtersBox = await box(filters);
    expect(Math.abs(searchBox.y + searchBox.height / 2 - (filtersBox.y + filtersBox.height / 2))).toBeLessThan(4);

    await filters.click();
    const sheet = page.getByRole("dialog", { name: "Filtres" });
    await sheet.getByLabel("Stock").selectOption("low_stock");
    await sheet.getByLabel("Trier par").selectOption({ label: "Stock croissant" });
    await sheet.getByRole("button", { name: "Voir les résultats" }).click();

    await expect(page.getByText("2 produits", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/stock=low_stock/);
    await expect(page).toHaveURL(/sort=stock&dir=asc/);
    await expect(grid(page).first()).toContainText("Bracelet en bronze");
    // One active filter: the order is not one.
    await expect(filters).toContainText("1");

    const count = await box(page.getByText("2 produits", { exact: true }));
    const back = await box(page.getByRole("button", { name: "Tout afficher" }));
    const views = await box(viewSwitch(page));
    for (const item of [back, views]) expect(Math.abs(item.y + item.height / 2 - (count.y + count.height / 2))).toBeLessThan(views.height / 2);
    expect(views.x + views.width).toBeLessThanOrEqual(390 - 16 + 0.5);

    await page.getByRole("button", { name: "Tout afficher" }).click();
    await expect(grid(page)).toHaveCount(24);
    await expect(catalogueSize(page)).toContainText("(46 produits)");
    // The order chosen is kept: only what narrowed the list is cleared.
    await expect(page).toHaveURL(/sort=stock&dir=asc/);
  });

  for (const width of WIDTHS) {
    test(`grid is laid out for ${width}px, usable and accessible`, async ({ page, baseURL }) => {
      await open(page, baseURL, "/vendor/products", { width });
      await expect(grid(page)).toHaveCount(24);

      // Cards of one row share its top; the count of that row is the number of columns.
      const tops = await grid(page).evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)));
      expect(tops.filter((top) => top === tops[0])).toHaveLength(GRID_COLUMNS[width]);

      // Every card is as wide as its neighbours and entirely on screen.
      const first = await box(grid(page).first());
      const last = await box(grid(page).nth(GRID_COLUMNS[width] - 1));
      expect(Math.abs(first.width - last.width)).toBeLessThan(1);
      expect(last.x + last.width).toBeLessThanOrEqual(width + 0.5);
      expect(first.width).toBeGreaterThanOrEqual(150);

      if (width < PHONE) {
        const menu = await box(grid(page).first().getByRole("button", { name: /^Actions pour/ }));
        expect(Math.min(menu.width, menu.height)).toBeGreaterThanOrEqual(TOUCH_TARGET);
        await expect(page.getByRole("link", { name: "Nouveau produit" })).toBeVisible();
      }

      // No label of a card is cut by its neighbour or by the card itself.
      const clipped = await grid(page).evaluateAll((items) =>
        items.filter((item) => Array.from(item.querySelectorAll("[data-status]")).some((badge) => badge.getBoundingClientRect().right > item.getBoundingClientRect().right + 0.5)).length,
      );
      expect(clipped).toBe(0);

      expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
      expect(await blockingViolations(page)).toEqual([]);
    });

    test(`list is laid out for ${width}px, usable and accessible`, async ({ page, baseURL }) => {
      await open(page, baseURL, "/vendor/products", { width, view: "list" });

      if (width < PHONE) {
        await expect(cards(page, "Produits")).toHaveCount(24);
        const first = cards(page, "Produits").first();
        await expect(first).toContainText("Coussin en bogolan");
        await expect(first).toContainText("Brouillon");
        await expect(first).toContainText("FCFA");
        // Secondary facts are one tap away, not dropped.
        await expect(first.getByText("Catégorie", { exact: true })).toHaveCount(0);
        await first.getByRole("button", { name: "Voir plus" }).click();
        await expect(first.getByText("Catégorie", { exact: true })).toBeVisible();
        await expect(first.getByText("Créé le", { exact: true })).toBeVisible();
        const menu = await box(first.getByRole("button", { name: /^Actions pour/ }));
        expect(Math.min(menu.width, menu.height)).toBeGreaterThanOrEqual(TOUCH_TARGET);
      } else {
        await expect(rows(page, "Produits")).toHaveCount(24);
        // The table fits: nothing is reached by dragging it sideways, and the actions are on screen.
        const region = table(page, "Produits");
        expect(await region.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
        const menu = await box(rows(page, "Produits").first().getByRole("button", { name: /^Actions pour/ }));
        expect(menu.x + menu.width).toBeLessThanOrEqual(width + 0.5);
        for (const heading of ["Produit", "Statut", "Stock", "Prix"]) await expect(region.getByRole("columnheader", { name: heading })).toBeVisible();
        // The category is never lost: in its column, or under the name when the column has no room.
        await expect(rows(page, "Produits").first()).toContainText("Maison");
      }

      expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
      expect(await blockingViolations(page)).toEqual([]);
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Product page
// ─────────────────────────────────────────────────────────────
test.describe("product page", () => {
  const summary = (page: Page) => page.locator("main dl").first();
  const variantList = (page: Page) => page.getByRole("list", { name: "Variantes du produit" });

  test("shows stored facts only: francs, variants with their stock, no executed markup", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-variants");
    const main = page.locator("main");

    await expect(page.getByRole("heading", { level: 1, name: "Chemise en Faso Dan Fani" })).toBeVisible();
    await expect(main.locator("header").first()).toContainText("En ligne");

    await expect(summary(page)).toContainText(/7\s500\sFCFA/);
    await expect(summary(page)).toContainText(/9\s000\sFCFA/);
    // 4 + 3: the deactivated variant holds 25 units that are not for sale.
    await expect(summary(page)).toContainText("7 unités");
    await expect(summary(page)).toContainText("Stock faible");
    await expect(main).toContainText(/À partir de 10 unités/);

    await expect(variantList(page).getByRole("listitem")).toHaveCount(3);
    await expect(variantList(page).getByRole("listitem").first()).toContainText("Rouge / M");
    await expect(variantList(page).getByRole("listitem").first()).toContainText("CHM-R-M");
    await expect(variantList(page).getByRole("listitem").first()).toContainText("4 en stock");
    await expect(variantList(page).getByRole("listitem").nth(2)).toContainText("Désactivée");

    // The description is rebuilt from its text: its markup is not in the page, its script did not run.
    await expect(main.getByRole("heading", { name: "Tissage" })).toBeVisible();
    await expect(main).toContainText("Coton tissé main à Ouagadougou.");
    await expect(main).not.toContainText("<p>");
    expect(await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBeUndefined();
    for (const fiction of ["Sugu Express", "avis", "vues", "ventes"]) await expect(main).not.toContainText(fiction);
  });

  test("shows the picture that is chosen among the product's pictures", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-variants");
    const pictures = page.getByRole("list", { name: "Photos du produit" });
    await expect(pictures.getByRole("button")).toHaveCount(3);
    await expect(pictures.getByRole("button", { name: "Afficher la photo 1" })).toHaveAttribute("aria-pressed", "true");

    const shown = page.getByRole("img", { name: "Photo de Chemise en Faso Dan Fani" });
    const before = await shown.getAttribute("src");
    await pictures.getByRole("button", { name: "Afficher la photo 2" }).click();
    await expect(pictures.getByRole("button", { name: "Afficher la photo 2" })).toHaveAttribute("aria-pressed", "true");
    await expect(shown).not.toHaveAttribute("src", before ?? "");
  });

  test("explains a rejection with the reason moderation gave", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-rejected");
    await expect(page.locator("main header").first()).toContainText("Rejeté");
    await expect(page.getByText("Ce produit a été rejeté")).toBeVisible();
    await expect(page.getByText("Motif : La photo principale est floue.")).toBeVisible();
    await expect(page.getByText("Ajoutez une photo nette sur fond clair.")).toBeVisible();
    // Rejected products can be corrected and sent again.
    await expect(page.getByRole("button", { name: "Soumettre à validation" })).toBeVisible();

    await page.goto("/vendor/products/product-submitted");
    await expect(page.getByText("En cours de validation")).toBeVisible();
    await expect(page.getByRole("button", { name: "Soumettre à validation" })).toHaveCount(0);
  });

  test("tells a product without picture from a picture that no longer loads, with no stand-in photo", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-out");
    await expect(page.getByText("Ce produit n'a pas encore de photo.")).toBeVisible();
    await expect(page.locator('main img[src*="fallback"]')).toHaveCount(0);
    await expect(page.getByRole("img", { name: "Image indisponible" })).toHaveCount(0);
    await expect(summary(page)).toContainText("Rupture");
    // A simple product has no variant list.
    await expect(variantList(page)).toHaveCount(0);

    await page.goto("/vendor/products/product-low");
    await expect(page.getByRole("img", { name: "Image indisponible" })).toBeVisible();
    await expect(page.getByText("Ce produit n'a pas encore de photo.")).toHaveCount(0);
  });

  test("submits a ready draft after a confirmation, and never publishes it itself", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-to-delete");
    const submissions: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/submit")) submissions.push(request.url());
    });

    await page.getByRole("button", { name: "Soumettre à validation" }).click();
    await expect(confirmation(page)).toContainText("L'équipe SUGU vérifie le produit");
    await confirmation(page).getByRole("button", { name: "Annuler" }).click();
    expect(submissions).toHaveLength(0);

    await page.getByRole("button", { name: "Soumettre à validation" }).click();
    await confirmation(page).getByRole("button", { name: "Soumettre à validation" }).click();
    await expect(page.getByText("Produit soumis à validation.")).toBeVisible();
    await expect(page.locator("main header").first()).toContainText("En validation");
    await expect(page.getByText("En cours de validation")).toBeVisible();
    // Waiting for moderation: nothing left to submit, the product can still be corrected.
    await expect(page.getByRole("button", { name: "Soumettre à validation" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Modifier" })).toBeVisible();
    expect(submissions).toHaveLength(1);
  });

  test("says what an incomplete draft is missing instead of queueing it", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-incomplete");
    await page.getByRole("button", { name: "Soumettre à validation" }).click();
    await confirmation(page).getByRole("button", { name: "Soumettre à validation" }).click();

    await expect(page.locator("[data-sonner-toast]")).toContainText("Complétez le produit avant de le soumettre");
    await expect(page.locator("[data-sonner-toast]")).toContainText("Aucune image produit");
    await expect(page.locator("main header").first()).toContainText("Brouillon");
  });

  test("deletes from the product page and returns to the list", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-to-delete");
    await page.getByRole("button", { name: "Supprimer" }).click();
    await confirmation(page).getByRole("button", { name: "Supprimer le produit" }).click();
    await expect(page).toHaveURL(/\/vendor\/products$/);
    await expect(page.locator("main header").first()).toContainText("(45 produits)");
  });

  test("answers « introuvable » for an unknown product and for another seller's alike", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-foreign");
    await expect(page.getByText("Produit introuvable")).toBeVisible();
    await expect(page.locator("main")).not.toContainText("autre boutique");

    await page.goto("/vendor/products/does-not-exist");
    await expect(page.getByText("Produit introuvable")).toBeVisible();
    await page.getByRole("link", { name: "Retour aux produits" }).click();
    await expect(page).toHaveURL(/\/vendor\/products$/);
  });

  for (const width of WIDTHS) {
    test(`is laid out for ${width}px, usable and accessible`, async ({ page, baseURL }) => {
      await open(page, baseURL, "/vendor/products/product-variants", { width, height: width < PHONE ? 844 : 900 });
      const edit = page.getByRole("link", { name: "Modifier" });
      await expect(edit).toBeVisible();

      // Picture and figures side by side, at every width: the price is read without scrolling.
      const picture = await box(page.getByRole("img", { name: "Photo de Chemise en Faso Dan Fani" }));
      const price = await box(summary(page));
      expect(picture.x + picture.width).toBeLessThanOrEqual(price.x + 0.5);
      expect(price.y).toBeLessThan(page.viewportSize()!.height - 200);

      if (width < PHONE) {
        expect((await box(edit)).height).toBeGreaterThanOrEqual(TOUCH_TARGET);
        // At the end of the page, nothing is left under the tab bar.
        await page.locator("main").evaluate((main) => main.scrollTo(0, main.scrollHeight));
        const lastCard = await box(page.locator("main .rounded-panel").last());
        const tabBar = await box(page.getByRole("navigation", { name: "Navigation rapide" }));
        expect(lastCard.y + lastCard.height).toBeLessThanOrEqual(tabBar.y + 0.5);
      }

      expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
      expect(await blockingViolations(page)).toEqual([]);
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Inventory
// ─────────────────────────────────────────────────────────────
const stockDialog = (page: Page) => page.getByRole("dialog", { name: "Ajuster le stock" });

test.describe("inventory", () => {
  test("counts each stock level like the product list, and filters on the server", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/inventory");
    await expect(page.getByRole("heading", { level: 1, name: "Inventaire" })).toBeVisible();
    await expect(rows(page, "Inventaire")).toHaveCount(25);

    await expect(tab(page, /^Tous/)).toContainText("46");
    await expect(tab(page, /^En stock/)).toContainText("43");
    await expect(tab(page, /^Stock faible/)).toContainText("2");
    await expect(tab(page, /^Rupture/)).toContainText("1");

    await tab(page, /^Stock faible/).click();
    await expect(page).toHaveURL(/level=low_stock/);
    await expect(rows(page, "Inventaire")).toHaveCount(2);
    await expect(page.getByText("2 produits", { exact: true })).toBeVisible();

    // The stock of each variant, the deactivated one marked.
    const shirt = rows(page, "Inventaire").filter({ hasText: "Chemise en Faso Dan Fani" });
    await expect(shirt).toContainText("Rouge / M");
    await expect(shirt).toContainText("Vert / S (désactivée)");

    // Found by the SKU of a variant.
    await tab(page, /^Tous/).click();
    await search(page).fill("chm-b-l");
    await search(page).press("Enter");
    await expect(rows(page, "Inventaire")).toHaveCount(1);
    await expect(rows(page, "Inventaire").first()).toContainText("Chemise en Faso Dan Fani");
  });

  test("sorts on the server, from the select as from the column headers", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/inventory");
    await expect(rows(page, "Inventaire")).toHaveCount(25);

    const byStock = page.waitForRequest((candidate) => candidate.url().includes("sellers/inventory/products") && candidate.url().includes("stock_asc"));
    await page.getByLabel("Trier par").selectOption({ label: "Stock croissant" });
    await byStock;
    await expect(page).toHaveURL(/sort=stock&dir=asc/);
    await expect(rows(page, "Inventaire").first()).toContainText("Sac en cuir de Kaya");
    await expect(table(page, "Inventaire").getByRole("columnheader", { name: "Stock" })).toHaveAttribute("aria-sort", "ascending");

    await table(page, "Inventaire").getByRole("button", { name: "Produit" }).click();
    await expect(page.getByLabel("Trier par")).toHaveValue("name-asc");
  });

  test("adds stock to the chosen variant and shows what the server answers", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/inventory?q=chm-0041");
    const posts: unknown[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/add-stock")) posts.push(request.postDataJSON());
    });

    await page.getByRole("button", { name: "Ajuster le stock de Chemise en Faso Dan Fani" }).click();
    await expect(stockDialog(page)).toBeVisible();
    await stockDialog(page).getByLabel("Variante").selectOption("variant-41-bl");
    await expect(stockDialog(page)).toContainText("Stock actuel : 3");

    await stockDialog(page).getByLabel("Quantité").fill("6");
    await expect(stockDialog(page)).toContainText("Stock après ajustement : 9 unités.");
    await stockDialog(page).getByLabel("Motif").selectOption("restock");
    await stockDialog(page).getByRole("button", { name: "Enregistrer" }).click();

    await expect(page.getByText("Stock mis à jour : 9 unités.")).toBeVisible();
    await expect(stockDialog(page)).toBeHidden();
    expect(posts).toEqual([{ quantity: 6, variant_id: "variant-41-bl", reason: "restock" }]);

    // 4 + 9: the row is refetched, and the product is no longer low on stock.
    const shirt = rows(page, "Inventaire").first();
    await expect(shirt).toContainText("13");
    await expect(shirt).toContainText("En stock");
  });

  test("validates the quantity before sending, and removes stock down to zero", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/inventory?q=bra-0043");
    let posts = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/add-stock")) posts += 1;
    });

    await page.getByRole("button", { name: "Ajuster le stock de Bracelet en bronze" }).click();
    // A simple product: no variant to choose.
    await expect(stockDialog(page).getByLabel("Variante")).toHaveCount(0);

    await stockDialog(page).getByRole("button", { name: "Enregistrer" }).click();
    await expect(stockDialog(page)).toContainText("Indiquez une quantité.");

    await stockDialog(page).getByLabel("Opération").selectOption("remove");
    await stockDialog(page).getByLabel("Quantité").fill("5");
    await stockDialog(page).getByRole("button", { name: "Enregistrer" }).click();
    await expect(stockDialog(page)).toContainText("Vous ne pouvez pas retirer plus que le stock actuel (3).");
    expect(posts).toBe(0);

    await stockDialog(page).getByLabel("Quantité").fill("3");
    await stockDialog(page).getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Stock mis à jour : 0 unité.")).toBeVisible();
    await expect(rows(page, "Inventaire").first()).toContainText("Rupture");
    expect(posts).toBe(1);
  });

  test("shows the server's refusal and keeps the form when the stock changed behind the page", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/inventory?q=bra-0043");
    await page.getByRole("button", { name: "Ajuster le stock de Bracelet en bronze" }).click();
    await stockDialog(page).getByLabel("Opération").selectOption("remove");
    await stockDialog(page).getByLabel("Quantité").fill("2");

    // Meanwhile a sale took the stock: the server refuses.
    await page.route("**/api/proxy/sellers/inventory/product-low/add-stock", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Le stock ne peut pas descendre sous zéro.", error_code: "SUGU-STOCK-NEGATIVE" }),
      }),
    );
    await stockDialog(page).getByRole("button", { name: "Enregistrer" }).click();

    await expect(stockDialog(page)).toContainText("Le stock n'a pas été modifié");
    await expect(stockDialog(page)).toContainText("Le stock ne peut pas descendre sous zéro.");
    await expect(stockDialog(page).getByLabel("Quantité")).toHaveValue("2");
  });

  test("does not send an adjustment twice on a double activation", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/inventory?q=bra-0043");
    let posts = 0;
    await page.route("**/api/proxy/sellers/inventory/product-low/add-stock", async (route) => {
      posts += 1;
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });

    await page.getByRole("button", { name: "Ajuster le stock de Bracelet en bronze" }).click();
    await stockDialog(page).getByLabel("Quantité").fill("4");
    const save = stockDialog(page).getByRole("button", { name: "Enregistrer" });
    await save.click();
    await expect(save).toBeDisabled();
    await save.click({ force: true }).catch(() => undefined);
    await expect(stockDialog(page)).toBeHidden();
    expect(posts).toBe(1);
  });

  test("exports the inventory as a CSV built by the server", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/inventory");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exporter en CSV" }).click()]);
    // Read while it is on screen: the confirmation does not wait for the file to be checked.
    await expect(page.locator("[data-sonner-toast]")).toContainText("Export de l");
    const lines = readFileSync(await download.path(), "utf8").trim().split("\n");

    expect(download.suggestedFilename()).toMatch(/^inventaire-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(lines[0]).toContain("Produit;Variante;SKU");
    // One line per variant: 45 simple products and the shirt's three variants.
    expect(lines).toHaveLength(1 + 45 + 3);
  });

  for (const width of WIDTHS) {
    test(`is laid out for ${width}px, usable and accessible`, async ({ page, baseURL }) => {
      await open(page, baseURL, "/vendor/inventory?level=low_stock", { width });
      const button = page.getByRole("button", { name: "Ajuster le stock de Chemise en Faso Dan Fani" });
      await expect(button).toBeVisible();

      if (width < PHONE) {
        await expect(cards(page, "Inventaire")).toHaveCount(2);
        expect((await box(button)).height).toBeGreaterThanOrEqual(TOUCH_TARGET);
        // The order can be chosen on a phone too, where the table has no header to tap.
        await page.getByRole("button", { name: /^Filtres/ }).click();
        await expect(page.getByRole("dialog", { name: "Filtres" }).getByLabel("Trier par")).toBeVisible();
        await page.getByRole("dialog", { name: "Filtres" }).getByRole("button", { name: "Voir les résultats" }).click();
      } else {
        // The table fits: nothing is reached by dragging it sideways.
        expect(await table(page, "Inventaire").evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
        expect((await box(button)).x + (await box(button)).width).toBeLessThanOrEqual(width + 0.5);
      }

      await button.click();
      // Polled: the panel is measured once its opening animation has settled.
      await expect
        .poll(async () => {
          const panel = await stockDialog(page).boundingBox();
          return panel !== null && panel.x >= 0 && panel.x + panel.width <= width + 0.5 && panel.y + panel.height <= 900 + 0.5;
        })
        .toBe(true);
      expect(await blockingViolations(page)).toEqual([]);
      await stockDialog(page).getByRole("button", { name: "Annuler" }).click();

      expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
      expect(await blockingViolations(page)).toEqual([]);
    });
  }
});
