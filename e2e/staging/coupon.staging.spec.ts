import { expect, request as playwrightRequest, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Acceptance run of a SELLER COUPON in the buyer's browser, on the
// marketplace, against a real backend (V10; the check V7 left open: the
// coupon had been proven through the API only).
//
//   STAGING_MARKET_URL=…                  the marketplace of the backend under test
//   STAGING_AGENCY_PASSWORD=…             the QA password (QaProPortalSeeder)
//   STAGING_ALLOW_MUTATIONS=1             required: the QA buyer's cart is written
//   STAGING_SHOTS=…                       where the captures go
//
//   npx playwright test -c playwright.staging.config.ts coupon
//
// Data of QaCommerceSeeder: store A's coupons QAV7DIX (10 %, from 10 000 F),
// QAV7EXPIRE (ended), QAV7EPUISE (used up), store B's QAV7RIVAL (50 %);
// products "QA V7 Baskets Sport" (A, 25 000 F) and "QA V7 Produit de B"
// (B, 30 000 F). The buyer is qa-acheteur-livraison@qa.sugu.test
// (QaCourierSeeder). No order is placed and nothing is paid; the cart is
// emptied at the end.
const env = process.env;
const password = env.STAGING_COURIER_PASSWORD ?? env.STAGING_AGENCY_PASSWORD ?? "";
const MARKET = (env.STAGING_MARKET_URL ?? "").replace(/\/+$/, "");
const BUYER = "qa-acheteur-livraison@qa.sugu.test";
const mayWrite = env.STAGING_ALLOW_MUTATIONS === "1";
const SHOTS = env.STAGING_SHOTS ?? join(__dirname, "..", "..", "docs", "captures", "v10-release-hardening", "coupon");
mkdirSync(SHOTS, { recursive: true });
const API = "/api/backend/api/v1";
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);
test.beforeEach(() => {
  test.skip(!password, "STAGING_AGENCY_PASSWORD is not set");
  test.skip(!MARKET, "STAGING_MARKET_URL is not set");
  test.skip(!mayWrite, "STAGING_ALLOW_MUTATIONS=1 is required: the QA buyer's cart is written");
  test.skip(/^https:\/\/(www\.)?(mysugu\.com|sugu\.pro)/.test(MARKET), "not for the production marketplace");
});

let context: BrowserContext;
let page: Page;

/** A call to the API through the marketplace's own relay, as the page makes it. */
async function api(method: string, path: string, body?: unknown): Promise<{ status: number; body: Json }> {
  return page.evaluate(
    async ([m, p, b]) => {
      const response = await fetch(p as string, {
        method: m as string,
        credentials: "include",
        headers: { accept: "application/json", ...(b ? { "content-type": "application/json" } : {}) },
        body: b ? JSON.stringify(b) : undefined,
      });
      return { status: response.status, body: await response.json().catch(() => ({})) };
    },
    [method, `${API}/${path}`, body ?? null] as const,
  );
}

