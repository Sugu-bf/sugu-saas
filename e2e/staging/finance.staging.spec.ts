import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Acceptance run of the MONEY screens (V5) against a REAL backend, for the
// three profiles: what they read, what a withdrawal and a payout method do,
// and what the server refuses.
//
// Nothing here is a stand-in: the portal under STAGING_URL talks to its own
// Laravel, seeded by QaProPortalSeeder, QaCourierSeeder then QaFinanceSeeder.
// The money is synthetic (see QaFinanceSeeder) and nothing leaves the server:
// a withdrawal REQUEST calls no provider — only an operator's approval does,
// and this run approves nothing.
//
//   STAGING_URL=http://localhost:3240
//   STAGING_AGENCY_PASSWORD=…         the QA password, the same for the three accounts
//   STAGING_ALLOW_MUTATIONS=1         required for the tests that write, tagged [write]
//   STAGING_SHOTS=…                   where the captures go (default docs/captures/v5-recette/<staging|local>)
//
//   npx playwright test -c playwright.staging.config.ts finance
//
// The tests that write ask for one withdrawal of the minimum amount per run
// and per profile; they stay PENDING, and three pending requests close the
// door (the cap of the server): the tests then say so instead of failing.

const env = process.env;
const password = env.STAGING_FINANCE_PASSWORD ?? env.STAGING_AGENCY_PASSWORD ?? "";
const mayWrite = env.STAGING_ALLOW_MUTATIONS === "1";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.STAGING_URL ?? "");
const TARGET = LOCAL ? "local" : "staging";
const SHOTS = env.STAGING_SHOTS ?? join(__dirname, "..", "..", "docs", "captures", "v5-recette", TARGET);
mkdirSync(SHOTS, { recursive: true });

const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

interface Space {
  email: string;
  home: RegExp;
  base: string;
  title: string;
  /** API paths, resolved once the account is known. */
  wallet: (me: Json) => string;
  withdrawals: (me: Json) => string;
  request: (me: Json) => string;
  methods: (me: Json) => string;
  method: (me: Json, id: string) => string;
  payout: (body: Json) => Json;
  list: (body: Json) => Json[];
}

const SPACES = {
  vendor: {
    email: env.STAGING_VENDOR_EMAIL ?? "qa-vendeur-a@qa.sugu.test",
    home: /\/vendor\//,
    base: "/vendor/wallet",
    title: "Portefeuille",
    wallet: () => "sellers/wallet",
    withdrawals: () => "sellers/wallet/payouts",
    request: () => "sellers/wallet/request-payout",
    methods: (me) => `stores/${me.store_id}/payout-settings`,
    method: (_me, id) => `stores/payout-settings/${id}`,
    payout: (body) => body.data.payout,
    list: (body) => body.data.payout_settings,
  },
  agency: {
    email: env.STAGING_AGENCY_EMAIL ?? "qa-agence@qa.sugu.test",
    home: /\/agency\//,
    base: "/agency/earnings",
    title: "Finances de l'agence",
    wallet: (me) => `agencies/${me.delivery_partner_id}/wallet`,
    withdrawals: (me) => `agencies/${me.delivery_partner_id}/withdrawals`,
    request: (me) => `agencies/${me.delivery_partner_id}/withdrawals`,
    methods: (me) => `agencies/${me.delivery_partner_id}/payout-settings`,
    method: (me, id) => `agencies/${me.delivery_partner_id}/payout-settings/${id}`,
    payout: (body) => body.data,
    list: (body) => body.data,
  },
  courier: {
    email: env.STAGING_COURIER_EMAIL ?? "qa-coursier@qa.sugu.test",
    home: /\/driver\//,
    base: "/driver/earnings",
    title: "Mes gains",
    wallet: () => "courier/wallet",
    withdrawals: () => "courier/withdrawals",
    request: () => "courier/withdrawals",
    methods: () => "courier/payout-settings",
    method: (_me, id) => `courier/payout-settings/${id}`,
    payout: (body) => body.data,
    list: (body) => body.data,
  },
} satisfies Record<string, Space>;
type Profile = keyof typeof SPACES;
const PROFILES = Object.keys(SPACES) as Profile[];

const isQa = PROFILES.every((profile) => /@qa\.sugu\.test$/i.test(SPACES[profile].email));

