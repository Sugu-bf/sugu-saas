import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Acceptance run of the SUGU BOX screens (V6) against a REAL backend: what a
// seller reads of the stock the warehouse holds, and what the server refuses.
//
// Nothing here is a stand-in: the portal under STAGING_URL talks to its own
// Laravel, seeded by QaProPortalSeeder then QaSuguBoxSeeder. The run only
// READS: Sugu Box has no write for a seller, and this spec sends none.
//
//   STAGING_URL=http://localhost:3240
//   STAGING_AGENCY_PASSWORD=…     the QA password, the same for every QA account
//   STAGING_SHOTS=…               where the captures go (default docs/captures/v6-sugu-box/recette-<staging|local>)
//
//   npx playwright test -c playwright.staging.config.ts sugubox

const env = process.env;
const password = env.STAGING_SUGUBOX_PASSWORD ?? env.STAGING_AGENCY_PASSWORD ?? "";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.STAGING_URL ?? "");
const SHOTS = env.STAGING_SHOTS ?? join(__dirname, "..", "..", "docs", "captures", "v6-sugu-box", `recette-${LOCAL ? "local" : "staging"}`);
mkdirSync(SHOTS, { recursive: true });

const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;
const BASE = "/vendor/sugubox";
const BOARD = "sellers/sugubox/board";

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
  test.skip(!password, "STAGING_AGENCY_PASSWORD (or STAGING_SUGUBOX_PASSWORD) is not set");
  test.skip(!isQa, "only accounts of the QA seeder (@qa.sugu.test) are accepted");
});

const get = async (page: Page, path: string): Promise<{ status: number; body: Json }> => {
  const response = await page.request.get(`/api/proxy/${path}`);
  return { status: response.status(), body: await response.json().catch(() => ({})) };
};
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
const plain = (text: string) => text.replace(/\s/g, " ");
const mainText = async (page: Page) => plain(await page.locator("main").innerText());
const units = (value: number) => plain(new Intl.NumberFormat("fr-FR").format(value));
const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze()).violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical").map((violation) => violation.id);
const overflow = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, main ? main.scrollWidth - main.clientWidth : 0);
  });
const lines = (page: Page, name: string) => page.getByRole("table", { name }).locator("tbody tr");
const settled = (page: Page) => expect(page.locator("main [aria-busy='true']")).toHaveCount(0, { timeout: 30_000 });

