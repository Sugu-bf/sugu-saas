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
// by stock: 43 in stock, 2 low, 1 out;
// by primary category: Beauté 11, Épicerie 11, Maison 12, Textile 12.

const grid = (page: Page) => cards(page, "Produits");
/** The size of the whole catalogue, next to the page title. */
const catalogueSize = (page: Page) => page.locator("main header").first();
/** What a search or a filter leaves, above the list. Absent while nothing narrows it. */
const resultCount = (page: Page) => page.locator("main p[aria-live='polite']").filter({ hasText: /^\d+ produits?$/ });
const sortSelect = (page: Page) => page.getByLabel("Trier par");

const categorySelect = (page: Page) => page.getByRole("combobox", { name: "Catégorie" });

/**
 * Columns of the grid at each width, with the sidebar open: never the most
 * that would fit. Two upright cards on a phone; from a tablet, cards on
 * their side, two then three a row; four from 1536px (see the test below).
 */
const GRID_COLUMNS: Record<number, number> = { 375: 2, 390: 2, 768: 2, 1024: 2, 1280: 3, 1440: 3 };

/** What every card of the grid is made of, measured in the page. */
const cardMeasures = (page: Page) =>
  grid(page).evaluateAll((items) =>
    items.map((item) => {
      const within = (inner: DOMRect, outer: DOMRect) => inner.left >= outer.left - 0.5 && inner.right <= outer.right + 0.5 && inner.top >= outer.top - 0.5 && inner.bottom <= outer.bottom + 0.5;
      const apart = (a: DOMRect, b: DOMRect) => a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom;
      const card = item.getBoundingClientRect();
      const picture = item.firstElementChild!.getBoundingClientRect();
      const menu = item.querySelector("button")!.getBoundingClientRect();
      const name = item.querySelector("a")!;
      const badges = Array.from(item.querySelectorAll("[data-status]"));
      return {
        name: name.textContent ?? "",
        width: card.width,
        pictureWidth: picture.width,
        pictureSquare: Math.abs(picture.width - picture.height) < 1,
        // On its side: the picture ends where the text starts. Upright: it is above it.
        sideways: picture.right <= name.getBoundingClientRect().left,
        // A badge cuts its label with an ellipsis when it lacks room: none should.
        cutBadges: badges.filter((badge) => {
          const label = badge.querySelector(".truncate") ?? badge;
          return label.scrollWidth > label.clientWidth;
        }).length,
        badgesInside: badges.every((badge) => within(badge.getBoundingClientRect(), card)),
        statusClearOfMenu: apart(badges[0].getBoundingClientRect(), menu),
        menuInside: within(menu, card),
        menuSide: Math.min(menu.width, menu.height),
        nameLines: Math.round(name.getBoundingClientRect().height / parseFloat(getComputedStyle(name).lineHeight)),
        textInside: Array.from(item.querySelectorAll("a, p, [data-status]")).every((element) => within(element.getBoundingClientRect(), card)),
      };
    }),
  );

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
    await expect(first).toContainText("66 en stock");
    // An alert takes the place of that line, with what is left.
    await expect(grid(page).filter({ hasText: "Bracelet en bronze" })).toContainText("Stock faible · 3");
    await expect(grid(page).filter({ hasText: "Sac en cuir de Kaya" })).toContainText("Rupture de stock");

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

  test("an icon-only control says what it does on hover, in text that can be read", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");
    await viewSwitch(page).getByRole("button", { name: "Vue en liste" }).hover();
    const bubble = page.locator(".z-tooltip").filter({ hasText: "Vue en liste" });
    await expect(bubble).toBeVisible();
    // White on near-black: the bubble once showed its text in the colour of its own background.
    const look = await bubble.evaluate((element) => {
      const style = getComputedStyle(element);
      return { text: style.color, background: style.backgroundColor };
    });
    expect(look).toEqual({ text: "rgb(255, 255, 255)", background: "rgb(24, 24, 27)" });
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

  test("filters by category on the server, offering only the categories the catalogue is filed under", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");
    await expect(grid(page)).toHaveCount(24);

    // Four categories hold products, each with its size: not the 57 of the marketplace.
    await expect(categorySelect(page).locator("option")).toHaveText(["Toutes les catégories", "Beauté (11)", "Épicerie (11)", "Maison (12)", "Textile (12)"]);

    const asked = page.waitForRequest((request) => request.url().includes("sellers/products?") && request.url().includes("category=cat-textile"));
    await categorySelect(page).selectOption({ label: "Textile (12)" });
    await asked;
    await expect(page).toHaveURL(/category=cat-textile/);
    await expect(page.getByText("12 produits", { exact: true })).toBeVisible();
    await expect(grid(page)).toHaveCount(12);
    for (const card of await grid(page).all()) await expect(card).toContainText("· Textile");

    // With another filter, the list is what both leave.
    await page.getByLabel("Stock").selectOption("low_stock");
    await expect(page.getByText("1 produit", { exact: true })).toBeVisible();
    await expect(grid(page).first()).toContainText("Chemise en Faso Dan Fani");

    // The address carries it: a reload, a shared link, "back" from a product.
    await page.reload();
    await expect(categorySelect(page)).toHaveValue("cat-textile");
    await expect(page.getByText("1 produit", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Tout afficher" }).click();
    await expect(categorySelect(page)).toHaveValue("");
    await expect(page).toHaveURL(/\/vendor\/products$/);
    await expect(grid(page)).toHaveCount(24);
  });

  test("keeps a category that holds no product named as the filter in force, and drops what is not an id", async ({ page, baseURL }) => {
    // Bijoux is only the second category of one product: the filter reads the primary one.
    await open(page, baseURL, "/vendor/products?category=cat-bijoux");
    await expect(page.getByText("Aucun produit ne correspond")).toBeVisible();
    await expect(categorySelect(page)).toHaveValue("cat-bijoux");
    await expect(categorySelect(page).locator("option:checked")).toHaveText("Catégorie sans produit");
    await page.getByRole("button", { name: "Tout afficher" }).first().click();
    await expect(grid(page)).toHaveCount(24);
    await expect(categorySelect(page).locator("option")).toHaveCount(5);

    await page.goto("/vendor/products?category=%3Cscript%3E");
    await expect(grid(page)).toHaveCount(24);
    await expect(categorySelect(page)).toHaveValue("");
  });

  test("offers no category filter when the server does not list the categories", async ({ page, baseURL }) => {
    // A backend older than the counters by category: the filter is not built on a guess.
    await page.route("**/api/proxy/sellers/products/stats", async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      delete body.data.byCategory;
      await route.fulfill({ response, json: body });
    });
    await open(page, baseURL, "/vendor/products");
    await expect(grid(page)).toHaveCount(24);
    await expect(tab(page, /^Tous/)).toContainText("46");
    await expect(categorySelect(page)).toHaveCount(0);
    // The other filters are there, and the list is whole.
    await expect(page.getByLabel("Stock")).toBeVisible();
    await expect(sortSelect(page)).toBeVisible();
  });

  test("sorts on the server: by name in the grid, by column in the list, one and the same order", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");
    await expect(sortSelect(page)).toHaveValue("created-desc");

    const byPrice = page.waitForResponse((candidate) => candidate.url().includes("sort=price") && candidate.url().includes("direction=asc"));
    await sortSelect(page).selectOption({ label: "Prix croissant" });
    await byPrice;
    await expect(page).toHaveURL(/sort=price&dir=asc/);
    // The address changes at once: wait for the sorted cards, not the previous ones fading out.
    await expect(page.locator("main [aria-busy='true']")).toHaveCount(0);
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

  test("filters changed in quick succession never reload the page, nor ask the server for it again", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");
    await expect(grid(page)).toHaveCount(24);
    await page.evaluate(() => Object.assign(window, { sameDocument: true }));
    const pageRequests: string[] = [];
    page.on("request", (request) => {
      if (/\/vendor\/products\?.*(stock|sort)=/.test(request.url())) pageRequests.push(request.url());
    });

    // As fast as a script can: two changes used to leave the router out of step and end in a full reload.
    for (const [stock, order] of [
      ["low_stock", "Prix croissant"],
      ["", "Stock croissant"],
      ["out_of_stock", "Plus récents"],
      ["in_stock", "Nom, de A à Z"],
    ]) {
      await page.getByLabel("Stock").selectOption(stock);
      await sortSelect(page).selectOption({ label: order });
    }

    await expect(page).toHaveURL(/stock=in_stock&sort=name&dir=asc/);
    await expect(page.getByText("43 produits", { exact: true })).toBeVisible();
    await expect(grid(page)).toHaveCount(24);
    expect(await page.evaluate(() => (window as unknown as { sameDocument?: boolean }).sameDocument)).toBe(true);
    // The list comes from the API: the address changes without fetching the page.
    expect(pageRequests).toEqual([]);

    // The address still drives the list: back and forward restore what they show.
    await grid(page).first().getByRole("link").click();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Produits");
    await page.goBack();
    await expect(page).toHaveURL(/stock=in_stock&sort=name&dir=asc/);
    await expect(page.getByLabel("Stock")).toHaveValue("in_stock");
    await expect(sortSelect(page)).toHaveValue("name-asc");
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

  test("on a phone, search, filters and view switch share one row; what narrows the list is counted under it", async ({ page, baseURL }) => {
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
    // The sentence that introduces the page is left to wider screens: the list comes sooner.
    await expect(page.getByText("Gérez votre catalogue : prix, stock et statut de publication.")).toBeHidden();
    // Fully rounded: the corner radius is at least half the height.
    for (const element of [tab(page, /^Tous/), tab(page, /^Brouillon/), page.getByRole("link", { name: "Nouveau produit" })]) {
      const shape = await element.evaluate((node) => ({ radius: parseFloat(getComputedStyle(node).borderTopLeftRadius), height: node.getBoundingClientRect().height }));
      expect(shape.radius).toBeGreaterThanOrEqual(shape.height / 2);
      expect(shape.height).toBeGreaterThanOrEqual(TOUCH_TARGET);
    }

    // One row of controls: the search, « Filtres » as an icon that keeps its name, the view switch at the end.
    const searchBox = await box(search(page));
    const filters = page.getByRole("button", { name: /^Filtres/ });
    const filtersBox = await box(filters);
    const views = await box(viewSwitch(page));
    for (const item of [filtersBox, views]) expect(Math.abs(item.y + item.height / 2 - (searchBox.y + searchBox.height / 2))).toBeLessThan(4);
    expect(searchBox.x + searchBox.width).toBeLessThanOrEqual(filtersBox.x);
    expect(filtersBox.x + filtersBox.width).toBeLessThanOrEqual(views.x);
    expect(views.x + views.width).toBeLessThanOrEqual(390 - 16 + 0.5);
    expect(Math.min(filtersBox.width, filtersBox.height)).toBeGreaterThanOrEqual(TOUCH_TARGET);
    for (const button of await viewSwitch(page).getByRole("button").all()) expect(Math.min((await box(button)).width, (await box(button)).height)).toBeGreaterThanOrEqual(TOUCH_TARGET);
    // The search keeps the room to say what it searches: its placeholder is not cut.
    expect(await search(page).evaluate((input) => input.scrollWidth - input.clientWidth)).toBeLessThanOrEqual(0);
    // Nothing between that row and the first products while nothing narrows the list.
    expect((await box(grid(page).first())).y - (searchBox.y + searchBox.height)).toBeLessThan(24);

    await filters.click();
    const sheet = page.getByRole("dialog", { name: "Filtres" });
    // In the sheet every filter shows its name above its choices.
    for (const label of ["Catégorie", "Stock", "Trier par"]) await expect(sheet.getByText(label, { exact: true })).toBeVisible();
    await sheet.getByLabel("Stock").selectOption("low_stock");
    await sheet.getByLabel("Trier par").selectOption({ label: "Stock croissant" });
    // The sheet stays open while filters change: it closes when the seller says so.
    await expect(page).toHaveURL(/stock=low_stock&sort=stock&dir=asc/);
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Voir les résultats" }).click();
    await expect(sheet).toBeHidden();

    await expect(page.getByText("2 produits", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/stock=low_stock/);
    await expect(page).toHaveURL(/sort=stock&dir=asc/);
    await expect(grid(page).first()).toContainText("Bracelet en bronze");
    // One active filter, counted on the icon: the order is not one.
    await expect(filters).toContainText("1");

    // The count and the way back to the whole list, on one row under the controls.
    const count = await box(page.getByText("2 produits", { exact: true }));
    const back = await box(page.getByRole("button", { name: "Tout afficher" }));
    expect(Math.abs(back.y + back.height / 2 - (count.y + count.height / 2))).toBeLessThan(back.height / 2);
    expect(count.y).toBeGreaterThanOrEqual(searchBox.y + searchBox.height);

    await page.getByRole("button", { name: "Tout afficher" }).click();
    await expect(grid(page)).toHaveCount(24);
    await expect(catalogueSize(page)).toContainText("(46 produits)");
    // The order chosen is kept: only what narrowed the list is cleared.
    await expect(page).toHaveURL(/sort=stock&dir=asc/);
  });

  for (const width of [768, 1024] as const) {
    test(`at ${width}px the three filters open from « Filtres », next to the search and the view switch`, async ({ page, baseURL }) => {
      await open(page, baseURL, "/vendor/products", { width });
      await expect(grid(page)).toHaveCount(24);

      // The row would not hold three filters: they are one button away, which says its name.
      const filters = page.getByRole("button", { name: /^Filtres/ });
      await expect(filters).toContainText("Filtres");
      await expect(categorySelect(page)).toHaveCount(0);
      const searchBox = await box(search(page));
      for (const item of [await box(filters), await box(viewSwitch(page))]) expect(Math.abs(item.y + item.height / 2 - (searchBox.y + searchBox.height / 2))).toBeLessThan(4);

      await filters.click();
      const sheet = page.getByRole("dialog", { name: "Filtres" });
      for (const label of ["Catégorie", "Stock", "Trier par"]) await expect(sheet.getByText(label, { exact: true })).toBeVisible();
      await sheet.getByLabel("Catégorie").selectOption({ label: "Maison (12)" });
      await sheet.getByRole("button", { name: "Voir les résultats" }).click();
      await expect(page.getByText("12 produits", { exact: true })).toBeVisible();
      await expect(filters).toContainText("1");
    });
  }

  for (const width of [1280, 1440] as const) {
    test(`at ${width}px search, filters and view switch read as one line`, async ({ page, baseURL }) => {
      await open(page, baseURL, "/vendor/products", { width });
      await expect(grid(page)).toHaveCount(24);
      await expect(page.getByRole("button", { name: /^Filtres/ })).toHaveCount(0);
      await expect(page.getByText("Gérez votre catalogue : prix, stock et statut de publication.")).toBeVisible();

      const controls = [search(page), categorySelect(page), page.getByLabel("Stock"), sortSelect(page), viewSwitch(page)];
      const boxes = await Promise.all(controls.map((control) => box(control)));
      // One line, in reading order, and controls of one height.
      for (const item of boxes) expect(Math.abs(item.y + item.height / 2 - (boxes[0].y + boxes[0].height / 2))).toBeLessThan(1);
      for (let index = 1; index < boxes.length; index += 1) expect(boxes[index].x).toBeGreaterThanOrEqual(boxes[index - 1].x + boxes[index - 1].width);
      for (const item of boxes.slice(0, 4)) expect(Math.abs(item.height - boxes[0].height)).toBeLessThan(1);
      // The view switch closes the line, at the edge of the list.
      const list = await box(page.getByRole("list", { name: "Produits" }));
      expect(Math.abs(boxes[4].x + boxes[4].width - (list.x + list.width))).toBeLessThan(1);
      // Two filters say what they filter by their first choice; their names stay for assistive technology.
      await expect(categorySelect(page).locator("option").first()).toHaveText("Toutes les catégories");
      await expect(page.getByLabel("Stock").locator("option").first()).toHaveText("Tout le stock");
    });
  }

  test("the grid follows the room it has, not the window: four cards a row once each keeps 292px", async ({ page, baseURL }) => {
    const columns = async () => {
      const tops = await grid(page).evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)));
      return tops.filter((top) => top === tops[0]).length;
    };

    // 1536px, the width of the mock-up the page was drawn from: four a row.
    await open(page, baseURL, "/vendor/products", { width: 1536 });
    await expect(grid(page)).toHaveCount(24);
    expect(await columns()).toBe(4);
    for (const card of await cardMeasures(page)) {
      expect(card.width).toBeGreaterThanOrEqual(292);
      expect(card.cutBadges, card.name).toBe(0);
      expect(card.statusClearOfMenu, card.name).toBe(true);
    }

    // 1440px: three with the sidebar open, four once it is folded. Same window, more room.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(columns).toBe(3);
    await page.getByRole("button", { name: "Réduire le menu" }).click();
    await expect.poll(columns).toBe(4);
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
  });

  test("a card keeps its shape with the longest name, reference and status a product can carry", async ({ page, baseURL }) => {
    const name = "Ensemble boubou trois pièces brodé main en bazin riche teinté, avec foulard et pochette assortis";
    await page.route(/\/api\/proxy\/sellers\/products\?/, async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      if (body.data?.data?.[0]) {
        // "En validation" is the longest status; 10 is the largest stock still "low".
        Object.assign(body.data.data[0], { name, sku: "ENSEMBLE-BOUBOU-3-PIECES-BAZIN-RICHE-0001", category: "Tenues traditionnelles", statusCode: "submitted", price: 12500000, stock: 10, stockStatus: "low_stock", hasVariants: true, variants: Array.from({ length: 12 }, (_, index) => ({ id: `v${index}` })) });
      }
      await route.fulfill({ response, json: body });
    });

    for (const width of [375, 768, 1280, 1536]) {
      await open(page, baseURL, "/vendor/products", { width });
      await expect(grid(page)).toHaveCount(24);
      const [card, neighbour] = await cardMeasures(page);
      expect(card.name, `${width}px`).toBe(name);
      // Cut after two lines, and by an ellipsis on one line for the reference.
      expect(card.nameLines, `${width}px`).toBe(2);
      expect(await grid(page).first().locator("p").first().evaluate((line) => line.scrollWidth > line.clientWidth && getComputedStyle(line).textOverflow === "ellipsis"), `${width}px`).toBe(true);
      expect(card.cutBadges, `${width}px: a status is never cut`).toBe(0);
      expect(card.statusClearOfMenu, `${width}px`).toBe(true);
      expect(card.textInside, `${width}px`).toBe(true);
      expect(card.menuInside, `${width}px`).toBe(true);
      // The card is not wider than its neighbour: the long text is its own problem.
      expect(Math.abs(card.width - neighbour.width), `${width}px`).toBeLessThan(1);
      expect(await sidewaysOverflow(page), `${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test("the menu of a card opens whole on screen and is driven from the keyboard", async ({ page, baseURL }) => {
    for (const width of [375, 768, 1440]) {
      await open(page, baseURL, "/vendor/products", { width, height: 800 });
      await expect(grid(page)).toHaveCount(24);
      // The last card of the first row: the one whose menu has the least room.
      const card = grid(page).nth(GRID_COLUMNS[width] - 1);
      const trigger = card.getByRole("button", { name: /^Actions pour/ });

      // The card is one stop, its menu the next.
      await card.getByRole("link").focus();
      await page.keyboard.press("Tab");
      await expect(trigger).toBeFocused();
      await page.keyboard.press("Enter");
      const menu = page.getByRole("menu");
      await expect(menu).toBeVisible();
      await expect(menu.getByRole("menuitem")).toHaveText(["Ouvrir la fiche", "Modifier", "Supprimer"]);
      const bounds = await box(menu);
      expect(bounds.x, `${width}px`).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width, `${width}px`).toBeLessThanOrEqual(width + 0.5);
      expect(bounds.y + bounds.height, `${width}px`).toBeLessThanOrEqual(800 + 0.5);

      // Escape gives the focus back to the button that opened it.
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();

      // Opened from the keyboard, the menu starts on its first choice: Enter opens the product.
      await page.keyboard.press("Enter");
      await expect(menu.getByRole("menuitem", { name: "Ouvrir la fiche" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/vendor\/products\/[^/?]+$/);
      await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Produits");
    }
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

      for (const card of await cardMeasures(page)) {
        // Never a narrow card: upright on a phone, on its side from a tablet, where it asks for more room.
        expect(card.width, card.name).toBeGreaterThanOrEqual(width < PHONE ? 150 : 292);
        expect(card.sideways, card.name).toBe(width >= PHONE);
        // A picture large enough to tell a product from its neighbour, never stretched.
        expect(card.pictureSquare, card.name).toBe(true);
        expect(card.pictureWidth, card.name).toBeGreaterThanOrEqual(width < PHONE ? 150 : 104);
        // Nothing is cut, nothing collides, nothing leaves the card.
        expect(card.cutBadges, card.name).toBe(0);
        expect(card.badgesInside, card.name).toBe(true);
        expect(card.statusClearOfMenu, card.name).toBe(true);
        expect(card.menuInside, card.name).toBe(true);
        expect(card.textInside, card.name).toBe(true);
        expect(card.nameLines, card.name).toBeLessThanOrEqual(2);
        if (width < PHONE) expect(card.menuSide, card.name).toBeGreaterThanOrEqual(TOUCH_TARGET);
      }

      if (width < PHONE) await expect(page.getByRole("link", { name: "Nouveau produit" })).toBeVisible();

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
  const summary = (page: Page) => page.getByRole("region", { name: "Résumé du produit" });
  const facts = (page: Page) => page.locator("main .rounded-panel").filter({ has: page.getByRole("heading", { name: "Informations" }) });
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
    await expect(summary(page)).toContainText(/À partir de 10 unités/);
    await expect(summary(page)).toContainText(/7\s000\sFCFA/);
    // Under the title: what tells the product from its neighbours.
    await expect(main.locator("header").first()).toContainText("CHM-0041 · Textile");

    // What files the product, one fact a line, each with its value.
    const pairs = await facts(page).locator("dl > div").evaluateAll((rows) => rows.map((row) => [row.querySelector("dt")?.textContent, row.querySelector("dd")?.textContent]));
    expect(pairs).toEqual(expect.arrayContaining([["Référence (SKU)", "CHM-0041"], ["Catégorie", "Textile"], ["État", "Neuf"], ["Pays d'origine", "Burkina Faso"], ["Poids", "350 g"]]));

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
    // No picture: the frame says so, and the way to add one is next to it.
    await expect(summary(page).getByText("Aucune photo")).toBeVisible();
    await expect(page.locator('main img[src*="fallback"]')).toHaveCount(0);
    await expect(page.getByRole("img", { name: "Image indisponible" })).toHaveCount(0);
    await expect(summary(page).locator("img")).toHaveCount(0);
    await expect(summary(page)).toContainText("Rupture");
    // A simple product has no variant list.
    await expect(variantList(page)).toHaveCount(0);

    // A picture that no longer loads is another matter: nothing to add, something to fix.
    await page.goto("/vendor/products/product-low");
    await expect(page.getByRole("img", { name: "Image indisponible" })).toBeVisible();
    await expect(summary(page).getByText("Image indisponible")).toBeVisible();
    await expect(summary(page).getByText("Aucune photo")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ajouter des photos" })).toHaveCount(0);

    // "Ajouter des photos" opens the form where photos are added, not at its first step.
    await page.goto("/vendor/products/product-out");
    await page.getByRole("link", { name: "Ajouter des photos" }).click();
    await expect(page).toHaveURL(/\/vendor\/products\/product-out\/edit\?step=photos$/);
    await expect(page.getByRole("navigation", { name: /^Étapes de la/ }).locator('[aria-current="step"]')).toContainText("Photos");
    await expect(page.locator("#product-photos")).toBeVisible();
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

      const picture = await box(page.getByRole("img", { name: "Photo de Chemise en Faso Dan Fani" }));
      const price = await box(summary(page).getByText("Prix de vente"));
      const overview = await box(summary(page));
      const information = await box(facts(page));
      if (width < PHONE) {
        // The picture across the card, then the figures: the price is read without scrolling, above the tab bar.
        expect(picture.y + picture.height).toBeLessThanOrEqual(price.y);
        expect(picture.width).toBeGreaterThanOrEqual(200);
        expect(price.y + price.height).toBeLessThan((await box(page.getByRole("navigation", { name: "Navigation rapide" }))).y);
      } else {
        // Picture and figures side by side: a gallery large enough to check a photo.
        expect(picture.x + picture.width).toBeLessThanOrEqual(price.x + 0.5);
        expect(picture.width).toBeGreaterThanOrEqual(180);
        expect(price.y).toBeLessThan(page.viewportSize()!.height - 200);
      }
      // No column left half empty: the figures use the room next to the pictures.
      const figures = await summary(page).locator("dl").evaluateAll((lists) => Math.max(...lists.map((list) => list.getBoundingClientRect().right)));
      expect(overview.x + overview.width - figures).toBeLessThan(24);

      if (width >= 1280) {
        // Two columns from 896px of page: the facts in the margin, level with the summary.
        expect(information.x).toBeGreaterThanOrEqual(overview.x + overview.width);
        expect(Math.abs(information.y - overview.y)).toBeLessThan(1);
        expect(information.width).toBeGreaterThanOrEqual(280);
      } else {
        // One column: the facts close the page, as wide as the rest.
        expect(information.y).toBeGreaterThan(overview.y + overview.height);
        expect(Math.abs(information.width - overview.width)).toBeLessThan(1);
      }

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
