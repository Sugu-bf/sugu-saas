import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Acceptance run of Clients, Marketing and Statistics (V7) against a REAL
// backend: what a seller and an agency read, what the server refuses, and,
// when allowed, what a seller writes.
//
// Nothing here is a stand-in: the portal under STAGING_URL talks to its own
// Laravel, seeded by QaProPortalSeeder then QaCommerceSeeder. Parts A to D
// only READ. Part E writes (a customer, a coupon, a promotion) and only runs
// with STAGING_ALLOW_MUTATIONS=1; everything it creates is named QAV7RUN…
// and the promotion it creates is removed at the end. The seeder rebuilds
// its own data at each run.
//
//   STAGING_URL=http://localhost:3240
//   STAGING_AGENCY_PASSWORD=…     the QA password, the same for every QA account
//   STAGING_ALLOW_MUTATIONS=1     to run part E
//   STAGING_SHOTS=…               where the captures go
//
//   npx playwright test -c playwright.staging.config.ts commerce

const env = process.env;
const password = env.STAGING_COMMERCE_PASSWORD ?? env.STAGING_AGENCY_PASSWORD ?? "";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.STAGING_URL ?? "");
const SHOTS = env.STAGING_SHOTS ?? join(__dirname, "..", "..", "docs", "captures", "v7-clients-marketing-statistics", `recette-${LOCAL ? "local" : "staging"}`);
mkdirSync(SHOTS, { recursive: true });
const WRITES = env.STAGING_ALLOW_MUTATIONS === "1";
const STAMP = (env.STAGING_RUN_STAMP ?? "0000000000").slice(-6);

const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const ACCOUNTS = {
  seller: { email: env.STAGING_VENDOR_EMAIL ?? "qa-vendeur-a@qa.sugu.test", home: /\/vendor\// },
  other: { email: env.STAGING_VENDOR_B_EMAIL ?? "qa-vendeur-b@qa.sugu.test", home: /\/vendor\// },
  agency: { email: env.STAGING_AGENCY_EMAIL ?? "qa-agence@qa.sugu.test", home: /\/agency\// },
} as const;
type Account = keyof typeof ACCOUNTS;
const isQa = Object.values(ACCOUNTS).every((account) => /@qa\.sugu\.test$/i.test(account.email));

// ── Sessions: each account signs in once, through the form ──

const sessions = new Map<Account, Awaited<ReturnType<BrowserContext["storageState"]>>>();

async function sessionOf(browser: Browser, baseURL: string | undefined, account: Account) {
  const known = sessions.get(account);
  if (known) return known;
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto("/login");
  await page.locator('input[type="email"], input[name="email"]').first().fill(ACCOUNTS[account].email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await expect(page, `${account} is signed in`).toHaveURL(ACCOUNTS[account].home, { timeout: 60_000 });
  const state = await context.storageState();
  sessions.set(account, state);
  await context.close();
  return state;
}

const test = base.extend<{ as: (account: Account, width?: number) => Promise<Page> }>({
  as: async ({ browser, baseURL }, provide) => {
    const contexts: BrowserContext[] = [];
    await provide(async (account, width = 1440) => {
      const context = await browser.newContext({ baseURL, storageState: await sessionOf(browser, baseURL, account), viewport: { width, height: width < 768 ? 844 : 900 }, acceptDownloads: true });
      contexts.push(context);
      return context.newPage();
    });
    for (const context of contexts) await context.close();
  },
});

test.beforeEach(() => {
  test.skip(!password, "STAGING_AGENCY_PASSWORD (or STAGING_COMMERCE_PASSWORD) is not set");
  test.skip(!isQa, "only accounts of the QA seeder (@qa.sugu.test) are accepted");
});

const get = async (page: Page, path: string): Promise<{ status: number; body: Json }> => {
  const response = await page.request.get(`/api/proxy/${path}`);
  return { status: response.status(), body: await response.json().catch(() => ({})) };
};
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
const plain = (text: string) => text.replace(/\s/g, " ");
const units = (value: number) => plain(new Intl.NumberFormat("fr-FR").format(value));
const money = (value: number) => `${units(value)} FCFA`;
const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze()).violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical").map((violation) => violation.id);
const overflow = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, main ? main.scrollWidth - main.clientWidth : 0);
  });
