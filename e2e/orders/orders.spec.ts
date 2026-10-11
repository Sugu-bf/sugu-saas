import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Seller orders (V1) on the production build. Data: e2e/orders/mock-orders.mjs,
// one fresh data set per sign-in, so every test may mutate its orders.
// Counts written here are an oracle independent from the app:
// 68 orders = 38 delivered, 15 canceled, 8 returned, 4 shipped, 1 pending,
// 1 confirmed, 1 processing; 3 of them are direct sales.

const WIDTHS = [375, 390, 768, 1280, 1440] as const;
const VENDOR = "vendeur@qa.test";
const PASSWORD = "Passw0rd!";

const SHOTS = join(__dirname, "..", "..", "docs", "captures", "v1-orders");
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });

async function signIn(page: Page, baseURL: string | undefined) {
  const response = await page.request.post("/api/auth/login", {
    data: { email: VENDOR, password: PASSWORD },
    headers: { Origin: baseURL ?? "" },
  });
  expect(response.ok(), `login: ${response.status()}`).toBe(true);
}

async function open(page: Page, baseURL: string | undefined, path: string, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await signIn(page, baseURL);
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

const table = (page: Page) => page.getByRole("region", { name: "Commandes" });
const rows = (page: Page) => table(page).locator("tbody tr");
const cards = (page: Page) => page.getByRole("list", { name: "Commandes" }).locator("> li");
const tab = (page: Page, name: RegExp) => page.getByRole("tab", { name });
const search = (page: Page) => page.getByRole("searchbox", { name: "Numéro, client ou téléphone" });
const tabBar = (page: Page) => page.getByRole("navigation", { name: "Navigation rapide" });
const dialog = (page: Page) => page.getByRole("alertdialog");

/** Nothing of `above` is covered by `below` (e.g. a button by the phone tab bar). */
async function expectNotCovered(above: Locator, below: Locator) {
  const [a, b] = await Promise.all([above.boundingBox(), below.boundingBox()]);
  expect(a, "element is rendered").not.toBeNull();
  expect(b, "obstacle is rendered").not.toBeNull();
  expect(a!.y + a!.height).toBeLessThanOrEqual(b!.y + 0.5);
}

async function downloadText(page: Page, trigger: () => Promise<void>) {
  const [download] = await Promise.all([page.waitForEvent("download"), trigger()]);
  return { name: download.suggestedFilename(), text: readFileSync(await download.path(), "utf8") };
}

// ─────────────────────────────────────────────────────────────
// List
// ─────────────────────────────────────────────────────────────
test.describe("orders list", () => {
  test("shows the server page, the real counters and paginates on the server", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders");

    await expect(page.getByRole("heading", { level: 1, name: "Commandes" })).toBeVisible();
    await expect(rows(page)).toHaveCount(25);
    await expect(rows(page).first()).toContainText("SU-2026-000068");
    await expect(page.getByText("68 commandes", { exact: true })).toBeVisible();

    // Counters come from the backend, one per status: canceled is not "the rest".
    await expect(tab(page, /^Toutes/)).toContainText("68");
    await expect(tab(page, /^Annulée/)).toContainText("15");
    await expect(tab(page, /^Livrée/)).toContainText("38");
    await expect(tab(page, /^Expédiée/)).toContainText("4");
    // A status outside the main tabs gets its tab as soon as it holds orders.
    await expect(tab(page, /^Retournée/)).toContainText("8");
    await expect(tab(page, /^Échouée/)).toHaveCount(0);

    await expect(page.getByText("1–25 sur 68 commandes")).toBeVisible();
    await page.getByRole("button", { name: "Page suivante" }).click();
    await expect(page.getByText("26–50 sur 68 commandes")).toBeVisible();
    await expect(page).toHaveURL(/page=2/);
    await expect(rows(page).first()).not.toContainText("SU-2026-000068");
  });

  test("searches on the server: finds an order that is on the last page", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders");
    await expect(rows(page)).toHaveCount(25);
    await expect(table(page)).not.toContainText("SU-2026-000001");

    const request = page.waitForRequest((candidate) => candidate.url().includes("sellers/orders?") && candidate.url().includes("search=Salimata"));
    await search(page).fill("Salimata");
    await search(page).press("Enter");
    await request;

    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("SU-2026-000001");
    await expect(rows(page).first()).toContainText("Salimata Kaboré");
    await expect(page.getByText("1 commande", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/q=Salimata/);

    await page.getByRole("button", { name: "Effacer la recherche" }).click();
    await expect(page.getByText("68 commandes", { exact: true })).toBeVisible();
  });

  test("says when nothing matches, and offers to clear", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders");
    await search(page).fill("aucune-commande-ainsi");
    await search(page).press("Enter");

    await expect(page.getByText("Aucune commande ne correspond")).toBeVisible();
    await page.getByRole("button", { name: "Tout afficher" }).last().click();
    await expect(rows(page)).toHaveCount(25);
  });

  test("filters by status tab and by origin, and keeps the state in the URL", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders");

    await tab(page, /^Annulée/).click();
    await expect(page.getByText("15 commandes", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/status=canceled/);
    await expect(rows(page)).toHaveCount(15);
    for (const row of await rows(page).all()) await expect(row).toContainText("Annulée");

    await tab(page, /^Toutes/).click();
    await page.getByLabel("Origine").selectOption("direct");
    await expect(page.getByText("3 commandes", { exact: true })).toBeVisible();
    for (const row of await rows(page).all()) await expect(row).toContainText("Vente directe");

    // Back from a detail page: same filter.
    await rows(page).first().getByRole("link").click();
    await expect(page.getByRole("heading", { level: 1, name: /^Commande SU-/ })).toBeVisible();
    await page.goBack();
    await expect(page.getByText("3 commandes", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Origine")).toHaveValue("direct");
  });

  test("sorts on the server by amount", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders");
    // The header can be clicked while the list still loads: wait for the rows it will sort.
    await expect(rows(page)).toHaveCount(25);
    const request = page.waitForRequest((candidate) => candidate.url().includes("sort=amount") && candidate.url().includes("direction=asc"));
    await table(page).getByRole("button", { name: "Montant" }).click();
    await request;
    await expect(page).toHaveURL(/sort=amount&dir=asc/);
    await expect(table(page).getByRole("columnheader", { name: "Montant" })).toHaveAttribute("aria-sort", "ascending");

    // Until the answer is drawn the table keeps the previous rows, or its loading rows: read it again until it is.
    await expect(async () => {
      const amounts = (await rows(page).locator("td:nth-last-child(2)").allTextContents()).map((text) => Number(text.replace(/[^\d]/g, "")));
      expect(amounts.length).toBe(25);
      expect(amounts).toEqual([...amounts].sort((a, b) => a - b));
    }).toPass({ timeout: 10_000 });
  });

  test("exports the filtered orders, then a selection, as CSV built by the server", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders");
    await tab(page, /^Annulée/).click();
    await expect(rows(page)).toHaveCount(15);

    const all = await downloadText(page, () => page.getByRole("button", { name: "Exporter en CSV" }).click());
    expect(all.name).toMatch(/^commandes-\d{4}-\d{2}-\d{2}\.csv$/);
    const lines = all.text.trim().split("\n");
    expect(lines[0]).toContain("Référence;Date;Client");
    // 15 canceled orders, although only this status is displayed.
    expect(lines).toHaveLength(16);

    await rows(page).nth(0).getByRole("checkbox").check();
    await rows(page).nth(1).getByRole("checkbox").check();
    await expect(page.getByText("2 sélectionnés", { exact: true })).toBeVisible();
    const selection = await downloadText(page, () => page.getByRole("button", { name: "Exporter la sélection" }).click());
    expect(selection.text.trim().split("\n")).toHaveLength(3);
  });

  test("confirms a pending order from the row menu and refreshes list and counters", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders");
    await tab(page, /^En attente/).click();
    await expect(rows(page)).toHaveCount(1);

    await page.getByRole("button", { name: "Actions pour la commande SU-2026-000061" }).click();
    await page.getByRole("menuitem", { name: "Confirmer la commande" }).click();
    await expect(dialog(page)).toContainText("Confirmée");
    await dialog(page).getByRole("button", { name: "Confirmer la commande" }).click();

    await expect(page.getByText("Commande SU-2026-000061 confirmée.")).toBeVisible();
    await expect(page.getByText("Aucune commande ne correspond")).toBeVisible();
    await expect(tab(page, /^En attente/)).toContainText("0");
    await expect(tab(page, /^Confirmée/)).toContainText("2");
  });

  test("offers no quick confirmation on an order that is not pending, and downloads its slip", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders");
    await page.getByRole("button", { name: "Actions pour la commande SU-2026-000068" }).click();
    await expect(page.getByRole("menuitem", { name: "Ouvrir la commande" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Confirmer la commande" })).toHaveCount(0);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("menuitem", { name: "Bon de livraison (PDF)" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("bon-livraison-SU-2026-000068.pdf");
  });

  test("shows an outage as an outage, never as an empty list, and recovers", async ({ page, baseURL }) => {
    await page.route("**/api/proxy/sellers/orders?**", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "SQLSTATE[08006]" }) }),
    );
    await open(page, baseURL, "/vendor/orders");

    await expect(page.getByText("Les commandes n'ont pas pu être chargées")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Aucune commande/)).toHaveCount(0);
    await expect(page.getByText(/SQLSTATE/)).toHaveCount(0);
    await shot(page, "list-error-1280");

    await page.unroute("**/api/proxy/sellers/orders?**");
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(rows(page)).toHaveCount(25);
  });

  for (const width of WIDTHS) {
    test(`is usable and accessible at ${width}px`, async ({ page, baseURL }) => {
      await open(page, baseURL, "/vendor/orders", width);
      const phone = width < 768;

      if (phone) {
        await expect(cards(page)).toHaveCount(25);
        const first = cards(page).first();
        // Reference, customer, amount, date, status and payment on the card.
        await expect(first).toContainText("SU-2026-000068");
        await expect(first).toContainText("FCFA");
        await expect(first).toContainText("Livrée");
        await expect(first).toContainText("Payée");
        await expect(first.getByRole("button", { name: /Actions pour la commande/ })).toBeVisible();
        const box = await first.getByRole("button", { name: /Actions pour la commande/ }).boundingBox();
        expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(44);
        await expect(page.getByRole("link", { name: "Nouvelle vente" })).toBeVisible();

        // Filters live in a bottom sheet; the export stays reachable.
        await page.getByRole("button", { name: "Filtres" }).click();
        await expect(page.getByRole("dialog", { name: "Filtres" })).toBeVisible();
        await page.getByRole("dialog", { name: "Filtres" }).getByLabel("Origine").selectOption("direct");
        await page.getByRole("button", { name: "Voir les résultats" }).click();
        await expect(cards(page)).toHaveCount(3);
        await page.getByRole("button", { name: "Plus d'actions" }).click();
        await expect(page.getByRole("menuitem", { name: "Exporter en CSV" })).toBeVisible();
        await page.keyboard.press("Escape");

        // The last control of the page clears the tab bar.
        const pager = page.getByRole("navigation", { name: "Pagination" });
        await pager.scrollIntoViewIfNeeded();
        await page.mouse.wheel(0, 4000);
        await expectNotCovered(pager, tabBar(page));
      } else {
        await expect(rows(page)).toHaveCount(25);
      }

      expect(await rootOverflow(page)).toBeLessThanOrEqual(0);
      expect(await blockingViolations(page)).toEqual([]);
      await shot(page, `list-${width}`);
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Detail
// ─────────────────────────────────────────────────────────────
const title = (page: Page, reference: string) => page.getByRole("heading", { level: 1, name: `Commande ${reference}` });
const header = (page: Page) => page.locator("main header").first();

async function confirmTransition(page: Page, label: string) {
  await page.getByRole("button", { name: label }).first().click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole("button", { name: label }).click();
  await expect(dialog(page)).toBeHidden();
}

test.describe("order detail", () => {
  test("walks a marketplace order through its workflow, one allowed step at a time", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/order-pending");
    await expect(title(page, "SU-2026-000061")).toBeVisible();
    await expect(header(page)).toContainText("En attente");
    await expect(header(page)).toContainText("Payée");
    await expect(page.getByText("Cette commande attend votre confirmation")).toBeVisible();
    // Only what the server allows on a pending order.
    await expect(page.getByRole("button", { name: /Marquer comme|Demander la livraison/ })).toHaveCount(0);

    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/sellers/orders/")) posts.push(new URL(request.url()).pathname);
    });

    await confirmTransition(page, "Confirmer la commande");
    await expect(page.getByText("Commande confirmée.")).toBeVisible();
    await expect(header(page)).toContainText("Confirmée");

    await confirmTransition(page, "Demander la livraison");
    await expect(header(page)).toContainText("En préparation");

    await confirmTransition(page, "Marquer comme expédiée");
    await expect(header(page)).toContainText("Expédiée");

    // Shipped marketplace order: the customer's code closes it, not the seller.
    await expect(page.getByRole("button", { name: "Marquer comme livrée" })).toHaveCount(0);
    await expect(page.getByText("Livraison en cours")).toBeVisible();
    await expect(page.getByText(/code de livraison/)).toBeVisible();

    expect(posts).toEqual([
      "/api/proxy/sellers/orders/order-pending/confirm",
      "/api/proxy/sellers/orders/order-pending/request-delivery",
      "/api/proxy/sellers/orders/order-pending/mark-shipped",
    ]);
  });

  test("lets the seller declare a direct sale delivered", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/order-shipped-direct");
    await expect(header(page)).toContainText("Vente directe");
    await expect(header(page)).toContainText("Paiement à la livraison");
    await expect(page.getByText("Appeler avant de passer")).toBeVisible();

    await confirmTransition(page, "Marquer comme livrée");
    await expect(page.getByText("Commande marquée comme livrée.")).toBeVisible();
    await expect(header(page)).toContainText("Livrée");
    await expect(page.getByRole("button", { name: "Annuler la commande" })).toHaveCount(0);
  });

  test("COD Mixte with an unpaid fee: shipped is not delivered, paid is not settled", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/order-shipped-mixte");
    await expect(header(page)).toContainText("Expédiée");
    await expect(header(page)).toContainText("Payée en partie");
    await expect(page.getByRole("button", { name: "Marquer comme livrée" })).toHaveCount(0);
    await expect(page.getByText("Expédiée, paiement du client en attente")).toBeVisible();

    const payment = page.locator("section", { has: page.getByRole("heading", { name: "Paiement" }) });
    await expect(payment).toContainText("Réglé");
    await expect(payment).toContainText("À régler");
    await expect(payment).toContainText("Produit à régler par le client");
    await shot(page, "detail-cod-mixte-1280");
  });

  test("shows the server's refusal when the order changed behind the page", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/order-stale");
    await page.getByRole("button", { name: "Marquer comme livrée" }).click();
    await dialog(page).getByRole("button", { name: "Marquer comme livrée" }).click();

    await expect(page.getByText(/frais de livraison et les frais produit doivent être réglés/)).toBeVisible();
    await expect(page.getByText(/SUGU-/)).toHaveCount(0);
    // The dialog stays open for a retry; the status has not moved.
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Annuler" }).click();
    await expect(header(page)).toContainText("Expédiée");
  });

  test("cancels only after an explicit confirmation", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/order-confirmed");
    await page.getByRole("button", { name: "Annuler la commande" }).click();
    await expect(dialog(page)).toContainText("définitive");
    await dialog(page).getByRole("button", { name: "Garder la commande" }).click();
    await expect(header(page)).toContainText("Confirmée");

    await confirmTransition(page, "Annuler la commande");
    await expect(page.getByText("Commande annulée.")).toBeVisible();
    await expect(header(page)).toContainText("Annulée");
    await expect(page.getByRole("heading", { name: "Autres actions" })).toHaveCount(0);
  });

  test("does not send a transition twice on a double activation", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/order-pending");
    let posts = 0;
    await page.route("**/api/proxy/sellers/orders/order-pending/confirm", async (route) => {
      posts += 1;
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });

    await page.getByRole("button", { name: "Confirmer la commande" }).click();
    const confirm = dialog(page).getByRole("button", { name: "Confirmer la commande" });
    await confirm.click();
    await expect(confirm).toBeDisabled();
    await confirm.click({ force: true }).catch(() => undefined);
    await expect(dialog(page)).toBeHidden();
    expect(posts).toBe(1);
  });

  test("handles the courier handoff: pickup code, then confirmation per item", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/order-processing");
    await expect(page.getByRole("heading", { name: "Code de collecte" })).toBeVisible();
    await expect(page.getByText("4821")).toBeVisible();
    await expect(page.getByText("Moussa Kaboré")).toBeVisible();
    await expect(page.getByText("Ramassage à faire")).toBeVisible();

    await page.getByRole("button", { name: /Confirmer la remise au coursier/ }).click();
    await expect(page.getByText("Remise au coursier confirmée", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Confirmer la remise au coursier/ })).toHaveCount(0);
  });

  test("produces the documents: delivery slip PDF and invoice link", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/order-pending");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Bon de livraison (PDF)" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("bon-livraison-SU-2026-000061.pdf");
    expect(readFileSync(await download.path()).subarray(0, 5).toString()).toBe("%PDF-");

    await page.getByRole("button", { name: "Copier le lien de la facture" }).click();
    await expect(page.getByText("Lien de la facture copié.")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/invoices\/tok-order-pending$/);

    await expect(page.getByRole("link", { name: "Appeler" })).toHaveAttribute("href", /^tel:\+226/);
    await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/226\d+$/);
  });

  test("shows stored facts only: amounts in francs, no invented carrier, delay or loyalty", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/order-counter-sale");
    const main = page.locator("main");

    // order 68: 3 × 8 750 = 26 250, discount 500, total 25 750.
    const amounts = page.locator("section", { has: page.getByRole("heading", { name: "Montants" }) });
    await expect(amounts).toContainText(/26\s250\sFCFA/);
    await expect(amounts).toContainText(/-500\sFCFA/);
    await expect(amounts).toContainText(/25\s750\sFCFA/);
    await expect(amounts).not.toContainText("Livraison");

    await expect(main).toContainText("Vente au comptoir");
    for (const fiction of ["Sugu Express", "2-4", "Mobile Money", "fidèle", "Burkina Faso", "Standard", "%"]) {
      await expect(main).not.toContainText(fiction);
    }
  });

  test("answers « introuvable » for an unknown order and for another seller's order alike", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/order-foreign");
    await expect(page.getByText("Commande introuvable")).toBeVisible();
    await expect(page.locator("main")).not.toContainText("SU-2026-009999");

    await page.goto("/vendor/orders/does-not-exist");
    await expect(page.getByText("Commande introuvable")).toBeVisible();
    await page.getByRole("link", { name: "Retour aux commandes" }).click();
    await expect(page).toHaveURL(/\/vendor\/orders$/);
  });

  test("tells a refusal from an outage, and retries the outage", async ({ page, baseURL }) => {
    await page.route("**/api/proxy/sellers/orders/order-pending", (route) =>
      route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Accès non autorisé à cette commande." }) }),
    );
    await open(page, baseURL, "/vendor/orders/order-pending");
    await expect(page.getByText("Accès refusé")).toBeVisible();
    await expect(page.getByText("Accès non autorisé à cette commande.")).toBeVisible();

    await page.unroute("**/api/proxy/sellers/orders/order-pending");
    await page.route("**/api/proxy/sellers/orders/order-confirmed", (route) =>
      route.fulfill({ status: 503, contentType: "text/html", body: "<h1>Bad gateway</h1>" }),
    );
    await page.goto("/vendor/orders/order-confirmed");
    await expect(page.getByText("La commande n'a pas pu être chargée")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Commande introuvable")).toHaveCount(0);

    await page.unroute("**/api/proxy/sellers/orders/order-confirmed");
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(title(page, "SU-2026-000062")).toBeVisible();
  });

  for (const width of WIDTHS) {
    test(`is usable and accessible at ${width}px`, async ({ page, baseURL }) => {
      await open(page, baseURL, "/vendor/orders/order-processing", width);
      await expect(title(page, "SU-2026-000063")).toBeVisible();

      const primary = page.getByRole("button", { name: "Marquer comme expédiée" }).first();
      await expect(primary).toBeVisible();

      if (width < 1024) {
        // Priority order in one column: customer, then items, then amounts.
        const y = async (name: string) => (await page.getByRole("heading", { name, exact: true }).boundingBox())!.y;
        expect(await y("Client")).toBeLessThan(await y("Articles"));
        expect(await y("Articles")).toBeLessThan(await y("Montants"));
        expect(await y("Montants")).toBeLessThan(await y("Livraison"));
      }

      if (width < 768) {
        const box = await primary.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        // The confirmation dialog fits the screen.
        await primary.click();
        // Polled: the panel is measured once its opening animation has settled.
        await expect
          .poll(async () => {
            const panel = await dialog(page).boundingBox();
            return panel!.x >= 0 && panel!.x + panel!.width <= width + 0.5 && panel!.y + panel!.height <= 900 + 0.5;
          })
          .toBe(true);
        expect(await blockingViolations(page)).toEqual([]);
        await dialog(page).getByRole("button", { name: "Annuler" }).click();

        // The last action of the page clears the tab bar.
        const cancel = page.getByRole("button", { name: "Annuler la commande" });
        await cancel.scrollIntoViewIfNeeded();
        await page.mouse.wheel(0, 6000);
        await expectNotCovered(cancel, tabBar(page));
      }

      expect(await rootOverflow(page)).toBeLessThanOrEqual(0);
      expect(await blockingViolations(page)).toEqual([]);
      await shot(page, `detail-${width}`);
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Manual sale
// ─────────────────────────────────────────────────────────────
const next = (page: Page) => page.getByRole("button", { name: "Suivant" });
const save = (page: Page) => page.getByRole("button", { name: "Enregistrer la vente" });

async function addProduct(page: Page, query: string, name: string) {
  await page.getByPlaceholder("Nom ou référence du produit").fill(query);
  await page.getByRole("button", { name: `Ajouter ${name}` }).click();
}

async function fillNewCustomer(page: Page, phone = "70112233") {
  await page.getByRole("radio", { name: /Nouveau client/ }).check();
  await page.getByLabel("Nom complet").fill("Aminata Sawadogo");
  await page.getByLabel("Téléphone").fill(phone);
}

test.describe("manual sale", () => {
  test("records a counter sale with a discount, amounts in francs end to end", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/new");
    await expect(page.getByRole("heading", { level: 1, name: "Nouvelle vente" })).toBeVisible();

    await addProduct(page, "pagne", "Pagne tissé Faso Dan Fani");
    await expect(page.getByRole("button", { name: "Ajouter Pagne tissé Faso Dan Fani" })).toBeDisabled();
    await page.getByRole("button", { name: "Ajouter un Pagne tissé Faso Dan Fani" }).click();
    await page.getByLabel("Remise", { exact: true }).fill("1500");

    const summary = page.locator("section", { has: page.getByRole("heading", { name: "Montant", exact: true }) });
    await expect(summary).toContainText(/15\s000\sFCFA/);
    await expect(summary).toContainText(/13\s500\sFCFA/);

    await next(page).click();
    await fillNewCustomer(page);
    await next(page).click();
    await expect(page.getByRole("radio", { name: /Vente au comptoir/ })).toBeChecked();
    await next(page).click();

    await expect(page.locator("main")).toContainText("Commande livrée, paiement encaissé");
    await expect(page.locator("main")).toContainText(/13\s500\sFCFA/);
    await shot(page, "sale-review-1280");

    const [request] = await Promise.all([
      page.waitForRequest((candidate) => candidate.method() === "POST" && candidate.url().endsWith("/sellers/sales")),
      save(page).click(),
    ]);
    const body = request.postDataJSON();
    expect(body).toMatchObject({
      products: [{ productId: "prod-pagne", quantity: 2, unitPrice: 7500 }],
      subtotal: 15000,
      discount: 1500,
      total: 13500,
      currency: "XOF",
      delivery: { method: "pickup" },
      client: { fullName: "Aminata Sawadogo", phone: "70112233" },
    });
    expect(request.headers()["idempotency-key"]).toBeTruthy();

    // Redirected to the new order, which carries the same figures.
    await expect(page).toHaveURL(/\/vendor\/orders\/order-sale-100$/);
    await expect(page.getByText("Vente SU-2026-000100 enregistrée.")).toBeVisible();
    await expect(title(page, "SU-2026-000100")).toBeVisible();
    await expect(header(page)).toContainText("Livrée");
    await expect(header(page)).toContainText("Payée");
    await expect(header(page)).toContainText("Vente directe");
    const amounts = page.locator("section", { has: page.getByRole("heading", { name: "Montants" }) });
    await expect(amounts).toContainText(/-1\s500\sFCFA/);
    await expect(amounts).toContainText(/13\s500\sFCFA/);
  });

  test("records a sale delivered by an agency, to an existing customer", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/new");
    await addProduct(page, "savon", "Savon au beurre de karité");
    await next(page).click();

    await page.getByPlaceholder("Nom, téléphone ou e-mail").fill("awa");
    await page.getByRole("button", { name: "Choisir Awa Traoré" }).click();
    await expect(page.getByText("+22670112233")).toBeVisible();
    await next(page).click();

    await page.getByRole("radio", { name: /Livraison par une agence/ }).check();
    const agency = page.getByLabel("Agence de livraison");
    await expect(agency.locator("option")).toHaveText(["Choisir une agence", "Faso Express", "Ouaga Livraison"]);
    await agency.selectOption({ label: "Faso Express" });
    await page.getByLabel("Adresse de livraison").fill("Secteur 15, rue 15.42");
    await page.getByLabel("Ville").fill("Ouagadougou");
    await page.getByLabel("Note").fill("Appeler avant de passer");
    await next(page).click();

    await expect(page.locator("main")).toContainText("Commande confirmée, paiement à la livraison");
    const [request] = await Promise.all([
      page.waitForRequest((candidate) => candidate.method() === "POST" && candidate.url().endsWith("/sellers/sales")),
      save(page).click(),
    ]);
    expect(request.postDataJSON()).toMatchObject({
      customerId: "cust-1",
      delivery: { method: "shipping", provider: "21", address: { line1: "Secteur 15, rue 15.42", city: "Ouagadougou" } },
      note: "Appeler avant de passer",
      subtotal: 1250,
      total: 1250,
    });

    await expect(header(page)).toContainText("Confirmée");
    await expect(header(page)).toContainText("Paiement à la livraison");
    const delivery = page.locator("section", { has: page.getByRole("heading", { name: "Livraison", exact: true }) });
    await expect(delivery).toContainText("Faso Express");
    await expect(delivery).toContainText("Secteur 15, rue 15.42");
    await expect(delivery).toContainText("Appeler avant de passer");
    // A shipment exists: the next step is shipping, never "delivered".
    await expect(page.getByRole("button", { name: "Marquer comme expédiée" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Marquer comme livrée" })).toHaveCount(0);
  });

  test("validates each step and respects the stock", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/new");

    await next(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "1 champ à corriger" })).toContainText("Ajoutez au moins un article.");

    await page.getByPlaceholder("Nom ou référence du produit").fill("panier");
    await expect(page.getByText("Rupture de stock")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ajouter Panier tressé" })).toBeDisabled();

    await addProduct(page, "savon", "Savon au beurre de karité");
    const more = page.getByRole("button", { name: "Ajouter un Savon au beurre de karité" });
    await more.click();
    await more.click();
    await expect(more).toBeDisabled(); // 3 in stock
    await page.getByLabel("Remise", { exact: true }).fill("9999");
    await next(page).click();
    await expect(page.getByText("La remise ne peut pas dépasser le sous-total.").first()).toBeVisible();
    await page.getByLabel("Remise", { exact: true }).fill("");
    await next(page).click();

    await next(page).click();
    await expect(page.getByText("Choisissez un client.").first()).toBeVisible();
    await page.getByRole("radio", { name: /Nouveau client/ }).check();
    await next(page).click();
    await expect(page.getByText("Indiquez le nom du client.").first()).toBeVisible();
    await expect(page.getByText(/au moins 8 chiffres/).first()).toBeVisible();
    await shot(page, "sale-validation-1280");
    await fillNewCustomer(page);
    await next(page).click();

    await page.getByRole("radio", { name: /Livraison par une agence/ }).check();
    await next(page).click();
    await expect(page.getByText("Choisissez une agence de livraison.").first()).toBeVisible();
    await expect(page.getByText("Indiquez l'adresse de livraison.").first()).toBeVisible();
    await expect(save(page)).toHaveCount(0);
  });

  test("shows a server refusal, keeps the form, and retries with the same idempotency key", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/new");
    await addProduct(page, "miel", "Miel de Fada");
    await next(page).click();
    await fillNewCustomer(page);
    await next(page).click();
    await next(page).click();

    const keys: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/sellers/sales")) keys.push(request.headers()["idempotency-key"]);
    });

    await save(page).click();
    const refusal = page.getByRole("alert").filter({ hasText: "La vente n'a pas été enregistrée" });
    await expect(refusal).toContainText("Stock insuffisant pour 'Miel de Fada'");
    await expect(page).toHaveURL(/\/vendor\/orders\/new$/);
    await expect(save(page)).toBeEnabled();

    await save(page).click();
    await expect.poll(() => keys.length).toBe(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  test("brings a server field error back to its field and step", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/new");
    await addProduct(page, "savon", "Savon au beurre de karité");
    await next(page).click();
    await fillNewCustomer(page, "701122334"); // 9 digits: accepted here, refused by the server
    await next(page).click();
    await next(page).click();
    await save(page).click();

    await expect(page.getByLabel("Téléphone")).toBeVisible();
    await expect(page.getByText(/doit comporter exactement 8 chiffres/).first()).toBeVisible();
    await expect(page.getByLabel("Téléphone")).toHaveAttribute("aria-invalid", "true");
  });

  test("submits once, even on a double activation", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/new");
    await addProduct(page, "savon", "Savon au beurre de karité");
    await next(page).click();
    await fillNewCustomer(page);
    await next(page).click();
    await next(page).click();

    let posts = 0;
    await page.route("**/api/proxy/sellers/sales", async (route) => {
      posts += 1;
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });
    await save(page).click();
    await expect(save(page)).toBeDisabled();
    await save(page).click({ force: true }).catch(() => undefined);
    await expect(page).toHaveURL(/\/vendor\/orders\/order-sale-/);
    expect(posts).toBe(1);
  });

  test("shows an agency outage as an outage, with a retry", async ({ page, baseURL }) => {
    await page.route("**/api/proxy/agencies?**", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "boom" }) }),
    );
    await open(page, baseURL, "/vendor/orders/new");
    await addProduct(page, "savon", "Savon au beurre de karité");
    await next(page).click();
    await fillNewCustomer(page);
    await next(page).click();
    await page.getByRole("radio", { name: /Livraison par une agence/ }).check();

    await expect(page.getByText("Les agences n'ont pas pu être chargées")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Aucune agence de livraison disponible")).toHaveCount(0);

    await page.unroute("**/api/proxy/agencies?**");
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.getByLabel("Agence de livraison")).toBeVisible();
  });

  for (const width of WIDTHS) {
    test(`is usable and accessible at ${width}px`, async ({ page, baseURL }) => {
      await open(page, baseURL, "/vendor/orders/new", width);
      await addProduct(page, "pagne", "Pagne tissé Faso Dan Fani");
      await expect(page.locator("main")).toContainText(/7\s500\sFCFA/);

      if (width < 768) {
        // The step actions stay above the tab bar, and are thumb-sized.
        await expectNotCovered(next(page), tabBar(page));
        const box = await next(page).boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        await expect(next(page)).toBeInViewport();
      }
      expect(await rootOverflow(page)).toBeLessThanOrEqual(0);
      expect(await blockingViolations(page)).toEqual([]);
      await shot(page, `sale-items-${width}`);

      await next(page).click();
      await fillNewCustomer(page);
      expect(await blockingViolations(page)).toEqual([]);
      await shot(page, `sale-customer-${width}`);
      await next(page).click();
      await page.getByRole("radio", { name: /Livraison par une agence/ }).check();
      await expect(page.getByLabel("Agence de livraison")).toBeVisible();
      expect(await rootOverflow(page)).toBeLessThanOrEqual(0);
      expect(await blockingViolations(page)).toEqual([]);
      await shot(page, `sale-delivery-${width}`);
    });
  }
});
