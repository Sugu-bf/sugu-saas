import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Acceptance run of the DELIVERY CODE (V4.1), across the two sites and a REAL
// backend: the customer reads their code on the marketplace, tells it to the
// courier, the courier enters it on the portal, Laravel says delivered. The
// courier is never answered the code.
//
// Nothing here is a stand-in. It runs on the staging sites, and on a local
// portal and a local marketplace started in front of a local Laravel.
//
//   STAGING_URL=https://pro-zk47m.sugu.pro      the portal
//   STAGING_MARKET_URL=…                        the marketplace of the same backend
//   STAGING_COURIER_PASSWORD=…                  the QA password (or STAGING_AGENCY_PASSWORD: it is the same one)
//   STAGING_ALLOW_MUTATIONS=1                   required for the tests that write, tagged [write]
//   STAGING_PRODUCT_PAID=1                      once the goods of SU-2099-000610 are recorded as paid (see D3)
//   STAGING_SHOTS=…                             where the captures go (default docs/captures/v4.1-recette/<staging|local>)
//
//   npx playwright test -c playwright.staging.config.ts delivery-code
//
// Accounts and orders are those of QaCourierSeeder: the customer
// qa-acheteur-livraison@qa.sugu.test, the courier qa-coursier@qa.sugu.test,
// the agency qa-agence-coursiers@qa.sugu.test (F), its free mission 608,
// the orders SU-2099-000603 (on the way), 604 (at the door), 605 (not on the
// way) and 610 (COD Mixte at the door, goods not paid). The tests that write
// deliver 604, and 610 once paid: run QaCourierSeeder again to put them back.
// No payment is made here and nobody is notified: the payment of 610 is a
// state the operator of the environment records on the QA order.

const env = process.env;
const password = env.STAGING_COURIER_PASSWORD ?? env.STAGING_AGENCY_PASSWORD ?? "";
const MARKET = (env.STAGING_MARKET_URL ?? "").replace(/\/+$/, "");
const BUYER = "qa-acheteur-livraison@qa.sugu.test";
const COURIER = "qa-coursier@qa.sugu.test";
const mayWrite = env.STAGING_ALLOW_MUTATIONS === "1";
const productPaid = env.STAGING_PRODUCT_PAID === "1";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.STAGING_URL ?? "");
const SHOTS = env.STAGING_SHOTS ?? join(__dirname, "..", "..", "docs", "captures", "v4.1-recette", LOCAL ? "local" : "staging");
mkdirSync(SHOTS, { recursive: true });

const WIDTHS = [375, 390, 768, 1280, 1440] as const;
const HEADING = "Code de confirmation de livraison";
const REF = (sequence: number) => `SU-2099-000${sequence}`;
const CODE = /^[A-Z0-9]{6,10}$/;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

test.beforeEach(() => {
  test.skip(!password, "STAGING_COURIER_PASSWORD (or STAGING_AGENCY_PASSWORD) is not set");
  test.skip(!MARKET, "STAGING_MARKET_URL is not set: the marketplace of the same backend");
  test.skip(/^https:\/\/(www\.)?(mysugu\.com|sugu\.pro)/.test(MARKET), "these checks are not meant for the production marketplace");
});

// ── Sessions ────────────────────────────────────────────────

/** The customer, signed in on the marketplace. Its form signs in by phone and OTP; a QA account signs in with its password, through the same BFF. */
type Session = Awaited<ReturnType<BrowserContext["storageState"]>>;
// Each account signs in once per run: a sign-in per test would meet the limit of the sign-in route. The sessions live in memory only.
let customerSession: Session | undefined;
let courierSession: Session | undefined;

