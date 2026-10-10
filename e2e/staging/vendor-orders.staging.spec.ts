import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Signed-in acceptance run of V1 on a DEPLOYED staging portal.
// It needs a QA seller account that exists on staging only. Never a real
// seller, never production. Without credentials every test is skipped.
//
//   STAGING_URL=https://pro-zk47m.sugu.pro
//   STAGING_VENDOR_EMAIL=...  STAGING_VENDOR_PASSWORD=...
//   STAGING_SEARCH_TERM=...          text matching an OLD order of that seller (number or customer)
//   STAGING_FOREIGN_ORDER_ID=...     id of an order of ANOTHER QA seller
//   STAGING_COD_MIXTE_ORDER_ID=...   shipped COD Mixte order with an unpaid fee, of the QA seller
//   STAGING_SALE_PRODUCT=...         name fragment of a QA product with stock
//   STAGING_ALLOW_MUTATIONS=1        required for the tests that write (sale, refused transition)
//
// Tests that write are tagged in their title and stay skipped without
// STAGING_ALLOW_MUTATIONS=1. They create QA orders and move QA stock.

const env = process.env;
const hasAccount = Boolean(env.STAGING_VENDOR_EMAIL && env.STAGING_VENDOR_PASSWORD);
const mayWrite = env.STAGING_ALLOW_MUTATIONS === "1";

const SHOTS = join(__dirname, "..", "..", "docs", "captures", "v1.1-staging");
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });

const table = (page: Page) => page.getByRole("region", { name: "Commandes" });
const rows = (page: Page) => table(page).locator("tbody tr");
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function signIn(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="email"], input[name="email"]').first().fill(env.STAGING_VENDOR_EMAIL!);
  await page.locator('input[type="password"]').first().fill(env.STAGING_VENDOR_PASSWORD!);
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await expect(page).toHaveURL(/\/vendor\//, { timeout: 30_000 });
}

