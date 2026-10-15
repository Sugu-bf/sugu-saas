import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Acceptance run of the SELLER'S DASHBOARD (V9.5) against a REAL backend:
// the three states of the page (a store that sells, one with alerts, a new
// one), each figure against what Laravel answers, the links of the cards,
// the periods, the six widths and accessibility. Read only: nothing is
// written, no order, stock or message is touched.
//
// The portal under STAGING_URL talks to its own Laravel, seeded by
// QaProPortalSeeder then QaDashboardSeeder (seller C: a new store; store B:
// a product out of stock).
//
//   STAGING_URL=http://localhost:3240
//   STAGING_AGENCY_PASSWORD=…         the QA password, the same for every QA account
//   STAGING_SHOTS=…                   captures (default docs/captures/v9.5-vendor-dashboard/recette-<local|staging>)
//
//   npx playwright test -c playwright.staging.config.ts dashboard

const env = process.env;
const password = env.STAGING_DASHBOARD_PASSWORD ?? env.STAGING_AGENCY_PASSWORD ?? "";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.STAGING_URL ?? "");
const SHOTS = env.STAGING_SHOTS ?? join(__dirname, "..", "..", "docs", "captures", "v9.5-vendor-dashboard", `recette-${LOCAL ? "local" : "staging"}`);
mkdirSync(SHOTS, { recursive: true });

const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const SELLERS = {
  active: { email: env.STAGING_VENDOR_EMAIL ?? "qa-vendeur-a@qa.sugu.test" },
  alerts: { email: env.STAGING_VENDOR_B_EMAIL ?? "qa-vendeur-b@qa.sugu.test" },
  new: { email: env.STAGING_VENDOR_C_EMAIL ?? "qa-vendeur-c@qa.sugu.test" },
} as const;
type Seller = keyof typeof SELLERS;
const isQa = Object.values(SELLERS).every((seller) => /@qa\.sugu\.test$/i.test(seller.email));

// ── Sessions ────────────────────────────────────────────────

const sessions = new Map<Seller, Awaited<ReturnType<BrowserContext["storageState"]>>>();

