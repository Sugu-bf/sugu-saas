import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Acceptance run of the AGENCY workspace (V3.1) against a REAL backend: the
// eight screens, what they read, what they change, who may do it.
//
// Nothing here is a stand-in: the portal under STAGING_URL talks to its own
// Laravel. It runs on the staging portal, and on a local portal started in
// front of a local Laravel seeded by QaProPortalSeeder — the report says
// which, check by check ("staging" / "local").
//
//   STAGING_URL=https://pro-zk47m.sugu.pro
//   STAGING_AGENCY_EMAIL=qa-agence@qa.sugu.test   STAGING_AGENCY_PASSWORD=…   (or in .env.staging.local)
//   STAGING_ALLOW_MUTATIONS=1    required for the tests that write, tagged [write]
//   STAGING_TOUCH_SEED=1         lets them also move the SEEDED deliveries (accept a request…): local runs
//   STAGING_FOREIGN_SHIPMENT_ID / STAGING_FOREIGN_COURIER_ID / FOREIGN_COURIER_USER_ID
//                                a delivery and a courier (his profile, his account) of ANOTHER agency, where one exists
//   STAGING_SHOTS=…              where the captures go (default docs/captures/v3.1-recette/<staging|local>)
//
//   npx playwright test -c playwright.staging.config.ts agency
//
// Only an account of the QA seeder (@qa.sugu.test) is accepted. What the run
// creates is named « QA Recette <stamp> » and listed at its end. Nothing
// prints the credentials; the config records no trace.

const env = process.env;
const email = env.STAGING_AGENCY_EMAIL ?? "";
const hasAccount = Boolean(email && env.STAGING_AGENCY_PASSWORD);
const isQaAccount = /@qa\.sugu\.test$/i.test(email);
const mayWrite = env.STAGING_ALLOW_MUTATIONS === "1";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.STAGING_URL ?? "");
const TARGET = LOCAL ? "local" : "staging";
/** Seeded deliveries are moved on a local run, or when asked: on staging the data set stays as seeded. */
const mayTouchSeed = mayWrite && (LOCAL || env.STAGING_TOUCH_SEED === "1");
const STAMP = env.STAGING_RUN_STAMP ?? "0000000000";

const SHOTS = env.STAGING_SHOTS ?? join(__dirname, "..", "..", "docs", "captures", "v3.1-recette", TARGET);
mkdirSync(SHOTS, { recursive: true });

const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;
const PHONE = 768;
const TOUCH_TARGET = 44;

/** What the run creates: found again by these names, whatever worker asks. */
const RECIPIENT = `QA Recette ${STAMP}`;
const SENDER = "QA Recette Expéditeur";
const COURIER_FIRST = "QA Recette";
const COURIER_LAST = `Livreur ${STAMP}`;
const COURIER_NAME = `${COURIER_FIRST} ${COURIER_LAST}`;
/** In the block of numbers the seeder uses (+226 70 00 0x xx): nobody is called, nothing is sent. */
const COURIER_PHONE = `+22670009${STAMP.slice(-3)}`;
const COURIER_EMAIL = `qa-recette-livreur-${STAMP}@qa.sugu.test`;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// ── Session ─────────────────────────────────────────────────

let storage: Awaited<ReturnType<BrowserContext["storageState"]>> | null = null;

/** Signs in once per worker, through the form of the portal. The session lives in memory only. */
async function sessionOf(browser: Browser, baseURL: string | undefined) {
  if (storage) return storage;
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto("/login");
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(env.STAGING_AGENCY_PASSWORD!);
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await expect(page, "the QA agency lands on its dashboard").toHaveURL(/\/agency\/dashboard/, { timeout: 60_000 });
  storage = await context.storageState();
  await context.close();
  return storage;
}

/** Map tiles that could not be loaded: refused by the content security policy the browser was served, or not relayed by the portal. */
let refusedTiles = 0;

/** What went wrong while a page was used: an error of the page, of the console, or an answer of the API that is not a success. */
function watch(page: Page, problems: string[]) {
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // The realtime socket is not part of this run, and a failed request is listed with its status below.
    if (/WebSocket|wss?:\/\/|Failed to load resource/.test(text)) return;
    // A portal older than the relay of the tiles asks them of another site, which the policy served in front
    // of it refuses: counted apart, and told once by the check of the map (G1).
    if (/tile\.openstreetmap\.org/.test(text) && /Content Security Policy/.test(text)) {
      refusedTiles += 1;
      return;
    }
    problems.push(`console: ${text.slice(0, 240)}`);
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    // A tile the portal could not relay (the tile server out of reach): counted with the refused ones, told by the check of the map.
    if (url.pathname.startsWith("/api/map-tiles/")) {
      if (response.status() >= 400) refusedTiles += 1;
      return;
    }
    if (url.pathname.startsWith("/api/") && response.status() >= 400) problems.push(`${response.status()} ${response.request().method()} ${url.pathname}`);
  });
}

// `provide` is what Playwright calls `use`: under that name the linter takes it for the React hook.
const test = base.extend<{ agency: Page; problems: string[] }>({
  problems: async ({}, provide) => {
    await provide([]);
  },
  agency: async ({ browser, baseURL, problems }, provide) => {
    const context = await browser.newContext({ baseURL, storageState: await sessionOf(browser, baseURL), viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
    const page = await context.newPage();
    watch(page, problems);
    await provide(page);
    await context.close();
  },
});

// ── The API, through the portal, with the session of the page ──

function through(page: Page, baseURL: string | undefined) {
  const headers = { Accept: "application/json", Origin: baseURL ?? "" };
  const read = async (response: Awaited<ReturnType<Page["request"]["get"]>>) => ({ status: response.status(), json: (await response.json().catch(() => null)) as Json | null });
  return {
    get: async (path: string) => read(await page.request.get(`/api/proxy/${path}`, { headers })),
    send: async (method: "POST" | "PUT", path: string, data: Json = {}) => read(await page.request.fetch(`/api/proxy/${path}`, { method, headers, data })),
    /** The `data` of a read that must succeed. */
    data: async (path: string): Promise<Json> => {
      const answer = await read(await page.request.get(`/api/proxy/${path}`, { headers }));
      expect(answer.status, `GET ${path}`).toBe(200);
      return answer.json?.data;
    },
  };
}

async function agencyIdOf(page: Page): Promise<string> {
  const me = await (await page.request.get("/api/auth/me")).json();
  const id = me?.data?.delivery_partner_id ?? me?.data?.user?.delivery_partner_id;
  expect(id, "the session carries the agency of the account").toBeTruthy();
  return String(id);
}

/** Every delivery the list returns for a query, page after page (the API serves fifty at most). */
async function deliveriesOf(page: Page, baseURL: string | undefined, query = ""): Promise<{ rows: Json[]; first: Json }> {
  const agency = await agencyIdOf(page);
  const api = through(page, baseURL);
  const first = await api.data(`agencies/${agency}/shipments?per_page=50${query ? `&${query}` : ""}`);
  const rows: Json[] = [...first.shipments];
  for (let next = 2; next <= first.pagination.last_page; next += 1) {
    rows.push(...(await api.data(`agencies/${agency}/shipments?per_page=50&page=${next}${query ? `&${query}` : ""}`)).shipments);
  }
  return { rows, first };
}

async function couriersOf(page: Page, baseURL: string | undefined, query = ""): Promise<Json> {
  const agency = await agencyIdOf(page);
  return through(page, baseURL).data(`agencies/${agency}/couriers?per_page=100${query ? `&${query}` : ""}`);
}

const numberOf = (row: Json): string => row.order?.order_number ?? "";
const courierNamed = (couriers: Json, name: string): Json | undefined => couriers.couriers.find((courier: Json) => (courier.user?.name ?? "") === name);

// ── What a screen shows ─────────────────────────────────────

const intOf = (text: string | null | undefined) => Number((text ?? "").replace(/[^\d-]/g, "") || NaN);
const francsOf = (centimes: number) => Math.round(centimes / 100);
/** « 1 500 FCFA », whatever kind of space separates the thousands. */
const money = (francs: number) => new RegExp(`${francs.toLocaleString("fr-FR").replace(/[\s  ]/g, "\\s")}\\sFCFA`);

const pageAlert = (page: Page) => page.locator("main").getByRole("alert");
const table = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
const rows = (page: Page, name: string) => table(page, name).locator("tbody tr");
const cards = (page: Page, name: string) => page.getByRole("list", { name }).locator("> li");
const dialog = (page: Page) => page.getByRole("dialog");
const confirmation = (page: Page) => page.getByRole("alertdialog");
const panel = (page: Page, title: string) => page.locator("section").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
const listHeading = (page: Page) => page.getByRole("heading", { level: 2, name: /livraison/ });
const next = (page: Page) => page.getByRole("button", { name: "Suivant" });
const summary = (page: Page) => pageAlert(page).filter({ hasText: /champs? à corriger/ });

/** The figure of a key-figure card, by the label of the card. */
async function figure(region: Locator, label: string): Promise<number> {
  const card = region.locator("> div").filter({ hasText: label }).first();
  await expect(card.locator(".text-kpi").first(), `the figure « ${label} » is drawn`).toBeVisible();
  return intOf(await card.locator(".text-kpi").first().textContent());
}

async function choose(scope: Page | Locator, text: string | RegExp) {
  const card = scope.locator("label").filter({ hasText: text });
  await card.click();
  await expect(card.getByRole("radio")).toBeChecked();
}

const sidewaysOverflow = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, main ? main.scrollWidth - main.clientWidth : 0);
  });

/** What sticks out of the page content on the right, element by element (a scroller of its own may hold more than it shows). */
const cutOnTheRight = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return ["no <main>"];
    const limit = main.getBoundingClientRect().right;
    const cut: string[] = [];
    for (const element of main.querySelectorAll<HTMLElement>("h1, h2, button, a, input, select, textarea, [role='img']")) {
      const bounds = element.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) continue;
      let scroller = element.parentElement;
      let scrolled = false;
      while (scroller && scroller !== main) {
        const overflowX = getComputedStyle(scroller).overflowX;
        if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden") {
          scrolled = true;
          break;
        }
        scroller = scroller.parentElement;
      }
      if (!scrolled && bounds.right > limit + 1) cut.push(`${element.tagName.toLowerCase()} "${(element.textContent ?? "").trim().slice(0, 30)}" +${Math.round(bounds.right - limit)}px`);
    }
    return cut;
  });

/** Pairs of things drawn over one another in the heading of a phone card: a number under its badges, for instance. */
const overlapsInCards = (page: Page, name: string) =>
  page.getByRole("list", { name }).evaluate((list) => {
    const out: string[] = [];
    for (const card of list.querySelectorAll<HTMLElement>(":scope > li")) {
      const title = card.querySelector<HTMLElement>("a[href]");
      const badges = [...card.querySelectorAll<HTMLElement>(".rounded-badge")];
      if (!title) continue;
      const a = title.getBoundingClientRect();
      for (const badge of badges) {
        const b = badge.getBoundingClientRect();
        const overlap = a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
        if (overlap) out.push(`${(title.textContent ?? "").trim()} / ${(badge.textContent ?? "").trim()}`);
      }
    }
    return out;
  });

async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target.join(" ")).slice(0, 3) }));
}

/** The whole page in one picture: the scroller of the pages is made as tall as its content. */
async function shot(page: Page, name: string) {
  const size = page.viewportSize() ?? { width: 1440, height: 900 };
  const height = await page.locator("main").evaluate((main) => main.scrollHeight + (main.getBoundingClientRect().top + 8));
  await page.setViewportSize({ width: size.width, height: Math.min(Math.max(height, 600), 7000) });
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
  await page.setViewportSize(size);
}

async function open(page: Page, path: string, heading?: string | RegExp) {
  await page.goto(path);
  await expect(page.locator('[data-shell="pro"][data-role="agency"]')).toBeVisible({ timeout: 30_000 });
  if (heading) await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading, { timeout: 30_000 });
}

/** Nothing failed while the page was used, but what a test expected to fail. */
function expectNoProblem(problems: string[], expected: RegExp[] = []) {
  expect(problems.filter((problem) => !expected.some((pattern) => pattern.test(problem)))).toEqual([]);
}