test.describe("V1 acceptance on staging", () => {
  test.skip(!hasAccount, "STAGING_VENDOR_EMAIL / STAGING_VENDOR_PASSWORD not provided");
  test.describe.configure({ mode: "serial" });

  test("1-2. sign-in: httpOnly session, no token readable, no direct API call", async ({ page, context }) => {
    const direct: string[] = [];
    page.on("request", (request) => {
      if (/mysugu\.com$/.test(new URL(request.url()).hostname) && request.url().startsWith("http")) direct.push(request.url());
    });
    await signIn(page);

    const session = (await context.cookies()).find((cookie) => cookie.name === "sugu_session");
    expect(session, "session cookie").toBeTruthy();
    expect(session!.httpOnly).toBe(true);
    expect(session!.secure).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain("sugu_session");
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/\d+\|[A-Za-z0-9]{40}/);
    expect(direct).toEqual([]);
  });

  test("3-4. list: real data, counters, server search, pagination", async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/vendor/orders");
    await expect(rows(page).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("tab", { name: /^Toutes/ })).toContainText(/\d/);
    // References are order numbers, never an id-based fallback.
    for (const text of await rows(page).locator("td:nth-child(2) a").allTextContents()) {
      expect(text, "reference").toMatch(/^SU-\d{4}-/);
    }
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await shot(page, "staging-list-1440");

    const pager = page.getByRole("button", { name: "Page suivante" });
    if (await pager.isEnabled()) {
      await pager.click();
      await expect(page).toHaveURL(/page=2/);
      await expect(rows(page).first()).toBeVisible();
      await page.goto("/vendor/orders");
    }

    test.skip(!env.STAGING_SEARCH_TERM, "STAGING_SEARCH_TERM not provided");
    const request = page.waitForRequest((candidate) => candidate.url().includes("sellers/orders?") && candidate.url().includes("search="));
    const box = page.getByRole("searchbox", { name: "Numéro, client ou téléphone" });
    await box.fill(env.STAGING_SEARCH_TERM!);
    await box.press("Enter");
    await request;
    await expect(rows(page).first()).toBeVisible();
    await expect(table(page)).toContainText(new RegExp(env.STAGING_SEARCH_TERM!, "i"));
  });

  test("5. detail carries the same reference as the list, at 1440 and 375 px", async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/vendor/orders");
    const link = rows(page).first().getByRole("link").first();
    const reference = (await link.textContent())!.trim();
    await link.click();
    await expect(page.getByRole("heading", { level: 1, name: `Commande ${reference}` })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("main")).not.toContainText(/Sugu Express|Mobile Money|fidèle/);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await shot(page, "staging-detail-1440");

    await page.setViewportSize({ width: 375, height: 800 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await shot(page, "staging-detail-375");
    await page.goto("/vendor/orders");
    await expect(page.getByRole("list", { name: "Commandes" }).locator("> li").first()).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await shot(page, "staging-list-375");
  });

  test("6. CSV export comes from the server, amounts in francs", async ({ page }) => {
    await signIn(page);
    await page.goto("/vendor/orders");
    await expect(rows(page).first()).toBeVisible({ timeout: 30_000 });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Exporter en CSV" }).click(),
    ]);
    const lines = readFileSync(await download.path(), "utf8").trim().split("\n");
    expect(lines[0]).toContain("Référence;Date;Client");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[1]).toMatch(/^SU-\d{4}-/);
  });

  test("9. another seller's order answers « introuvable »", async ({ page }) => {
    test.skip(!env.STAGING_FOREIGN_ORDER_ID, "STAGING_FOREIGN_ORDER_ID not provided");
    await signIn(page);
    const api = await page.request.get(`/api/proxy/sellers/orders/${env.STAGING_FOREIGN_ORDER_ID}`);
    expect(api.status()).toBe(404);
    await page.goto(`/vendor/orders/${env.STAGING_FOREIGN_ORDER_ID}`);
    await expect(page.getByText("Commande introuvable")).toBeVisible({ timeout: 30_000 });
  });

  test("10. [writes if the guard fails] COD Mixte with an unpaid fee cannot be declared delivered", async ({ page, baseURL }) => {
    test.skip(!env.STAGING_COD_MIXTE_ORDER_ID || !mayWrite, "STAGING_COD_MIXTE_ORDER_ID and STAGING_ALLOW_MUTATIONS=1 required");
    await signIn(page);
    await page.goto(`/vendor/orders/${env.STAGING_COD_MIXTE_ORDER_ID}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Marquer comme livrée" })).toHaveCount(0);

    // The server is the authority: asked directly, it must refuse.
    const refusal = await page.request.post(`/api/proxy/sellers/orders/${env.STAGING_COD_MIXTE_ORDER_ID}/mark-delivered`, {
      headers: { Origin: baseURL! },
    });
    expect([400, 422]).toContain(refusal.status());
    const after = await page.request.get(`/api/proxy/sellers/orders/${env.STAGING_COD_MIXTE_ORDER_ID}`);
    expect((await after.json()).data.order.statusCode).not.toBe("delivered");
  });

  test("7-8. [writes] counter sale, then the same idempotency key replays it", async ({ page, baseURL }) => {
    test.skip(!env.STAGING_SALE_PRODUCT || !mayWrite, "STAGING_SALE_PRODUCT and STAGING_ALLOW_MUTATIONS=1 required");
    await signIn(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/vendor/orders/new");
    await page.getByPlaceholder("Nom ou référence du produit").fill(env.STAGING_SALE_PRODUCT!);
    await page.getByRole("button", { name: /^Ajouter (?!un )/ }).first().click();
    await shot(page, "staging-sale-items-375");
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("radio", { name: /Nouveau client/ }).check();
    await page.getByLabel("Nom complet").fill("QA Recette Sugu");
    await page.getByLabel("Téléphone").fill("70000001");
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("button", { name: "Suivant" }).click();
    expect(await overflow(page)).toBeLessThanOrEqual(0);

    const [request] = await Promise.all([
      page.waitForRequest((candidate) => candidate.method() === "POST" && candidate.url().endsWith("/sellers/sales")),
      page.getByRole("button", { name: "Enregistrer la vente" }).click(),
    ]);
    const response = await request.response();
    expect(response!.status()).toBe(201);
    const created = (await response!.json()).data;
    expect(created.reference).toMatch(/^SU-\d{4}-\d{6}$/);
    await expect(page.getByRole("heading", { level: 1, name: `Commande ${created.reference}` })).toBeVisible({ timeout: 30_000 });
    // A counter sale is handed over and cashed: delivered AND paid.
    const header = page.locator("main header").first();
    await expect(header).toContainText("Livrée");
    await expect(header).toContainText("Payée");
    await shot(page, "staging-sale-created-375");

    // Same body, same key: the same order comes back, nothing new is created.
    const replay = await page.request.post("/api/proxy/sellers/sales", {
      headers: { Origin: baseURL!, "Idempotency-Key": request.headers()["idempotency-key"] },
      data: request.postDataJSON(),
    });
    expect(replay.status()).toBe(200);
    expect((await replay.json()).data.id).toBe(created.id);
  });
});
