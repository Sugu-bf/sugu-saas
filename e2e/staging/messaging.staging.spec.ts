import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test as base, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Acceptance run of messaging and support (V8) against a REAL backend: what
// a seller, a courier and an agency read, what the server refuses, what
// travels on the real socket, and, when allowed, what is written.
//
// Nothing here is a stand-in: the portal under STAGING_URL talks to its own
// Laravel and to its own Reverb, seeded by QaProPortalSeeder, QaCourierSeeder
// then QaMessagingSeeder. Parts A (reading), S (what the server refuses) and
// L (layout) write nothing: the refused attempts of part S are checked to
// have left no message. Parts R (real time, two sessions) and W (a message,
// a file, a ticket) write, between QA accounts only, and only run with
// STAGING_ALLOW_MUTATIONS=1; everything they write starts with QAV8RUN.
// Nobody outside the QA accounts receives anything: a message between two
// QA accounts reaches those two accounts.
//
//   STAGING_URL=http://localhost:3240
//   STAGING_AGENCY_PASSWORD=…     the QA password, the same for every QA account
//   STAGING_ALLOW_MUTATIONS=1     to run parts R and W
//   STAGING_SHOTS=…               where the captures go
//
//   npx playwright test -c playwright.staging.config.ts messaging

const env = process.env;
const password = env.STAGING_MESSAGING_PASSWORD ?? env.STAGING_AGENCY_PASSWORD ?? "";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.STAGING_URL ?? "");
const SHOTS = env.STAGING_SHOTS ?? join(__dirname, "..", "..", "docs", "captures", "v8-messaging-support", `recette-${LOCAL ? "local" : "staging"}`);
mkdirSync(SHOTS, { recursive: true });
const WRITES = env.STAGING_ALLOW_MUTATIONS === "1";
const STAMP = (env.STAGING_RUN_STAMP ?? "0000000000").slice(-6);
const RUN = `QAV8RUN ${STAMP}`;

const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;

// A local Laravel under `php -S` answers one request at a time, and a
// messaging screen asks several: an assertion waits longer than the default.
const expect = baseExpect.configure({ timeout: 30_000 });
base.describe.configure({ timeout: 240_000 });

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const ACCOUNTS = {
  seller: { email: "qa-vendeur-a@qa.sugu.test", home: /\/vendor\// },
  otherSeller: { email: "qa-vendeur-b@qa.sugu.test", home: /\/vendor\// },
  courier: { email: "qa-coursier@qa.sugu.test", home: /\/driver\// },
  agency: { email: "qa-agence-coursiers@qa.sugu.test", home: /\/agency\// },
  otherAgency: { email: "qa-agence@qa.sugu.test", home: /\/agency\// },
} as const;
type Account = keyof typeof ACCOUNTS;

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
      const context = await browser.newContext({ baseURL, storageState: await sessionOf(browser, baseURL, account), viewport: { width, height: width < 768 ? 844 : 900 } });
      contexts.push(context);
      return context.newPage();
    });
    for (const context of contexts) await context.close();
  },
});

test.beforeEach(() => {
  test.skip(!password, "STAGING_AGENCY_PASSWORD (or STAGING_MESSAGING_PASSWORD) is not set");
});