// ── Sessions ────────────────────────────────────────────────

const sessions = new Map<Profile, { state: Awaited<ReturnType<BrowserContext["storageState"]>>; me: Json }>();

/** Signs an account in once per worker, through the form of the portal. The session lives in memory only. */
async function sessionOf(browser: Browser, baseURL: string | undefined, profile: Profile) {
  const known = sessions.get(profile);
  if (known) return known;
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto("/login");
  await page.locator('input[type="email"], input[name="email"]').first().fill(SPACES[profile].email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await expect(page, `${profile} is signed in`).toHaveURL(SPACES[profile].home, { timeout: 60_000 });
  const me = (await (await page.request.get("/api/auth/me")).json().catch(() => ({}))) as Json;
  const session = { state: await context.storageState(), me: me.user ?? me.data ?? me };
  sessions.set(profile, session);
  await context.close();
  return session;
}

const test = base.extend<{ as: (profile: Profile, width?: number) => Promise<{ page: Page; me: Json }> }>({
  as: async ({ browser, baseURL }, provide) => {
    const contexts: BrowserContext[] = [];
    await provide(async (profile, width = 390) => {
      const session = await sessionOf(browser, baseURL, profile);
      const context = await browser.newContext({ baseURL, storageState: session.state, viewport: { width, height: width < 768 ? 844 : 900 } });
      contexts.push(context);
      return { page: await context.newPage(), me: session.me };
    });
    for (const context of contexts) await context.close();
  },
});

test.beforeEach(() => {
  test.skip(!password, "STAGING_AGENCY_PASSWORD (or STAGING_FINANCE_PASSWORD) is not set");
  test.skip(!isQa, "only accounts of the QA seeder (@qa.sugu.test) are accepted");
});

const write = (title: string) => `[write] ${title}`;
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
const get = async (page: Page, path: string): Promise<{ status: number; body: Json }> => {
  const response = await page.request.get(`/api/proxy/${path}`);
  return { status: response.status(), body: await response.json().catch(() => ({})) };
};
/** A write as the portal sends it: the relay only lets through what comes from its own origin. */
const ORIGIN = new URL(env.STAGING_URL ?? "http://localhost").origin;
const send = async (page: Page, method: "post" | "delete", path: string, data?: Json): Promise<{ status: number; body: Json }> => {
  const response = await page.request[method](`/api/proxy/${path}`, { data, headers: { Origin: ORIGIN, Accept: "application/json" } });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
};
/** 12 345 600 centimes → "123 456 FCFA", as the portal writes it, spaces made plain. */
const francs = (cents: number) => `${Math.trunc(cents / 100).toLocaleString("fr-FR").replace(/\s/g, " ")} FCFA`;
const plain = (text: string) => text.replace(/\s/g, " ");
const mainText = async (page: Page) => plain(await page.locator("main").innerText());
const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze()).violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical").map((violation) => violation.id);
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const SCREENS = [
  { key: "vue-ensemble", path: "", ready: (space: Space) => space.title },
  { key: "historique", path: "/history", ready: () => /Historique/ },
  { key: "retraits", path: "/withdrawals", ready: () => "Mes retraits" },
  { key: "retrait", path: "/withdraw", ready: () => "Demander un retrait" },
  { key: "methodes", path: "/methods", ready: () => "Mes méthodes" },
] as const;

// ── A. What each profile reads ──────────────────────────────