async function signIn(browser: Browser) {
  context = await browser.newContext({ baseURL: MARKET, viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  page = await context.newPage();
  await page.goto("/robots.txt");
  const login = await api("POST", "web-auth/login", { login_field: BUYER, password });
  expect(login.status, "the QA buyer signs in").toBe(200);
}

/**
 * The id of a QA product, read in its seller's catalogue on the portal: the
 * QA stores are not verified, so the marketplace neither lists nor finds them.
 * Adding to the cart by id is what the product page itself sends.
 */
async function productId(sellerEmail: string, name: string): Promise<string> {
  const portal = await playwrightRequest.newContext({ baseURL: env.STAGING_URL });
  const login = await portal.post("/api/auth/login", { data: { email: sellerEmail, password }, headers: { origin: env.STAGING_URL ?? "" } });
  expect(login.status(), `${sellerEmail} signs in on the portal`).toBe(200);
  const answer = await portal.get(`/api/proxy/sellers/products?search=${encodeURIComponent(name)}`);
  const body = (await answer.json()) as Json;
  const list: Json[] = body?.data?.products ?? body?.data?.data ?? body?.data ?? [];
  const product = (Array.isArray(list) ? list : []).find((p) => p.name === name);
  await portal.post("/api/auth/logout", { headers: { origin: env.STAGING_URL ?? "" } });
  await portal.dispose();
  expect(product, `the product "${name}" is found`).toBeTruthy();
  return String(product!.id);
}

async function cart(): Promise<Json> {
  const answer = await api("GET", "cart");
  expect(answer.status).toBe(200);
  return answer.body.data;
}

/** "−2 500 FCFA" / "27 500 F" as a number of francs. */
const francs = (text: string) => Number(text.replace(/[^\d]/g, ""));
const summary = () => page.locator("text=Résumé de la commande").locator("xpath=ancestor::div[contains(@class,'p-6')]");
const row = (label: string) => summary().locator("div", { has: page.getByText(label, { exact: true }) }).last();

async function openCart() {
  await page.goto("/cart");
  await expect(page.getByText("Résumé de la commande")).toBeVisible({ timeout: 30_000 });
}

async function applyCode(code: string) {
  await page.getByLabel("Code promo").fill(code);
  await expect(page.getByLabel("Code promo")).toHaveValue(code);
  const answered = page.waitForResponse((r) => r.url().includes("cart/coupon/apply"));
  await page.getByRole("button", { name: "Appliquer" }).click();
  return answered;
}

test.beforeAll(async ({ browser }) => {
  await signIn(browser);
  await api("DELETE", "cart");
});

test.afterAll(async () => {
  await api("POST", "cart/coupon/remove").catch(() => null);
  await api("DELETE", "cart").catch(() => null);
  await context?.close();
});

const discountOf = (server: Json) => Number(server.totals?.discount ?? 0);
const subtotalOf = (server: Json) => Number(server.totals?.subtotal ?? 0);
/** What the coupon alone took off store A, measured in K1 and expected again in K4. */
let couponPartA = 0;

test("K1 a code of store A takes 10 % off store A's goods, on top of their promotion, and the page says what the server computed", async () => {
  const baskets = await productId("qa-vendeur-a@qa.sugu.test", "QA V7 Baskets Sport");
  expect((await api("POST", "cart/items", { product_id: baskets, qty: 1 })).status).toBeLessThan(300);
  // The product has its own promotion (QaCommerceSeeder: 20 %): the coupon comes on the reduced price.
  const without = await cart();

  await openCart();
  const applied = await applyCode("QAV7DIX");
  expect((await applied).status()).toBe(200);
  await expect(page.getByText("QAV7DIX", { exact: true })).toBeVisible();

  const server = await cart();
  couponPartA = discountOf(server) - discountOf(without);
  expect(couponPartA, "10 % of what store A's goods cost after their promotion").toBe(Math.round((subtotalOf(without) - discountOf(without)) * 0.1));
  expect(couponPartA).toBeGreaterThan(0);
  await expect.poll(async () => francs(await row("Réduction").innerText()), { message: "the discount on the page is the server's" }).toBe(discountOf(server));
  await expect.poll(async () => francs(await row("Total").innerText()), { message: "the total on the page is the server's" }).toBe(Number(server.totals?.total));
  await page.screenshot({ path: join(SHOTS, "k1-code-applique-1440.png"), fullPage: true });
});

test("K2 removing the code puts the total back", async () => {
  const before = await cart();
  await page.getByLabel("Supprimer le code promo").click();
  await expect(page.getByLabel("Code promo")).toBeVisible();
  const after = await cart();
  expect(discountOf(before) - discountOf(after), "only the coupon's part goes").toBe(couponPartA);
  expect(Number(after.totals?.total)).toBe(Number(before.totals?.total) + couponPartA);
  await expect.poll(async () => francs(await row("Total").innerText())).toBe(Number(after.totals?.total));
});

test("K3 an ended, a used-up and another store's code are refused, with a message and no discount", async () => {
  const before = await cart();
  for (const code of ["QAV7EXPIRE", "QAV7EPUISE", "QAV7RIVAL"]) {
    const answered = await applyCode(code);
    expect((await answered).status(), code).toBeGreaterThanOrEqual(400);
    await expect(page.getByRole("alert").filter({ hasText: /./ }).first()).toBeVisible();
    expect(discountOf(await cart()), `${code} takes nothing off`).toBe(discountOf(before));
    await page.getByLabel("Code promo").fill("");
  }
  await page.screenshot({ path: join(SHOTS, "k3-code-refuse-1440.png"), fullPage: true });
});

test("K4 in a cart of two stores, a code of store A reduces store A's goods only", async () => {
  const rival = await productId("qa-vendeur-b@qa.sugu.test", "QA V7 Produit de B");
  expect((await api("POST", "cart/items", { product_id: rival, qty: 1 })).status).toBeLessThan(300);
  const without = await cart();
  await openCart();
  const applied = await applyCode("QAV7DIX");
  expect((await applied).status()).toBe(200);
  const server = await cart();
  expect(discountOf(server) - discountOf(without), "the same part as with store A alone: nothing taken off store B").toBe(couponPartA);
  await expect.poll(async () => francs(await row("Réduction").innerText())).toBe(discountOf(server));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(SHOTS, "k4-panier-deux-boutiques-390.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
});
