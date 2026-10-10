import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Seller catalogue (V2) on the production build. Data: e2e/catalog/mock-catalog.mjs,
// one fresh data set per sign-in, so every test may mutate its products.
// Counts written here are an oracle independent from the app:
// 46 products = 30 active, 8 draft, 6 archived, 1 submitted, 1 rejected;
// by stock: 43 in stock, 2 low, 1 out.

const WIDTHS = [375, 390, 768, 1280] as const;
const VENDOR = "vendeur@qa.test";
const PASSWORD = "Passw0rd!";

const SHOTS = join(__dirname, "..", "..", "docs", "captures", "v2-catalog");
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });

async function open(page: Page, baseURL: string | undefined, path: string, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  const response = await page.request.post("/api/auth/login", {
    data: { email: VENDOR, password: PASSWORD },
    headers: { Origin: baseURL ?? "" },
  });
  expect(response.ok(), `login: ${response.status()}`).toBe(true);
  await page.goto(path);
  await expect(page.locator('[data-shell="pro"][data-role="vendor"]')).toBeVisible();
}

async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target.join(" ")).slice(0, 3) }));
}

const rootOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const table = (page: Page, name: string) => page.getByRole("region", { name });
const rows = (page: Page, name: string) => table(page, name).locator("tbody tr");
const cards = (page: Page, name: string) => page.getByRole("list", { name }).locator("> li");
const tab = (page: Page, name: RegExp) => page.getByRole("tab", { name });
const search = (page: Page) => page.getByRole("searchbox", { name: "Nom ou référence (SKU)" });
const dialog = (page: Page) => page.getByRole("alertdialog");
const header = (page: Page) => page.locator("main header").first();

