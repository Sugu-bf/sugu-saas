import { expect, test, type Page } from "@playwright/test";
import { BASE, api, open, plain, settled, signIn, table, textOf, toast } from "./helpers";

// What a seller does on the Sugu Box screens, on a desktop: read the figures,
// narrow a list, turn its pages, open a document, export a file. Every list
// is searched, filtered and paged by the server: the specs check both what
// is drawn and what was asked.

const lines = (page: Page, name: string) => table(page, name).locator("tbody tr");
const figure = (page: Page, name: string | RegExp) => page.locator("main").getByRole("button", { name });
const filter = (page: Page, name: string) => page.locator("main").getByRole("combobox", { name });
const search = (page: Page) => page.locator("main").getByRole("searchbox");

/** Types in the search field and waits for the request that carries it. */
async function searchFor(page: Page, list: string, term: string) {
  const asked = page.waitForRequest((request) => request.url().includes(`/board/${list}`) && new URL(request.url()).searchParams.get("search") === term);
  await search(page).fill(term);
  await asked;
  await settled(page);
}

test.describe("overview", () => {
  test("shows the figures the server counts, each with the list behind it", async ({ page, baseURL }) => {
    await open(page, baseURL);
    const { body } = await api(page, "summary");
    const figures = page.getByRole("region", { name: "Chiffres clés de Sugu Box" });
    const text = await textOf(figures);

    for (const value of [body.data.stock_units, body.data.received_today_units, body.data.outbound_to_prepare, body.data.orders_this_month, body.data.alerts]) {
      expect(text).toContain(String(value));
    }
    expect(body.data.stock_units).toBe(371);

    await expect(lines(page, "Réceptions récentes")).toHaveCount(5);
    await expect(lines(page, "Expéditions récentes")).toHaveCount(5);
    await expect(lines(page, "Alertes stock")).toHaveCount(3);
    await expect(page.getByRole("region", { name: "Activité récente" }).getByRole("listitem")).toHaveCount(5);

    await figures.getByRole("link", { name: "Voir les alertes" }).click();
    await expect(page).toHaveURL(/\/stock\?etat=alertes$/);
    await expect(lines(page, "Stock en entrepôt Sugu Box")).toHaveCount(3);
  });

  test("opens a reception and an expedition from its panels", async ({ page, baseURL }) => {
    await open(page, baseURL);
    await lines(page, "Réceptions récentes").first().getByRole("link").click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Réception REC-2026-00124");
    await page.getByRole("link", { name: "Réceptions" }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Réceptions");

    await page.goto(BASE);
    await page.getByRole("link", { name: "Voir toutes les expéditions" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Expéditions");
  });
});

test.describe("stock", () => {
  test("is searched, filtered and ordered by the server", async ({ page, baseURL }) => {
    await open(page, baseURL, "/stock");
    const list = () => lines(page, "Stock en entrepôt Sugu Box");
    await expect(list()).toHaveCount(8);

    const baskets = list().filter({ hasText: "Baskets urbaines" });
    await expect(baskets).toContainText("A-01-03");
    expect(plain(await baskets.innerText())).toMatch(/40\s+12\s+52/);

    await searchFor(page, "stock", "mug");
    await expect(list()).toHaveCount(1);
    await expect(page).toHaveURL(/q=mug/);
    await search(page).fill("");
    await expect(list()).toHaveCount(8);

    await filter(page, "Statut du stock").selectOption({ label: "Rupture" });
    await expect(list()).toHaveCount(1);
    await expect(list()).toContainText("Sérum hydratant");
    await expect(list().locator('[data-status="out_of_stock"]')).toBeVisible();

    // The filter is in the address: a reload keeps it.
    await page.reload();
    await expect(list()).toHaveCount(1);
    await filter(page, "Statut du stock").selectOption({ label: "Tous" });

    const sorted = page.waitForRequest((request) => new URL(request.url()).searchParams.get("sort") === "-available");
    await filter(page, "Trier par").selectOption({ label: "Disponible décroissant" });
    await sorted;
    await expect(list().first()).toContainText("Mug Sugu");

    await filter(page, "Entrepôt").selectOption({ label: "Sugu Bobo Nord" });
    await expect(list()).toHaveCount(2);
  });

  test("says nothing matches, and gives the whole list back", async ({ page, baseURL }) => {
    await open(page, baseURL, "/stock");
    await searchFor(page, "stock", "introuvable");
    await expect(page.getByText("Aucun article ne correspond")).toBeVisible();
    await page.getByRole("button", { name: "Tout afficher" }).click();
    await expect(lines(page, "Stock en entrepôt Sugu Box")).toHaveCount(8);
    await expect(search(page)).toHaveValue("");
  });

  test("opens the journal of an article, and exports the list as the server filters it", async ({ page, baseURL }) => {
    await open(page, baseURL, "/stock?etat=alertes");
    const exported = page.waitForRequest((request) => request.url().includes("/board/stock/export"));
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exporter CSV" }).click();
    expect(new URL((await exported).url()).searchParams.get("state")).toBe("alerts");
    expect((await download).suggestedFilename()).toMatch(/^sugu-box-stock-\d{4}-\d{2}-\d{2}\.csv$/);
    await expect(toast(page, "Le fichier du stock a été téléchargé.")).toBeVisible();

    await page.getByRole("button", { name: "Voir les mouvements de Sac en toile" }).click();
    await expect(page).toHaveURL(/\/movements\?q=SKU005$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mouvements");
    await expect(lines(page, "Mouvements de stock").first()).toContainText("Sac en toile");
  });
});

test.describe("receptions", () => {
  test("are counted, filtered by a figure, searched and paged by the server", async ({ page, baseURL }) => {
    await open(page, baseURL, "/inbound");
    const list = () => lines(page, "Réceptions");
    await expect(list()).toHaveCount(10);
    await expect(page.getByText("Affichage de 1 à 10 sur 15")).toBeVisible();

    const { body } = await api(page, "inbound");
    expect(body.counts).toEqual({ pending: 1, in_progress: 1, completed_last_30_days: 2 });

    await figure(page, /En attente/).click();
    await expect(figure(page, /En attente/)).toHaveAttribute("aria-pressed", "true");
    await expect(list()).toHaveCount(1);
    await expect(list()).toContainText("REC-2026-00125");
    await expect(page).toHaveURL(/statut=en-attente/);
    await figure(page, /En attente/).click();
    await expect(list()).toHaveCount(10);

    await page.getByRole("button", { name: "Page 2" }).click();
    await expect(list()).toHaveCount(5);
    await expect(page).toHaveURL(/page=2/);

    // A search starts again from the first page, over the whole list.
    await searchFor(page, "inbound", "lunettes");
    await expect(page).not.toHaveURL(/page=2/);
    await expect(list()).toHaveCount(2);
    await search(page).fill("");

    await filter(page, "Statut").selectOption({ label: "Annulée" });
    await expect(list()).toHaveCount(1);
    await expect(list().locator('[data-status="cancelled"]')).toBeVisible();
  });

  test("are ordered by the day they are expected, by the server", async ({ page, baseURL }) => {
    await open(page, baseURL, "/inbound");
    const asked = page.waitForRequest((request) => new URL(request.url()).searchParams.get("sort") === "expected_at");
    await table(page, "Réceptions").getByRole("button", { name: /Date prévue/ }).click();
    await asked;
    await settled(page);
    await expect(page).toHaveURL(/tri=prevue/);
    await expect(lines(page, "Réceptions").first()).toContainText("REC-2026-00101");
  });

  test("a range that ends before it starts is said, not sent", async ({ page, baseURL }) => {
    await open(page, baseURL, "/inbound?du=2026-10-10&au=2026-10-01");
    await expect(page.locator("main").getByText("La date de fin est avant la date de début.")).toBeVisible();
    await expect(lines(page, "Réceptions")).toHaveCount(10);
  });

  test("the page of a reception says what was checked, line by line", async ({ page, baseURL }) => {
    await open(page, baseURL, "/inbound?q=REC-2026-00121");
    await page.getByRole("link", { name: "Voir la réception REC-2026-00121" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Réception REC-2026-00121");
    await expect(page.locator("main").locator('[data-status="completed"]').first()).toBeVisible();

    const steps = page.getByRole("list", { name: "Étapes de la réception" });
    await expect(steps.getByRole("listitem")).toHaveCount(4);
    await expect(steps.getByRole("listitem").last()).toContainText("fait");

    const rows = lines(page, "Articles de la réception");
    await expect(rows).toHaveCount(3);
    await expect(rows.filter({ hasText: "Sac en toile" })).toContainText("Écart (−2)");
    await expect(rows.filter({ hasText: "Mug Sugu" })).toContainText("Conforme");
    await expect(page.locator("main")).toContainText("Réception partielle pour le sac en toile");

    let printed = 0;
    await page.exposeFunction("__printed", () => (printed += 1));
    await page.evaluate(() => (window.print = () => void (window as unknown as { __printed: () => void }).__printed()));
    await page.getByRole("button", { name: "Imprimer" }).click();
    await expect.poll(() => printed).toBe(1);
  });

  test("a reception that is not the store's is not found", async ({ page, baseURL }) => {
    await open(page, baseURL, "/inbound/inb-of-another-store");
    await expect(page.getByText("Réception introuvable")).toBeVisible();
    await page.getByRole("link", { name: "Retour aux réceptions" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Réceptions");
  });
});

test.describe("expeditions", () => {
  test("are counted, filtered by figure, city and order number", async ({ page, baseURL }) => {
    await open(page, baseURL, "/outbound");
    const list = () => lines(page, "Expéditions");
    await expect(list()).toHaveCount(10);

    const { body } = await api(page, "outbound");
    expect(body.counts).toEqual({ to_prepare: 2, packed: 2, shipped: 8, cancelled: 1 });

    const asked = page.waitForRequest((request) => new URL(request.url()).searchParams.get("status") === "to_prepare");
    await figure(page, /À préparer/).click();
    await asked;
    await expect(list()).toHaveCount(2);
    await expect(list().locator('[data-status="pending"]')).toHaveCount(1);
    await expect(list().locator('[data-status="picking"]')).toHaveCount(1);
    await figure(page, /À préparer/).click();

    await filter(page, "Destination").selectOption({ label: "Koudougou" });
    await expect(list()).not.toHaveCount(10);
    for (const row of await list().all()) await expect(row).toContainText("Koudougou");
    await filter(page, "Destination").selectOption({ label: "Toutes les destinations" });

    await searchFor(page, "outbound", "SU-2026-004585");
    await expect(list()).toHaveCount(1);
    await expect(list()).toContainText("EXP-2026-00085");
    await expect(list().getByRole("link", { name: "SU-2026-004585" })).toHaveAttribute("href", "/vendor/orders/order-85");
  });

  test("the page of an expedition follows it, and opens the order it serves", async ({ page, baseURL, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await open(page, baseURL, "/outbound/out-85");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Expédition EXP-2026-00085");
    await expect(page.getByRole("heading", { level: 2, name: "Prête à expédier" })).toBeVisible();

    const steps = page.getByRole("list", { name: "Étapes de l'expédition" }).getByRole("listitem");
    await expect(steps).toHaveCount(4);
    await expect(steps.nth(2)).toContainText("en cours");
    await expect(steps.nth(3)).toContainText("à venir");

    const rows = lines(page, "Articles à expédier");
    await expect(rows).toHaveCount(3);
    await expect(rows.first()).toContainText("2 / 2");
    await expect(rows.first()).toContainText("Préparé");

    await expect(page.locator("main").getByRole("link", { name: "SU-2026-004585" })).toHaveAttribute("href", "/vendor/orders/order-85");
    await expect(page.locator("main")).toContainText("Mamadou Diop");

    await page.getByRole("button", { name: "Copier le lien" }).click();
    await expect(toast(page, "Le lien de l'expédition est copié.")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("/vendor/sugubox/outbound/out-85");
  });

  test("a cancelled expedition says so, and one that is not the store's is not found", async ({ page, baseURL }) => {
    await open(page, baseURL, "/outbound/out-82");
    await expect(page.getByRole("heading", { level: 2, name: "Annulée" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Étapes de l'expédition" })).toHaveCount(0);

    await page.goto(`${BASE}/outbound/out-of-another-store`);
    await expect(page.getByText("Expédition introuvable")).toBeVisible();
  });
});

test.describe("movements", () => {
  test("are totalled per type, and a figure filters the journal", async ({ page, baseURL }) => {
    await open(page, baseURL, "/movements");
    const list = () => lines(page, "Mouvements de stock");
    await expect(list()).toHaveCount(25);
    await expect(page.getByText("Affichage de 1 à 25 sur 50")).toBeVisible();

    const { body } = await api(page, "movements");
    const totals = await textOf(page.getByRole("region", { name: "Mouvements par type" }));
    for (const type of ["inbound", "outbound", "adjustment", "transfer"]) expect(totals).toContain(String(body.totals[type].count));
    expect(totals).toContain("+419 articles");
    expect(totals).toContain("10 articles déplacés");

    await figure(page, /Transferts/).click();
    await expect(list()).toHaveCount(2);
    await expect(page).toHaveURL(/type=transferts/);
    // Before and after are those of the bin, as the server computed them.
    const out = list().filter({ hasText: "A-01-07" });
    expect(plain(await out.innerText())).toMatch(/−10\s+29\s+19/);
    await expect(out).toContainText("Fatou D.");
    await expect(out).toContainText("Transfert entre casiers");
  });

  test("are filtered by who moved the stock, and link to their document", async ({ page, baseURL }) => {
    await open(page, baseURL, "/movements");
    const list = () => lines(page, "Mouvements de stock");
    const asked = page.waitForRequest((request) => new URL(request.url()).searchParams.get("user_id") === "user-aminata");
    await filter(page, "Utilisateur").selectOption({ label: "Aminata S." });
    await asked;
    await settled(page);
    for (const row of await list().all()) await expect(row).toContainText("Aminata S.");

    await list().first().getByRole("link", { name: "REC-2026-00124" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Réception REC-2026-00124");
  });

  test("are paged and exported with the filters of the screen", async ({ page, baseURL }) => {
    await open(page, baseURL, "/movements?type=sorties");
    await expect(page.getByText(/sur 23/)).toBeVisible();

    const exported = page.waitForRequest((request) => request.url().includes("/board/movements/export"));
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exporter" }).click();
    expect(new URL((await exported).url()).searchParams.get("type")).toBe("outbound");
    expect((await download).suggestedFilename()).toMatch(/^sugu-box-mouvements-/);
  });
});

test.describe("failures and permissions", () => {
  test("a failure is said as one, never drawn as an empty list, and a retry recovers", async ({ page, baseURL }) => {
    await page.route("**/api/proxy/sellers/sugubox/board/inbound**", (route) => route.fulfill({ status: 500, json: { message: "Server Error" } }));
    await open(page, baseURL, "/inbound");
    // The HTTP client asks a failing read again before giving up: the failure is said once it has.
    await expect(page.locator("main").getByRole("alert")).toContainText("Chargement impossible", { timeout: 30_000 });
    await expect(page.getByText("Aucune réception")).toHaveCount(0);

    await page.unroute("**/api/proxy/sellers/sugubox/board/inbound**");
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(lines(page, "Réceptions")).toHaveCount(10);
  });

  test("an answer that is not the agreed one is a failure, not a page that breaks", async ({ page, baseURL }) => {
    await page.route("**/api/proxy/sellers/sugubox/board/summary", (route) => route.fulfill({ json: { success: true, data: [] } }));
    await open(page, baseURL);
    await expect(page.locator("main").getByRole("alert")).toContainText("Chargement impossible");
    await expect(page.getByText("Cette page a rencontré un problème")).toHaveCount(0);
  });

  test("a store with nothing in the warehouse reads so on every list", async ({ page, baseURL }) => {
    const empty = { data: [], current_page: 1, last_page: 1, per_page: 25, total: 0 };
    await page.route("**/api/proxy/sellers/sugubox/board/stock**", (route) => route.fulfill({ json: { success: true, data: empty } }));
    await page.route("**/api/proxy/sellers/sugubox/board/inbound**", (route) => route.fulfill({ json: { success: true, data: empty, counts: { pending: 0, in_progress: 0, completed_last_30_days: 0 } } }));
    await page.route("**/api/proxy/sellers/sugubox/board/outbound**", (route) => route.fulfill({ json: { success: true, data: empty, counts: { to_prepare: 0, packed: 0, shipped: 0, cancelled: 0 } } }));
    const none = { count: 0, units: 0 };
    await page.route("**/api/proxy/sellers/sugubox/board/movements**", (route) => route.fulfill({ json: { success: true, data: empty, totals: { inbound: none, outbound: none, adjustment: none, transfer: none } } }));

    await open(page, baseURL, "/stock");
    await expect(page.getByText("Aucun stock en entrepôt")).toBeVisible();
    await expect(page.getByRole("button", { name: "Exporter CSV" })).toBeDisabled();
    for (const [path, words] of [["/inbound", "Aucune réception"], ["/outbound", "Aucune expédition"], ["/movements", "Aucun mouvement"]] as const) {
      await page.goto(`${BASE}${path}`);
      await expect(page.locator("main").getByText(words, { exact: true })).toBeVisible();
    }
  });

  test("the screens offer no action the warehouse alone can take", async ({ page, baseURL }) => {
    await open(page, baseURL, "/inbound/inb-124");
    for (const path of ["/inbound/inb-124", "/outbound/out-86", "/stock", "/inbound", "/outbound"]) {
      await page.goto(`${BASE}${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      for (const name of [/Nouvelle réception/, /Nouvelle expédition/, /Ajuster le stock/, /Valider la réception/, /Marquer comme expédiée/, /Scanner/, /Ajouter une note/]) {
        await expect(page.getByRole("button", { name })).toHaveCount(0);
        await expect(page.getByRole("link", { name })).toHaveCount(0);
      }
    }
  });

  test("the server refuses a filter it does not know, and another profile", async ({ page, baseURL }) => {
    await signIn(page, baseURL);
    expect((await api(page, "inbound?status=lost")).status).toBe(422);
    expect((await api(page, "movements?date_from=hier")).status).toBe(422);
    expect((await api(page, "outbound/out-of-another-store")).status).toBe(404);

    await signIn(page, baseURL, "agence@qa.test");
    expect((await api(page, "summary")).status).toBe(403);
    await page.goto(BASE);
    await expect(page).toHaveURL(/\/agency\/dashboard/);
  });

  test("without a session, the screens send to the sign-in page", async ({ page }) => {
    await page.goto(`${BASE}/stock`);
    await expect(page).toHaveURL(/\/login/);
    expect((await api(page, "summary")).status).toBe(401);
  });
});