async function customer(browser: Browser, width = 390): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL: MARKET, viewport: { width, height: width < 768 ? 844 : 900 }, locale: "fr-FR", storageState: customerSession });
  const page = await context.newPage();
  if (customerSession) return { context, page };
  // A page of the marketplace that asks the API nothing: only its origin is needed to sign in.
  await page.goto("/robots.txt");
  const answer = await page.evaluate(
    async ([login_field, secret]) => {
      const response = await fetch("/api/backend/api/v1/web-auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ login_field, password: secret }),
      });
      return { status: response.status, body: await response.text() };
    },
    [BUYER, password],
  );
  expect(answer.status, "the QA customer signs in: run QaCourierSeeder with the QA password").toBe(200);
  // The session is a cookie the page cannot read: no token comes back to the browser.
  expect(answer.body).not.toMatch(/"token"\s*:/);
  customerSession = await context.storageState();
  return { context, page };
}

async function courier(browser: Browser, baseURL: string | undefined): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, locale: "fr-FR", storageState: courierSession });
  const page = await context.newPage();
  if (courierSession) {
    await page.goto("/driver/dashboard");
    return { context, page };
  }
  await page.goto("/login");
  await page.locator('input[type="email"], input[name="email"]').first().fill(COURIER);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await expect(page).toHaveURL(/\/driver\/dashboard/, { timeout: 90_000 });
  courierSession = await context.storageState();
  return { context, page };
}

// ── Helpers ─────────────────────────────────────────────────

const card = (page: Page) => page.getByRole("region", { name: HEADING });
const shownCode = (page: Page) => page.getByTestId("delivery-code");
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

/** Through the BFF of the marketplace, as the page does. */
async function market(page: Page, path: string, headers: Record<string, string> = {}): Promise<{ status: number; text: string; cache: string }> {
  // From a page of the marketplace: a relative address needs its origin.
  if (!page.url().startsWith(MARKET)) await page.goto("/robots.txt");
  return page.evaluate(
    async ([url, extra]) => {
      const response = await fetch(url as string, { headers: { accept: "application/json", ...(extra as Record<string, string>) } });
      return { status: response.status, text: await response.text(), cache: response.headers.get("cache-control") ?? "" };
    },
    [`/api/backend/api/v1/${path}`, headers] as const,
  );
}

const orderIds = new Map<number, string>();

/** The id of a seeded order, read from the orders of the customer. */
async function orderId(page: Page, sequence: number): Promise<string> {
  if (!orderIds.size) {
    const { status, text } = await market(page, "orders?per_page=50");
    expect(status, "the customer reads their orders").toBe(200);
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) return value.forEach(walk);
      if (!value || typeof value !== "object") return;
      const row = value as Json;
      // The list names an order `displayId`; a raw order, `number`.
      const number = [row.displayId, row.number].find((value) => typeof value === "string") as string | undefined;
      const match = number && typeof row.id === "string" ? /SU-2099-000(\d{3})$/.exec(number) : null;
      if (match) orderIds.set(Number(match[1]), row.id);
      Object.values(row).forEach(walk);
    };
    walk(JSON.parse(text));
  }
  const id = orderIds.get(sequence);
  if (!id) throw new Error(`order ${REF(sequence)} is not among the orders of the QA customer: run QaCourierSeeder`);
  return id;
}

async function track(page: Page, sequence: number): Promise<void> {
  await page.goto(`/track-order?order=${await orderId(page, sequence)}`, { waitUntil: "domcontentloaded" });
  await expect(card(page)).toBeVisible({ timeout: 90_000 });
  await expect(card(page).getByText("Chargement de votre code…")).toHaveCount(0, { timeout: 30_000 });
}

async function mission(page: Page, sequence: number): Promise<Json> {
  for (const scope of ["in_progress", "done"]) {
    const response = await page.request.get(`/api/proxy/courier/deliveries?scope=${scope}&per_page=50`);
    expect(response.status(), `the ${scope} missions of the courier: ${(await response.text()).slice(0, 200)}`).toBe(200);
    const found = ((await response.json()).data?.rows as Json[] | undefined)?.find((row) => row.reference === REF(sequence));
    if (found) return (await (await page.request.get(`/api/proxy/courier/deliveries/${found.id}`)).json()).data;
  }
  throw new Error(`mission ${REF(sequence)} is not in the lists of the QA courier: run QaCourierSeeder`);
}

const write = (title: string) => `[write] ${title}`;