const get = async (page: Page, path: string): Promise<{ status: number; body: Json }> => {
  const response = await page.request.get(`/api/proxy/${path}`);
  return { status: response.status(), body: await response.json().catch(() => ({})) };
};
const post = async (page: Page, baseURL: string | undefined, path: string, data: Json = {}): Promise<number> =>
  (await page.request.post(`/api/proxy/${path}`, { data, headers: { Origin: baseURL ?? "" } })).status();
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`) });
const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical").map((violation) => violation.id);
const overflow = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, main ? main.scrollWidth - main.clientWidth : 0);
  });

const rows = (page: Page) => page.locator("[data-conversation]");
const bubbles = (page: Page) => page.locator("[data-thread] [data-message]");
const field = (page: Page) => page.locator("[data-composer] textarea");
const send = (page: Page) => page.locator("[data-composer] [data-send]");

/** The identifier of the agency of the signed-in account, as the session carries it. */
async function agencyOf(page: Page): Promise<string> {
  const me = await (await page.request.get("/api/auth/me")).json();
  return String(me?.data?.delivery_partner_id ?? me?.data?.user?.delivery_partner_id ?? "");
}

const seeded = async (page: Page, base: string): Promise<Json[]> => (await get(page, `${base}?per_page=50`)).body.data ?? [];

// ── A. Reading ──────────────────────────────────────────────

test("A1 · vendeur : ses conversations, dans l'ordre et avec les non-lus du serveur", async ({ as }) => {
  const page = await as("seller");
  const api = await get(page, "seller/conversations?per_page=50");
  expect(api.status).toBe(200);
  const qa = (api.body.data as Json[]).filter((row) => !row.last_message?.body?.startsWith("QAV8RUN"));
  expect(qa.length, "run QaMessagingSeeder").toBeGreaterThanOrEqual(3);

  await page.goto("/vendor/messages");
  await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible();
  await expect(rows(page).first()).toBeVisible();

  // The screen shows what the server answered, in its order.
  const shown = await rows(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-conversation")));
  expect(shown).toEqual((api.body.data as Json[]).slice(0, shown.length).map((row) => row.id));
  for (const row of (api.body.data as Json[]).slice(0, 5)) {
    const line = page.locator(`[data-conversation="${row.id}"]`);
    if (row.unread_count > 0) await expect(line).toContainText(row.unread_count === 1 ? "1 message non lu" : `${row.unread_count} messages non lus`);
    else await expect(line).not.toContainText("non lu");
  }
  await shot(page, "A1-vendeur-liste");

  // A closed conversation is read, and takes nothing.
  const closed = (api.body.data as Json[]).find((row) => row.status === "closed");
  expect(closed, "a closed QA conversation").toBeTruthy();
  await page.locator(`[data-conversation="${closed!.id}"]`).click();
  await expect(page.locator("[data-thread]").getByText("Cette conversation est fermée.")).toBeVisible();
  await expect(field(page)).toHaveCount(0);
});

test("A2 · vendeur : une conversation, sa carte produit et ce que le serveur permet", async ({ as }) => {
  const page = await as("seller");
  const list = await seeded(page, "seller/conversations");
  const open = list.find((row) => row.status === "open" && row.can.share_product);
  expect(open, "an open QA conversation").toBeTruthy();

  const messages = (await get(page, `seller/conversations/${open!.id}/messages`)).body.data.messages as Json[];
  await page.goto(`/vendor/messages/${open!.id}`);
  await expect(bubbles(page)).toHaveCount(messages.length);
  // Oldest first, as the server orders them.
  expect(await bubbles(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-message")))).toEqual(messages.map((message) => message.id));

  const card = messages.find((message) => message.message_type === "product_card");
  if (card) {
    const shown = page.locator(`[data-product-card="${card.metadata.product_id}"]`);
    await expect(shown).toContainText(card.metadata.product_name);
    await expect(shown.getByRole("link", { name: "Voir le produit" })).toHaveAttribute("href", `/vendor/products/${card.metadata.product_id}`);
  }
  await expect(field(page)).toBeVisible();
  await shot(page, "A2-vendeur-conversation");
});

test("A3 · coursier : les échanges de ses missions, sans aucun code de remise", async ({ as }) => {
  const page = await as("courier", 390);
  const api = await get(page, "courier/conversations?per_page=50");
  expect(api.status).toBe(200);
  const list = api.body.data as Json[];
  expect(list.length, "run QaMessagingSeeder").toBeGreaterThanOrEqual(3);
  expect(JSON.stringify(api.body)).not.toMatch(/delivery_code|pickup_code|QAD00|QAP00/);

  await page.goto("/driver/messages");
  await expect(rows(page)).toHaveCount(list.length);
  await expect(page.getByRole("button", { name: `Toutes (${api.body.meta.counts.all})` })).toBeVisible();
  await expect(page.getByRole("button", { name: `Non lus (${api.body.meta.counts.unread})` })).toBeVisible();
  await shot(page, "A3-coursier-liste");

  const withBuyer = list.find((row) => row.peer?.type === "customer");
  await page.locator(`[data-conversation="${withBuyer!.id}"]`).click();
  await expect(page.locator("[data-thread]").getByRole("heading", { level: 2 })).toContainText(withBuyer!.order_number);
  await expect(bubbles(page).first()).toBeVisible();
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/QAD00\d+|QAP00\d+/);
  // What belongs to the store is not offered.
  await page.locator("[data-thread]").getByRole("button", { name: "Actions de la conversation" }).click();
  await expect(page.getByRole("menuitem", { name: "Signaler un message" })).toBeVisible();
  await expect(page.getByRole("menuitem")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await shot(page, "A3-coursier-conversation");
});

test("A4 · agence : supervision en lecture seule", async ({ as }) => {
  const page = await as("agency");
  const agencyId = await agencyOf(page);
  expect(agencyId).not.toBe("");
  const list = await seeded(page, `agency/${agencyId}/conversations`);
  expect(list.length, "run QaMessagingSeeder").toBeGreaterThanOrEqual(3);

  await page.goto("/agency/messages");
  await expect(page.getByRole("heading", { level: 1, name: "Conversations" })).toBeVisible();
  await expect(rows(page)).toHaveCount(list.length);
  await rows(page).first().click();

  await expect(page.locator("[data-read-only]")).toContainText("Lecture seule");
  await expect(bubbles(page).first()).toBeVisible();
  await expect(page.locator("[data-composer]")).toHaveCount(0);
  await expect(page.locator("[data-thread]").getByRole("button", { name: "Actions de la conversation" })).toHaveCount(0);

  // The mission beside the conversation is the delivery the agency already reads.
  const panel = page.locator("[data-mission-panel]");
  await expect(panel).toContainText(list[0].order_number);
  await expect(panel.locator("[data-status]")).toBeVisible();
  await expect(panel.getByRole("link", { name: "Voir la livraison" })).toHaveAttribute("href", `/agency/deliveries/${list[0].shipment_id}`);
  await shot(page, "A4-agence-supervision");
});

test("A5 · tickets : la liste, les six statuts du serveur, un ticket fermé", async ({ as }) => {
  const page = await as("seller");
  const api = await get(page, "sellers/support/tickets?per_page=50");
  expect(api.status).toBe(200);
  const qa = (api.body.data as Json[]).filter((row) => String(row.ticket_number).startsWith("TKT-QAV8-"));
  expect(qa.length, "run QaMessagingSeeder").toBe(6);
  // No deadline, no agent in what a seller is answered.
  expect(JSON.stringify(api.body)).not.toMatch(/sla_|assigned_admin/);

  await page.goto("/vendor/tickets");
  await expect(page.getByRole("heading", { level: 1, name: "Support" })).toBeVisible();
  for (const row of qa) {
    await expect(page.locator(`[data-ticket="${row.id}"] [data-status="${row.status}"]`)).toBeVisible();
  }
  await shot(page, "A5-tickets-liste");

  const closed = qa.find((row) => row.status === "closed")!;
  const resolved = qa.find((row) => row.status === "resolved")!;
  expect(closed.can).toEqual({ reply: false, close: false });
  expect(resolved.can).toEqual({ reply: true, close: true });

  await page.locator(`[data-ticket="${closed.id}"]`).click();
  await expect(page.locator("[data-ticket-thread]").getByText("Ce ticket est fermé")).toBeVisible();
  await expect(page.locator("[data-ticket-thread] [data-composer]")).toHaveCount(0);
  await shot(page, "A5-tickets-ferme");
});

// ── S. What the server refuses ──────────────────────────────

test("S1 · une conversation ou un ticket d'une autre boutique ne se lit par aucune porte", async ({ as, baseURL }) => {
  const other = await as("otherSeller");
  const theirs = await seeded(other, "seller/conversations");
  const rival = theirs.find((row) => row.type === "general");
  expect(rival, "a QA conversation of store B").toBeTruthy();
  const theirTickets = ((await get(other, "sellers/support/tickets?per_page=50")).body.data as Json[]).filter((row) => String(row.ticket_number).startsWith("TKT-QAV8-"));
  expect(theirTickets).toHaveLength(1);

  const page = await as("seller");
  for (const path of [`seller/conversations/${rival!.id}`, `seller/conversations/${rival!.id}/messages`, `seller/conversations/${rival!.id}/presence`]) {
    expect((await get(page, path)).status, path).toBe(404);
  }
  expect(await post(page, baseURL, `seller/conversations/${rival!.id}/messages`, { body: "Ne doit pas passer" })).toBe(404);
  expect(await post(page, baseURL, `seller/conversations/${rival!.id}/close`)).toBe(404);
  expect((await get(page, `sellers/support/tickets/${theirTickets[0].id}`)).status).toBe(403);
  expect(await post(page, baseURL, `sellers/support/tickets/${theirTickets[0].id}/close`)).toBe(403);
  expect(((await get(page, "sellers/support/tickets?per_page=50")).body.data as Json[]).map((row) => row.id)).not.toContain(theirTickets[0].id);

  await page.goto(`/vendor/messages/${rival!.id}`);
  await expect(page.getByText("Conversation introuvable")).toBeVisible();
  await page.goto(`/vendor/tickets?ticket=${theirTickets[0].id}`);
  await expect(page.getByText("Ticket introuvable")).toBeVisible();

  // Nothing was written by the refused attempts.
  const after = (await get(other, `seller/conversations/${rival!.id}/messages`)).body.data.messages as Json[];
  expect(after.some((message) => message.body === "Ne doit pas passer")).toBe(false);
});

test("S2 · l'agence ne peut rien écrire, et chaque agence ne lit que ses livraisons", async ({ as, baseURL }) => {
  const agency = await as("agency");
  const agencyId = await agencyOf(agency);
  const supervised = await seeded(agency, `agency/${agencyId}/conversations`);
  const target = supervised[0];
  const before = ((await get(agency, `agency/${agencyId}/conversations/${target.id}/messages`)).body.data.messages as Json[]).length;
  const lastId = ((await get(agency, `agency/${agencyId}/conversations/${target.id}/messages`)).body.data.messages as Json[]).at(-1)?.id;

  // No route of the agency writes, and the doors of the participants are closed to it.
  const attempts: Array<[string, Json]> = [
    [`agency/${agencyId}/conversations/${target.id}/messages`, { body: "Au nom du coursier" }],
    [`agency/${agencyId}/conversations/${target.id}/read`, { last_read_message_id: lastId }],
    [`agency/${agencyId}/conversations/${target.id}/close`, {}],
    [`agency/${agencyId}/conversations/${target.id}/block`, {}],
    [`agency/${agencyId}/conversations/${target.id}/typing`, {}],
    [`courier/conversations/${target.id}/messages`, { body: "Au nom du coursier" }],
    [`courier/conversations/${target.id}/read`, { last_read_message_id: lastId }],
    [`seller/conversations/${target.id}/messages`, { body: "Au nom de la boutique" }],
    [`seller/conversations/${target.id}/block`, {}],
  ];
  for (const [path, body] of attempts) {
    expect([403, 404, 405], path).toContain(await post(agency, baseURL, path, body));
  }
  expect(((await get(agency, `agency/${agencyId}/conversations/${target.id}/messages`)).body.data.messages as Json[]).length).toBe(before);

  // The other agency: its own conversations, none of these, by list or by identifier.
  const other = await as("otherAgency");
  const otherId = await agencyOf(other);
  expect(otherId).not.toBe(agencyId);
  const theirs = await seeded(other, `agency/${otherId}/conversations`);
  expect(theirs.length).toBeGreaterThanOrEqual(1);
  const mine = supervised.map((row) => row.id);
  expect(theirs.map((row) => row.id).filter((id) => mine.includes(id))).toEqual([]);
  for (const id of mine) {
    expect((await get(other, `agency/${otherId}/conversations/${id}`)).status).toBe(404);
    expect((await get(other, `agency/${otherId}/conversations/${id}/messages`)).status).toBe(404);
  }
  // And nobody reads an agency by naming it.
  expect((await get(other, `agency/${agencyId}/conversations`)).status).toBe(403);
  expect((await get(agency, `agency/${otherId}/conversations/${theirs[0].id}`)).status).toBe(403);

  await other.goto(`/agency/messages/${mine[0]}`);
  await expect(other.getByText("Conversation introuvable")).toBeVisible();
});

test("S3 · un coursier n'a ni carte produit, ni fermeture, ni blocage, et ne lit que ses échanges", async ({ as, baseURL }) => {
  const page = await as("courier");
  const mine = await seeded(page, "courier/conversations");
  for (const action of ["product-card", "close", "block"]) {
    expect([404, 405], action).toContain(await post(page, baseURL, `courier/conversations/${mine[0].id}/${action}`, { product_id: "x" }));
  }
  const seller = await as("seller");
  const shop = (await seeded(seller, "seller/conversations")).find((row) => row.type === "general")!;
  expect((await get(page, `courier/conversations/${shop.id}`)).status).toBe(404);
  expect(await post(page, baseURL, `courier/conversations/${shop.id}/messages`, { body: "Ne doit pas passer" })).toBe(404);
});

// ── L. Layout and accessibility ─────────────────────────────

test("L1 · six largeurs, sans débordement ni défaut bloquant d'accessibilité", async ({ as }) => {
  test.setTimeout(240_000);
  const seller = await as("seller");
  const open = (await seeded(seller, "seller/conversations")).find((row) => row.status === "open")!;
  const courier = await as("courier");
  const mission = (await seeded(courier, "courier/conversations"))[0];

  const screens: Array<[Page, string, string]> = [
    [seller, "/vendor/messages", "vendeur-liste"],
    [seller, `/vendor/messages/${open.id}`, "vendeur-conversation"],
    [seller, "/vendor/tickets", "tickets"],
    [courier, "/driver/messages", "coursier-liste"],
    [courier, `/driver/messages/${mission.id}`, "coursier-conversation"],
  ];

  for (const [page, path, name] of screens) {
    // Loaded once, then resized: reloading at each width would spend the rate limits of the server.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).or(page.locator("[data-thread]")).first()).toBeVisible();
    // The first load is over (a list read again in the background keeps its rows: not waited for).
    await expect(page.locator("[aria-busy='true'][aria-label^='Chargement']")).toHaveCount(0);

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await page.waitForTimeout(200);
      expect(await overflow(page), `${name} at ${width}px`).toBe(0);
      if (width === 390 || width === 1440) await shot(page, `L1-${name}-${width}`);
    }
    expect(await serious(page), `${name}: axe`).toEqual([]);
  }
});

// ── R. Real time, on the real socket ────────────────────────

test("R1 · le portail rejoint son canal privé sur le vrai serveur de temps réel", async ({ as }) => {
  const page = await as("seller");
  const joins: number[] = [];
  page.on("response", (response) => {
    if (response.url().endsWith("/api/broadcasting/auth")) joins.push(response.status());
  });
  await page.goto("/vendor/messages");
  await expect(rows(page).first()).toBeVisible();

  // Loading the list over HTTP proves nothing about real time: the channel must be joined.
  await expect.poll(() => joins, { timeout: 30_000, message: "the socket never asked to join a channel: Reverb is unreachable from the browser (host, port, scheme, allowed origins, CSP)" }).not.toEqual([]);
  expect(joins[0], "channel authorisation").toBe(200);
  await expect(page.getByText("Temps réel indisponible")).toHaveCount(0);
});

test("R2 · deux sessions : un message arrive sans rechargement, puis ce qui a été manqué revient sans doublon", async ({ as }) => {
  test.skip(!WRITES, "writes two-way messages between QA accounts: set STAGING_ALLOW_MUTATIONS=1");
  test.setTimeout(180_000);

  // The courier and store B talk about mission 601: two accounts of the portal.
  const courier = await as("courier", 390);
  const withStore = (await seeded(courier, "courier/conversations")).find((row) => row.peer?.type === "store");
  expect(withStore, "the QA conversation between the courier and store B").toBeTruthy();
  const seller = await as("otherSeller");

  await courier.goto(`/driver/messages/${withStore!.id}`);
  await seller.goto(`/vendor/messages/${withStore!.id}`);
  await expect(bubbles(courier).first()).toBeVisible();
  await expect(bubbles(seller).first()).toBeVisible();
  await expect(courier.getByText("Temps réel indisponible")).toHaveCount(0);
  const before = await bubbles(courier).count();

  // 1. Sent in one session, shown in the other without a reload.
  const first = `${RUN} premier`;
  await field(seller).fill(first);
  await send(seller).click();
  await expect(bubbles(seller).filter({ hasText: first })).toHaveCount(1);
  await expect(bubbles(courier).filter({ hasText: first }), "received on the socket, no reload").toHaveCount(1, { timeout: 90_000 });
  await shot(courier, "R2-coursier-recu-en-direct");

  // And back.
  const answer = `${RUN} réponse`;
  await field(courier).fill(answer);
  await send(courier).click();
  await expect(bubbles(seller).filter({ hasText: answer })).toHaveCount(1, { timeout: 90_000 });

  // 2. The courier loses the network; two messages are written meanwhile.
  await courier.context().setOffline(true);
  for (const body of [`${RUN} manqué 1`, `${RUN} manqué 2`]) {
    await field(seller).fill(body);
    await send(seller).click();
    await expect(bubbles(seller).filter({ hasText: body })).toHaveCount(1);
  }
  await courier.waitForTimeout(3_000);
  await expect(bubbles(courier).filter({ hasText: `${RUN} manqué` })).toHaveCount(0);

  // 3. The network is back: what was missed is there, once each.
  await courier.context().setOffline(false);
  await expect(bubbles(courier).filter({ hasText: `${RUN} manqué 1` })).toHaveCount(1, { timeout: 60_000 });
  await expect(bubbles(courier).filter({ hasText: `${RUN} manqué 2` })).toHaveCount(1);
  expect(await bubbles(courier).count()).toBe(before + 4);
  const ids = await bubbles(courier).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-message")));
  expect(new Set(ids).size, "no message twice").toBe(ids.length);

  // 4. The unread counter of the other side is the server's.
  await seller.goto("/vendor/messages");
  const row = ((await get(seller, "seller/conversations?per_page=50")).body.data as Json[]).find((entry) => entry.id === withStore!.id)!;
  expect(row.unread_count).toBe(0);
  const courierRow = ((await get(courier, "courier/conversations?per_page=50")).body.data as Json[]).find((entry) => entry.id === withStore!.id)!;
  expect(courierRow.last_message.body).toBe(`${RUN} manqué 2`);
});

test("R3 · l'agence voit arriver en direct un message de la conversation qu'elle supervise", async ({ as }) => {
  test.skip(!WRITES, "writes a message between QA accounts: set STAGING_ALLOW_MUTATIONS=1");
  test.setTimeout(120_000);
  const courier = await as("courier", 390);
  const withStore = (await seeded(courier, "courier/conversations")).find((row) => row.peer?.type === "store")!;
  const agency = await as("agency");
  await agency.goto(`/agency/messages/${withStore.id}`);
  await expect(bubbles(agency).first()).toBeVisible();

  const body = `${RUN} vu par l'agence`;
  await courier.goto(`/driver/messages/${withStore.id}`);
  await field(courier).fill(body);
  await send(courier).click();
  await expect(bubbles(agency).filter({ hasText: body })).toHaveCount(1, { timeout: 90_000 });
  // Seen, not read on anyone's behalf: the store still has it unread.
  const seller = await as("otherSeller");
  const row = ((await get(seller, "seller/conversations?per_page=50")).body.data as Json[]).find((entry) => entry.id === withStore.id)!;
  expect(row.unread_count).toBeGreaterThanOrEqual(1);
});