for (const profile of PROFILES) {
  const space: Space = SPACES[profile];

  test.describe(`A. reads — ${profile}`, () => {
    test("A1 the overview shows the balance, the holds and the earnings the server answers", async ({ as }) => {
      const { page, me } = await as(profile);
      const { status, body } = await get(page, `${space.wallet(me)}/summary`);
      expect(status).toBe(200);
      expect(body.data.amounts_in).toBe("centimes");

      await page.goto(space.base);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(space.title);
      const figures = page.getByRole("region", { name: "Chiffres clés" });
      await expect(figures).toBeVisible();

      const text = plain(await figures.innerText());
      expect(text, "available balance").toContain(francs(body.data.balance.available));
      expect(text, "held by requests").toContain(francs(body.data.balance.in_withdrawal));
      expect(text, "earned in total").toContain(francs(body.data.earned.total));
      expect(text, "earned this month").toContain(francs(body.data.period.earned));
      if (profile !== "vendor") expect(text, "cash held for others").toContain("Espèces à reverser");
      else expect(text).not.toContain("Espèces à reverser");

      // The button is offered exactly when the server says a withdrawal can be asked.
      const link = page.locator("main").getByRole("link", { name: "Demander un retrait" });
      if (body.data.withdrawal.allowed) await expect(link).toBeVisible();
      else await expect(link).toHaveCount(0);
    });

    test("A2 the history holds what the server counts, and its pills ask the server", async ({ as }) => {
      const { page, me } = await as(profile, 1280);
      const { body } = await get(page, `${space.wallet(me)}/entries?per_page=20`);
      const counts = body.meta.counts as Record<string, number>;

      await page.goto(`${space.base}/history`);
      const list = page.locator("main ul[aria-label]").first();
      await expect(list.getByRole("listitem")).toHaveCount(Math.min(20, body.meta.total));
      await expect(page.getByRole("tab", { name: /Toutes/ })).toContainText(String(counts.all));

      const withdrawals = page.getByRole("tab", { name: /^Retraits/ }).first();
      const [answer] = await Promise.all([page.waitForResponse((response) => response.url().includes("/entries") && response.url().includes("kind=withdrawal")), withdrawals.click()]);
      expect(answer.status()).toBe(200);
      await expect(page).toHaveURL(/type=retraits/);
      await expect(list.getByRole("listitem")).toHaveCount(Math.min(20, counts.withdrawal));

      // A row opens what the server knows of it.
      await list.getByRole("button").first().click();
      const sheet = page.getByRole("dialog", { name: "Détail de l'opération" });
      await expect(sheet).toContainText("Demande de retrait");
      await expect(sheet).toContainText("Montant net");
    });

    test("A3 the requests are listed with the state the server gives", async ({ as }) => {
      const { page, me } = await as(profile);
      const { body } = await get(page, space.withdrawals(me));
      await page.goto(`${space.base}/withdrawals`);
      await expect(page.getByRole("tab", { name: /Toutes/ })).toContainText(String(body.meta.counts.all));
      await expect(page.getByRole("tab", { name: /En cours/ })).toContainText(String(body.meta.counts.in_progress));
      const rows = page.getByRole("list", { name: "Demandes de retrait" }).getByRole("listitem");
      await expect(rows).toHaveCount(Math.min(20, body.meta.total));
      const first = body.data[0] as Json;
      await expect(rows.first()).toContainText(first.payout_number);
      await expect(rows.first().locator("[data-status]")).toHaveAttribute("data-status", first.status);
    });

    test("A4 the methods are shown masked, with the state the server gives", async ({ as }) => {
      const { page, me } = await as(profile);
      const { status, body } = await get(page, space.methods(me));
      expect(status).toBe(200);
      const methods = space.list(body);
      // No answer carries a number in clear.
      expect(JSON.stringify(body)).not.toMatch(/\+226\d{8}|_norm/);

      await page.goto(`${space.base}/methods`);
      const cards = page.getByRole("list", { name: "Méthodes de paiement" }).getByRole("listitem");
      await expect(cards).toHaveCount(methods.length);
      for (const method of methods) {
        const card = cards.filter({ hasText: method.account_masked });
        await expect(card).toHaveCount(1);
        const badge = card.locator('[data-status="pending"]');
        if (method.is_payable) await expect(badge).toHaveCount(0);
        else await expect(badge).toHaveCount(1);
      }
      expect(await mainText(page)).not.toMatch(/\+226\d{8}/);
    });

    test("A5 the five screens fit the six widths, with no serious accessibility defect", async ({ as }) => {
      const { page } = await as(profile, 390);
      for (const screen of SCREENS) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`${space.base}${screen.path}`);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(screen.ready(space));
        await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
          expect(await overflow(page), `${screen.key} at ${width}px`).toBeLessThanOrEqual(0);
          if (width === 390 || width === 1440) {
            expect(await serious(page), `${screen.key} at ${width}px`).toEqual([]);
            await shot(page, `${profile}-${screen.key}-${width}`);
          }
        }
      }
    });
  });
}

// ── B. Isolation ────────────────────────────────────────────