// ── D. The customer reads their code ────────────────────────

test.describe("D. the customer, on the marketplace", () => {
  test("D1 reads the code of a parcel on the way, at every width, and it is kept nowhere", async ({ browser }) => {
    // One page, resized: a page per width would meet the limits of the API.
    const { context, page } = await customer(browser, WIDTHS[0]);
    await track(page, 603);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });

      await expect(shownCode(page), `${width}px`).toHaveText(CODE);
      await expect(card(page)).toContainText("Donnez ce code au livreur au moment de la remise");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `no sideways scroll at ${width}px`).toBe(true);
      const violations = (await new AxeBuilder({ page }).include('section[aria-labelledby="delivery-code-heading"]').withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations.map((v) => v.id);
      expect(violations, `accessibility at ${width}px`).toEqual([]);

      const code = (await shownCode(page).innerText()).trim();
      const kept = await page.evaluate(() => JSON.stringify({ url: location.href, local: { ...localStorage }, session: { ...sessionStorage }, cookie: document.cookie }));
      expect(kept, "the code is in no address, storage or readable cookie").not.toContain(code);
      await card(page).scrollIntoViewIfNeeded();
      await shot(page, `D1-code-disponible-${width}`);
    }
    await context.close();
  });

  test("D2 is told why there is no code yet, and never shown one", async ({ browser }) => {
    const { context, page } = await customer(browser);

    await track(page, 605);
    await expect(shownCode(page)).toHaveCount(0);
    await expect(card(page)).toContainText("dès que le livreur sera en route");
    await shot(page, "D2-pas-encore-en-route-390");

    const answer = await market(page, `orders/${await orderId(page, 605)}/delivery-code`);
    expect(answer.status).toBe(200);
    expect(answer.cache).toContain("no-store");
    expect(JSON.parse(answer.text).data.deliveries[0]).toMatchObject({ state: "not_on_the_way", code: null });
    await context.close();
  });

  test("D3 has no code for a COD Mixte until the goods are paid, whatever the browser says", async ({ browser }) => {
    test.skip(productPaid, "the goods of 610 are recorded as paid: D3 is the state before");
    const { context, page } = await customer(browser);

    await track(page, 610);
    await expect(shownCode(page)).toHaveCount(0);
    await expect(card(page)).toContainText("une fois les produits payés");
    await shot(page, "D3-paiement-en-attente-390");

    const forced = await market(page, `orders/${await orderId(page, 610)}/delivery-code?product_fee_paid=1&paid=true`, { "x-product-fee-paid": "1" });
    expect(JSON.parse(forced.text).data.deliveries[0]).toMatchObject({ state: "product_payment_pending", code: null });
    await context.close();
  });

  test("D4 a code that cannot be checked is not shown: at loading, and again once it was on screen", async ({ browser }) => {
    const { context, page } = await customer(browser);
    const id = await orderId(page, 603);

    await page.route("**/delivery-code", (route) => route.abort("failed"));
    await page.goto(`/track-order?order=${id}`, { waitUntil: "domcontentloaded" });
    await expect(card(page).getByRole("button", { name: "Réessayer" })).toBeVisible({ timeout: 90_000 });
    await expect(card(page)).toContainText("ne peut pas être vérifié");
    await expect(shownCode(page)).toHaveCount(0);
    await shot(page, "D4-erreur-reseau-390");

    await page.unroute("**/delivery-code");
    await card(page).getByRole("button", { name: "Réessayer" }).click();
    await expect(shownCode(page)).toHaveText(CODE, { timeout: 30_000 });
    const code = (await shownCode(page).innerText()).trim();

    // The code is on screen and the network drops: the next check fails, and the code goes.
    await page.route("**/delivery-code", (route) => route.abort("failed"));
    await expect(shownCode(page)).toHaveCount(0, { timeout: 45_000 });
    await expect(card(page)).toContainText("ne peut pas être vérifié");
    await expect(card(page)).toContainText("il reste masqué");
    expect(await card(page).innerText()).not.toContain(code);
    await expect(card(page).getByRole("button", { name: "Réessayer" })).toBeVisible();
    await card(page).scrollIntoViewIfNeeded();
    await shot(page, "D4-code-masque-verification-impossible-390");

    // The network is back: the server confirms, the code is shown again.
    await page.unroute("**/delivery-code");
    await card(page).getByRole("button", { name: "Réessayer" }).click();
    await expect(shownCode(page)).toHaveText(code, { timeout: 30_000 });
    await context.close();
  });

  test("D5 nobody else is answered the code: not a visitor, not the courier, on either site", async ({ browser, baseURL }) => {
    const buyer = await customer(browser);
    const id = await orderId(buyer.page, 603);
    const code = JSON.parse((await market(buyer.page, `orders/${id}/delivery-code`)).text).data.deliveries[0].code as string;
    expect(code).toMatch(CODE);
    await buyer.context.close();

    // A visitor who knows the number of the order.
    const visitor = await browser.newContext({ baseURL: MARKET });
    const anonymous = await visitor.newPage();
    await anonymous.goto("/robots.txt");
    const refused = await market(anonymous, `orders/${id}/delivery-code`);
    expect(refused.status).toBe(401);
    expect(refused.text).not.toContain(code);
    expect(refused.cache).toContain("no-store");
    await visitor.close();

    // The courier who carries this very parcel.
    const carrier = await courier(browser, baseURL);
    const asked = await carrier.page.request.get(`/api/proxy/orders/${id}/delivery-code`);
    // Signed in, and carrying the parcel: the order is still not theirs.
    expect(asked.status()).toBe(404);
    expect(await asked.text()).not.toContain(code);
    const theirs = await mission(carrier.page, 603);
    expect(JSON.stringify(theirs)).not.toContain(code);
    for (const path of [`courier/deliveries/${theirs.id}/codes`, `shipments/${theirs.id}`, `shipments/${theirs.id}/codes`, `shipments?search=${code}`, `shipments?search=${code.slice(0, 3)}`]) {
      const response = await carrier.page.request.get(`/api/proxy/${path}`);
      expect(await response.text(), path).not.toContain(code);
    }
    await carrier.page.goto(`/driver/deliveries/${theirs.id}`);
    await expect(carrier.page.getByRole("heading", { level: 1 })).toContainText(REF(603), { timeout: 30_000 });
    expect(await carrier.page.content()).not.toContain(code);
    await carrier.context.close();
  });
});