/** Signs an account in once per worker, through the form of the portal. */
async function sessionOf(browser: Browser, baseURL: string | undefined, seller: Seller) {
  const known = sessions.get(seller);
  if (known) return known;
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto("/login");
  await page.locator('input[type="email"], input[name="email"]').first().fill(SELLERS[seller].email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await expect(page, `${seller} is signed in`).toHaveURL(/\/vendor\//, { timeout: 90_000 });
  const state = await context.storageState();
  sessions.set(seller, state);
  await context.close();
  return state;
}

const test = base.extend<{ as: (seller: Seller, width?: number) => Promise<Page> }>({
  as: async ({ browser, baseURL }, provide) => {
    const contexts: BrowserContext[] = [];
    await provide(async (seller, width = 1440) => {
      const state = await sessionOf(browser, baseURL, seller);
      const context = await browser.newContext({ baseURL, storageState: state, viewport: { width, height: width < 768 ? 844 : 900 } });
      contexts.push(context);
      return context.newPage();
    });
    for (const context of contexts) await context.close();
  },
});

expect.configure({ timeout: 45_000 });

test.beforeEach(() => {
  test.skip(!password, "STAGING_AGENCY_PASSWORD (or STAGING_DASHBOARD_PASSWORD) is not set");
  test.skip(!isQa, "only accounts of the QA seeders (@qa.sugu.test) are accepted");
});

const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze()).violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`);

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function settle(page: Page) {
  await expect(page.locator("main").getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 120_000 });
  await expect(page.locator("main [aria-busy='true']")).toHaveCount(0, { timeout: 90_000 });
  await expect(page.locator("main").getByRole("button", { name: /Réessayer/ })).toHaveCount(0);
}

async function board(page: Page, query = "period=7j"): Promise<Json> {
  const response = await page.request.get(`/api/proxy/sellers/dashboard?view=board&${query}`);
  expect(response.status()).toBe(200);
  return ((await response.json()) as Json).data;
}

/** "245 000 F" whatever the space between thousands. */
const amount = (value: number) => new RegExp(`${new Intl.NumberFormat("fr-FR").format(value).replace(/\s/g, "\\s?")}\\s?F`);

/**
 * The state the page must show, by the rule of the page (model.ts): new
 * while the store never had an order; alerts when a product is out of stock
 * or an order waits for its confirmation for a day; active otherwise. Read
 * from the server's answer: a QA store can hold an alert left by another run.
 */
function expectedState(data: Json): "new" | "alerts" | "active" {
  if (!data.hasOrders) return "new";
  const late = data.tasks.toConfirm > 0 && data.tasks.oldestPendingAt && Date.now() - new Date(data.tasks.oldestPendingAt).getTime() >= 24 * 3_600_000;
  return data.tasks.outOfStock > 0 || late ? "alerts" : "active";
}

// ── The three states ────────────────────────────────────────

for (const seller of Object.keys(SELLERS) as Seller[]) {
  test(`D1 ${seller}: the page says what the server counted, at the six widths, with no serious accessibility defect`, async ({ as }) => {
    test.setTimeout(10 * 60_000);
    const page = await as(seller);
    await page.goto("/vendor/dashboard");
    await settle(page);
    const data = await board(page);

    const state = expectedState(data);
    if (seller === "new") expect(state, "seller C is a new store (QaDashboardSeeder)").toBe("new");
    if (seller === "alerts") expect(state, "store B has a product out of stock (QaDashboardSeeder)").toBe("alerts");
    await expect(page.locator("main header[data-state]")).toHaveAttribute("data-state", state);
    const figures = page.getByRole("region", { name: "Chiffres de la période" });
    await expect(figures).toContainText(amount(data.kpis.revenue.value));
    await expect(figures.getByRole("link", { name: /Commandes/ })).toContainText(String(data.kpis.orders.value));
    await expect(figures.getByRole("link", { name: /Produits vendus/ })).toContainText(String(data.kpis.unitsSold.value));
    await expect(figures.getByRole("link", { name: /À préparer/ })).toContainText(String(data.kpis.toPrepare));

    if (seller === "new") {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bienvenue sur SUGU PRO !");
      await expect(page.getByText(`${data.onboarding.completed} sur ${data.onboarding.total} étapes complétées`)).toBeVisible();
      await expect(page.getByText("Aucune vente pour le moment")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Actions recommandées" })).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { level: 1 })).toContainText(`Bonjour, ${data.store.name}`);
      await expect(page.getByRole("heading", { name: "Commandes récentes" })).toBeVisible();
      for (const order of data.recentOrders as Json[]) await expect(page.getByRole("link", { name: new RegExp(`#${order.number}`) })).toBeVisible();
      if (state === "alerts") {
        await expect(page.getByText("Plusieurs éléments nécessitent votre attention.")).toBeVisible();
        await expect(page.getByRole("heading", { name: "Produits en alerte" })).toBeVisible();
        await expect(page.getByText("Rupture de stock").first()).toBeVisible();
      }
    }

    // No notification made up.
    await expect(page.getByText(/Bienvenue sur Sugu !|Tout marquer comme lu|1 Nouvelle/)).toHaveCount(0);

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await page.waitForTimeout(150);
      expect(await overflow(page), `${seller} at ${width}px overflows`).toBeLessThanOrEqual(0);
      if (width === 390 || width === 1440) {
        await page.setViewportSize({ width, height: 2400 });
        await page.screenshot({ path: join(SHOTS, `${seller}-${width}.png`) });
        expect(await serious(page), `${seller} at ${width}px`).toEqual([]);
      }
    }
  });
}

// ── Where the cards lead ────────────────────────────────────

test("D2 each card of « À faire maintenant » opens the list that counts the same thing", async ({ as }) => {
  test.setTimeout(5 * 60_000);
  const page = await as("alerts");
  await page.goto("/vendor/dashboard");
  await settle(page);
  const data = await board(page);
  const todo = page.getByRole("region", { name: "À faire maintenant" });

  if (data.tasks.outOfStock > 0) {
    await todo.getByRole("link", { name: /en rupture/ }).click();
    await expect(page).toHaveURL(/\/vendor\/inventory\?level=out_of_stock/);
    await expect(page.getByRole("button", { name: /Rupture/ }).or(page.getByRole("tab", { name: /Rupture/ })).first()).toContainText(String(data.tasks.outOfStock));
    await page.goBack();
    await settle(page);
  }

  if (data.tasks.toConfirm > 0) {
    await todo.getByRole("link", { name: /à traiter/ }).click();
    await expect(page).toHaveURL(/\/vendor\/orders\?status=pending/);
    await expect(page.getByRole("tab", { name: /En attente/ })).toHaveAttribute("aria-selected", "true");
    await page.goBack();
    await settle(page);
  }

  // The figure "À préparer" opens the Confirmée tab.
  await page.getByRole("region", { name: "Chiffres de la période" }).getByRole("link", { name: /À préparer/ }).click();
  await expect(page).toHaveURL(/\/vendor\/orders\?status=confirmed/);
});