// ── W. Writing ──────────────────────────────────────────────

test("W1 · vendeur : un message envoyé une fois, qui persiste", async ({ as }) => {
  test.skip(!WRITES, "writes a message between QA accounts: set STAGING_ALLOW_MUTATIONS=1");
  const page = await as("seller");
  const open = (await seeded(page, "seller/conversations")).find((row) => row.status === "open" && row.can.share_product)!;
  const body = `${RUN} message du vendeur`;

  await page.goto(`/vendor/messages/${open.id}`);
  await expect(bubbles(page).first()).toBeVisible();
  await field(page).fill(body);
  await field(page).press("Enter");
  await field(page).press("Enter");
  await expect(bubbles(page).filter({ hasText: body })).toHaveCount(1);
  await expect(bubbles(page).filter({ hasText: body }).locator("[data-mark='sent']")).toBeVisible();

  await page.reload();
  await expect(bubbles(page).filter({ hasText: body })).toHaveCount(1);
  const stored = ((await get(page, `seller/conversations/${open.id}/messages`)).body.data.messages as Json[]).filter((message) => message.body === body);
  expect(stored).toHaveLength(1);
  expect(stored[0].client_message_id).toMatch(/^[0-9a-f-]{36}$/);
  await shot(page, "W1-vendeur-message-envoye");
});