// ─────────────────────────────────────────────────────────────
// Product list
// ─────────────────────────────────────────────────────────────
test.describe("product list", () => {
  test("shows the server page, the real counters and paginates on the server", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");

    await expect(page.getByRole("heading", { level: 1, name: "Produits" })).toBeVisible();
    await expect(rows(page, "Produits")).toHaveCount(24);
    await expect(page.getByText("46 produits", { exact: true })).toBeVisible();

    // One counter per status, from the backend: archived is not "the rest".
    await expect(tab(page, /^Tous/)).toContainText("46");
    await expect(tab(page, /^En ligne/)).toContainText("30");
    await expect(tab(page, /^Brouillon/)).toContainText("8");
    await expect(tab(page, /^En validation/)).toContainText("1");
    // Statuses outside the main tabs get theirs as soon as they hold products.
    await expect(tab(page, /^Archivé/)).toContainText("6");
    await expect(tab(page, /^Rejeté/)).toContainText("1");
    await expect(tab(page, /^Suspendu/)).toHaveCount(0);

    // Real stock and price of the first row, in francs.
    const first = rows(page, "Produits").first();
    await expect(first).toContainText("Coussin en bogolan");
    await expect(first).toContainText("66");
    await expect(first).toContainText("En stock");
    await expect(first).toContainText(/FCFA/);

    await expect(page.getByText("1–24 sur 46 produits")).toBeVisible();
    await page.getByRole("button", { name: "Page suivante" }).click();
    await expect(page.getByText("25–46 sur 46 produits")).toBeVisible();
    await expect(page).toHaveURL(/page=2/);
    await expect(rows(page, "Produits")).toHaveCount(22);
  });

  test("searches on the server: finds a product that is on the last page", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");
    await expect(table(page, "Produits")).not.toContainText("Tabouret Sénoufo");

    const request = page.waitForRequest((candidate) => candidate.url().includes("sellers/products?") && candidate.url().includes("search=tab-0001"));
    await search(page).fill("tab-0001");
    await search(page).press("Enter");
    await request;

    await expect(rows(page, "Produits")).toHaveCount(1);
    await expect(rows(page, "Produits").first()).toContainText("Tabouret Sénoufo");
    await expect(page.getByText("1 produit", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/q=tab-0001/);

    await search(page).fill("rien-de-tel");
    await search(page).press("Enter");
    await expect(page.getByText("Aucun produit ne correspond")).toBeVisible();
    await page.getByRole("button", { name: "Tout afficher" }).last().click();
    await expect(page.getByText("46 produits", { exact: true })).toBeVisible();
  });

  test("filters by status and stock level, and keeps the state in the URL", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");

    await tab(page, /^Brouillon/).click();
    await expect(page.getByText("8 produits", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/status=draft/);
    for (const row of await rows(page, "Produits").all()) await expect(row).toContainText("Brouillon");

    // A product waiting for moderation is not shown as a draft.
    await expect(table(page, "Produits")).not.toContainText("Tunique brodée");
    await tab(page, /^En validation/).click();
    await expect(rows(page, "Produits")).toHaveCount(1);
    await expect(rows(page, "Produits").first()).toContainText("Tunique brodée");

    await tab(page, /^Tous/).click();
    await page.getByLabel("Stock").selectOption("low_stock");
    await expect(page.getByText("2 produits", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/stock=low_stock/);
    for (const row of await rows(page, "Produits").all()) await expect(row).toContainText("Stock faible");

    // Back from a product: same filter.
    await rows(page, "Produits").first().getByRole("link").click();
    await expect(page.getByRole("heading", { level: 1, name: "Bracelet en bronze" })).toBeVisible();
    await page.goBack();
    await expect(page.getByText("2 produits", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Stock")).toHaveValue("low_stock");
  });

  test("sorts on the server by price and by stock", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");

    const byPrice = page.waitForRequest((candidate) => candidate.url().includes("sort=price") && candidate.url().includes("direction=asc"));
    await table(page, "Produits").getByRole("button", { name: "Prix" }).click();
    await byPrice;
    await expect(page).toHaveURL(/sort=price&dir=asc/);
    await expect(table(page, "Produits").getByRole("columnheader", { name: "Prix" })).toHaveAttribute("aria-sort", "ascending");
    const prices = (await rows(page, "Produits").locator("td:nth-last-child(3)").allTextContents()).map((text) => Number(text.replace(/[^\d]/g, "")));
    expect(prices).toHaveLength(24);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    const byStock = page.waitForRequest((candidate) => candidate.url().includes("sort=stock"));
    await table(page, "Produits").getByRole("button", { name: "Stock" }).click();
    await byStock;
    await expect(rows(page, "Produits").first()).toContainText("Sac en cuir de Kaya");
    await expect(rows(page, "Produits").first()).toContainText("Rupture");
  });

  test("deletes a product only after an explicit confirmation, and recounts", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products");
    await page.getByRole("button", { name: "Actions pour Coussin en bogolan" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();

    await expect(dialog(page)).toContainText("Coussin en bogolan");
    await dialog(page).getByRole("button", { name: "Garder le produit" }).click();
    await expect(table(page, "Produits")).toContainText("Coussin en bogolan");

    await page.getByRole("button", { name: "Actions pour Coussin en bogolan" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await dialog(page).getByRole("button", { name: "Supprimer le produit" }).click();

    await expect(page.getByText(/a été supprimé/)).toBeVisible();
    await expect(table(page, "Produits")).not.toContainText("Coussin en bogolan");
    await expect(page.getByText("45 produits", { exact: true })).toBeVisible();
    await expect(tab(page, /^Brouillon/)).toContainText("7");
  });

  test("shows an outage as an outage, never as an empty catalogue, and recovers", async ({ page, baseURL }) => {
    await page.route("**/api/proxy/sellers/products?**", (route) =>
      route.fulfill({ status: 503, contentType: "text/html", body: "<h1>Bad gateway</h1>" }),
    );
    await open(page, baseURL, "/vendor/products");
    await expect(page.getByText("Les produits n'ont pas pu être chargés")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Votre catalogue est vide")).toHaveCount(0);

    await page.unroute("**/api/proxy/sellers/products?**");
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(rows(page, "Produits")).toHaveCount(24);
  });

  for (const width of WIDTHS) {
    test(`is usable and accessible at ${width}px`, async ({ page, baseURL }) => {
      await open(page, baseURL, "/vendor/products", width);

      if (width < 768) {
        await expect(cards(page, "Produits")).toHaveCount(24);
        const first = cards(page, "Produits").first();
        await expect(first).toContainText("Coussin en bogolan");
        await expect(first).toContainText("Brouillon");
        await expect(first).toContainText("FCFA");
        const box = await first.getByRole("button", { name: /^Actions pour/ }).boundingBox();
        expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(44);
        await expect(page.getByRole("link", { name: "Nouveau produit" })).toBeVisible();
      } else {
        await expect(rows(page, "Produits")).toHaveCount(24);
      }

      expect(await rootOverflow(page)).toBeLessThanOrEqual(0);
      expect(await blockingViolations(page)).toEqual([]);
      await shot(page, `products-${width}`);
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Product detail
// ─────────────────────────────────────────────────────────────
test.describe("product detail", () => {
  test("shows stored facts only: francs, variants with their stock, no executed markup", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-variants");
    const main = page.locator("main");

    await expect(page.getByRole("heading", { level: 1, name: "Chemise en Faso Dan Fani" })).toBeVisible();
    await expect(header(page)).toContainText("En ligne");
    await expect(header(page)).toContainText("Stock faible");

    const pricing = page.locator("section", { has: page.getByRole("heading", { name: "Prix et stock" }) });
    await expect(pricing).toContainText(/7\s500\sFCFA/);
    await expect(pricing).toContainText(/9\s000\sFCFA/);
    // 4 + 3: the deactivated variant holds 25 units that are not for sale.
    await expect(pricing).toContainText("7 unités");
    await expect(pricing).toContainText(/À partir de 10 unités/);

    const variants = page.locator("section", { has: page.getByRole("heading", { name: "Variantes" }) });
    await expect(variants.getByRole("listitem")).toHaveCount(3);
    await expect(variants).toContainText("Couleur : Rouge · Taille : M");
    await expect(variants.getByRole("listitem").nth(2)).toContainText("Désactivée");

    // The description is read as text: its markup is not in the page.
    await expect(main).toContainText("Fabriqué à Ouagadougou.");
    await expect(main).not.toContainText("<p>");
    for (const fiction of ["Sugu Express", "avis", "vues", "ventes", "%"]) await expect(main).not.toContainText(fiction);
  });

  test("explains a rejection with the reason moderation gave", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-rejected");
    await expect(header(page)).toContainText("Rejeté");
    await expect(page.getByText("Ce produit a été rejeté")).toBeVisible();
    await expect(page.getByText("Motif : La photo principale est floue.")).toBeVisible();
    await expect(page.getByText("Ajoutez une photo nette sur fond clair.")).toBeVisible();

    await page.goto("/vendor/products/product-submitted");
    await expect(page.getByText("En cours de validation")).toBeVisible();
  });

  test("says a product has no picture instead of showing a stand-in", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-out");
    await expect(page.getByText("Ce produit n'a pas encore de photo.")).toBeVisible();
    await expect(page.locator('main img[src*="fallback"]')).toHaveCount(0);
    await expect(header(page)).toContainText("Rupture");
    // A simple product has no variant list.
    await expect(page.getByRole("heading", { name: "Variantes" })).toHaveCount(0);
  });

  test("deletes from the product page and returns to the list", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/products/product-to-delete");
    await page.getByRole("button", { name: "Supprimer" }).click();
    await dialog(page).getByRole("button", { name: "Supprimer le produit" }).click();
    await expect(page).toHaveURL(/\/vendor\/products$/);
    await expect(page.getByText("45 produits", { exact: true })).toBeVisible();
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
    test(`is usable and accessible at ${width}px`, async ({ page, baseURL }) => {
      await open(page, baseURL, "/vendor/products/product-variants", width);
      await expect(page.getByRole("link", { name: "Modifier" })).toBeVisible();

      if (width < 1024) {
        // One column: price and stock first, then the pictures.
        const y = async (name: string) => (await page.getByRole("heading", { name, exact: true }).boundingBox())!.y;
        expect(await y("Prix et stock")).toBeLessThan(await y("Photos"));
        expect(await y("Photos")).toBeLessThan(await y("Variantes"));
      }

      expect(await rootOverflow(page)).toBeLessThanOrEqual(0);
      expect(await blockingViolations(page)).toEqual([]);
      await shot(page, `product-${width}`);
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
    const lines = readFileSync(await download.path(), "utf8").trim().split("\n");

    expect(download.suggestedFilename()).toMatch(/^inventaire-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(lines[0]).toContain("Produit;Variante;SKU");
    // One line per variant: 45 simple products and the shirt's three variants.
    expect(lines).toHaveLength(1 + 45 + 3);
    await expect(page.locator("[data-sonner-toast]")).toContainText("Export de l");
  });

  for (const width of WIDTHS) {
    test(`is usable and accessible at ${width}px`, async ({ page, baseURL }) => {
      await open(page, baseURL, "/vendor/inventory?level=low_stock", width);
      const button = page.getByRole("button", { name: "Ajuster le stock de Chemise en Faso Dan Fani" });
      await expect(button).toBeVisible();

      if (width < 768) {
        await expect(cards(page, "Inventaire")).toHaveCount(2);
        const box = await button.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
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
      await shot(page, `inventory-adjust-${width}`);
      await stockDialog(page).getByRole("button", { name: "Annuler" }).click();

      expect(await rootOverflow(page)).toBeLessThanOrEqual(0);
      expect(await blockingViolations(page)).toEqual([]);
      await shot(page, `inventory-${width}`);
    });
  }
});