test.describe("B. isolation", () => {
  test("B1 an account reads its own money and nobody else's", async ({ as }) => {
    const vendor = await as("vendor");
    const agency = await as("agency");
    const courier = await as("courier");

    expect((await get(vendor.page, `agencies/${agency.me.delivery_partner_id}/wallet/summary`)).status).toBe(403);
    expect((await get(vendor.page, `agencies/${agency.me.delivery_partner_id}/withdrawals`)).status).toBe(403);
    expect((await get(vendor.page, `agencies/${agency.me.delivery_partner_id}/payout-settings`)).status).toBe(403);
    expect((await get(vendor.page, "courier/wallet/summary")).status).toBe(403);
    expect((await get(courier.page, `agencies/${agency.me.delivery_partner_id}/wallet/entries`)).status).toBe(403);
    expect((await get(courier.page, "sellers/wallet/summary")).status).toBe(404);
    expect((await get(agency.page, `stores/${vendor.me.store_id}/payout-settings`)).status).toBe(403);
    expect((await get(agency.page, "courier/wallet/summary")).status).toBe(403);
  });

  test("B2 the screens of another space are not served to an account", async ({ as }) => {
    const { page } = await as("courier");
    await page.goto("/vendor/wallet");
    await expect(page).not.toHaveURL(/\/vendor\/wallet/);
  });
});

// ── C. What a profile changes ───────────────────────────────