// ── E. The handover ─────────────────────────────────────────

/** The customer reads, the courier enters, Laravel says delivered, the customer's screen follows. */
async function handover(browser: Browser, baseURL: string | undefined, sequence: number): Promise<void> {
  const buyer = await customer(browser);
  await track(buyer.page, sequence);
  await expect(shownCode(buyer.page)).toHaveText(CODE);
  const code = (await shownCode(buyer.page).innerText()).trim();
  await card(buyer.page).scrollIntoViewIfNeeded();
  await shot(buyer.page, `E-${sequence}-1-acheteur-lit-son-code`);

  const carrier = await courier(browser, baseURL);
  const before = await mission(carrier.page, sequence);
  expect(before.status).toBe("arrived");
  expect(JSON.stringify(before)).not.toContain(code);
  await carrier.page.goto(`/driver/deliveries/${before.id}`);
  await expect(carrier.page.getByRole("heading", { level: 1 })).toContainText(REF(sequence), { timeout: 30_000 });
  expect(await carrier.page.content()).not.toContain(code);

  await carrier.page.getByRole("button", { name: "J'ai livré le colis" }).click();
  const dialog = carrier.page.getByRole("dialog");
  await dialog.getByLabel("Code de livraison").fill("FAUX0000");
  await dialog.getByRole("button", { name: "Valider la livraison" }).click();
  await expect(dialog.getByRole("alert")).toContainText("invalide");
  expect((await mission(carrier.page, sequence)).status).toBe("arrived");

  await dialog.getByLabel("Code de livraison").fill(code);
  await shot(carrier.page, `E-${sequence}-2-coursier-saisit-le-code`);
  await dialog.getByRole("button", { name: "Valider la livraison" }).click();
  await expect(carrier.page.locator("header").getByText("Terminée")).toBeVisible({ timeout: 30_000 });

  const after = await mission(carrier.page, sequence);
  expect(after.status).toBe("delivered");
  expect(after.delivered_at).toBeTruthy();
  expect(after.next_actions).toEqual([]);
  await shot(carrier.page, `E-${sequence}-3-coursier-livraison-terminee`);

  // The customer's screen follows: delivered, and no code any more.
  await buyer.page.reload({ waitUntil: "domcontentloaded" });
  await expect(card(buyer.page)).toContainText("Votre commande a été remise", { timeout: 60_000 });
  await expect(shownCode(buyer.page)).toHaveCount(0);
  expect(await buyer.page.content()).not.toContain(code);
  await card(buyer.page).scrollIntoViewIfNeeded();
  await shot(buyer.page, `E-${sequence}-4-acheteur-apres-remise`);

  await buyer.context.close();
  await carrier.context.close();
}