test("W2 · une pièce jointe se lit par le portail, et par personne d'autre", async ({ as, baseURL, browser }) => {
  test.skip(!WRITES, "writes a file between QA accounts: set STAGING_ALLOW_MUTATIONS=1");
  const page = await as("seller");
  const open = (await seeded(page, "seller/conversations")).find((row) => row.status === "open" && row.can.share_product)!;
  await page.goto(`/vendor/messages/${open.id}`);
  await expect(bubbles(page).first()).toBeVisible();

  // A real, tiny PNG.
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await page.locator("[data-composer] input[type='file']").first().setInputFiles({ name: `qav8run-${STAMP}.png`, mimeType: "image/png", buffer: png });
  await send(page).click();
  const image = page.locator("[data-thread]").getByRole("img", { name: `qav8run-${STAMP}.png` });
  await expect(image).toBeVisible({ timeout: 30_000 });

  const src = (await image.getAttribute("src"))!;
  expect(src).toMatch(/^\/api\/proxy\/seller\/conversations\//);
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  expect((await page.request.get(src)).status()).toBe(200);
  await shot(page, "W2-vendeur-piece-jointe");

  // Without a session: nothing. As another store: nothing. With another identifier: nothing.
  const anonymous = await browser.newContext({ baseURL });
  expect((await anonymous.request.get(src)).status()).toBe(401);
  await anonymous.close();
  const other = await as("otherSeller");
  expect((await other.request.get(src)).status()).toBe(404);
  expect((await page.request.get(src.replace(/\/attachments\/\d+$/, "/attachments/999999999"))).status()).toBe(404);

  // A file that is not allowed is refused by the server as well as by the screen.
  const refused = await page.request.post(`/api/proxy/seller/conversations/${open.id}/messages`, {
    headers: { Origin: baseURL ?? "" },
    multipart: { attachments: { name: "outil.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") } },
  });
  expect(refused.status()).toBe(422);
});