async function open(page: Page, path: string, title: string | RegExp) {
  await page.goto(`${BASE}${path}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title, { timeout: 30_000 });
  await settled(page);
}

/** The receptions and expeditions of QaSuguBoxSeeder, found by their reference. */
async function seeded(page: Page) {
  const inbound = await get(page, `${BOARD}/inbound?search=INB-QA-0002`);
  const outbound = await get(page, `${BOARD}/outbound?search=OUT-QA-0003`);
  const reception = inbound.body.data?.data?.[0];
  const expedition = outbound.body.data?.data?.[0];
  test.skip(!reception || !expedition, "the Sugu Box data of the acceptance run is missing: run `php artisan db:seed --class=QaSuguBoxSeeder --force` after QaProPortalSeeder");
  return { reception: reception as Json, expedition: expedition as Json };
}

// ── A. What the seller reads ────────────────────────────────

test("A1 the overview shows the figures of the server, bin by bin", async ({ as }) => {
  const page = await as("seller");
  await seeded(page);
  await open(page, "", "Vue d'ensemble Sugu Box");
  const { status, body } = await get(page, `${BOARD}/summary`);
  expect(status).toBe(200);

  const figures = plain(await page.getByRole("region", { name: "Chiffres clés de Sugu Box" }).innerText());
  for (const key of ["stock_units", "received_today_units", "outbound_to_prepare", "orders_this_month", "alerts"]) expect(figures, key).toContain(units(body.data[key]));
  // What the bins hold, not what the store sells: the legacy route counts the whole catalogue.
  expect(body.data.stock_units).toBe(398);
  const legacy = await get(page, "sellers/sugubox/overview");
  expect(legacy.body.data.total_units_in_box).toBeGreaterThan(body.data.stock_units);

  await expect(lines(page, "Réceptions récentes")).toHaveCount(5);
  await expect(lines(page, "Alertes stock")).toHaveCount(3);
  expect(await serious(page)).toEqual([]);
  await shot(page, "vue-ensemble-1440");
});

test("A2 the stock is searched and filtered by the server, with what is reserved", async ({ as }) => {
  const page = await as("seller");
  await seeded(page);
  await open(page, "/stock", "Mon stock");
  const list = () => lines(page, "Stock en entrepôt Sugu Box");
  await expect(list()).toHaveCount(8);
  await shot(page, "mon-stock-1440");

  const asked = page.waitForRequest((request) => new URL(request.url()).searchParams.get("search") === "baskets");
  await page.locator("main").getByRole("searchbox").fill("baskets");
  await asked;
  await expect(list()).toHaveCount(1);
  expect(plain(await list().innerText())).toMatch(/46\s+12\s+58/);
  await expect(list()).toContainText("A-01-01");

  await page.goto(`${BASE}/stock?etat=rupture`);
  await expect(list()).toHaveCount(1);
  await expect(list()).toContainText("QA Sérum hydratant");
  await expect(list().locator('[data-status="out_of_stock"]')).toBeVisible();

  // The other articles of the store, never sent to the warehouse, are not listed.
  expect((await get(page, `${BOARD}/stock?search=QA-PAGNE`)).body.data.total).toBe(0);
});

test("A3 receptions carry their counters, and the page of one says what was checked", async ({ as }) => {
  const page = await as("seller");
  const { reception } = await seeded(page);
  await open(page, "/inbound", "Réceptions");
  const { body } = await get(page, `${BOARD}/inbound`);
  expect(body.data.total).toBe(14);
  const figures = plain(await page.getByRole("region", { name: "Réceptions par situation" }).innerText());
  for (const value of Object.values(body.counts) as number[]) expect(figures).toContain(units(value));
  await expect(lines(page, "Réceptions")).toHaveCount(10);
  await shot(page, "receptions-1440");

  await page.getByRole("button", { name: "En cours de contrôle" }).click();
  await expect(lines(page, "Réceptions")).toHaveCount(1);
  await expect(lines(page, "Réceptions")).toContainText("INB-QA-0004");

  await open(page, `/inbound/${reception.id}`, "Réception INB-QA-0002");
  const rows = lines(page, "Articles de la réception");
  await expect(rows).toHaveCount(3);
  await expect(rows.filter({ hasText: "QA Sac en toile" })).toContainText("Écart (−2)");
  await expect(page.locator("main")).toContainText("Réception partielle");
  await expect(page.locator("main")).toContainText("Aminata S.");
  expect(await serious(page)).toEqual([]);
  await shot(page, "fiche-reception-1440");
});

test("A4 an expedition shared with another store shows the seller's lines only, and opens their order", async ({ as }) => {
  const page = await as("seller");
  const { expedition } = await seeded(page);
  await open(page, "/outbound", "Expéditions");
  const { body } = await get(page, `${BOARD}/outbound`);
  expect(body.counts).toEqual({ to_prepare: 2, packed: 1, shipped: 1, cancelled: 1 });
  await expect(lines(page, "Expéditions")).toHaveCount(5);
  await shot(page, "expeditions-1440");

  await open(page, `/outbound/${expedition.id}`, "Expédition OUT-QA-0003");
  const rows = lines(page, "Articles à expédier");
  await expect(rows).toHaveCount(2);
  expect(await mainText(page)).not.toContain("Panier");
  await expect(page.getByRole("heading", { level: 2, name: "En préparation" })).toBeVisible();
  expect(await serious(page)).toEqual([]);
  await shot(page, "fiche-expedition-1440");

  // The order it serves is the seller's own: its page opens.
  await page.locator("main").getByRole("link", { name: "SU-2099-000703" }).click();
  await expect(page).toHaveURL(new RegExp(`/vendor/orders/${expedition.order.id}$`));
  await expect(page.locator("main")).toContainText("SU-2099-000703", { timeout: 30_000 });
});

test("A5 the journal reads the quantity before and after, and exports what the server filters", async ({ as }) => {
  const page = await as("seller");
  await seeded(page);
  await open(page, "/movements?type=transferts&q=QA-BOX-TSHIRT", "Mouvements");
  const list = () => lines(page, "Mouvements de stock");
  await expect(list()).toHaveCount(2);
  expect(plain(await list().filter({ hasText: "A-01-02" }).innerText())).toMatch(/−10\s+38\s+28/);
  await expect(list().first()).toContainText("Aminata S.");
  await shot(page, "mouvements-1440");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter" }).click();
  const file = await (await download).createReadStream();
  let text = "";
  for await (const chunk of file) text += chunk.toString("utf8");
  expect(text.split("\n").filter(Boolean)).toHaveLength(3);
  expect(text).toContain("Transfert entre casiers");
});

// ── B. What the server refuses ──────────────────────────────

test("B1 another store reads neither the reception nor the lines of the seller", async ({ as }) => {
  const seller = await as("seller");
  const { reception, expedition } = await seeded(seller);

  const other = await as("other");
  expect((await get(other, `${BOARD}/inbound/${reception.id}`)).status).toBe(404);
  const shared = await get(other, `${BOARD}/outbound/${expedition.id}`);
  expect(shared.status).toBe(200);
  expect(shared.body.data.lines.map((line: Json) => line.sku)).toEqual(["QA-BOX-B-PANIER"]);
  expect((await get(other, `${BOARD}/stock`)).body.data.total).toBe(1);

  // The page says "not found": an identifier tells nothing.
  await other.goto(`${BASE}/inbound/${reception.id}`);
  await expect(other.getByText("Réception introuvable")).toBeVisible({ timeout: 30_000 });
});

test("B2 no session, another profile, an unknown filter: 401, 403, 422", async ({ as, browser, baseURL }) => {
  const anonymous = await browser.newContext({ baseURL });
  for (const path of ["summary", "stock", "inbound", "outbound", "movements", "stock/export"]) {
    expect((await anonymous.request.get(`/api/proxy/${BOARD}/${path}`)).status(), path).toBe(401);
  }
  await anonymous.close();

  const agency = await as("agency");
  expect((await get(agency, `${BOARD}/summary`)).status).toBe(403);
  await agency.goto(BASE);
  await expect(agency).toHaveURL(/\/agency\//);

  const seller = await as("seller");
  expect((await get(seller, `${BOARD}/inbound?status=lost`)).status).toBe(422);
  expect((await get(seller, `${BOARD}/movements?date_from=hier`)).status).toBe(422);
  expect((await get(seller, `${BOARD}/stock?sort=price`)).status).toBe(422);
  expect((await get(seller, `${BOARD}/outbound/01JUNKNOWN0000000000000000`)).status).toBe(404);
});

test("B3 no phone number, no address line and no staff note leave the server", async ({ as }) => {
  const page = await as("seller");
  const { expedition } = await seeded(page);
  const answers = await Promise.all([`${BOARD}/outbound/${expedition.id}`, `${BOARD}/outbound`, `${BOARD}/movements?per_page=100`, `${BOARD}/summary`].map((path) => get(page, path)));
  const text = JSON.stringify(answers.map((answer) => answer.body));
  expect(text).not.toMatch(/\+226\d{6,}/);
  expect(text).not.toContain("Rue de recette");
  expect(text).not.toContain("QA recette");
  expect(text).not.toMatch(/"(note|notes|email|phone|line1)":/);
  expect(text).not.toContain("Sawadogo");
});

// ── C. The six widths ───────────────────────────────────────

test("C1 the seven screens fit the six widths, and are cards on a phone", async ({ as }) => {
  test.slow();
  const page = await as("seller", 375);
  const { reception, expedition } = await seeded(page);
  const screens: Array<[string, string, string | RegExp]> = [
    ["vue-ensemble", "", "Vue d'ensemble Sugu Box"],
    ["mon-stock", "/stock", "Mon stock"],
    ["receptions", "/inbound", "Réceptions"],
    ["fiche-reception", `/inbound/${reception.id}`, /^Réception /],
    ["expeditions", "/outbound", "Expéditions"],
    ["fiche-expedition", `/outbound/${expedition.id}`, /^Expédition /],
    ["mouvements", "/movements", "Mouvements"],
  ];

  for (const [name, path, title] of screens) {
    await page.setViewportSize({ width: 375, height: 844 });
    await open(page, path, title);
    // One load, six sizes: a page is not asked of the server again for each width.
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await page.waitForTimeout(150);
      expect(await overflow(page), `${name} at ${width}px`).toBeLessThanOrEqual(0);
      if (width === 390) await shot(page, `${name}-390`);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "/outbound", "Expéditions");
  await expect(page.getByRole("table", { name: "Expéditions" })).toBeHidden();
  await expect(page.getByRole("list", { name: "Expéditions" }).getByRole("listitem")).toHaveCount(5);
  expect(await serious(page)).toEqual([]);
});