for (const profile of PROFILES) {
  const space: Space = SPACES[profile];

  test.describe(`C. writes — ${profile}`, () => {
    test.beforeEach(() => test.skip(!mayWrite, "STAGING_ALLOW_MUTATIONS=1 is not set"));

    test(write("C1 a method is declared, waits for its verification, and can be removed"), async ({ as }) => {
      const { page, me } = await as(profile);
      const number = `+22670${String(Date.now()).slice(-6)}`;
      await page.goto(`${space.base}/methods`);
      const cards = page.getByRole("list", { name: "Méthodes de paiement" }).getByRole("listitem");
      const before = space.list((await get(page, space.methods(me))).body).length;
      await expect(cards).toHaveCount(before);

      await page.locator("main").getByRole("button", { name: "Ajouter", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Ajouter une méthode de paiement" });
      await dialog.getByRole("combobox", { name: /Opérateur/ }).selectOption({ label: "Moov Money" });
      await dialog.getByLabel("Numéro mobile money").fill(number);
      await dialog.getByLabel("Titulaire du compte").fill("QA Recette V5");
      await expect(dialog.getByLabel("Titulaire du compte")).toHaveValue("QA Recette V5");
      const [created] = await Promise.all([page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("payout-settings")), dialog.getByRole("button", { name: "Ajouter la méthode" }).click()]);
      expect(created.status()).toBe(201);
      // The answer of the creation does not carry the number back.
      expect(await created.text()).not.toContain(number);

      await expect(cards).toHaveCount(before + 1);
      const card = cards.filter({ hasText: "Moov Money" }).filter({ hasText: number.slice(-2) }).last();
      await expect(card.locator('[data-status="pending"]')).toHaveCount(1);
      expect(await mainText(page)).not.toContain(number);

      // Not verified: the server would refuse a withdrawal to it, and the wizard does not offer it.
      const methods = space.list((await get(page, space.methods(me))).body);
      const draft = methods.find((method: Json) => !method.is_payable && method.provider === "moov_money" && String(method.account_masked).endsWith(number.slice(-2)));
      expect(draft, "the new method is a draft").toBeTruthy();
      const summary = (await get(page, `${space.wallet(me)}/summary`)).body.data;
      const refused = await send(page, "post", space.request(me), { amount: summary.limits.min_amount, payout_setting_id: draft!.id, idempotency_key: `qa-v5-draft-${Date.now()}` });
      expect(refused.status).toBe(422);
      expect(String(refused.body.message)).toContain("vérifiée");

      await card.getByRole("button", { name: /^Actions pour/ }).click();
      await page.getByRole("menuitem", { name: "Supprimer" }).click();
      const [removed] = await Promise.all([page.waitForResponse((response) => response.request().method() === "DELETE"), page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click()]);
      expect(removed.status()).toBe(200);
      await expect(cards).toHaveCount(before);
    });

    test(write("C2 a withdrawal is asked in three steps, recorded once, and found again"), async ({ as }) => {
      const { page, me } = await as(profile);
      const before = (await get(page, `${space.wallet(me)}/summary`)).body.data;
      test.skip(!before.withdrawal.allowed, `the server does not offer a withdrawal: ${before.withdrawal.blocked?.code}`);
      const amount = before.limits.min_amount as number;
      const quote = (await get(page, `${space.wallet(me)}/quote?amount=${amount}`)).body.data;

      await page.goto(`${space.base}/withdraw`);
      await page.getByLabel("Montant à retirer").fill(String(amount / 100));
      const recap = page.getByRole("region", { name: "Récapitulatif" });
      await expect.poll(async () => plain(await recap.innerText()), { timeout: 15_000 }).toContain(francs(quote.net_amount));
      expect(plain(await recap.innerText()), "the fee is the server's").toContain(francs(quote.fee_amount));
      await page.getByRole("button", { name: "Continuer" }).click();
      await expect(page.getByRole("group", { name: "Méthode de paiement" })).toBeVisible();
      await page.getByRole("button", { name: "Continuer" }).click();
      await expect(page.getByRole("heading", { name: "Vérifiez avant de confirmer" })).toBeVisible();

      const [answer] = await Promise.all([page.waitForResponse((response) => response.request().method() === "POST" && /withdrawals|request-payout/.test(response.url())), page.getByRole("button", { name: "Confirmer le retrait" }).click()]);
      // The route lets five requests a minute through (five in ten for a vendor): a run started again too soon waits.
      test.skip(answer.status() === 429, "the rate limit of the withdrawal route is reached: run again later");
      expect(answer.status()).toBe(201);
      const sent = answer.request().postDataJSON() as Json;
      const recorded = space.payout(await answer.json());
      expect(recorded.status).toBe("pending");
      expect(recorded.amount).toBe(amount);
      expect(recorded.fee_amount).toBe(quote.fee_amount);
      expect(recorded.net_amount).toBe(quote.net_amount);

      await expect(page.getByRole("heading", { name: "Demande enregistrée" })).toBeVisible();
      await expect(page.locator("main")).toContainText(recorded.payout_number);
      await shot(page, `${profile}-retrait-enregistre-390`);

      // The same request again, under the same key: the same withdrawal, nothing more.
      const replay = await send(page, "post", space.request(me), sent);
      expect(replay.status).toBe(201);
      expect(space.payout(replay.body).id).toBe(recorded.id);
      const found = await get(page, `${space.wallet(me)}/lookup?idempotency_key=${encodeURIComponent(sent.idempotency_key)}`);
      expect(found.body.data.id).toBe(recorded.id);

      const after = (await get(page, `${space.wallet(me)}/summary`)).body.data;
      expect(after.balance.available, "the balance lost the amount, once").toBe(before.balance.available - amount);
      expect(after.balance.in_withdrawal).toBe(before.balance.in_withdrawal + amount);
      expect(after.limits.pending_count).toBe(before.limits.pending_count + 1);

      await page.getByRole("link", { name: "Voir mes demandes" }).click();
      await expect(page.getByRole("list", { name: "Demandes de retrait" }).getByRole("listitem").first()).toContainText(recorded.payout_number);
    });

    test(write("C3 the server refuses what the screen would never send"), async ({ as }) => {
      const { page, me } = await as(profile);
      const summary = (await get(page, `${space.wallet(me)}/summary`)).body.data;
      const method = space.list((await get(page, space.methods(me))).body).find((entry: Json) => entry.is_payable);
      test.skip(!method, "no verified method on this account");
      const ask = (amount: unknown, key: string) => send(page, "post", space.request(me), { amount, payout_setting_id: method!.id, idempotency_key: `qa-v5-${key}-${Date.now()}` });

      // Few of them: the route lets five requests a minute through, five in ten for a vendor.
      for (const [key, amount] of [["negative", -500000], ["cents", summary.limits.min_amount + 50]] as const) {
        const answer = await ask(amount, key);
        test.skip(answer.status === 429, "the rate limit of the withdrawal route is reached: run again later");
        expect(answer.status, key).toBe(422);
      }
      const after = (await get(page, `${space.wallet(me)}/summary`)).body.data;
      expect(after.balance.available).toBe(summary.balance.available);
      expect(after.limits.pending_count).toBe(summary.limits.pending_count);
    });
  });
}