test("W3 · tickets : créer, répondre, fermer", async ({ as }) => {
  test.skip(!WRITES, "writes a QA ticket: set STAGING_ALLOW_MUTATIONS=1");
  const page = await as("seller");
  const subject = `${RUN} ticket de recette`;

  await page.goto("/vendor/tickets?new=1");
  const form = page.getByRole("form", { name: "Nouveau ticket" });
  await form.getByRole("textbox", { name: /^Sujet/ }).fill(subject);
  await form.getByRole("combobox", { name: /^Catégorie/ }).selectOption("other");
  await form.getByRole("textbox", { name: /^Description/ }).fill("Ticket créé par la recette automatique. Rien à traiter.");
  await form.getByRole("button", { name: "Créer le ticket" }).click();

  await expect(page).toHaveURL(/\?ticket=/, { timeout: 30_000 });
  const thread = page.locator("[data-ticket-thread]");
  await expect(thread).toContainText(subject);
  await expect(thread.locator("[data-status='open']")).toBeVisible();
  const id = new URL(page.url()).searchParams.get("ticket")!;

  // One ticket, not two.
  const mine = ((await get(page, `sellers/support/tickets?per_page=50&search=${encodeURIComponent(RUN)}`)).body.data as Json[]).filter((row) => row.subject === subject);
  expect(mine).toHaveLength(1);

  await thread.locator("[data-composer] textarea").fill("Réponse de la recette.");
  await thread.locator("[data-composer] [data-send]").click();
  await expect(thread.locator("[data-reply]")).toHaveCount(2);
  await shot(page, "W3-ticket-reponse");

  await thread.getByRole("button", { name: "Actions du ticket" }).click();
  await page.getByRole("menuitem", { name: "Fermer le ticket" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Fermer le ticket" }).click();
  await expect(thread.locator("[data-status='closed']")).toBeVisible();
  await expect(thread.locator("[data-composer]")).toHaveCount(0);

  const stored = (await get(page, `sellers/support/tickets/${id}`)).body.ticket as Json;
  expect(stored).toMatchObject({ status: "closed", can: { reply: false, close: false } });
  expect(((await get(page, `sellers/support/tickets/${id}/messages`)).body.messages as Json[]).length).toBe(2);
  await shot(page, "W3-ticket-ferme");
});