const rows = (page: Page) => page.locator("main").locator("tbody tr, [data-row-card]");
const settled = (page: Page) => expect(page.locator("main [aria-busy='true']")).toHaveCount(0, { timeout: 30_000 });
const region = async (page: Page, name: string) => plain(await page.getByRole("region", { name }).innerText());

async function open(page: Page, path: string, title: string | RegExp) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title, { timeout: 30_000 });
  await settled(page);
}

/** The buyers of QaCommerceSeeder, found by name. */
async function seeded(page: Page) {
  const list = await get(page, "sellers/customers?search=Awa%20Traor%C3%A9");
  const awa = (list.body.data ?? []).find((row: Json) => row.fullName === "Awa Traoré" && row.source === "marketplace");
  test.skip(!awa, "the V7 data of the acceptance run is missing: run `php artisan db:seed --class=QaCommerceSeeder --force` after QaProPortalSeeder");
  return { awa: awa as Json };
}

// ── A. Clients ──────────────────────────────────────────────

test("A1 the list shows the counters of the whole store, and each segment as the server sorted it", async ({ as }) => {
  const page = await as("seller");
  const { awa } = await seeded(page);
  await open(page, "/vendor/clients", "Mes clients");
  const summary = (await get(page, "sellers/customers/summary")).body.data;

  const figures = await region(page, "Vos clients en chiffres");
  expect(figures).toContain(units(summary.total));
  for (const segment of ["new", "loyal", "vip"]) expect(figures, segment).toContain(units(summary.segments[segment]));
  // The seeded buyers, with the figures of their orders in THIS store.
  expect(awa).toMatchObject({ segment: "vip", ordersCount: 6, totalSpent: 145000, city: "Ouagadougou" });
  expect(Object.values(summary.segments as Record<string, number>).reduce((sum, count) => sum + count, 0)).toBe(summary.total);

  expect(await serious(page)).toEqual([]);
  await shot(page, "clients-liste-1440");
});

test("A2 status, city, search and sort are the server's: the list equals its answer", async ({ as }) => {
  const page = await as("seller");
  await seeded(page);

  for (const [segment, label] of [["vip", "VIP"], ["inactive", "Inactif"], ["prospect", "Sans commande"]] as const) {
    const answer = (await get(page, `sellers/customers?segment=${segment}&limit=10`)).body;
    await open(page, `/vendor/clients?statut=${segment}`, "Mes clients");
    await expect(rows(page), segment).toHaveCount(Math.min(10, answer.meta.total));
    for (const text of await rows(page).allInnerTexts()) expect(text, segment).toContain(label);
    expect((answer.data as Json[]).every((row) => row.segment === segment)).toBe(true);
  }

  await open(page, "/vendor/clients?ville=Koudougou&tri=spent&sens=desc", "Mes clients");
  const sorted = (await get(page, "sellers/customers?city=Koudougou&sort=spent&direction=desc&limit=10")).body.data as Json[];
  expect(sorted.length).toBeGreaterThan(0);
  await expect(rows(page)).toHaveCount(sorted.length);
  await expect(rows(page).first()).toContainText(sorted[0].fullName);
  const spent = sorted.map((row) => row.totalSpent);
  expect(spent).toEqual([...spent].sort((a, b) => b - a));

  // A phone number typed with spaces, an unknown filter refused by the server.
  await open(page, "/vendor/clients", "Mes clients");
  const asked = page.waitForRequest((request) => new URL(request.url()).searchParams.get("search") === "70 00 88 01");
  await page.locator("main").getByRole("searchbox").fill("70 00 88 01");
  await asked;
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Awa Traoré");
  expect((await get(page, "sellers/customers?segment=gold")).status).toBe(422);
  expect((await get(page, "sellers/customers?sort=password")).status).toBe(422);
});