test.describe("E. the handover", () => {
  test.beforeEach(() => {
    test.skip(!mayWrite, "set STAGING_ALLOW_MUTATIONS=1 to run the tests that write on the QA missions");
  });

  test(write("E1 a parcel at the door is delivered with the code its customer read on the marketplace"), async ({ browser, baseURL }) => {
    await handover(browser, baseURL, 604);
  });

  test(write("E2 a COD Mixte whose goods are not paid is not delivered, even with the right code"), async ({ browser, baseURL }) => {
    test.skip(productPaid, "the goods of 610 are recorded as paid: E2 is the state before");
    const carrier = await courier(browser, baseURL);
    const waiting = await mission(carrier.page, 610);
    expect(waiting.status).toBe("arrived");
    expect(waiting.next_actions).not.toContain("mark_delivered");

    // The code the seeder fixes for this order: the courier is not told it, and it would not be enough.
    const forced = await carrier.page.request.post(`/api/proxy/courier/deliveries/${waiting.id}/mark-delivered`, { data: { code: "QAD00610" } });
    expect(forced.status()).toBeGreaterThanOrEqual(400);
    expect((await mission(carrier.page, 610)).status).toBe("arrived");

    await carrier.page.goto(`/driver/deliveries/${waiting.id}`);
    await expect(carrier.page.getByRole("heading", { level: 1 })).toContainText(REF(610), { timeout: 30_000 });
    await expect(carrier.page.getByRole("button", { name: "J'ai livré le colis" })).toHaveCount(0);
    await expect(carrier.page.locator("main").locator('[role="alert"], [role="status"]').filter({ hasText: "Le client n'a pas encore tout réglé" })).toBeVisible();
    await shot(carrier.page, "E2-coursier-attend-le-paiement");
    await carrier.context.close();
  });

  test(write("E3 once the goods are paid, the customer reads the code and the COD Mixte is delivered with it"), async ({ browser, baseURL }) => {
    test.skip(!productPaid, "record the goods of SU-2099-000610 as paid on the QA order, then set STAGING_PRODUCT_PAID=1");
    await handover(browser, baseURL, 610);
  });
});

// ── F. The agency, its courier and the customer ─────────────

const AGENCY = "qa-agence-coursiers@qa.sugu.test";
let agencySession: Session | undefined;

/** The agency of the QA couriers, signed in on the portal. */
async function agency(browser: Browser, baseURL: string | undefined): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 }, locale: "fr-FR", storageState: agencySession });
  const page = await context.newPage();
  if (agencySession) {
    await page.goto("/agency/dashboard");
    return { context, page };
  }
  await page.goto("/login");
  await page.locator('input[type="email"], input[name="email"]').first().fill(AGENCY);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await expect(page).toHaveURL(/\/agency\/dashboard/, { timeout: 90_000 });
  agencySession = await context.storageState();
  return { context, page };
}