test("D3 a recent order opens its detail", async ({ as }) => {
  const page = await as("active");
  await page.goto("/vendor/dashboard");
  await settle(page);
  const data = await board(page);
  test.skip(data.recentOrders.length === 0, "no order on this store");
  const first = data.recentOrders[0] as Json;
  await page.getByRole("link", { name: new RegExp(`#${first.number}`) }).click();
  await expect(page).toHaveURL(new RegExp(`/vendor/orders/${first.id}$`));
  await expect(page.locator("main")).toContainText(first.number, { timeout: 60_000 });
});

// ── Periods ─────────────────────────────────────────────────

test("D4 the period is the statistics' one, in the address, and a custom one is accepted", async ({ as }) => {
  test.setTimeout(5 * 60_000);
  const page = await as("active");
  await page.goto("/vendor/dashboard");
  await settle(page);

  await page.getByRole("button", { name: /Période : 7 derniers jours/ }).click();
  const answer = page.waitForResponse((response) => response.url().includes("view=board") && response.url().includes("period=30j"));
  await page.getByRole("group", { name: "Choisir la période" }).getByRole("button", { name: "30 derniers jours" }).click();
  const thirty = ((await (await answer).json()) as Json).data;
  await expect(page).toHaveURL(/periode=30j/);
  expect(thirty.period.days).toBe(30);
  await expect(page.getByRole("region", { name: "Chiffres de la période" })).toContainText(amount(thirty.kpis.revenue.value));
  await expect(page.getByRole("group", { name: "Période du graphique" }).getByRole("button", { name: "30 jours" })).toHaveAttribute("aria-pressed", "true");

  // The chart's own buttons change the same period.
  await page.getByRole("group", { name: "Période du graphique" }).getByRole("button", { name: "90 jours" }).click();
  await expect(page).toHaveURL(/periode=90j/);

  await page.getByRole("button", { name: /Période : 90 derniers jours/ }).click();
  await page.getByRole("button", { name: "Période personnalisée" }).click();
  await page.getByRole("textbox", { name: "Du" }).fill("2026-09-01");
  await page.getByRole("textbox", { name: "Au" }).fill("2026-09-30");
  await page.getByRole("button", { name: "Appliquer" }).click();
  await expect(page).toHaveURL(/du=2026-09-01&au=2026-09-30/);
  await settle(page);
  const custom = await board(page, "from=2026-09-01&to=2026-09-30");
  expect(custom.period).toMatchObject({ key: "custom", days: 30 });
  await expect(page.getByRole("region", { name: "Chiffres de la période" })).toContainText(amount(custom.kpis.revenue.value));
});

// ── Isolation ───────────────────────────────────────────────

test("D5 a seller never sees another store's orders, and nobody without a session", async ({ as, browser, baseURL }) => {
  const pageA = await as("active");
  await pageA.goto("/vendor/dashboard");
  const a = await board(pageA);
  const pageB = await as("alerts");
  await pageB.goto("/vendor/dashboard");
  const b = await board(pageB);

  const numbersA = new Set((a.recentOrders as Json[]).map((order) => order.number));
  for (const order of b.recentOrders as Json[]) expect(numbersA.has(order.number), `${order.number} of B in A's board`).toBe(false);
  expect((b.stockWatch as Json[]).map((item) => item.name)).toContain("QA Robe fleurie");
  expect((a.stockWatch as Json[]).map((item) => item.name)).not.toContain("QA Robe fleurie");

  const anonymous = await browser.newContext({ baseURL });
  expect((await anonymous.request.get("/api/proxy/sellers/dashboard?view=board")).status()).toBe(401);
  await anonymous.close();
});

// ── Loading and failure ─────────────────────────────────────

test("D6 while loading the page says so; when the board cannot be read, it shows no figure", async ({ as }) => {
  const page = await as("active");
  await page.route(/sellers\/dashboard\?view=board/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Erreur" }) });
  });
  await page.goto("/vendor/dashboard");
  await expect(page.getByRole("status").filter({ hasText: "Chargement du tableau de bord…" })).toBeAttached();
  await page.screenshot({ path: join(SHOTS, "loading-1440.png") });
  await expect(page.getByText("Tableau de bord indisponible")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("button", { name: /Réessayer/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Chiffres de la période" })).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/\b0\s?F\b/);
  await page.screenshot({ path: join(SHOTS, "error-1440.png") });
});