const note = (key: string, value: unknown) => {
  test.info().annotations.push({ type: key, description: typeof value === "string" ? value : JSON.stringify(value) });
  console.log(`[${TARGET}] ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
};

/** The delivery the run created, found again by the name of its recipient. */
async function createdDelivery(page: Page, baseURL: string | undefined): Promise<Json | undefined> {
  const { rows: found } = await deliveriesOf(page, baseURL, `search=${encodeURIComponent(RECIPIENT)}`);
  return found[0];
}

// ── Without an account ──────────────────────────────────────
// What can be told of an environment by anyone: which portal it serves, that
// the QA agency exists, and that nothing of the agency workspace is served
// without a session. Read only.

base.describe(`V3.1 agency, without an account — ${TARGET}`, () => {
  base("S1. the portal serves V3, and the QA agency of the seeder exists behind it", async ({ request }) => {
    const login = await request.get("/login");
    expect(login.status()).toBe(200);
    const sheets = [...new Set((await login.text()).match(/\/_next\/static\/[^"\\]*\.css/g) ?? [])];
    expect(sheets.length, "the login page links its style sheets").toBeGreaterThan(0);
    const css = (await Promise.all(sheets.map(async (sheet) => (await request.get(sheet)).text()))).join(" ");
    // Tokens that came with the agency workspace (V3): the radius of a badge, the agency density.
    expect(css, "the style sheet is the one of V3").toContain("--radius-badge");

    // The directory of agencies is public: the BFF relays it without a session.
    const directory = await request.get("/api/proxy/agencies", { headers: { Accept: "application/json" } });
    expect(directory.status()).toBe(200);
    const partners: Json[] = (await directory.json()).data.partners;
    const qa = partners.find((partner) => partner.code === "QA-RECETTE");
    console.log(`[${TARGET}] agencies behind the portal: ${partners.map((partner) => partner.code).join(", ")}`);
    // Only the seeder of sugu 45b421b7 creates it: listed, that seeder ran on a backend that holds it.
    expect(qa, "the QA agency of the seeder (QaProPortalSeeder, sugu 45b421b7) is listed").toBeTruthy();
    expect(qa).toMatchObject({ name: "QA Agence Recette", isActive: true });
    // Its identifier is a ULID: its first ten characters are the moment it was created.
    const created = [...String(qa!.id).slice(0, 10)].reduce((time, char) => time * 32 + "0123456789abcdefghjkmnpqrstvwxyz".indexOf(char), 0);
    console.log(`[${TARGET}] QA agency ${qa!.id} created ${new Date(created).toISOString()}`);
  });

  base("S2. without a session the agency workspace serves nothing, and writes nothing", async ({ page, request, baseURL }) => {
    const partners: Json[] = (await (await request.get("/api/proxy/agencies", { headers: { Accept: "application/json" } })).json()).data.partners;
    const id = partners.find((partner) => partner.code === "QA-RECETTE")?.id ?? partners[0]?.id ?? "01zzzzzzzzzzzzzzzzzzzzzzzz";

    for (const path of ["/agency/dashboard", "/agency/deliveries", "/agency/deliveries/new", "/agency/drivers", "/agency/drivers/new"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(new RegExp(`/login\\?redirect=${encodeURIComponent(path)}$`));
    }
    for (const path of [`agencies/${id}/dashboard`, `agencies/${id}/shipments`, `agencies/${id}/shipments/export`, `agencies/${id}/couriers`, `agencies/${id}/couriers/export`, "partners/drivers/referral-code"]) {
      const answer = await request.get(`/api/proxy/${path}`, { headers: { Accept: "application/json" } });
      expect(answer.status(), `GET ${path}`).toBe(401);
      expect(await answer.text(), path).not.toMatch(/QA Livreur|SU-2099/);
    }
    // A write without a session: stopped by Laravel (401) when it comes from the portal, by the portal (403) from anywhere else.
    const own = await request.post(`/api/proxy/agencies/${id}/shipments`, { headers: { Origin: baseURL ?? "", Accept: "application/json" }, data: {} });
    expect(own.status()).toBe(401);
    const foreign = await request.post(`/api/proxy/agencies/${id}/couriers/register`, { headers: { Origin: "https://example.org", Accept: "application/json" }, data: {} });
    expect(foreign.status()).toBe(403);
    expect((await foreign.json()).code).toBe("CSRF_REJECTED");
    expect((await request.get("/api/auth/me")).status()).toBe(401);
  });
});

test.describe(`V3.1 agency acceptance — ${TARGET}`, () => {
  test.skip(!hasAccount, "STAGING_AGENCY_EMAIL / STAGING_AGENCY_PASSWORD not provided");
  test.skip(hasAccount && !isQaAccount, "STAGING_AGENCY_EMAIL is not an account of the QA seeder (@qa.sugu.test)");

  // ── A. Session and backend ────────────────────────────────

  test("A1. sign-in: an httpOnly session, no token in the page, no call to the API host from the browser", async ({ agency }) => {
    const direct: string[] = [];
    agency.on("request", (request) => {
      const host = new URL(request.url()).hostname;
      if (/mysugu\.com$/.test(host) || (LOCAL && request.url().includes(":8010"))) direct.push(request.url());
    });
    await open(agency, "/agency/dashboard", /^Bonjour/);

    const session = (await agency.context().cookies()).find((cookie) => cookie.name === "sugu_session");
    expect(session, "session cookie").toBeTruthy();
    expect(session!.httpOnly).toBe(true);
    // Over https only: a local run is plain http.
    if (!LOCAL) expect(session!.secure).toBe(true);
    expect(await agency.evaluate(() => document.cookie)).not.toContain("sugu_session");
    expect(await agency.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/\d+\|[A-Za-z0-9]{40}/);
    expect(direct).toEqual([]);

    const me = (await (await agency.request.get("/api/auth/me")).json()).data;
    expect(me.role).toBe("agency");
    expect(me.email).toBe(email);
    note("agency", { name: me.business_name, id: me.delivery_partner_id });
  });

  test("A2. which backend answers: the contract of V3, and what V3.1 adds to it", async ({ agency, baseURL }) => {
    await open(agency, "/agency/dashboard", /^Bonjour/);
    const id = await agencyIdOf(agency);
    const api = through(agency, baseURL);
    const { rows: all, first } = await deliveriesOf(agency, baseURL);
    const couriers = await couriersOf(agency, baseURL);
    const dashboard = await api.data(`agencies/${id}/dashboard`);
    const pressing = await api.get(`agencies/${id}/shipments?scope=needs_action&per_page=1`);
    const detail = all[0] ? await api.data(`agencies/${id}/shipments/${all[0].id}`) : null;
    const mixte = all.find((row) => row.status === "awaiting_fee_payment" || row.order?.payment_status === "unpaid");

    const level = {
      // V3 (8111e44c … dd203a37): what the eight screens read.
      listGroups: Boolean(first.overview && "late" in first.overview),
      listZones: Array.isArray(first.zones),
      rowSaysWhatIsAllowed: all.length === 0 ? "no delivery to tell" : "next_statuses" in all[0] && "can_assign" in all[0],
      pressingScope: pressing.status === 200 && pressing.json?.data?.pagination?.total === dashboard.priority?.total,
      dashboardOfTheDay: Boolean(dashboard.today && dashboard.priority && Array.isArray(dashboard.activityByHour) && dashboard.couriers?.live),
      courierActivity: Boolean(couriers.overview && couriers.quartiers) && (couriers.couriers.length === 0 || "activity" in couriers.couriers[0]),
      pageJourney: detail === null ? "no delivery to tell" : Boolean(detail.journey),
      // V3.1: found by this very run. Absent, the portal falls back and the report says so.
      paymentInOneWord: all.length === 0 ? "no delivery to tell" : "payment_status_code" in (all[0].order ?? {}),
      codMixteToldAsOne: mixte ? Boolean(mixte.cod_mixte?.isCodMixte) : "no COD Mixte delivery to tell",
    };
    note("backend", level);

    for (const key of ["listGroups", "listZones", "rowSaysWhatIsAllowed", "pressingScope", "dashboardOfTheDay", "courierActivity", "pageJourney"] as const) {
      expect(level[key], `V3 backend expected (${key}): deploy sugu 45b421b7 first`).not.toBe(false);
    }
    expect.soft(level.paymentInOneWord, "V3.1 backend: `payment_status_code` in a row (the portal shows the raw status until then)").not.toBe(false);
    expect.soft(level.codMixteToldAsOne, "V3.1 backend: `cod_mixte` answered for a COD Mixte delivery (never answered before)").not.toBe(false);
  });

  // ── B. Dashboard (§8) ─────────────────────────────────────

  test("B1. dashboard: the agency, its figures and its pressing deliveries are those of Laravel", async ({ agency, baseURL, problems }) => {
    await open(agency, "/agency/dashboard", /^Bonjour/);
    const id = await agencyIdOf(agency);
    const api = through(agency, baseURL);
    const dashboard = await api.data(`agencies/${id}/dashboard`);
    const me = (await (await agency.request.get("/api/auth/me")).json()).data;

    await expect(agency.getByRole("heading", { level: 1 })).toHaveText(`Bonjour, ${me.business_name} !`);

    const figures = agency.getByRole("region", { name: "Chiffres du jour" });
    const shown = {
      toAssign: await figure(figures, "À assigner"),
      onTheWay: await figure(figures, "En cours"),
      deliveredToday: await figure(figures, "Livrées aujourd'hui"),
      failedToday: await figure(figures, "Échecs"),
      revenueToday: await figure(figures, "Revenus du jour"),
    };
    note("dashboard figures", shown);
    expect(shown).toEqual({
      toAssign: dashboard.overview.toAssign,
      onTheWay: dashboard.overview.onTheWay,
      deliveredToday: dashboard.today.delivered,
      failedToday: dashboard.today.failed,
      revenueToday: francsOf(dashboard.today.revenue),
    });
    // No indicator beside a figure, and no figure invented: each one is the size of a list of the server.
    await expect(figures).not.toContainText(/[+−-]\d+ ?%/);
    for (const [scope, value] of [["to_assign", shown.toAssign], ["on_the_way", shown.onTheWay], ["delivered_today", shown.deliveredToday]] as const) {
      const listed = await api.data(`agencies/${id}/shipments?scope=${scope}&per_page=1`);
      expect(listed.pagination.total, `the list of « ${scope} » has the size the dashboard shows`).toBe(value);
    }

    // What is late and what waits for a decision: said only when there is something to say.
    const late = pageAlert(agency).filter({ hasText: /livraisons? en retard/ });
    if (dashboard.overview.late > 0) {
      await expect(late).toContainText(new RegExp(`^${dashboard.overview.late} livraisons? en retard`));
      await expect(late.getByRole("link", { name: "Voir les livraisons" })).toHaveAttribute("href", "/agency/deliveries?scope=late");
    } else await expect(late).toHaveCount(0);
    const requests = agency.getByRole("status").filter({ hasText: /votre décision/ });
    if (dashboard.overview.awaitingDecision > 0) await expect(requests).toContainText(new RegExp(`^${dashboard.overview.awaitingDecision} demandes? attend`));
    else await expect(requests).toHaveCount(0);

    // The pressing deliveries: the ones the server lists, in its order.
    await expect(agency.getByRole("heading", { name: /Livraisons prioritaires/ })).toContainText(String(dashboard.priority.total));
    const listed = rows(agency, "Livraisons prioritaires");
    if (dashboard.priority.shipments.length > 0) {
      await expect(listed).toHaveCount(dashboard.priority.shipments.length);
      const numbers = await listed.locator("td:first-child").allTextContents();
      expect(numbers.map((text) => text.trim())).toEqual(dashboard.priority.shipments.map(numberOf));
    } else await expect(agency.getByText("Aucune livraison ne demande d'action")).toBeVisible();

    // Who is at work.
    const live = panel(agency, "Suivi en direct");
    if (dashboard.couriers.live.length > 0) {
      await expect(live.getByRole("listitem")).toHaveCount(dashboard.couriers.live.length);
      await expect(live.getByRole("listitem").first()).toContainText(dashboard.couriers.live[0].name);
    } else await expect(live).toContainText("Aucun livreur en activité");

    await shot(agency, "tableau-de-bord-1440");
    expectNoProblem(problems);
  });

  test("B2. dashboard: a figure opens the list it counts, and a pressing delivery opens its page", async ({ agency, baseURL }) => {
    await open(agency, "/agency/dashboard", /^Bonjour/);
    const figures = agency.getByRole("region", { name: "Chiffres du jour" });
    const onTheWay = await figure(figures, "En cours");
    await figures.getByRole("button", { name: "En cours" }).click();
    await expect(agency).toHaveURL(/\/agency\/deliveries\?scope=on_the_way$/);
    await expect(listHeading(agency)).toHaveText(new RegExp(`^${onTheWay} livraisons?$`));

    await open(agency, "/agency/dashboard", /^Bonjour/);
    const pressing = (await through(agency, baseURL).data(`agencies/${await agencyIdOf(agency)}/dashboard`)).priority.shipments as Json[];
    if (pressing.length > 0) {
      // The first of the server is the first of the table, once the table is drawn.
      const number = numberOf(pressing[0]);
      const first = rows(agency, "Livraisons prioritaires").first();
      await expect(first).toContainText(number);
      await first.getByRole("link", { name: number }).click();
      await expect(agency.getByRole("heading", { level: 1 })).toHaveText(`Livraison ${number}`);
    }
    // The quick actions lead somewhere real.
    await open(agency, "/agency/dashboard", /^Bonjour/);
    await agency.locator("main").getByRole("link", { name: "Nouvelle course" }).click();
    await expect(agency.getByRole("heading", { level: 1 })).toHaveText("Nouvelle course");
    expect(baseURL).toBeTruthy();
  });

  test("B3. dashboard: it says it is loading, and that it failed — never zero deliveries for a failure", async ({ agency }) => {
    // The real answer, held back: the page says it is loading and shows no figure meanwhile.
    await agency.route("**/api/proxy/agencies/*/dashboard", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.continue();
    });
    await agency.goto("/agency/dashboard");
    await expect(agency.locator('main [aria-busy="true"]').first()).toBeVisible();
    await expect(agency.getByRole("region", { name: "Chiffres du jour" }).locator(".text-kpi")).toHaveCount(0);
    await expect(agency.getByRole("region", { name: "Chiffres du jour" }).locator(".text-kpi").first()).toBeVisible({ timeout: 30_000 });
    await agency.unroute("**/api/proxy/agencies/*/dashboard");

    // A failure, injected in the browser (the backend is not touched): said as a failure.
    await agency.route("**/api/proxy/agencies/*/dashboard", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, message: "Service indisponible" }) }));
    await agency.goto("/agency/dashboard");
    await expect(pageAlert(agency).filter({ hasText: "Le tableau de bord n'a pas pu être chargé" })).toBeVisible({ timeout: 30_000 });
    await expect(agency.getByRole("region", { name: "Chiffres du jour" })).toHaveCount(0);
    await expect(agency.getByText("Aucune livraison ne demande d'action")).toHaveCount(0);

    await agency.unroute("**/api/proxy/agencies/*/dashboard");
    await agency.getByRole("button", { name: "Réessayer" }).click();
    await expect(agency.getByRole("region", { name: "Chiffres du jour" }).locator(".text-kpi").first()).toBeVisible({ timeout: 30_000 });
  });

  // ── C. Deliveries list (§9) ───────────────────────────────

  test("C1. deliveries: the list, its groups and its statuses are counted by the server, each status worded as Laravel words it", async ({ agency, baseURL, problems }) => {
    await open(agency, "/agency/deliveries", "Livraisons");
    const { rows: all, first } = await deliveriesOf(agency, baseURL);
    note("deliveries", { total: first.pagination.total, statusCounts: first.statusCounts, overview: first.overview });

    await expect(listHeading(agency)).toHaveText(new RegExp(`^${first.pagination.total} livraisons?$`));
    await expect(rows(agency, "Livraisons")).toHaveCount(Math.min(10, first.pagination.total));

    const groups = agency.getByRole("region", { name: "Livraisons par situation" });
    const shown = {
      toAssign: await figure(groups, "À assigner"),
      onTheWay: await figure(groups, "En cours"),
      deliveredToday: await figure(groups, "Livrées aujourd'hui"),
      failed: await figure(groups, "Échecs"),
      late: await figure(groups, "En retard"),
    };
    expect(shown).toEqual({ toAssign: first.overview.toAssign, onTheWay: first.overview.onTheWay, deliveredToday: first.overview.deliveredToday, failed: first.overview.failed, late: first.overview.late });
    await expect(groups).toContainText(`Hier : ${first.overview.deliveredYesterday}`);

    // Each group filters the list to its own size.
    for (const [label, value] of [["En retard", shown.late], ["À assigner", shown.toAssign], ["En cours", shown.onTheWay]] as const) {
      await groups.getByRole("button", { name: label }).click();
      await expect(listHeading(agency), label).toHaveText(new RegExp(`^${value} livraisons?$`));
      await expect(groups.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
      await groups.getByRole("button", { name: label }).click();
      await expect(listHeading(agency)).toHaveText(new RegExp(`^${first.pagination.total} livraisons?$`));
    }

    // Each status of the enum: the count of the server, and the words of AgencyShipmentService::STATUS_LABELS.
    const LABELS: Record<string, string> = {
      pending: "À assigner",
      awaiting_fee_payment: "Frais attendus",
      assigned: "À ramasser",
      picked_up: "Colis collecté",
      in_transit: "En livraison",
      arrived: "Chez le client",
      delivery_failed: "Échec",
      delivered: "Livrée",
    };
    expect(Object.keys(first.statusCounts).filter((key) => key !== "all").sort(), "the statuses Laravel declares are the ones this run knows").toEqual(Object.keys(LABELS).sort());
    for (const [status, label] of Object.entries(LABELS)) {
      // « À assigner » is the group the figure above counts: accepted, and waiting for a courier.
      // By its status alone it also listed the requests to accept (V3.1).
      const count = status === "pending" ? first.overview.toAssign : first.statusCounts[status];
      await agency.getByLabel("Statut").selectOption(status);
      await expect(agency, status).toHaveURL(status === "pending" ? /scope=to_assign/ : new RegExp(`status=${status}`));
      await expect(listHeading(agency), status).toHaveText(new RegExp(`^${count} livraisons?$`));
      if (count === 0) continue;
      // A request the agency has not accepted reads « À accepter », whatever its code; the others read their status.
      const decided = all.filter((row) => row.status === status && !row.awaiting_decision).length;
      await expect(async () => {
        await expect(rows(agency, "Livraisons")).toHaveCount(Math.min(10, count));
        const badges = (await rows(agency, "Livraisons").locator(".rounded-badge").allTextContents()).map((text) => text.trim());
        expect(badges.join(" | "), `no delivery of status ${status} is shown as unknown`).not.toMatch(/Statut inconnu|Code non reconnu/);
        if (decided > 0) expect(badges, `« ${label} » is the word for ${status}`).toContain(label);
        if (status === "pending") expect(badges, "nothing to accept is listed among what is to assign").not.toContain("À accepter");
      }, status).toPass({ timeout: 20_000 });
    }
    await agency.getByLabel("Statut").selectOption("");

    await shot(agency, "livraisons-1440");
    expectNoProblem(problems);
  });

  test("C2. deliveries: the search is the server's, filters combine, and the address remembers them", async ({ agency, baseURL, problems }) => {
    await open(agency, "/agency/deliveries", "Livraisons");
    const { rows: all, first } = await deliveriesOf(agency, baseURL);
    test.skip(all.length === 0, "no delivery to search");
    const search = agency.getByRole("searchbox", { name: "N° de course, client, téléphone ou livreur" });
    const total = async (query: string) => (await deliveriesOf(agency, baseURL, query)).first.pagination.total;
    const sample = all.find((row) => row.courier) ?? all[0];
    const terms = [numberOf(sample), numberOf(sample).slice(-6), sample.order.shipping_address.name.split(" ").pop()!.toLowerCase(), sample.order.shipping_address.phone];
    if (sample.courier) terms.push(sample.courier.name.split(" ").pop()!.toUpperCase());
    for (const term of terms) {
      const expected = await total(`search=${encodeURIComponent(term)}`);
      expect(expected, `the server finds « ${term} »`).toBeGreaterThan(0);
      await search.fill(term);
      await agency.keyboard.press("Enter");
      await expect(listHeading(agency), term).toHaveText(new RegExp(`^${expected} livraisons?$`));
    }

    // A phone as it is typed, with its spaces: found by a V3.1 backend.
    const digits = String(sample.order.shipping_address.phone).replace(/\D/g, "").slice(-8);
    const spaced = digits.replace(/(\d{2})(?=\d)/g, "$1 ");
    expect.soft(await total(`search=${encodeURIComponent(spaced)}`), `V3.1 backend: « ${spaced} » finds the phone it is the digits of`).toBeGreaterThan(0);

    // Nothing found is said as such, with a way back.
    await search.fill("zzzz-introuvable");
    await agency.keyboard.press("Enter");
    await expect(listHeading(agency)).toHaveText("0 livraison");
    await expect(agency.getByText("Aucune livraison ne correspond")).toBeVisible();
    await agency.getByRole("button", { name: "Effacer la recherche" }).click();
    await expect(listHeading(agency)).toHaveText(new RegExp(`^${first.pagination.total} livraisons?$`));

    // Two filters together, as the server combines them; a reload lands on the same list.
    // Any status but « À assigner », which the filter reads as a group of its own (see C1).
    const status = Object.entries(first.statusCounts as Record<string, number>).find(([key, count]) => key !== "all" && key !== "pending" && count > 0)![0];
    await agency.getByLabel("Statut").selectOption(status);
    await agency.getByLabel("Date de création").selectOption("today");
    const combined = await total(`status=${status}&date=today`);
    await expect(listHeading(agency)).toHaveText(new RegExp(`^${combined} livraisons?$`));
    await expect(agency).toHaveURL(new RegExp(`status=${status}`));
    await agency.reload();
    await expect(listHeading(agency)).toHaveText(new RegExp(`^${combined} livraisons?$`));
    await expect(agency.getByLabel("Statut")).toHaveValue(status);

    // The courier and the priority sit behind « Filtres avancés ».
    const couriers = await couriersOf(agency, baseURL);
    const busy = couriers.couriers.find((courier: Json) => courier.active_shipments > 0);
    if (busy) {
      await agency.getByRole("button", { name: "Tout afficher" }).first().click();
      await agency.getByRole("button", { name: /Filtres avancés/ }).click();
      await dialog(agency).getByLabel("Livreur").selectOption({ label: busy.user.name });
      await dialog(agency).getByRole("button", { name: "Voir les résultats" }).click();
      const his = await total(`courier_id=${busy.user_id}`);
      await expect(listHeading(agency)).toHaveText(new RegExp(`^${his} livraisons?$`));
      await expect(agency).toHaveURL(new RegExp(`courier=${busy.user_id}`));
    }
    expectNoProblem(problems);
  });

  test("C3. deliveries: sorted and paged by the server", async ({ agency, baseURL, problems }) => {
    await open(agency, "/agency/deliveries", "Livraisons");
    const { rows: all, first } = await deliveriesOf(agency, baseURL);
    const total = first.pagination.total;
    test.skip(total < 2, "not enough deliveries to sort");
    const pagination = agency.getByRole("navigation", { name: "Pagination" });
    await expect(pagination).toContainText(`Affichage de 1 à ${Math.min(10, total)} sur ${total} livraison`);

    if (total > 10) {
      await pagination.getByRole("button", { name: "Page 2", exact: true }).click();
      await expect(pagination).toContainText(`Affichage de 11 à ${Math.min(20, total)} sur ${total} livraison`);
      await expect(rows(agency, "Livraisons")).toHaveCount(Math.min(10, total - 10));
      await expect(agency).toHaveURL(/page=2/);
      // No delivery of the first page is listed again on the second.
      const second = (await rows(agency, "Livraisons").locator("td:nth-child(2)").allTextContents()).map((text) => text.trim());
      expect(second.filter((number) => all.slice(0, 10).map(numberOf).includes(number))).toEqual([]);
    }
    await pagination.getByLabel("Nombre de lignes par page").selectOption("25");
    await expect(rows(agency, "Livraisons")).toHaveCount(Math.min(25, total));

    // By amount, both ways: the first row is the cheapest, then the dearest, of the whole list.
    const amounts = all.map((row) => row.shipping_amount as number);
    await table(agency, "Livraisons").getByRole("button", { name: "Montant" }).click();
    await expect(agency).toHaveURL(/sort=shipping_amount&dir=asc/);
    await expect(rows(agency, "Livraisons").first()).toContainText(money(francsOf(Math.min(...amounts))));
    await table(agency, "Livraisons").getByRole("button", { name: "Montant" }).click();
    await expect(agency).toHaveURL(/sort=shipping_amount(?!.*dir=asc)/);
    await expect(rows(agency, "Livraisons").first()).toContainText(money(francsOf(Math.max(...amounts))));
    expectNoProblem(problems);
  });

  test("C4. deliveries: a failure is said as a failure, not as an empty list", async ({ agency }) => {
    await agency.route("**/api/proxy/agencies/*/shipments?*", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ success: false, message: "Erreur lors du chargement des livraisons." }) }));
    await agency.goto("/agency/deliveries");
    await expect(pageAlert(agency).filter({ hasText: "Les livraisons n'ont pas pu être chargées" })).toBeVisible({ timeout: 30_000 });
    await expect(agency.getByText("Aucune livraison pour le moment")).toHaveCount(0);
    await expect(agency.getByText(/^0 livraison$/)).toHaveCount(0);
    await agency.unroute("**/api/proxy/agencies/*/shipments?*");
    await agency.getByRole("button", { name: "Réessayer" }).click();
    await expect(listHeading(agency)).toHaveText(/^\d+ livraisons?$/, { timeout: 30_000 });
  });

  test("C5. deliveries on a phone: one card a delivery, its number never under its status, every filter in one sheet", async ({ agency, baseURL, problems }) => {
    for (const width of [375, 390]) {
      await agency.setViewportSize({ width, height: 844 });
      await open(agency, "/agency/deliveries", "Livraisons");
      const { first } = await deliveriesOf(agency, baseURL);
      await expect(table(agency, "Livraisons")).toBeHidden();
      await expect(cards(agency, "Livraisons")).toHaveCount(Math.min(10, first.pagination.total));
      expect(await overlapsInCards(agency, "Livraisons"), `at ${width}px, a number and a status are never drawn over one another`).toEqual([]);
      expect(await sidewaysOverflow(agency), `at ${width}px`).toBe(0);
    }
    const card = cards(agency, "Livraisons").first();
    await card.getByRole("button", { name: "Voir plus" }).click();
    await expect(card).toContainText("Paiement");
    await agency.getByRole("button", { name: "Filtres" }).click();
    for (const label of ["Statut", "Date de création", "Livreur", "Priorité"]) await expect(dialog(agency).getByLabel(label)).toBeVisible();
    await agency.keyboard.press("Escape");
    await shot(agency, "livraisons-390");
    expectNoProblem(problems);
  });

  // ── D. Delivery page (§10) ────────────────────────────────

  test("D1. delivery page: every value shown is the one Laravel answers, and nothing is invented", async ({ agency, baseURL, problems }) => {
    await open(agency, "/agency/dashboard", /^Bonjour/);
    const id = await agencyIdOf(agency);
    const { rows: all } = await deliveriesOf(agency, baseURL);
    const row = all.find((entry) => entry.status === "in_transit" && entry.courier) ?? all.find((entry) => entry.courier) ?? all[0];
    test.skip(!row, "no delivery to open");
    const detail = await through(agency, baseURL).data(`agencies/${id}/shipments/${row.id}`);
    const address = detail.order.shipping_address;
    note("delivery opened", { number: numberOf(detail), status: detail.status, position: detail.position ? "known" : "none", distance: detail.position?.distance_km ?? null });

    await open(agency, `/agency/deliveries/${row.id}`, `Livraison ${numberOf(detail)}`);
    const client = panel(agency, "Client destinataire");
    await expect(client).toContainText(address.name);
    await expect(client).toContainText(address.phone);
    await expect(client).toContainText(new RegExp(`${detail.recipient.deliveries_count} livraisons? avec votre agence`));
    await expect(panel(agency, "Adresse de livraison")).toContainText(address.line1);
    await expect(agency.getByRole("link", { name: "Appeler le client" })).toHaveAttribute("href", `tel:${String(address.phone).replace(/\s/g, "")}`);

    const parcel = panel(agency, "Informations du colis");
    await expect(parcel).toContainText(numberOf(detail));
    await expect(parcel).toContainText(detail.source === "agency_manual" ? "Saisie par votre agence" : "Marketplace SUGU");
    if (detail.pickup?.name) await expect(parcel).toContainText(detail.pickup.name);
    for (const item of detail.order.items ?? []) await expect(parcel).toContainText(item.name);
    // The goods are worth what the lines of the order say; its total, when it differs, is said apart.
    const goods = detail.source === "agency_manual" || (detail.order.items ?? []).length === 0 ? detail.order.total : detail.order.items.reduce((sum: number, item: Json) => sum + item.unit_price * item.qty, 0);
    await expect(parcel).toContainText(money(francsOf(goods)));

    const payment = panel(agency, "Informations de paiement");
    await expect(payment).toContainText(money(francsOf(detail.shipping_amount)));
    await expect(payment).not.toContainText(/Statut inconnu/);
    if (!detail.cod_mixte && goods !== detail.order.total) await expect(payment).toContainText(money(francsOf(detail.order.total)));

    if (detail.courier) {
      const courier = panel(agency, "Livreur assigné");
      await expect(courier).toContainText(detail.courier.name);
      await expect(courier.getByRole("link", { name: detail.courier.phone })).toHaveAttribute("href", `tel:${String(detail.courier.phone).replace(/\s/g, "")}`);
    }

    // The progress: the steps of the server, the dates it recorded, and « Date non enregistrée » for what it did not date.
    const steps = agency.getByRole("region", { name: "Avancement de la livraison" }).getByRole("list", { name: "Étapes de la livraison" }).getByRole("listitem");
    const journey = detail.journey.steps.filter((step: Json) => step.key !== "accepted");
    await expect(steps).toHaveCount(journey.length);
    const current = journey.findIndex((step: Json) => step.status === "current");
    if (current >= 0) await expect(steps.nth(current)).toHaveAttribute("aria-current", "step");
    for (const [index, step] of journey.entries()) {
      if (step.status === "done" && step.timestamp === null) await expect(steps.nth(index), `${step.key} was reached at a moment nothing recorded`).toContainText("Date non enregistrée");
    }

    // A position only when a phone sent one; a distance only when the address is located.
    const map = agency.getByRole("link", { name: /Dernière position connue|Le livreur est à/ });
    if (detail.position) {
      await expect(map.first()).toHaveAttribute("href", new RegExp(`query=${detail.position.lat},${detail.position.lng}`));
      if (detail.position.distance_km === null) await expect(agency.getByText(/Le livreur est à [\d,]+ km/)).toHaveCount(0);
    } else {
      await expect(map).toHaveCount(0);
      await expect(agency.getByRole("img", { name: /Carte/ })).toHaveCount(0);
    }
    // Nothing the server does not say: no proof of delivery, no hour of delivery for a parcel on the road.
    if (!detail.delivered_at) await expect(agency.locator("main")).not.toContainText(/Livrée le|Remis le|Preuve de livraison/);

    await shot(agency, "fiche-livraison-1440");
    expectNoProblem(problems);
  });

  test("D2. delivery page: a COD Mixte delivery tells its two fees apart, and offers no step its fee forbids", async ({ agency, baseURL, problems }) => {
    await open(agency, "/agency/dashboard", /^Bonjour/);
    const id = await agencyIdOf(agency);
    const { rows: all } = await deliveriesOf(agency, baseURL);
    const row = all.find((entry) => entry.cod_mixte?.isCodMixte) ?? all.find((entry) => entry.status === "awaiting_fee_payment");
    test.skip(!row, "no COD Mixte delivery in this agency");
    const detail = await through(agency, baseURL).data(`agencies/${id}/shipments/${row!.id}`);
    note("COD Mixte delivery", { number: numberOf(detail), status: detail.status, cod_mixte: detail.cod_mixte, next_statuses: detail.next_statuses, payment: [detail.order.payment_status, detail.order.payment_status_code ?? null] });

    await open(agency, `/agency/deliveries/${row!.id}`, `Livraison ${numberOf(detail)}`);
    const payment = panel(agency, "Informations de paiement");
    // Whatever the backend, the payment is never shown as an unknown status.
    await expect(payment).not.toContainText(/Statut inconnu/);

    if (detail.cod_mixte?.isCodMixte) {
      await expect(agency.getByRole("heading", { level: 1 }).locator("..")).toContainText("COD mixte");
      const fee = francsOf(detail.cod_mixte.deliveryFeeAmount);
      const goods = francsOf(detail.cod_mixte.productFeeAmount);
      await expect(payment).toContainText(new RegExp(`Frais de livraison${money(fee).source}${detail.cod_mixte.deliveryFeePaid ? "Payé" : "À régler"}`));
      await expect(payment).toContainText(new RegExp(`Produits${money(goods).source}${detail.cod_mixte.productFeePaid ? "Payé" : "À régler"}`));
      const due = (detail.cod_mixte.deliveryFeePaid ? 0 : fee) + (detail.cod_mixte.productFeePaid ? 0 : goods);
      await expect(payment).toContainText(new RegExp(`Reste à encaisser${money(due).source}`));
    } else {
      // A backend older than V3.1 never answers `cod_mixte`: the page cannot tell the two fees apart.
      expect.soft(detail.cod_mixte, "V3.1 backend: the two fees of a COD Mixte delivery").toBeTruthy();
    }

    // What the row does not allow is not offered.
    await agency.getByRole("button", { name: "Plus d'actions" }).first().click();
    const offered = await agency.getByRole("menuitem").allTextContents();
    await agency.keyboard.press("Escape");
    if (!detail.next_statuses.includes("in_transit")) {
      expect(offered).not.toContain("Marquer en livraison");
      await expect(agency.getByRole("button", { name: "Marquer en livraison" })).toHaveCount(0);
    }
    if (!detail.next_statuses.includes("delivered")) expect(offered).not.toContain("Marquer comme remise");
    await shot(agency, "fiche-livraison-cod-mixte-1440");
    expectNoProblem(problems);
  });

  test("D3. delivery page: a request offers its decision only; a delivery that is not the agency's does not exist", async ({ agency, baseURL }) => {
    await open(agency, "/agency/dashboard", /^Bonjour/);
    const id = await agencyIdOf(agency);
    const api = through(agency, baseURL);
    const { rows: all } = await deliveriesOf(agency, baseURL);
    const request = all.find((entry) => entry.awaiting_decision);
    if (request) {
      await open(agency, `/agency/deliveries/${request.id}`, `Livraison ${numberOf(request)}`);
      await expect(agency.getByRole("region", { name: "Avancement de la livraison" })).toContainText("Demande à accepter");
      await expect(agency.getByRole("button", { name: "Accepter la livraison" }).or(agency.getByRole("button", { name: "Accepter" })).first()).toBeVisible();
      await expect(agency.getByRole("button", { name: "Assigner un livreur" })).toHaveCount(0);
    }

    // An id that does not exist: said as such, without a retry that cannot help.
    await agency.goto("/agency/deliveries/01zzzzzzzzzzzzzzzzzzzzzzzz");
    await expect(pageAlert(agency)).toContainText("Cette livraison est introuvable");
    await expect(agency.getByRole("button", { name: "Réessayer" })).toHaveCount(0);
    await expect(agency.getByRole("link", { name: "Retour aux livraisons" })).toBeVisible();
    expect((await api.get(`agencies/${id}/shipments/01zzzzzzzzzzzzzzzzzzzzzzzz`)).status).toBe(404);

    // A delivery of ANOTHER agency, where one exists: the same answer, and none of its content.
    const foreign = env.STAGING_FOREIGN_SHIPMENT_ID;
    test.skip(!foreign, "no delivery of another agency on this environment: its isolation is shown by the Laravel tests (AgencyIsolationTest)");
    expect((await api.get(`agencies/${id}/shipments/${foreign}`)).status).toBe(404);
    expect((await api.send("POST", `agencies/${id}/shipments/${foreign}/notes`, { memo: "QA: note sur la livraison d'une autre agence" })).status).toBe(404);
    expect((await api.send("POST", `agencies/${id}/shipments/${foreign}/status`, { status: "delivery_failed" })).status).toBe(404);
    await agency.goto(`/agency/deliveries/${foreign}`);
    await expect(pageAlert(agency)).toContainText("Cette livraison est introuvable");
  });

  // ── F. Couriers list (§12) ────────────────────────────────

  test("F1. couriers: who does what is counted by the server; account, documents and activity are told apart", async ({ agency, baseURL, problems }) => {
    await open(agency, "/agency/drivers", "Livreurs");
    const couriers = await couriersOf(agency, baseURL);
    note("couriers", { overview: couriers.overview, people: couriers.couriers.map((courier: Json) => [courier.user?.name, courier.activity, courier.status, `kyc:${courier.kyc_verified}`, `active:${courier.is_active}`, `rate:${courier.success_rate}`]) });

    const groups = agency.getByRole("region", { name: "Livreurs par situation" });
    expect({
      active: await figure(groups, "Actifs"),
      onDelivery: await figure(groups, "En livraison"),
      available: await figure(groups, "Disponibles"),
      paused: await figure(groups, "En pause"),
      toVerify: await figure(groups, "À vérifier"),
    }).toEqual({ active: couriers.overview.active, onDelivery: couriers.overview.onDelivery, available: couriers.overview.available, paused: couriers.overview.paused, toVerify: couriers.overview.toVerify });
    await expect(groups).toContainText(`Sur ${couriers.overview.total} livreur`);
    await expect(rows(agency, "Livreurs")).toHaveCount(couriers.couriers.length);
    // Every courier is in one activity and one only.
    expect(couriers.overview.onDelivery + couriers.overview.available + couriers.overview.paused + couriers.overview.toVerify + couriers.overview.suspended).toBe(couriers.overview.total);

    const ACTIVITY: Record<string, string> = { on_delivery: "En livraison", available: "Disponible", paused: "En pause", to_verify: "À vérifier", suspended: "Suspendu" };
    for (const courier of couriers.couriers as Json[]) {
      const row = rows(agency, "Livreurs").filter({ hasText: courier.user.name });
      await expect(row, courier.user.name).toContainText(ACTIVITY[courier.activity]);
      // Only who can work is offered a delivery: the server says who (active, verified, not on hold).
      const mayWork = courier.status === "active" && courier.kyc_verified && courier.is_active;
      await expect(row.getByRole("button", { name: `Confier une course à ${courier.user.name}` }), `${courier.user.name}: ${courier.activity}`).toHaveCount(mayWork ? 1 : 0);
      // No rate before a first finished delivery: a dash, not 0 %.
      if (courier.success_rate === null) await expect(row).not.toContainText("0 %");
    }

    // Each group is a filter of the server.
    for (const [activity, label] of [["on_delivery", "En livraison"], ["paused", "En pause"], ["to_verify", "À vérifier"]] as const) {
      const expected = (await couriersOf(agency, baseURL, `activity=${activity}`)).pagination.total;
      await groups.getByRole("button", { name: label }).click();
      await expect(rows(agency, "Livreurs"), label).toHaveCount(expected);
      await expect(agency).toHaveURL(new RegExp(`activity=${activity}`));
      await groups.getByRole("button", { name: label }).click();
    }
    await agency.getByLabel("Statut").selectOption("suspended");
    await expect(rows(agency, "Livreurs")).toHaveCount(couriers.overview.suspended);
    await agency.getByLabel("Statut").selectOption("");

    await shot(agency, "livreurs-1440");
    expectNoProblem(problems);
  });

  test("F2. couriers: searched and sorted by the server; the alerts say nothing the list contradicts", async ({ agency, baseURL, problems }) => {
    await open(agency, "/agency/drivers", "Livreurs");
    const couriers = await couriersOf(agency, baseURL);
    test.skip(couriers.couriers.length === 0, "no courier");
    const someone = couriers.couriers[0] as Json;
    const search = agency.getByRole("searchbox", { name: "Nom, téléphone ou matricule" });
    for (const term of [someone.user.name.split(" ").pop().toLowerCase(), String(someone.employee_id ?? "").toLowerCase(), String(someone.user.phone_e164 ?? "").slice(-8)].filter(Boolean)) {
      const expected = (await couriersOf(agency, baseURL, `search=${encodeURIComponent(term)}`)).pagination.total;
      expect(expected, `the server finds « ${term} »`).toBeGreaterThan(0);
      await search.fill(term);
      await agency.keyboard.press("Enter");
      await expect(rows(agency, "Livreurs"), term).toHaveCount(expected);
    }
    await search.fill("zzzz-introuvable");
    await agency.keyboard.press("Enter");
    await expect(agency.getByText("Aucun livreur ne correspond")).toBeVisible();
    await agency.getByRole("button", { name: "Effacer la recherche" }).click();
    await expect(rows(agency, "Livreurs")).toHaveCount(couriers.couriers.length);

    // By name, both ways.
    const names = (couriers.couriers as Json[]).map((courier) => courier.user.name as string).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
    await expect(rows(agency, "Livreurs").first()).toContainText(names[0]);
    await table(agency, "Livreurs").getByRole("button", { name: "Livreur", exact: true }).click();
    await expect(rows(agency, "Livreurs").first()).toContainText(names.at(-1)!);

    // The alerts: a courier who delivered today, or who carries a parcel, is not listed as inactive.
    const contradicted = (couriers.alerts?.inactive?.items ?? []).filter((item: Json) => {
      const courier = (couriers.couriers as Json[]).find((entry) => entry.id === item.courier_id);
      return courier && (courier.deliveries_today > 0 || courier.active_shipments > 0);
    });
    expect.soft(contradicted.map((item: Json) => item.name), "V3.1 backend: nobody at work is listed as inactive (the counters of the record were read, which nothing writes)").toEqual([]);
    expectNoProblem(problems);
  });

  test("F3. couriers on a phone: a card a courier, his name whole, the alerts under the list", async ({ agency, baseURL, problems }) => {
    const couriers = await (async () => {
      await open(agency, "/agency/drivers", "Livreurs");
      return couriersOf(agency, baseURL);
    })();
    for (const width of [375, 390]) {
      await agency.setViewportSize({ width, height: 844 });
      await open(agency, "/agency/drivers", "Livreurs");
      await expect(table(agency, "Livreurs")).toBeHidden();
      await expect(cards(agency, "Livreurs")).toHaveCount(couriers.couriers.length);
      // The name is the card: it wraps, it is not cut.
      const cut = await cards(agency, "Livreurs")
        .locator("a[href*='/agency/drivers/']")
        .evaluateAll((links) => links.filter((link) => link.scrollWidth > link.clientWidth + 1).map((link) => (link.textContent ?? "").trim()));
      expect(cut, `at ${width}px, no name is cut`).toEqual([]);
      expect(await sidewaysOverflow(agency), `at ${width}px`).toBe(0);
    }
    await expect(panel(agency, "Alertes et suivi")).toBeVisible();
    await shot(agency, "livreurs-390");
    expectNoProblem(problems);
  });

  // ── G. Courier page (§13) ─────────────────────────────────

  test("G1. courier page: his record, his figures, his mission and his share are those of Laravel", async ({ agency, baseURL, problems }) => {
    await open(agency, "/agency/drivers", "Livreurs");
    const id = await agencyIdOf(agency);
    const couriers = await couriersOf(agency, baseURL);
    const someone = (couriers.couriers as Json[]).find((courier) => courier.activity === "on_delivery") ?? (couriers.couriers as Json[]).find((courier) => courier.kyc_verified) ?? couriers.couriers[0];
    test.skip(!someone, "no courier");
    const data = await through(agency, baseURL).data(`agencies/${id}/couriers/${someone.id}`);
    const courier = data.courier as Json;
    const activity = data.activity as Json;
    note("courier opened", { name: courier.user.name, activity: courier.activity, counters: [courier.total_deliveries, courier.completed_deliveries, courier.failed_deliveries, courier.success_rate], revenue_total: activity.performance.revenue_total, mission: activity.current_mission ? numberOf(activity.current_mission) : null, position: activity.last_position ? "known" : "none" });

    await open(agency, `/agency/drivers/${someone.id}`, courier.user.name);
    const header = agency.locator("header").filter({ has: agency.getByRole("heading", { level: 1 }) });
    if (courier.employee_id) await expect(header).toContainText(`Matricule ${courier.employee_id}`);
    await expect(header).toContainText(courier.kyc_verified ? "Pièces validées" : "Pièces à vérifier");
    await expect(header.getByRole("link", { name: "Historique complet" })).toHaveAttribute("href", `/agency/deliveries?courier=${courier.user_id}`);

    const identity = panel(agency, "Informations personnelles");
    await expect(identity).toContainText(courier.user.name);
    await expect(identity).toContainText(courier.user.phone_e164 ?? courier.phone_e164);
    if (courier.user.email) await expect(identity).toContainText(courier.user.email);
    if (courier.vehicle_plate) await expect(panel(agency, "Véhicule")).toContainText(courier.vehicle_plate);

    const figures = agency.getByRole("region", { name: "Chiffres du livreur" });
    expect(await figure(figures, "Livraisons")).toBe(courier.total_deliveries);
    await expect(figures).toContainText(money(francsOf(activity.performance.revenue_total)));
    if (courier.success_rate === null) await expect(figures).toContainText("Pas encore de livraison");
    else await expect(figures).toContainText(`${String(courier.success_rate).replace(".", ",")} %`);
    // The figures do not contradict one another: a courier whose deliveries earned something has delivered.
    expect.soft(activity.performance.revenue_total > 0 && courier.total_deliveries === 0, "V3.1 backend: the count of deliveries comes from the deliveries").toBe(false);

    const mission = panel(agency, "Mission actuelle");
    if (activity.current_mission) {
      await expect(mission).toContainText(numberOf(activity.current_mission));
      await expect(mission.getByRole("link", { name: "Voir la course" })).toHaveAttribute("href", `/agency/deliveries/${activity.current_mission.id}`);
    } else await expect(mission).toContainText("Aucune course en main.");

    const position = panel(agency, "Dernière position");
    if (activity.last_position) {
      await expect(position.getByRole("link", { name: "Ouvrir la carte" })).toHaveAttribute("href", new RegExp(`query=${activity.last_position.lat},${activity.last_position.lng}`));
      // The map itself: drawn, or said unavailable where its tiles are refused. Never broken pictures under a marker.
      await agency.waitForLoadState("networkidle");
      const unavailable = position.getByText("Le fond de carte n'a pas pu être chargé.");
      await expect(position.getByRole("img", { name: /Carte/ }).or(unavailable).first()).toBeVisible();
      const broken = await position.locator("img").evaluateAll((tiles) => tiles.filter((tile) => (tile as HTMLImageElement).complete && (tile as HTMLImageElement).naturalWidth === 0 && getComputedStyle(tile).visibility !== "hidden").length);
      const drawnTiles = await position.locator("img").evaluateAll((tiles) => tiles.filter((tile) => (tile as HTMLImageElement).naturalWidth > 0).length);
      note("map", { tilesNotLoaded: refusedTiles, tilesDrawn: drawnTiles, shown: (await unavailable.count()) > 0 ? "said unavailable" : "drawn", brokenPictures: broken });
      expect(broken, "no broken picture where the map should be").toBe(0);
      if (refusedTiles > 0) {
        // A fact of the environment, not of the screen: the tiles are refused by the policy served in front of a portal that
        // still asks them of another site, or the tile server is out of reach of the portal. The map says so.
        test.info().annotations.push({ type: "environment", description: `${TARGET}: ${refusedTiles} map tiles could not be loaded` });
        if (drawnTiles === 0) await expect(unavailable).toBeVisible();
      } else {
        expect(drawnTiles, "the map is drawn with its tiles").toBeGreaterThan(0);
      }
    } else {
      await expect(position).toContainText("n'a transmis aucune position");
      await expect(agency.getByRole("img", { name: /Carte/ })).toHaveCount(0);
    }

    const month = activity.earnings.this_month;
    const earnings = panel(agency, "Gains du mois");
    await expect(earnings).toContainText(new RegExp(`Courses livrées${money(francsOf(month.revenue)).source}`));
    await expect(earnings).toContainText(new RegExp(`Part du livreur${money(francsOf(month.courier_share)).source}${String(activity.earnings.commission_rate).replace(".", ",")} %`));
    await expect(earnings).toContainText(new RegExp(`Part de l'agence${money(francsOf(month.agency_share)).source}`));
    expect(month.courier_share + month.agency_share, "the two shares make the whole").toBe(month.revenue);

    await expect(rows(agency, "Dernières livraisons")).toHaveCount(activity.recent_deliveries.length);
    await shot(agency, "fiche-livreur-1440");

    // On a phone: every key figure whole, the amount included.
    for (const width of [375, 390]) {
      await agency.setViewportSize({ width, height: 844 });
      await open(agency, `/agency/drivers/${someone.id}`, courier.user.name);
      await expect(figures.locator(".text-kpi").first()).toBeVisible();
      const cut = await agency.locator("main .text-kpi").evaluateAll((elements) =>
        elements
          .filter((element) => {
            const card = element.closest(".rounded-panel");
            return element.scrollWidth > element.clientWidth + 1 || (card !== null && element.getBoundingClientRect().right > card.getBoundingClientRect().right - 1);
          })
          .map((element) => (element.textContent ?? "").trim()),
      );
      expect(cut, `at ${width}px, every key figure is whole`).toEqual([]);
      expect(await sidewaysOverflow(agency), `at ${width}px`).toBe(0);
    }
    await shot(agency, "fiche-livreur-390");
    expectNoProblem(problems);
  });

  test("G2. courier page: a courier to verify cannot be given a delivery, and his page fits every width", async ({ agency, baseURL, problems }) => {
    await open(agency, "/agency/drivers", "Livreurs");
    const couriers = await couriersOf(agency, baseURL);
    const unverified = (couriers.couriers as Json[]).find((courier) => courier.activity === "to_verify");
    test.skip(!unverified, "no courier to verify in this agency");

    for (const width of WIDTHS) {
      await agency.setViewportSize({ width, height: width < PHONE ? 844 : 900 });
      await open(agency, `/agency/drivers/${unverified!.id}`, unverified!.user.name);
      await agency.waitForLoadState("networkidle");
      expect(await sidewaysOverflow(agency), `at ${width}px, the page cannot be dragged sideways`).toBe(0);
      expect(await cutOnTheRight(agency), `at ${width}px, nothing is cut by the right edge`).toEqual([]);
    }
    const header = agency.locator("header").filter({ has: agency.getByRole("heading", { level: 1 }) });
    await expect(header).toContainText("À vérifier");
    await expect(header).toContainText("Pièces à vérifier");
    // Three dimensions, three words: he is not « en pause », which is a decision of the agency.
    await expect(header).not.toContainText("Compte en pause");
    await expect(agency.getByRole("button", { name: "Confier une course" })).toHaveCount(0);
    // The title of the documents and their three actions are all in view, none over another.
    const documents = panel(agency, "Pièces justificatives");
    for (const name of ["Refuser", "Valider les pièces", "Ajouter une pièce"]) await expect(documents.getByRole("button", { name })).toBeVisible();
    await shot(agency, "fiche-livreur-a-verifier-1440");
    await agency.setViewportSize({ width: 390, height: 844 });
    await open(agency, `/agency/drivers/${unverified!.id}`, unverified!.user.name);
    await shot(agency, "fiche-livreur-a-verifier-390");
    expectNoProblem(problems);
  });

  test("G3. courier page: a courier who is not the agency's does not exist", async ({ agency, baseURL }) => {
    await open(agency, "/agency/dashboard", /^Bonjour/);
    const id = await agencyIdOf(agency);
    const api = through(agency, baseURL);
    await agency.goto("/agency/drivers/01zzzzzzzzzzzzzzzzzzzzzzzz");
    await expect(pageAlert(agency)).toContainText("Ce livreur est introuvable");
    expect((await api.get(`agencies/${id}/couriers/01zzzzzzzzzzzzzzzzzzzzzzzz`)).status).toBe(404);

    const foreign = env.STAGING_FOREIGN_COURIER_ID;
    test.skip(!foreign, "no courier of another agency on this environment: his isolation is shown by the Laravel tests (AgencyIsolationTest)");
    expect((await api.get(`agencies/${id}/couriers/${foreign}`)).status).toBe(404);
    // Editing or suspending him answers that he is not there (404; an older backend answered 500).
    expect.soft((await api.send("PUT", `agencies/${id}/couriers/${foreign}`, { quartier: "QA: pas le mien" })).status, "V3.1 backend: 404, not 500").toBe(404);
    expect((await api.send("POST", `agencies/${id}/couriers/${foreign}/suspend`, { reason: "QA: pas le mien" })).status).not.toBe(200);
    await agency.goto(`/agency/drivers/${foreign}`);
    await expect(pageAlert(agency)).toContainText("Ce livreur est introuvable");
  });

  // ── K. Authorization at the edge (§16) ────────────────────

  test("K1. without a session nothing is served, and a request from another site is refused before Laravel", async ({ browser, baseURL, agency }) => {
    const id = await (async () => {
      await open(agency, "/agency/dashboard", /^Bonjour/);
      return agencyIdOf(agency);
    })();
    const context = await browser.newContext({ baseURL });
    const visitor = await context.newPage();
    for (const path of ["/agency/dashboard", "/agency/deliveries", "/agency/drivers", "/agency/deliveries/new", "/agency/drivers/new"]) {
      await visitor.goto(path);
      await expect(visitor, path).toHaveURL(new RegExp(`/login\\?redirect=${encodeURIComponent(path)}$`));
    }
    for (const path of [`agencies/${id}/dashboard`, `agencies/${id}/shipments`, `agencies/${id}/couriers`, `agencies/${id}/couriers/export`]) {
      expect((await visitor.request.get(`/api/proxy/${path}`, { headers: { Accept: "application/json" } })).status(), path).toBe(401);
    }
    expect((await visitor.request.post(`/api/proxy/agencies/${id}/shipments`, { headers: { Origin: baseURL ?? "" }, data: {} })).status()).toBe(401);
    await context.close();

    // With the session, from another origin: refused by the portal itself.
    const forged = await agency.request.post(`/api/proxy/agencies/${id}/shipments/bulk-status`, { headers: { Origin: "https://example.org" }, data: { shipment_ids: [], status: "delivered" } });
    expect(forged.status()).toBe(403);
    expect((await forged.json()).code).toBe("CSRF_REJECTED");
    // The paths that hand out tokens are not proxied.
    expect((await agency.request.post("/api/proxy/web-auth/login", { headers: { Origin: baseURL ?? "" }, data: {} })).status()).toBe(404);
  });

  // ── L. Every screen, every width (§17) ────────────────────

  test("L1. the eight screens at six widths: nothing to drag sideways, nothing cut, the title whole, no blocking accessibility issue", async ({ agency, baseURL, problems }) => {
    test.setTimeout(900_000);
    await open(agency, "/agency/dashboard", /^Bonjour/);
    const { rows: all } = await deliveriesOf(agency, baseURL);
    const couriers = await couriersOf(agency, baseURL);
    const delivery = all.find((row) => row.status === "in_transit" && row.courier) ?? all[0];
    const mixte = all.find((row) => row.status === "awaiting_fee_payment" || row.cod_mixte?.isCodMixte);
    const courier = (couriers.couriers as Json[]).find((entry) => entry.activity === "on_delivery") ?? couriers.couriers[0];
    const screens: [string, string][] = [
      ["tableau-de-bord", "/agency/dashboard"],
      ["livraisons", "/agency/deliveries"],
      ...(delivery ? ([["fiche-livraison", `/agency/deliveries/${delivery.id}`]] as [string, string][]) : []),
      ...(mixte ? ([["fiche-livraison-cod-mixte", `/agency/deliveries/${mixte.id}`]] as [string, string][]) : []),
      ["nouvelle-course", "/agency/deliveries/new"],
      ["livreurs", "/agency/drivers"],
      ...(courier ? ([["fiche-livreur", `/agency/drivers/${courier.id}`], ["modifier-livreur", `/agency/drivers/${courier.id}/edit`]] as [string, string][]) : []),
      ["nouveau-livreur", "/agency/drivers/new"],
    ];

    const found: string[] = [];
    for (const [name, path] of screens) {
      for (const width of WIDTHS) {
        await agency.setViewportSize({ width, height: width < PHONE ? 844 : 900 });
        await open(agency, path);
        await expect(agency.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
        await agency.waitForLoadState("networkidle");

        const overflow = await sidewaysOverflow(agency);
        if (overflow !== 0) found.push(`${name} @${width}: ${overflow}px to drag sideways`);
        for (const cut of await cutOnTheRight(agency)) found.push(`${name} @${width}: cut ${cut}`);
        const heading = await agency.getByRole("heading", { level: 1 }).boundingBox();
        if (!heading || heading.x < 0 || heading.x + heading.width > width) found.push(`${name} @${width}: the title leaves the screen`);
        if (width < PHONE) {
          // The tab bar of the shell is there, and the main action of a form rests on it.
          const tabBar = await agency.getByRole("navigation", { name: "Navigation rapide" }).boundingBox();
          if (!tabBar) found.push(`${name} @${width}: no tab bar`);
          const submit = agency.getByRole("button", { name: /^(Suivant|Enregistrer)$/ });
          if ((await submit.count()) === 1 && tabBar) {
            const button = (await submit.boundingBox())!;
            if (button.y + button.height > tabBar.y + 1) found.push(`${name} @${width}: the main action is under the tab bar`);
            if (button.height < TOUCH_TARGET) found.push(`${name} @${width}: the main action is ${Math.round(button.height)}px tall`);
          }
        }
        if (width === 375 || width === 1440) {
          for (const violation of await blockingViolations(agency)) found.push(`${name} @${width}: axe ${violation.id} ${violation.nodes.join(", ")}`);
        }
        await shot(agency, `${name}-${width}`);
      }
    }
    note("layout", { screens: screens.length, widths: WIDTHS.length, findings: found.length });
    expect(found).toEqual([]);
    expectNoProblem(problems);
  });

  test("L2. keyboard and touch: the first Tab reaches the content, the focus is visible, the actions of a phone are targets a finger can hit", async ({ agency }) => {
    await open(agency, "/agency/deliveries", "Livraisons");
    await expect(rows(agency, "Livraisons").first()).toBeVisible();
    // A visible focus on what the keyboard reaches.
    await agency.getByRole("searchbox", { name: "N° de course, client, téléphone ou livreur" }).focus();
    await agency.keyboard.press("Tab");
    const ring = await agency.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element) return null;
      const style = getComputedStyle(element);
      return { tag: element.tagName, outline: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0, shadow: style.boxShadow !== "none" };
    });
    expect(ring, "something takes the focus").not.toBeNull();
    expect(ring!.outline || ring!.shadow, `the focus of ${ring!.tag} is drawn`).toBe(true);

    // The menu of a row opens within the screen, and closes with Escape.
    await rows(agency, "Livraisons").first().getByRole("button", { name: /^Autres actions/ }).click();
    const menu = await agency.getByRole("menu").boundingBox();
    expect(menu!.x).toBeGreaterThanOrEqual(0);
    expect(menu!.x + menu!.width).toBeLessThanOrEqual(1440);
    await agency.keyboard.press("Escape");
    await expect(agency.getByRole("menu")).toHaveCount(0);

    await agency.setViewportSize({ width: 375, height: 812 });
    await open(agency, "/agency/deliveries", "Livraisons");
    const card = cards(agency, "Livraisons").first();
    await expect(card).toBeVisible();
    // Two sizes on a touch screen, as the design system sets them: 44px for the actions of a page, and the
    // height of a control (40px in this workspace) for the compact actions of a row. Both are measured and said.
    const heights: Record<string, number> = {};
    for (const [name, control, least] of [
      ["the main action of the page", agency.locator("main").getByRole("link", { name: "Nouvelle course" }), TOUCH_TARGET],
      ["the filters", agency.getByRole("button", { name: "Filtres" }), TOUCH_TARGET],
      ["the action of a card", card.locator("a, button").filter({ hasText: /Accepter|Assigner|Suivi|Relancer/ }).first(), 40],
      ["the menu of a card", card.getByRole("button", { name: /^Autres actions/ }), 40],
    ] as const) {
      const bounds = await control.boundingBox();
      expect(bounds, `${name} is laid out`).not.toBeNull();
      heights[name] = Math.round(bounds!.height);
      expect(heights[name], `${name} is a target a finger can hit`).toBeGreaterThanOrEqual(least);
    }
    note("touch targets at 375px", heights);
    // The menu of a card stays within a 375px screen.
    await card.getByRole("button", { name: /^Autres actions/ }).click();
    const sheet = await agency.getByRole("menu").boundingBox();
    expect(sheet!.x).toBeGreaterThanOrEqual(0);
    expect(sheet!.x + sheet!.width).toBeLessThanOrEqual(375);
  });

  // ── Writes ────────────────────────────────────────────────
  // In the order a day goes: a delivery is created, given to a courier, sent
  // on the road; a courier is registered, verified, edited, suspended.

  test.describe("what the agency changes", () => {
    test.skip(!mayWrite, "set STAGING_ALLOW_MUTATIONS=1 to run the tests that write");
    test.describe.configure({ mode: "serial" });

    test("E1. [write] new delivery: checked step by step, created once, found in the list and on its page", async ({ agency, baseURL, problems }) => {
      test.setTimeout(180_000);
      await open(agency, "/agency/deliveries/new", "Nouvelle course");
      const before = (await deliveriesOf(agency, baseURL)).first.pagination.total;

      // A step is left once it is right.
      await next(agency).click();
      await expect(summary(agency)).toContainText("2 champs à corriger");
      await expect(agency.getByLabel(/Expéditeur/)).toHaveAttribute("aria-invalid", "true");
      await agency.getByLabel(/Expéditeur/).fill(SENDER);
      await agency.getByLabel(/Nombre d'articles/).fill("2");
      await agency.getByLabel(/Valeur des articles/).fill("6 000");
      await agency.getByRole("radio", { name: /À encaisser à la livraison/ }).check();
      await next(agency).click();

      await next(agency).click();
      await expect(summary(agency)).toContainText(/champs à corriger/);
      await agency.getByLabel(/Adresse de collecte/).fill("QA — avenue de la Recette, Ouagadougou");
      await agency.getByLabel(/Adresse de livraison/).fill("QA — rue du Test 12.34, Ouagadougou");
      await agency.getByLabel(/Point de repère/).fill("Portail de recette");
      await agency.getByLabel(/Nom du destinataire/).fill(RECIPIENT);
      // A phone that is not one is refused before anything is sent.
      await agency.getByLabel(/Téléphone du destinataire/).fill("abc");
      await next(agency).click();
      await expect(summary(agency)).toContainText(/Téléphone du destinataire/);
      await agency.getByLabel(/Téléphone du destinataire/).fill("+226 70 00 09 99");
      await next(agency).click();

      // No courier yet: the delivery will wait among those to assign. A slot without a day is not a promise.
      await expect(agency.getByRole("heading", { name: "Livreur", exact: true })).toBeVisible();
      await agency.getByLabel(/Prix de la livraison/).fill("1500");
      await agency.getByLabel(/Fin du créneau/).fill("16:00");
      await next(agency).click();
      await expect(summary(agency)).toContainText("Un créneau demande une date de livraison.");
      await agency.getByLabel(/Fin du créneau/).fill("");
      await next(agency).click();

      // The recap says what will be sent.
      await expect(panel(agency, "Le colis")).toContainText(SENDER);
      await expect(panel(agency, "Le colis")).toContainText("À encaisser à la livraison");
      await expect(panel(agency, "Adresses et destinataire")).toContainText(RECIPIENT);
      await expect(panel(agency, "Livreur et options")).toContainText("À assigner plus tard");

      // A request that does not reach the server (injected in the browser): said, the form kept, nothing created.
      await agency.route("**/api/proxy/agencies/*/shipments", (route) => (route.request().method() === "POST" ? route.abort("connectionrefused") : route.continue()));
      await agency.getByRole("button", { name: "Créer la course" }).click();
      await expect(agency.locator("[data-sonner-toast], [role='alert']").filter({ hasText: /Connexion impossible|n'a pas pu être/ }).first()).toBeVisible({ timeout: 20_000 });
      await expect(panel(agency, "Adresses et destinataire")).toContainText(RECIPIENT);
      await agency.unroute("**/api/proxy/agencies/*/shipments");
      expect((await deliveriesOf(agency, baseURL)).first.pagination.total, "nothing was created by the request that failed").toBe(before);

      // Two clicks, one delivery.
      const posts: string[] = [];
      agency.on("request", (request) => {
        if (request.method() === "POST" && /\/api\/proxy\/agencies\/[^/]+\/shipments$/.test(new URL(request.url()).pathname)) posts.push(request.url());
      });
      const create = agency.getByRole("button", { name: "Créer la course" });
      await create.dblclick();
      await expect(agency.getByText(/Course AG-[A-Z0-9]+ créée\./)).toBeVisible({ timeout: 30_000 });
      await expect(agency).toHaveURL(/\/agency\/deliveries\/[0-9a-z]{26}$/);
      expect(posts, "one request for two clicks").toHaveLength(1);

      // It exists on the server, as it was typed: amounts in francs on the form, in centimes on the wire.
      const created = await createdDelivery(agency, baseURL);
      expect(created, "the delivery is found by the name of its recipient").toBeTruthy();
      expect((await deliveriesOf(agency, baseURL)).first.pagination.total).toBe(before + 1);
      expect(created).toMatchObject({ status: "pending", source: "agency_manual", awaiting_decision: false, can_assign: true, shipping_amount: 150000 });
      expect(created!.order).toMatchObject({ total: 600000, items_count: 2 });
      expect(created!.order.shipping_address).toMatchObject({ name: RECIPIENT, line1: "QA — rue du Test 12.34, Ouagadougou" });
      expect(created!.pickup).toMatchObject({ name: SENDER, address: "QA — avenue de la Recette, Ouagadougou" });
      note("created delivery", { number: numberOf(created!), id: created!.id, recipient: RECIPIENT });

      // Its page: entered by the agency, no decision to wait for, a courier to choose.
      await expect(agency.getByRole("heading", { level: 1 })).toHaveText(`Livraison ${numberOf(created!)}`);
      await expect(agency.getByRole("region", { name: "Avancement de la livraison" })).toContainText("Livreur à assigner");
      await expect(panel(agency, "Informations du colis")).toContainText("Saisie par votre agence");
      await expect(panel(agency, "Informations de paiement")).toContainText(money(1500));
      await expect(panel(agency, "Informations de paiement")).toContainText(money(6000));
      // As the form said it: cash to collect, not a payment that is late.
      await expect(panel(agency, "Informations de paiement")).toContainText("À encaisser");
      await shot(agency, "course-creee-1440");

      // And in the list.
      await open(agency, "/agency/deliveries", "Livraisons");
      await agency.getByRole("searchbox", { name: "N° de course, client, téléphone ou livreur" }).fill(RECIPIENT);
      await agency.keyboard.press("Enter");
      await expect(rows(agency, "Livraisons")).toHaveCount(1);
      await expect(rows(agency, "Livraisons").first()).toContainText(numberOf(created!));
      await expect(rows(agency, "Livraisons").first()).toContainText("À assigner");
      expectNoProblem(problems, [/failed/]);
    });

    test("E2. [write] new delivery: what the server refuses is said in French, on its field", async ({ agency, baseURL }) => {
      await open(agency, "/agency/dashboard", /^Bonjour/);
      const id = await agencyIdOf(agency);
      const api = through(agency, baseURL);
      const before = (await deliveriesOf(agency, baseURL)).first.pagination.total;

      // Sent as a form that skipped its own checks would send it.
      const empty = await api.send("POST", `agencies/${id}/shipments`, {});
      expect(empty.status).toBe(422);
      expect(Object.keys(empty.json?.errors ?? {})).toEqual(expect.arrayContaining(["vendor_name", "items_count", "order_total", "pickup_address", "delivery_address", "client_name", "client_phone"]));
      const negative = await api.send("POST", `agencies/${id}/shipments`, {
        vendor_name: SENDER, items_count: 1, order_total: -5, payment_status: "pending",
        pickup_address: "QA", delivery_address: "QA", client_name: `${RECIPIENT} refusée`, client_phone: "+226 70 00 09 99",
      });
      expect(negative.status).toBe(422);
      expect(negative.json?.errors?.order_total).toBeTruthy();
      expect((await deliveriesOf(agency, baseURL)).first.pagination.total, "nothing was created by a refused request").toBe(before);
      // The sentences of the validation: French on a server whose locale is French.
      note("validation wording", { vendor_name: empty.json?.errors?.vendor_name?.[0], order_total: negative.json?.errors?.order_total?.[0] });
      expect.soft(String(empty.json?.errors?.vendor_name?.[0]), "the validation speaks French").not.toMatch(/^The /);
    });

    test("I1. [write] assignment: who can work is offered, the choice is kept by the server and shown everywhere", async ({ agency, baseURL, problems }) => {
      test.setTimeout(180_000);
      await open(agency, "/agency/dashboard", /^Bonjour/);
      const id = await agencyIdOf(agency);
      const created = await createdDelivery(agency, baseURL);
      test.skip(!created, "E1 did not create its delivery");
      const couriers = await couriersOf(agency, baseURL);
      const people = couriers.couriers as Json[];
      const mayWork = (courier: Json) => courier.status === "active" && courier.kyc_verified && courier.is_active;
      const chosen = people.find((courier) => mayWork(courier) && courier.activity === "available") ?? people.find(mayWork);
      test.skip(!chosen, "no courier who can work in this agency");

      await open(agency, `/agency/deliveries/${created!.id}`, `Livraison ${numberOf(created!)}`);
      await agency.getByRole("button", { name: "Assigner un livreur" }).click();
      await expect(dialog(agency)).toContainText(`Assigner la livraison ${numberOf(created!)}`);
      // Everyone is listed; only who can work can be chosen.
      for (const courier of people) {
        const radio = dialog(agency).getByRole("radio", { name: new RegExp(courier.user.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
        await expect(radio, courier.user.name).toHaveCount(1);
        if (mayWork(courier)) await expect(radio, `${courier.user.name} can be chosen`).toBeEnabled();
        else await expect(radio, `${courier.user.name} (${courier.activity}) cannot be chosen`).toBeDisabled();
      }
      await expect(dialog(agency).getByRole("button", { name: "Assigner" })).toBeDisabled();
      await shot(agency, "assigner-1440");
      await choose(dialog(agency), chosen!.user.name);
      await dialog(agency).getByRole("button", { name: "Assigner" }).click();
      await expect(agency.getByText(`Livraison ${numberOf(created!)} confiée à ${chosen!.user.name}.`)).toBeVisible({ timeout: 30_000 });

      // Kept by the server.
      const after = await through(agency, baseURL).data(`agencies/${id}/shipments/${created!.id}`);
      expect(after).toMatchObject({ status: "assigned", can_assign: false, can_reassign: true });
      expect(after.courier).toMatchObject({ user_id: chosen!.user_id, name: chosen!.user.name });

      // Shown on the page, in the list, and on the page of the courier.
      await expect(panel(agency, "Livreur assigné")).toContainText(chosen!.user.name);
      await expect(agency.getByRole("button", { name: "Marquer en livraison" })).toBeVisible();
      await open(agency, `/agency/drivers/${chosen!.id}`, chosen!.user.name);
      await expect(rows(agency, "Dernières livraisons").filter({ hasText: numberOf(created!) })).toHaveCount(1);
      await expect(agency.locator("header").filter({ has: agency.getByRole("heading", { level: 1 }) })).toContainText("En livraison");
      await open(agency, "/agency/deliveries?scope=on_the_way", "Livraisons");
      await expect(rows(agency, "Livraisons").filter({ hasText: numberOf(created!) })).toContainText("À ramasser");
      expectNoProblem(problems);
    });

    test("I2. [write] assignment: the server refuses by itself who cannot work, whose delivery it is not, and what is over", async ({ agency, baseURL }) => {
      await open(agency, "/agency/dashboard", /^Bonjour/);
      const id = await agencyIdOf(agency);
      const api = through(agency, baseURL);
      const created = await createdDelivery(agency, baseURL);
      test.skip(!created, "E1 did not create its delivery");
      const people = (await couriersOf(agency, baseURL)).couriers as Json[];
      const holder = (await api.data(`agencies/${id}/shipments/${created!.id}`)).courier;
      const assign = (courierId: string) => api.send("POST", `agencies/${id}/shipments/${created!.id}/assign`, { courier_id: courierId });
      const stillHis = async (why: string) => expect((await api.data(`agencies/${id}/shipments/${created!.id}`)).courier?.user_id, why).toBe(holder?.user_id);

      // Asked straight to the API, as a forged request would: the screens never send these.
      for (const [activity, code] of [["suspended", "SUGU-COURIER-SUSPENDED"], ["to_verify", "SUGU-COURIER-NOT-VERIFIED"], ["paused", "SUGU-COURIER-PAUSED"]] as const) {
        const courier = people.find((entry) => entry.activity === activity);
        if (!courier) continue;
        const answer = await assign(courier.user_id);
        note(`assign to a courier ${activity}`, { status: answer.status, error_code: answer.json?.error_code ?? null });
        // A backend older than V3.1 hands the delivery over: the rule was only in the screens.
        expect.soft(answer.status, `V3.1 backend: a courier ${activity} is refused by the server`).toBe(422);
        if (answer.status === 422) expect(answer.json?.error_code).toBe(code);
        else if (holder) await assign(holder.user_id); // put it back where the run had left it
        await stillHis(`the delivery is still its courier's after the ${activity} one was refused`);
      }

      // Someone who is no courier of the agency: its owner, here.
      const me = (await (await agency.request.get("/api/auth/me")).json()).data;
      expect((await assign(me.id)).status).toBe(404);
      // The profile of a courier where his account is expected: refused by the validation.
      const anyone = people[0];
      if (anyone) expect((await assign(anyone.id)).status).toBe(422);
      // The courier of ANOTHER agency, by his account as by his profile: he is nobody here.
      if (env.FOREIGN_COURIER_USER_ID) expect((await assign(env.FOREIGN_COURIER_USER_ID)).status, "the courier of another agency").toBe(404);
      if (env.STAGING_FOREIGN_COURIER_ID) expect((await assign(env.STAGING_FOREIGN_COURIER_ID)).status, "the profile of the courier of another agency").not.toBe(200);
      await stillHis("nothing of this moved the delivery");

      // A delivery that is over, or not accepted yet, takes no courier.
      const { rows: all } = await deliveriesOf(agency, baseURL);
      const able = people.find((courier) => courier.status === "active" && courier.kyc_verified && courier.is_active);
      const delivered = all.find((row) => row.status === "delivered");
      if (delivered && able) {
        const answer = await api.send("POST", `agencies/${id}/shipments/${delivered.id}/assign`, { courier_id: able.user_id });
        expect(answer.status).toBe(422);
        expect(answer.json?.error_code).toBe("SUGU-ASSIGN-INVALID-STATUS");
      }
      const request = all.find((row) => row.awaiting_decision);
      if (request && able) {
        const answer = await api.send("POST", `agencies/${id}/shipments/${request.id}/assign`, { courier_id: able.user_id });
        expect(answer.status).toBe(422);
        expect(answer.json?.error_code).toBe("SUGU-AGENCY-NOT-ACCEPTED");
        // Nor can it be moved by a status sent by hand, before the agency has answered.
        const moved = await api.send("POST", `agencies/${id}/shipments/${request.id}/status`, { status: "delivery_failed", memo: "QA: sans décision" });
        expect.soft(moved.status, "V3.1 backend: nothing moves before the acceptance").toBe(422);
        expect((await api.data(`agencies/${id}/shipments/${request.id}`)).agency_accepted_at).toBeNull();
      }
    });

    test("J1. [write] one delivery: a note, its price, its departure, and a refused step said as a sentence", async ({ agency, baseURL, problems }) => {
      test.setTimeout(180_000);
      await open(agency, "/agency/dashboard", /^Bonjour/);
      const id = await agencyIdOf(agency);
      const api = through(agency, baseURL);
      const created = await createdDelivery(agency, baseURL);
      test.skip(!created, "E1 did not create its delivery");
      await open(agency, `/agency/deliveries/${created!.id}`, `Livraison ${numberOf(created!)}`);

      // A note, kept and shown first.
      const notes = panel(agency, "Notes internes");
      const noted = await notes.getByRole("listitem").count();
      await notes.getByRole("button", { name: "Ajouter une note" }).click();
      await dialog(agency).getByRole("button", { name: "Enregistrer la note" }).click();
      await expect(dialog(agency)).toContainText("Écrivez la note avant de l'enregistrer.");
      await dialog(agency).getByLabel(/Note/).fill(`QA recette ${STAMP} : appeler en arrivant.`);
      await dialog(agency).getByRole("button", { name: "Enregistrer la note" }).click();
      await expect(agency.getByText("Note ajoutée.")).toBeVisible({ timeout: 20_000 });
      await expect(notes.getByRole("listitem")).toHaveCount(noted + 1);
      await expect(notes.getByRole("listitem").first()).toContainText(`QA recette ${STAMP} : appeler en arrivant.`);
      expect((await api.data(`agencies/${id}/shipments/${created!.id}`)).notes[0].memo).toBe(`QA recette ${STAMP} : appeler en arrivant.`);

      // Its price: francs on the screen, centimes on the server; a price out of reach is refused with a sentence.
      await agency.getByRole("button", { name: "Plus d'actions" }).first().click();
      await agency.getByRole("menuitem", { name: "Modifier le prix" }).click();
      await expect(dialog(agency).getByLabel(/Prix de la livraison/)).toHaveValue("1500");
      await dialog(agency).getByLabel(/Prix de la livraison/).fill("900000");
      await dialog(agency).getByRole("button", { name: "Enregistrer le prix" }).click();
      // The sentence is the server's own, written for the agency; its code stays out of the screen.
      await expect(agency.getByText(/Montant trop élevé par rapport au prix annoncé au client/)).toBeVisible({ timeout: 20_000 });
      await expect(agency.getByText(/SUGU-/)).toHaveCount(0);
      await expect(dialog(agency), "a refused price leaves its dialog open").toBeVisible();
      await dialog(agency).getByLabel(/Prix de la livraison/).fill("2 000");
      await dialog(agency).getByRole("button", { name: "Enregistrer le prix" }).click();
      await expect(agency.getByText(/Prix de la livraison .* mis à jour/)).toBeVisible({ timeout: 20_000 });
      expect((await api.data(`agencies/${id}/shipments/${created!.id}`)).shipping_amount).toBe(200000);
      await expect(panel(agency, "Informations de paiement")).toContainText(money(2000));

      // Its departure, confirmed first.
      await agency.getByRole("button", { name: "Marquer en livraison" }).click();
      await expect(confirmation(agency)).toContainText("Le livreur est parti vers le client avec le colis.");
      await confirmation(agency).getByRole("button", { name: "Marquer en livraison" }).click();
      await expect(agency.getByText(`Livraison ${numberOf(created!)} en livraison.`)).toBeVisible({ timeout: 20_000 });
      const moving = await api.data(`agencies/${id}/shipments/${created!.id}`);
      expect(moving).toMatchObject({ status: "in_transit", can_assign: false, can_reassign: false, next_statuses: ["delivered", "delivery_failed"] });
      expect(moving.picked_at, "leaving dates the pickup").not.toBeNull();
      await expect(agency.getByRole("region", { name: "Avancement de la livraison" })).toContainText("Colis en route");

      // A step the rules forbid, asked straight to the API: refused, and worded for who reads it.
      const back = await api.send("POST", `agencies/${id}/shipments/${created!.id}/status`, { status: "pending" });
      expect(back.status).toBe(422);
      expect(String(back.json?.message)).not.toMatch(/→/);
      expect((await api.data(`agencies/${id}/shipments/${created!.id}`)).status).toBe("in_transit");
      // Its courier can no longer be changed.
      const people = (await couriersOf(agency, baseURL)).couriers as Json[];
      const other = people.find((courier) => courier.status === "active" && courier.kyc_verified && courier.is_active && courier.user_id !== moving.courier.user_id);
      if (other) {
        const reassigned = await api.send("POST", `agencies/${id}/shipments/${created!.id}/assign`, { courier_id: other.user_id });
        expect(reassigned.status).toBe(422);
        expect(reassigned.json?.error_code).toBe("SUGU-ASSIGN-INVALID-STATUS");
      }

      // A failed attempt asks why; the reason is kept with the notes.
      await agency.getByRole("button", { name: "Plus d'actions" }).first().click();
      await agency.getByRole("menuitem", { name: "Déclarer un échec" }).click();
      await dialog(agency).getByLabel("Motif de l'échec").fill(`QA recette ${STAMP} : client absent`);
      await dialog(agency).getByRole("button", { name: "Déclarer un échec" }).click();
      await expect(agency.getByText(`Livraison ${numberOf(created!)} déclarée en échec.`)).toBeVisible({ timeout: 20_000 });
      const failed = await api.data(`agencies/${id}/shipments/${created!.id}`);
      expect(failed).toMatchObject({ status: "delivery_failed", can_assign: true });
      expect(failed.notes.map((entry: Json) => entry.memo)).toContain(`QA recette ${STAMP} : client absent`);
      await expect(agency.getByRole("button", { name: /Relancer/ }).first()).toBeVisible();
      await shot(agency, "course-en-echec-1440");
      expectNoProblem(problems, [/422 PUT .*\/price$/]);
    });

    test("H1. [write] new courier: checked step by step, created to verify, his document kept in his file", async ({ agency, baseURL, problems }) => {
      test.setTimeout(180_000);
      await open(agency, "/agency/drivers/new", "Nouveau livreur");
      const id = await agencyIdOf(agency);
      const before = await couriersOf(agency, baseURL);
      const known = (before.couriers as Json[]).find((courier) => courier.user?.phone_e164);

      await next(agency).click();
      await expect(summary(agency)).toContainText("3 champs à corriger");
      await agency.getByLabel(/Prénom/).fill(COURIER_FIRST);
      await agency.getByLabel(/^Nom/).fill(COURIER_LAST);
      // The phone of a courier the agency already has: refused by the server, on its field, on the step that holds it.
      if (known) {
        await agency.locator("#courier-phone").fill(known.user.phone_e164);
        await next(agency).click();
        await agency.getByRole("radio", { name: /Moto/ }).check();
        await next(agency).click();
        await agency.getByRole("button", { name: "Enregistrer le livreur" }).click();
        await expect(summary(agency)).toContainText("Téléphone : Ce numéro de téléphone est déjà associé à un compte.", { timeout: 20_000 });
        await expect(agency.locator("#courier-phone")).toHaveAttribute("aria-invalid", "true");
        await expect(agency.getByLabel(/Prénom/)).toHaveValue(COURIER_FIRST);
        expect((await couriersOf(agency, baseURL)).pagination.total, "nobody was registered by the refused request").toBe(before.pagination.total);
      }
      await agency.locator("#courier-phone").fill(COURIER_PHONE);
      await agency.getByLabel(/E-mail/).fill(COURIER_EMAIL);
      await agency.getByLabel(/Quartier/).fill("Tanghin");
      await next(agency).click();
      await agency.getByRole("radio", { name: /Tricycle/ }).check();
      await agency.getByLabel(/Immatriculation/).fill(`11 QA ${STAMP.slice(-4)}`);
      await next(agency).click();

      // No SMS is promised: the server sends none. No invitation is asked for here: nothing leaves the server.
      await expect(agency.getByText(/SMS/)).toHaveCount(0);
      await expect(agency.getByRole("checkbox", { name: /invitation par e-mail/ })).not.toBeChecked();
      // A synthetic document, named as such: never a real identity paper.
      await agency.getByRole("button", { name: "Joindre une pièce" }).click();
      const piece = agency.getByRole("group", { name: "Pièce 1" });
      await piece.getByLabel("Numéro").fill(`QA-FACTICE-${STAMP}`);
      await piece.getByLabel("Fichier").setInputFiles({ name: "cnib.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
      await expect(piece).toContainText("Formats acceptés : JPG, PNG ou PDF.");
      await piece.getByLabel("Fichier").setInputFiles({ name: "piece-factice-de-recette.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% PIECE FACTICE DE RECETTE SUGU - AUCUNE VALEUR\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n") });
      await agency.getByRole("button", { name: "Enregistrer le livreur" }).click();

      await expect(agency).toHaveURL(/\/agency\/drivers\/[0-9a-z]{26}(#pieces)?$/, { timeout: 45_000 });
      const after = await couriersOf(agency, baseURL);
      const created = courierNamed(after, COURIER_NAME);
      expect(created, "the courier is in the list of the server").toBeTruthy();
      expect(after.pagination.total).toBe(before.pagination.total + 1);
      // To verify, as the server makes every new courier: three dimensions, each with its own word.
      expect(created).toMatchObject({ activity: "to_verify", status: "pending_kyc", kyc_verified: false, is_active: false, vehicle_type: "tricycle" });
      note("created courier", { name: COURIER_NAME, id: created!.id, phone: COURIER_PHONE, email: COURIER_EMAIL });

      const header = agency.locator("header").filter({ has: agency.getByRole("heading", { level: 1 }) });
      await expect(header).toContainText(COURIER_NAME);
      await expect(header).toContainText("À vérifier");
      await expect(panel(agency, "Véhicule")).toContainText("Tricycle");
      await expect(agency.getByRole("button", { name: "Confier une course" })).toHaveCount(0);
      const record = await through(agency, baseURL).data(`agencies/${id}/couriers/${created!.id}`);
      expect(record.courier.kyc_documents, "the document joined is in his file").toHaveLength(1);
      expect(record.courier.kyc_documents[0]).toMatchObject({ document_type: "id_card", document_number: `QA-FACTICE-${STAMP}` });
      await expect(panel(agency, "Pièces justificatives").getByRole("listitem")).toHaveCount(1);
      await shot(agency, "livreur-inscrit-1440");

      // In the list, among those to verify, and not offered a delivery.
      await open(agency, "/agency/drivers?activity=to_verify", "Livreurs");
      const row = rows(agency, "Livreurs").filter({ hasText: COURIER_NAME });
      await expect(row).toContainText("À vérifier");
      await expect(row.getByRole("button", { name: /Confier une course/ })).toHaveCount(0);
      expectNoProblem(problems, [/422 POST .*\/couriers\/register$/]);
    });

    test("H2. [write] edit courier: starts from his record, saves what changed, empties what was emptied, refuses what the server refuses", async ({ agency, baseURL, problems }) => {
      test.setTimeout(120_000);
      await open(agency, "/agency/drivers", "Livreurs");
      const id = await agencyIdOf(agency);
      const list = await couriersOf(agency, baseURL);
      const created = courierNamed(list, COURIER_NAME);
      test.skip(!created, "H1 did not register its courier");
      const other = (list.couriers as Json[]).find((courier) => courier.id !== created!.id && courier.user?.phone_e164);
      const api = through(agency, baseURL);

      await open(agency, `/agency/drivers/${created!.id}/edit`, `Modifier ${COURIER_NAME}`);
      await expect(agency.getByLabel(/Prénom/)).toHaveValue(COURIER_FIRST);
      await expect(agency.getByLabel(/^Nom/)).toHaveValue(COURIER_LAST);
      await expect(agency.locator("#courier-phone")).toHaveValue(COURIER_PHONE);
      await expect(agency.getByLabel(/E-mail/)).toHaveValue(COURIER_EMAIL);
      await expect(agency.getByLabel(/Quartier/)).toHaveValue("Tanghin");
      await expect(agency.getByRole("radio", { name: /Tricycle/ })).toBeChecked();
      // What an edit cannot save is not shown.
      await expect(agency.getByLabel(/Date de naissance/)).toHaveCount(0);

      // Refused before anything is sent.
      await agency.getByLabel(/E-mail/).fill("pas-une-adresse");
      await agency.getByRole("button", { name: "Enregistrer" }).click();
      await expect(summary(agency)).toContainText(/champs? à corriger/);
      await agency.getByLabel(/E-mail/).fill(COURIER_EMAIL);

      // Refused by the server: the phone of another courier.
      if (other) {
        await agency.locator("#courier-phone").fill(other.user.phone_e164);
        await agency.getByRole("button", { name: "Enregistrer" }).click();
        await expect(summary(agency)).toContainText("Ce numéro de téléphone est déjà associé à un compte.", { timeout: 20_000 });
        expect((await api.data(`agencies/${id}/couriers/${created!.id}`)).courier.user.phone_e164, "his phone has not moved").toBe(COURIER_PHONE);
        await agency.locator("#courier-phone").fill(COURIER_PHONE);
      }

      // Cancelled: nothing is saved.
      await agency.getByLabel(/Quartier/).fill("Annulé");
      await agency.getByRole("link", { name: "Annuler" }).click();
      await expect(agency).toHaveURL(new RegExp(`/agency/drivers/${created!.id}$`));
      expect((await api.data(`agencies/${id}/couriers/${created!.id}`)).courier.metadata.quartier).toBe("Tanghin");

      // Saved: what changed, and what was emptied.
      await open(agency, `/agency/drivers/${created!.id}/edit`, `Modifier ${COURIER_NAME}`);
      await agency.getByLabel(/Quartier/).fill("Tampouy");
      await agency.getByLabel(/Couleur/).fill("Bleu de recette");
      await agency.getByLabel(/Personne à prévenir/).fill("QA Recette Contact");
      await agency.getByRole("button", { name: "Enregistrer" }).click();
      await expect(agency.getByText("Fiche du livreur enregistrée.")).toBeVisible({ timeout: 20_000 });
      await expect(agency).toHaveURL(new RegExp(`/agency/drivers/${created!.id}$`));
      let saved = (await api.data(`agencies/${id}/couriers/${created!.id}`)).courier;
      expect(saved.metadata).toMatchObject({ quartier: "Tampouy", vehicle_color: "Bleu de recette" });
      expect(saved.emergency_contact_name).toBe("QA Recette Contact");
      // A tricycle stays a tricycle.
      expect(saved.vehicle_type).toBe("tricycle");
      await expect(panel(agency, "Véhicule")).toContainText("Bleu de recette");

      await open(agency, `/agency/drivers/${created!.id}/edit`, `Modifier ${COURIER_NAME}`);
      await expect(agency.getByLabel(/Quartier/)).toHaveValue("Tampouy");
      await agency.getByLabel(/Couleur/).fill("");
      await agency.getByRole("button", { name: "Enregistrer" }).click();
      await expect(agency.getByText("Fiche du livreur enregistrée.")).toBeVisible({ timeout: 20_000 });
      saved = (await api.data(`agencies/${id}/couriers/${created!.id}`)).courier;
      expect(saved.metadata.vehicle_color ?? null, "an emptied field is emptied").toBeNull();
      expect(saved.metadata.quartier).toBe("Tampouy");
      expectNoProblem(problems, [/422 PUT .*\/couriers\//]);
    });

    test("H3. [write] one account: verified it may work, on hold or suspended it may not, and the server says so by itself", async ({ agency, baseURL, problems }) => {
      test.setTimeout(180_000);
      await open(agency, "/agency/drivers", "Livreurs");
      const id = await agencyIdOf(agency);
      const api = through(agency, baseURL);
      const created = courierNamed(await couriersOf(agency, baseURL), COURIER_NAME);
      test.skip(!created, "H1 did not register its courier");
      const state = async () => (await api.data(`agencies/${id}/couriers/${created!.id}`)).courier as Json;
      const header = agency.locator("header").filter({ has: agency.getByRole("heading", { level: 1 }) });
      const waiting = (await deliveriesOf(agency, baseURL, "scope=to_assign")).rows[0] ?? (await createdDelivery(agency, baseURL));
      const tryAssign = async () => (waiting ? api.send("POST", `agencies/${id}/shipments/${waiting.id}/assign`, { courier_id: created!.user_id }) : null);

      await open(agency, `/agency/drivers/${created!.id}`, COURIER_NAME);
      // His documents are approved: his account opens.
      await header.getByRole("button", { name: "Valider les pièces" }).click();
      await expect(confirmation(agency)).toContainText("Son compte devient actif et il peut recevoir des courses.");
      await confirmation(agency).getByRole("button", { name: "Valider les pièces" }).click();
      await expect(agency.getByText(`Pièces de ${COURIER_NAME} validées : son compte est actif.`)).toBeVisible({ timeout: 20_000 });
      expect(await state()).toMatchObject({ activity: "available", status: "active", kyc_verified: true, is_active: true });
      await expect(header).toContainText("Disponible");
      await expect(header).toContainText("Pièces validées");
      await expect(header.getByRole("button", { name: "Confier une course" })).toBeVisible();

      // On hold: no delivery is offered to him, by the screens and by the server.
      await open(agency, "/agency/drivers", "Livreurs");
      const row = rows(agency, "Livreurs").filter({ hasText: COURIER_NAME });
      const menu = async (item: string) => {
        await row.getByRole("button", { name: `Autres actions pour ${COURIER_NAME}` }).click();
        await agency.getByRole("menuitem", { name: item }).click();
      };
      await menu("Mettre en pause");
      await expect(confirmation(agency)).toContainText("Plus aucune course ne lui sera proposée tant que la pause dure.");
      await confirmation(agency).getByRole("button", { name: "Mettre en pause" }).click();
      await expect(agency.getByText(`${COURIER_NAME} est en pause.`)).toBeVisible({ timeout: 20_000 });
      expect(await state()).toMatchObject({ activity: "paused", status: "active", kyc_verified: true, is_active: false });
      await expect(row).toContainText("En pause");
      await expect(row.getByRole("button", { name: /Confier une course/ })).toHaveCount(0);
      const whilePaused = await tryAssign();
      if (whilePaused) {
        note("assign to the courier on hold", { status: whilePaused.status, error_code: whilePaused.json?.error_code ?? null });
        expect.soft(whilePaused.status, "V3.1 backend: the promise of the pause is kept by the server").toBe(422);
        if (whilePaused.status === 200) await api.send("POST", `agencies/${id}/shipments/${waiting!.id}/status`, { status: "pending" });
      }
      await menu("Reprendre l'activité");
      await confirmation(agency).getByRole("button", { name: "Reprendre l'activité" }).click();
      await expect(row).toContainText("Disponible", { timeout: 20_000 });

      // Suspended, with its reason; then brought back.
      await menu("Suspendre le compte");
      await dialog(agency).getByLabel("Motif").fill(`QA recette ${STAMP}`);
      await dialog(agency).getByRole("button", { name: "Suspendre le compte" }).click();
      await expect(agency.getByText(`Compte de ${COURIER_NAME} suspendu.`)).toBeVisible({ timeout: 20_000 });
      expect(await state()).toMatchObject({ activity: "suspended", status: "suspended", is_active: false });
      await expect(row).toContainText("Suspendu");
      const whileSuspended = await tryAssign();
      if (whileSuspended) {
        note("assign to the suspended courier", { status: whileSuspended.status, error_code: whileSuspended.json?.error_code ?? null });
        expect.soft(whileSuspended.status, "V3.1 backend: a suspended courier is refused by the server").toBe(422);
        if (whileSuspended.status === 200) await api.send("POST", `agencies/${id}/shipments/${waiting!.id}/status`, { status: "pending" });
      }
      await menu("Réactiver le compte");
      await confirmation(agency).getByRole("button", { name: "Réactiver le compte" }).click();
      await expect(row).toContainText("Disponible", { timeout: 20_000 });
      expect(await state()).toMatchObject({ activity: "available", status: "active", is_active: true });
      // No route removes a courier: the list offers none.
      await row.getByRole("button", { name: `Autres actions pour ${COURIER_NAME}` }).click();
      await expect(agency.getByRole("menuitem", { name: /Retirer|Supprimer/ })).toHaveCount(0);
      await agency.keyboard.press("Escape");
      expectNoProblem(problems);
    });

    test("J2. [write] a request of the marketplace: accepted, it waits for a courier; several deliveries change together where each could alone", async ({ agency, baseURL, problems }) => {
      test.skip(!mayTouchSeed, "moves the seeded deliveries: a local run, or STAGING_TOUCH_SEED=1");
      test.setTimeout(180_000);
      await open(agency, "/agency/deliveries?scope=awaiting_decision", "Livraisons");
      const id = await agencyIdOf(agency);
      const api = through(agency, baseURL);
      const requests = (await deliveriesOf(agency, baseURL, "scope=awaiting_decision")).rows;
      test.skip(requests.length === 0, "no request waits for a decision");
      const request = requests[0];
      const row = rows(agency, "Livraisons").filter({ hasText: numberOf(request) });

      await row.getByRole("button", { name: "Accepter" }).click();
      await expect(confirmation(agency)).toContainText(`Accepter la livraison ${numberOf(request)} ?`);
      await confirmation(agency).getByRole("button", { name: "Accepter la livraison" }).click();
      await expect(agency.getByText(`Livraison ${numberOf(request)} acceptée.`)).toBeVisible({ timeout: 20_000 });
      const accepted = await api.data(`agencies/${id}/shipments/${request.id}`);
      expect(accepted).toMatchObject({ awaiting_decision: false, can_assign: true, status: "pending" });
      expect(accepted.agency_accepted_at).not.toBeNull();
      // Accepting it twice is a conflict, said as such.
      const again = await api.send("POST", `agencies/${id}/shipments/${request.id}/accept`);
      expect(again.status).toBe(409);

      // A selection: one that can be given to a courier, one that is over. Each answer has its reason.
      const { rows: all } = await deliveriesOf(agency, baseURL);
      const people = (await couriersOf(agency, baseURL)).couriers as Json[];
      const able = people.find((courier) => courier.status === "active" && courier.kyc_verified && courier.is_active && courier.user?.name !== COURIER_NAME) ?? people.find((courier) => courier.status === "active" && courier.kyc_verified && courier.is_active);
      const delivered = all.find((entry) => entry.status === "delivered");
      if (able && delivered) {
        const bulk = await api.send("POST", `agencies/${id}/shipments/bulk-assign`, { shipment_ids: [request.id, delivered.id], courier_id: able.user_id });
        expect(bulk.status).toBe(200);
        expect(bulk.json?.data?.updated).toEqual([request.id]);
        expect(bulk.json?.data?.rejected).toEqual([{ shipment_id: delivered.id, reason: "SUGU-ASSIGN-INVALID-STATUS" }]);
        const status = await api.send("POST", `agencies/${id}/shipments/bulk-status`, { shipment_ids: [request.id, delivered.id], status: "in_transit" });
        expect(status.json?.data?.updated).toEqual([request.id]);
        expect(status.json?.data?.rejected).toEqual([{ shipment_id: delivered.id, reason: "SUGU-STATUS-TRANSITION-INVALID" }]);
      }
      expectNoProblem(problems);
    });

    test("Z. [write] what this run created, for a clean-up that is decided, not improvised", async ({ agency, baseURL }) => {
      await open(agency, "/agency/dashboard", /^Bonjour/);
      const delivery = await createdDelivery(agency, baseURL);
      const courier = courierNamed(await couriersOf(agency, baseURL), COURIER_NAME);
      note("created by this run", {
        stamp: STAMP,
        delivery: delivery ? { number: numberOf(delivery), id: delivery.id, status: delivery.status, recipient: RECIPIENT } : null,
        courier: courier ? { name: COURIER_NAME, id: courier.id, activity: courier.activity, phone: COURIER_PHONE, email: COURIER_EMAIL } : null,
      });
    });
  });
});