/** The API through the portal, with the session of the page, as its screens call it. */
function through(page: Page, baseURL: string | undefined) {
  const headers = { Accept: "application/json", Origin: baseURL ?? "" };
  return {
    data: async (path: string): Promise<Json> => {
      const response = await page.request.get(`/api/proxy/${path}`, { headers });
      expect(response.status(), `GET ${path}`).toBe(200);
      return (await response.json()).data;
    },
    post: async (path: string, data: Json = {}): Promise<{ status: number; json: Json | null }> => {
      const response = await page.request.post(`/api/proxy/${path}`, { headers, data });
      return { status: response.status(), json: await response.json().catch(() => null) };
    },
  };
}

test.describe("F. the agency, its courier and the customer", () => {
  test.beforeEach(() => {
    test.skip(!mayWrite, "set STAGING_ALLOW_MUTATIONS=1 to run the tests that write on the QA missions");
  });

  test(write("F1 a free mission goes from the agency to the customer's door: assigned, accepted, carried, delivered with a code the server drew"), async ({ browser, baseURL }) => {
    test.setTimeout(300_000);
    const office = await agency(browser, baseURL);
    const desk = through(office.page, baseURL);
    const me = await (await office.page.request.get("/api/auth/me")).json();
    const agencyId = String(me?.data?.delivery_partner_id ?? me?.data?.user?.delivery_partner_id);

    // The mission nobody carries yet, and the people of the agency.
    const rows = (await desk.data(`agencies/${agencyId}/shipments?per_page=50`)).shipments as Json[];
    const free = rows.find((row) => row.order?.order_number === REF(608));
    expect(free, `${REF(608)} is a delivery of the QA agency: run QaCourierSeeder`).toBeTruthy();
    const delivery = () => desk.data(`agencies/${agencyId}/shipments/${free!.id}`);
    expect((await delivery()).courier ?? null, `${REF(608)} is free: run QaCourierSeeder again`).toBeNull();
    const people = (await desk.data(`agencies/${agencyId}/couriers?per_page=100`)).couriers as Json[];
    const named = (name: string) => people.find((person) => (person.user?.name ?? "") === name);
    const assign = (person: Json | undefined) => desk.post(`agencies/${agencyId}/shipments/${free!.id}/assign`, { courier_id: person?.user_id });

    // Who cannot work is refused by the server itself, and the mission stays free.
    for (const [name, code] of [["QA Coursier Suspendu", "SUGU-COURIER-SUSPENDED"], ["QA Coursier En Attente", "SUGU-COURIER-NOT-VERIFIED"]] as const) {
      const refused = await assign(named(name));
      expect(refused.status, `${name} is refused`).toBe(422);
      expect(refused.json?.error_code).toBe(code);
    }
    expect((await assign(named("QA Coursier Refuse"))).status, "a courier whose file is refused").toBe(422);
    expect((await delivery()).courier ?? null).toBeNull();

    // The customer: no courier, no code.
    const buyer = await customer(browser);
    const order = await orderId(buyer.page, 608);
    const codeState = async () => JSON.parse((await market(buyer.page, `orders/${order}/delivery-code`)).text).data.deliveries[0] as Json;
    expect(await codeState()).toMatchObject({ state: "not_issued", code: null });

    // The agency gives it to the courier who can work, and sees him on the delivery.
    const moussa = named("QA Coursier Moussa");
    expect(moussa, "the QA courier who can work").toBeTruthy();
    expect((await assign(moussa)).status).toBe(200);
    expect((await delivery()).courier?.user_id).toBe(moussa!.user_id);
    await office.page.goto(`/agency/deliveries/${free!.id}`);
    await expect(office.page.getByRole("heading", { level: 1 })).toContainText(REF(608), { timeout: 30_000 });
    await expect(office.page.locator("main")).toContainText("QA Coursier Moussa");
    await shot(office.page, "F1-1-agence-mission-assignee");

    // The courier finds it among the missions to accept, and accepts it on his phone.
    const carrier = await courier(browser, baseURL);
    const road = through(carrier.page, baseURL);
    const offered = (await road.data("courier/deliveries?scope=offered&per_page=50")).rows as Json[];
    const mine = offered.find((row) => row.reference === REF(608));
    expect(mine, "the mission is offered to the courier the agency chose").toBeTruthy();
    await carrier.page.goto("/driver/deliveries?liste=disponibles");
    const offer = carrier.page.locator("[data-mission]").filter({ hasText: REF(608) });
    await expect(offer).toBeVisible({ timeout: 30_000 });
    await shot(carrier.page, "F1-2-coursier-mission-a-accepter");
    await offer.getByRole("button", { name: "Accepter" }).click();
    await expect(carrier.page.getByRole("heading", { level: 1 })).toHaveText(`Mission ${REF(608)}`, { timeout: 30_000 });

    // Accepted: the server drew a code. Neither the courier nor the agency is answered it; the customer not yet.
    const accepted = await road.data(`courier/deliveries/${mine!.id}`);
    expect(accepted.delivery_code_issued, "a code now exists").toBe(true);
    expect(await codeState()).toMatchObject({ state: "not_on_the_way", code: null });
    expect((await delivery()).status).toBe("assigned");

    // He leaves, then arrives: the agency follows each step.
    await carrier.page.getByRole("button", { name: "Démarrer la livraison" }).click();
    await expect(carrier.page.locator("header").getByText("En transit")).toBeVisible({ timeout: 30_000 });
    expect((await delivery()).status).toBe("in_transit");
    const onTheWay = await codeState();
    expect(onTheWay.state).toBe("available");
    expect(onTheWay.code).toMatch(CODE);
    // A code the server drew, not one the seeder fixes.
    expect(onTheWay.code).not.toMatch(/^QAD00/);
    for (const answer of [await road.data(`courier/deliveries/${mine!.id}`), await delivery(), await desk.data(`agencies/${agencyId}/shipments?per_page=50`)]) {
      expect(JSON.stringify(answer), "neither the courier nor the agency is answered the code").not.toContain(onTheWay.code);
    }
    await carrier.page.getByRole("button", { name: "Confirmer l'arrivée" }).click();
    await expect(carrier.page.locator("header").getByText("Arrivé")).toBeVisible({ timeout: 30_000 });
    expect((await delivery()).status).toBe("arrived");
    await buyer.context.close();
    await carrier.context.close();

    // The handover, with the code the customer reads on the marketplace.
    await handover(browser, baseURL, 608);

    // Delivered, for the agency too, on its screen as in its list.
    expect((await delivery()).status).toBe("delivered");
    await office.page.goto(`/agency/deliveries/${free!.id}`);
    await expect(office.page.getByRole("heading", { level: 1 })).toContainText(REF(608), { timeout: 30_000 });
    await expect(office.page.locator("main").getByText("Livrée").first()).toBeVisible();
    expect(await office.page.content()).not.toContain(onTheWay.code);
    await shot(office.page, "F1-3-agence-mission-livree");
    await office.context.close();
  });

  test("F2 a courier who may not work signs in to his file, and is given no mission by the server", async ({ browser, baseURL }) => {
    for (const [account, landing] of [["qa-coursier-suspendu@qa.sugu.test", /Compte suspendu/], ["qa-coursier-attente@qa.sugu.test", /Dossier (incomplet|en cours de vérification)/]] as const) {
      const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, locale: "fr-FR" });
      const page = await context.newPage();
      await page.goto("/login");
      await page.locator('input[type="email"], input[name="email"]').first().fill(account);
      await page.locator('input[type="password"]').first().fill(password);
      await page.getByRole("button", { name: /Se connecter/ }).click();
      await expect(page, `${account} lands on their file`).toHaveURL(/\/driver\/documents/, { timeout: 90_000 });
      await expect(page.locator("main")).toContainText(landing);
      for (const path of ["courier/dashboard", "courier/deliveries?scope=offered", "courier/deliveries/available"]) {
        expect((await page.request.get(`/api/proxy/${path}`)).status(), `${account}: ${path}`).toBe(403);
      }
      await context.close();
    }
  });
});