test("A3 the sheet of a customer shows its orders in this store only, linked to their detail", async ({ as }) => {
  const page = await as("seller");
  const { awa } = await seeded(page);
  const sheet = (await get(page, `sellers/customers/${awa.id}`)).body.data;
  await open(page, `/vendor/clients?client=${awa.id}`, "Awa Traoré");

  const figures = await region(page, "Chiffres du client");
  expect(figures).toContain(units(sheet.stats.totalOrders));
  expect(figures).toContain(money(sheet.stats.totalSpent));
  expect(figures).toContain(money(sheet.stats.averageBasket));
  expect(sheet.stats).toMatchObject({ totalOrders: 6, deliveredOrders: 6, totalSpent: 145000 });

  const first = sheet.recentOrders[0];
  const link = page.locator("main").getByRole("link", { name: new RegExp(first.reference) }).first();
  await expect(link).toHaveAttribute("href", `/vendor/orders/${first.id}`);
  for (const order of sheet.recentOrders as Json[]) expect(order.reference).toMatch(/^SU-2099-0008/);
  await expect(page.locator("main").getByText(/WhatsApp|SMS|Offrir un code/i)).toHaveCount(0);
  expect(await serious(page)).toEqual([]);
  await shot(page, "clients-fiche-1440");

  // The order it links to opens for this seller.
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/vendor/orders/${first.id}`));
  await expect(page.getByRole("heading", { level: 1 })).toContainText(first.reference, { timeout: 30_000 });
});

test("A4 the export is the server's file of the filtered list, with no formula to run", async ({ as }) => {
  const page = await as("seller");
  await seeded(page);
  const expected = (await get(page, "sellers/customers?segment=vip&limit=100")).body.meta.total;
  await open(page, "/vendor/clients?statut=vip", "Mes clients");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter" }).first().click();
  const file = await download;
  const csv = readFileSync(await file.path(), "utf8");
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  const lines = csv.slice(1).trim().split("\n");
  expect(lines[0]).toContain("Nom;Téléphone;E-mail;Ville;Statut");
  expect(lines).toHaveLength(expected + 1);
  expect(csv).toContain("Awa Traoré");
  expect(csv).toContain("'+22670008801");
  expect(csv).not.toContain("QA Client de B");
});

// ── B. Marketing ────────────────────────────────────────────

test("B1 every code and promotion is listed in the state the server computed, amounts in francs", async ({ as }) => {
  const page = await as("seller");
  await seeded(page);
  const board = (await get(page, "sellers/marketing")).body.data;
  await open(page, "/vendor/marketing", "Marketing");

  const codes = page.getByRole("table", { name: "Codes promotionnels" });
  const row = (code: string) => codes.getByRole("row").filter({ hasText: code });
  await expect(row("QAV7DIX")).toContainText("Actif");
  await expect(row("QAV7DIX")).toContainText("Min. 10 000 FCFA");
  await expect(row("QAV7MOINS2000")).toContainText("2 000 FCFA");
  await expect(row("QAV7AVENIR")).toContainText("À venir");
  await expect(row("QAV7EXPIRE")).toContainText("Expiré");
  await expect(row("QAV7COUPE")).toContainText("Désactivé");
  await expect(row("QAV7EPUISE")).toContainText("Épuisé");
  await expect(row("QAV7RIVAL")).toHaveCount(0);
  expect(await region(page, "Vos codes promotionnels en chiffres")).toContain(units(board.summary.coupons.active));
  expect(await serious(page)).toEqual([]);
  await shot(page, "marketing-codes-1440");

  await open(page, "/vendor/marketing?onglet=promotions", "Marketing");
  const promotions = page.getByRole("table", { name: "Promotions produits" });
  const baskets = promotions.getByRole("row").filter({ hasText: "QA V7 Baskets Sport" });
  await expect(baskets).toContainText("25 000 FCFA");
  await expect(baskets).toContainText("20 000 FCFA");
  await expect(baskets).toContainText("Actif");
  await expect(promotions.getByRole("row").filter({ hasText: "QA V7 Sac à main" })).toContainText("À venir");
  await expect(promotions.getByRole("row").filter({ hasText: "QA V7 Lampe de chevet" })).toContainText("Expiré");
  await expect(promotions.getByRole("row").filter({ hasText: "Produit de B" })).toHaveCount(0);
  await shot(page, "marketing-promotions-1440");
});

test("B2 the server refuses what the form could not: units, limits, another store's product", async ({ as }) => {
  const page = await as("seller");
  await seeded(page);
  await page.goto("/vendor/marketing");
  // Sent as the form would, with what a tampered form could send: all refused, nothing created.
  const post = async (path: string, data: Json) => (await page.request.post(`/api/proxy/${path}`, { data, headers: { Origin: new URL(page.url()).origin } })).status();
  const before = (await get(page, "sellers/marketing")).body.data;

  expect(await post("sellers/marketing/coupons", { code: "QAV7DIX", discount_type: "percent_off", discount_value: 10 }), "a code already taken").toBe(422);
  expect(await post("sellers/marketing/coupons", { code: "QAV7RUNPCT", discount_type: "percent_off", discount_value: 150 }), "150 %").toBe(422);
  expect(await post("sellers/marketing/coupons", { code: "QAV7RUNFREE", discount_type: "free_shipping", discount_value: 0 }), "free shipping").toBe(422);
  expect(await post("sellers/marketing/coupons", { code: "QAV7RUNCENT", discount_type: "amount_off", discount_value: 150 }), "an amount that is not whole francs").toBe(422);
  expect(await post("sellers/marketing/coupons", { code: "QAV7RUNPAST", discount_type: "percent_off", discount_value: 10, ends_at: "2020-01-01" }), "an end in the past").toBe(422);

  const rival = (await get(await as("other"), "sellers/marketing")).body.data.promotionList.find((entry: Json) => entry.product.name === "QA V7 Produit de B");
  expect(rival, "store B has its own promotion").toBeTruthy();
  expect(await post("sellers/marketing/promotions", { product_id: rival.product.id, discount_type: "percent_off", discount_value: 90 }), "another store's product").toBe(403);
  expect((await page.request.put(`/api/proxy/sellers/marketing/promotions/${rival.id}`, { data: { discount_value: 90 }, headers: { Origin: new URL(page.url()).origin } })).status(), "another store's promotion").toBe(404);
  expect((await page.request.delete(`/api/proxy/sellers/marketing/promotions/${rival.id}`, { headers: { Origin: new URL(page.url()).origin } })).status()).toBe(404);

  const after = (await get(page, "sellers/marketing")).body.data;
  expect(after.summary).toEqual(before.summary);
});

// ── C. Statistics of the seller ─────────────────────────────

test("C1 each period is computed by the server and shown as answered", async ({ as }) => {
  const page = await as("seller");
  await seeded(page);

  const seen: Record<string, number> = {};
  for (const period of ["7j", "30j", "90j"] as const) {
    const report = (await get(page, `sellers/statistics?period=${period}`)).body.data.report;
    await open(page, period === "30j" ? "/vendor/statistics" : `/vendor/statistics?periode=${period}`, "Statistiques");
    await expect(page.locator(`[data-period='${period}']`)).toBeVisible();

    const figures = await region(page, "Chiffres de la période");
    expect(figures, period).toContain(units(report.kpis.orders.value));
    expect(figures, period).toContain(money(report.kpis.revenue.value));
    expect(figures, period).toContain(units(report.kpis.newCustomers.value));
    await expect(page.getByRole("table", { name: /^Ventes par jour/ }).locator("tbody tr")).toHaveCount(report.period.days);
    expect(report.series).toHaveLength(report.period.days);
    // The days add up to the figures: one definition for the curve and the total.
    expect((report.series as Json[]).reduce((sum, day) => sum + day.revenue, 0)).toBe(report.kpis.revenue.value);
    expect((report.series as Json[]).reduce((sum, day) => sum + day.orders, 0)).toBe(report.kpis.orders.value);
    seen[period] = report.kpis.revenue.value;
    if (period === "30j") {
      expect(await serious(page)).toEqual([]);
      await shot(page, "statistiques-vendeur-1440");
    }
  }
  // 90 days hold the 30, which hold the 7: the periods are really different.
  expect(seen["90j"]).toBeGreaterThan(seen["30j"]);
  expect(seen["30j"]).toBeGreaterThan(seen["7j"]);

  const main = plain(await page.locator("main").innerText());
  expect(main).not.toMatch(/Note moyenne|Taux de conversion|Entonnoir|Catégorie 1|4[.,]7/);
  expect(main).toContain("QA V7 Baskets Sport");
  expect(main).toContain("QA Mode");
});

test("C2 changing the period on the screen asks the server again", async ({ as }) => {
  const page = await as("seller");
  await seeded(page);
  await open(page, "/vendor/statistics", "Statistiques");
  const asked = page.waitForRequest((request) => request.url().includes("sellers/statistics") && new URL(request.url()).searchParams.get("period") === "7j");
  await page.getByRole("button", { name: "7 jours" }).first().click();
  await asked;
  await expect(page.locator("[data-period='7j']")).toBeVisible({ timeout: 30_000 });
  expect((await get(page, "sellers/statistics?period=12m")).status).toBe(422);
  expect((await get(page, "sellers/statistics?from=2026-10-05&to=2026-10-01")).status).toBe(422);
});

// ── D. Statistics of the agency, and isolation ──────────────

test("D1 the agency reads its own activity per period, with no money", async ({ as }) => {
  const page = await as("agency");
  // The screen asks for its agency itself: the address of that request says which one.
  const first = page.waitForRequest((request) => /agencies\/[^/]+\/statistics/.test(request.url()));
  await page.goto("/agency/statistics");
  const agencyId = /agencies\/([^/]+)\/statistics/.exec((await first).url())![1];
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Statistiques", { timeout: 30_000 });
  await expect(page.locator("[data-period='30j']")).toBeVisible({ timeout: 30_000 });
  await settled(page);

  const shown = async (period: string) => {
    const report = (await get(page, `agencies/${agencyId}/statistics?period=${period}`)).body.data.report;
    const figures = await region(page, "Chiffres de la période");
    for (const value of [report.kpis.created.value, report.kpis.delivered.value, report.kpis.inProgress, report.kpis.failed.value]) expect(figures, period).toContain(units(value));
    // The states add up to what was created, and the days to the total.
    expect((report.statuses as Json[]).reduce((sum, status) => sum + status.count, 0)).toBe(report.kpis.created.value);
    expect((report.series as Json[]).reduce((sum, day) => sum + day.created, 0)).toBe(report.kpis.created.value);
    expect(report.series).toHaveLength(report.period.days);
    return report;
  };
  const month = await shown("30j");

  const asked = page.waitForRequest((request) => /agencies\/[^/]+\/statistics/.test(request.url()) && new URL(request.url()).searchParams.get("period") === "90j");
  await page.getByRole("button", { name: "90 jours" }).first().click();
  await asked;
  await expect(page.locator("[data-period='90j']")).toBeVisible({ timeout: 30_000 });
  await settled(page);
  const quarter = await shown("90j");
  // 90 days hold the 30: never fewer deliveries.
  expect(quarter.kpis.created.value).toBeGreaterThanOrEqual(month.kpis.created.value);

  expect(plain(await page.locator("main").innerText())).not.toMatch(/FCFA|Livreur du mois|Féliciter/);
  expect(await serious(page)).toEqual([]);
  await shot(page, "statistiques-agence-1440");
});

test("D2 nothing of a store or an agency reaches another account", async ({ as }) => {
  const seller = await as("seller");
  const { awa } = await seeded(seller);
  const other = await as("other");
  const agency = await as("agency");

  // Seller B: its own customers, never A's; A's sheet is not found.
  const theirs = (await get(other, "sellers/customers?limit=100")).body.data as Json[];
  expect(theirs.map((row) => row.fullName)).not.toContain("Awa Traoré");
  expect((await get(other, `sellers/customers/${awa.id}`)).status).toBe(404);
  // The buyer the two stores share: each store sees only what was bought from it.
  const sharedA = ((await get(seller, "sellers/customers?search=Issa%20Compaor%C3%A9")).body.data as Json[])[0];
  const sharedB = theirs.find((row) => row.fullName === "Issa Compaoré");
  expect(sharedA).toMatchObject({ ordersCount: 1, totalSpent: 9000 });
  expect(sharedB).toMatchObject({ ordersCount: 1, totalSpent: 90000 });
  expect(sharedA.id).not.toBe(sharedB!.id);

  // Offers and statistics of B hold nothing of A.
  const board = (await get(other, "sellers/marketing")).body.data;
  expect((board.couponList as Json[]).map((coupon) => coupon.code)).toEqual(["QAV7RIVAL"]);
  const report = (await get(other, "sellers/statistics?period=90j")).body.data.report;
  expect((report.topProducts as Json[]).map((product) => product.name)).not.toContain("QA V7 Baskets Sport");

  // An agency has no store; a seller has no agency.
  expect((await get(agency, "sellers/customers")).status).toBe(404);
  const anyAgency = (await get(seller, "agencies/01HZZZZZZZZZZZZZZZZZZZZZZZ/statistics")).status;
  expect([403, 404]).toContain(anyAgency);
});

test("D3 the screens fit the six widths, on real data", async ({ as }) => {
  test.slow();
  const page = await as("seller", 375);
  await seeded(page);
  for (const [path, title, name] of [
    ["/vendor/clients", "Mes clients", "clients-liste"],
    ["/vendor/marketing", "Marketing", "marketing-codes"],
    ["/vendor/statistics", "Statistiques", "statistiques-vendeur"],
  ] as const) {
    await open(page, path, title);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await page.waitForTimeout(150);
      expect(await overflow(page), `${path} at ${width}px`).toBeLessThanOrEqual(0);
      const cut = await page.locator("main .text-kpi").evaluateAll((values) => values.filter((value) => (value as HTMLElement).offsetParent !== null && value.scrollWidth > value.clientWidth + 1).map((value) => value.textContent));
      expect(cut, `${path} at ${width}px: no figure cut`).toEqual([]);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await shot(page, `${name}-390`);
  }
});

// ── E. Writes (STAGING_ALLOW_MUTATIONS=1) ───────────────────

test.describe("E writes", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(() => test.skip(!WRITES, "set STAGING_ALLOW_MUTATIONS=1 to run the writes"));

  test("E1 a customer is created, refused as a duplicate, and counted", async ({ as }) => {
    const page = await as("seller");
    await seeded(page);
    const before = (await get(page, "sellers/customers/summary")).body.data.total;
    await open(page, "/vendor/clients", "Mes clients");

    await page.getByRole("button", { name: "Ajouter un client" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Ajouter un client" });
    await dialog.getByLabel("Prénom").fill("QA");
    await dialog.getByRole("textbox", { name: /^Nom/ }).fill("Doublon");
    await dialog.getByLabel("Téléphone").fill("70 00 88 99");
    await dialog.getByRole("button", { name: "Ajouter le client" }).click();
    await expect(dialog.getByText("Un client de votre boutique a déjà ce numéro.")).toBeVisible({ timeout: 30_000 });

    await dialog.getByRole("textbox", { name: /^Nom/ }).fill(`Recette ${STAMP}`);
    await dialog.getByLabel("Téléphone").fill(`61 ${STAMP.slice(0, 2)} ${STAMP.slice(2, 4)} ${STAMP.slice(4, 6)}`);
    await dialog.getByRole("button", { name: "Ajouter le client" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`QA Recette ${STAMP}`, { timeout: 30_000 });
    await expect(page.locator("main").getByText(`+226 61 ${STAMP.slice(0, 2)} ${STAMP.slice(2, 4)} ${STAMP.slice(4, 6)}`).first()).toBeVisible();
    expect((await get(page, "sellers/customers/summary")).body.data.total).toBe(before + 1);
  });

  test("E2 a code is created with its amount in francs, switched off and on", async ({ as }) => {
    const page = await as("seller");
    await seeded(page);
    const code = `QAV7RUN${STAMP}`;
    await open(page, "/vendor/marketing", "Marketing");

    await page.getByRole("button", { name: "Créer un code" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Créer un code promotionnel" });
    await dialog.getByLabel("Code").fill(code);
    await dialog.getByLabel("Type de réduction").selectOption({ label: "Montant fixe" });
    await dialog.getByLabel("Valeur").fill("1500");
    await dialog.getByLabel("Commande minimum").fill("10000");
    const created = page.waitForResponse((response) => response.url().includes("sellers/marketing/coupons") && response.request().method() === "POST");
    await dialog.getByRole("button", { name: "Créer le code" }).click();
    expect((await created).status()).toBe(201);

    const row = page.getByRole("table", { name: "Codes promotionnels" }).getByRole("row").filter({ hasText: code });
    await expect(row).toContainText("1 500 FCFA", { timeout: 30_000 });
    await expect(row).toContainText("Min. 10 000 FCFA");
    // What the server kept: centimes in, francs out.
    const kept = ((await get(page, "sellers/marketing")).body.data.couponList as Json[]).find((coupon) => coupon.code === code);
    expect(kept).toMatchObject({ type: "amount_off", value: 1500, minSubtotal: 10000, status: "active" });

    for (const [action, state] of [["Désactiver", "Désactivé"], ["Réactiver", "Actif"]] as const) {
      await row.getByRole("button", { name: `Actions pour le code ${code}` }).click();
      const answered = page.waitForResponse((response) => response.url().includes("/toggle"));
      await page.getByRole("menuitem", { name: action }).click();
      await answered;
      await expect(row).toContainText(state, { timeout: 30_000 });
    }
  });

  test("E3 a promotion is created on a product on sale, refused on a draft, then removed", async ({ as }) => {
    const page = await as("seller");
    await seeded(page);
    const origin = { Origin: new URL((await page.goto("/vendor/marketing?onglet=promotions"))!.url()).origin };
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Marketing", { timeout: 30_000 });

    // The seeded scheduled promotion of the bag is removed first: one promotion per product.
    const board = (await get(page, "sellers/marketing")).body.data;
    const bag = (board.promotionList as Json[]).find((entry) => entry.product.name === "QA V7 Sac à main");
    if (bag) expect((await page.request.delete(`/api/proxy/sellers/marketing/promotions/${bag.id}`, { headers: origin })).status()).toBe(200);
    await page.reload();

    await page.getByRole("button", { name: "Créer une promotion" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Créer une promotion produit" });
    await dialog.getByRole("textbox", { name: /^Produit/ }).fill("QA V7");
    const options = dialog.getByRole("listbox", { name: "Produits en vente" });
    await expect(options.getByRole("option", { name: /QA V7 Sac à main/ })).toBeVisible({ timeout: 30_000 });
    await expect(options.getByRole("option", { name: /Produit non publié/ })).toHaveCount(0);
    await options.getByRole("option", { name: /QA V7 Sac à main/ }).click();
    await dialog.getByLabel("Valeur").fill("25");
    await expect(dialog.getByRole("region", { name: "Aperçu" })).toContainText("13 500 FCFA");
    const created = page.waitForResponse((response) => response.url().includes("sellers/marketing/promotions") && response.request().method() === "POST");
    await dialog.getByRole("button", { name: "Créer la promotion" }).click();
    expect((await created).status()).toBe(201);

    const row = page.getByRole("table", { name: "Promotions produits" }).getByRole("row").filter({ hasText: "QA V7 Sac à main" });
    // The price the server computed is the one the form previewed.
    await expect(row).toContainText("13 500 FCFA", { timeout: 30_000 });

    // A draft product is refused by the server itself.
    const draft = (await get(page, "sellers/products?search=QA%20V7%20Produit%20non%20publi%C3%A9")).body.data?.data?.[0];
    if (draft) expect((await page.request.post("/api/proxy/sellers/marketing/promotions", { data: { product_id: draft.id, discount_type: "percent_off", discount_value: 10 }, headers: origin })).status()).toBe(422);

    await row.getByRole("button", { name: /Actions pour la promotion de QA V7 Sac à main/ }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer la promotion" }).click();
    await expect(row).toHaveCount(0, { timeout: 30_000 });
  });
});
