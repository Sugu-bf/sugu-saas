import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Acceptance run of the SETTINGS (V9) against a REAL backend, for the three
// profiles: the 23 sections at the six widths, what they read, what the
// server refuses, and — with STAGING_ALLOW_MUTATIONS=1 — that what is saved
// is read back after a reload.
//
// Nothing here is a stand-in: the portal under STAGING_URL talks to its own
// Laravel, seeded by QaProPortalSeeder, QaCourierSeeder and QaFinanceSeeder.
// The writes touch the QA accounts only, and put back what they changed: a
// description, a zone named "QA V9 …" (removed at the end), a vehicle brand,
// the e-mail of new missions. No account is closed, no money moves, no real
// agency price is touched.
//
//   STAGING_URL=http://localhost:3240
//   STAGING_AGENCY_PASSWORD=…         the QA password, the same for the three accounts
//   STAGING_ALLOW_MUTATIONS=1         required for the tests tagged [write]
//   STAGING_SHOTS=…                   captures (default docs/captures/v9-settings/recette-<local|staging>)
//
//   npx playwright test -c playwright.staging.config.ts settings

const env = process.env;
const password = env.STAGING_SETTINGS_PASSWORD ?? env.STAGING_AGENCY_PASSWORD ?? "";
const mayWrite = env.STAGING_ALLOW_MUTATIONS === "1";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.STAGING_URL ?? "");
const SHOTS = env.STAGING_SHOTS ?? join(__dirname, "..", "..", "docs", "captures", "v9-settings", `recette-${LOCAL ? "local" : "staging"}`);
mkdirSync(SHOTS, { recursive: true });
const STAMP = env.STAGING_RUN_STAMP ?? "run";

const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const SPACES = {
  vendor: {
    email: env.STAGING_VENDOR_EMAIL ?? "qa-vendeur-a@qa.sugu.test",
    home: /\/vendor\//,
    path: "/vendor/settings",
    sections: ["profile", "payments", "delivery", "notifications", "security", "integrations", "display", "subscription", "legal", "delete"],
  },
  agency: {
    email: env.STAGING_AGENCY_EMAIL ?? "qa-agence@qa.sugu.test",
    home: /\/agency\//,
    path: "/agency/settings",
    sections: ["agency", "account", "vehicles", "zones", "payments", "notifications", "security", "subscription"],
  },
  courier: {
    email: env.STAGING_COURIER_EMAIL ?? "qa-coursier@qa.sugu.test",
    home: /\/driver\//,
    path: "/driver/settings",
    sections: ["profile", "vehicle", "notifications", "security", "delete"],
  },
} as const;
type Profile = keyof typeof SPACES;
const PROFILES = Object.keys(SPACES) as Profile[];
const isQa = PROFILES.every((profile) => /@qa\.sugu\.test$/i.test(SPACES[profile].email));

// ── Sessions ────────────────────────────────────────────────

const sessions = new Map<Profile, { state: Awaited<ReturnType<BrowserContext["storageState"]>>; me: Json }>();

/** Signs an account in once per worker, through the form of the portal. */
async function sessionOf(browser: Browser, baseURL: string | undefined, profile: Profile) {
  const known = sessions.get(profile);
  if (known) return known;
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto("/login");
  await page.locator('input[type="email"], input[name="email"]').first().fill(SPACES[profile].email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await expect(page, `${profile} is signed in`).toHaveURL(SPACES[profile].home, { timeout: 90_000 });
  const me = (await (await page.request.get("/api/auth/me")).json().catch(() => ({}))) as Json;
  const session = { state: await context.storageState(), me: me.user ?? me.data ?? me };
  sessions.set(profile, session);
  await context.close();
  return session;
}

const test = base.extend<{ as: (profile: Profile, width?: number) => Promise<{ page: Page; me: Json }> }>({
  as: async ({ browser, baseURL }, provide) => {
    const contexts: BrowserContext[] = [];
    await provide(async (profile, width = 1440) => {
      const session = await sessionOf(browser, baseURL, profile);
      const context = await browser.newContext({ baseURL, storageState: session.state, viewport: { width, height: width < 768 ? 844 : 900 } });
      contexts.push(context);
      return { page: await context.newPage(), me: session.me };
    });
    for (const context of contexts) await context.close();
  },
});

expect.configure({ timeout: 45_000 });

test.beforeEach(() => {
  test.skip(!password, "STAGING_AGENCY_PASSWORD (or STAGING_SETTINGS_PASSWORD) is not set");
  test.skip(!isQa, "only accounts of the QA seeder (@qa.sugu.test) are accepted");
});

const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze()).violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`);

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** A section is shown once its loading is over and no error took its place. */
async function settle(page: Page) {
  // The frame of the space first (its heading), then the section's data.
  await expect(page.locator("main").getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 120_000 });
  await expect(page.locator("main [aria-busy]")).toHaveCount(0, { timeout: 90_000 });
  // An error state always offers "Réessayer"; a section that loaded offers none.
  await expect(page.locator("main").getByRole("button", { name: /Réessayer/ })).toHaveCount(0);
}

// ── Read ────────────────────────────────────────────────────

for (const profile of PROFILES) {
  test(`R1 ${profile}: each section shows the server's data at the six widths, with no serious accessibility defect`, async ({ as }) => {
    test.setTimeout(30 * 60_000);
    const { page } = await as(profile, 1440);
    for (const section of SPACES[profile].sections) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${SPACES[profile].path}?section=${section}`);
      await settle(page);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
        await page.waitForTimeout(150);
        expect(await overflow(page), `${profile} ${section} at ${width}px overflows`).toBeLessThanOrEqual(0);
        if (width === 390 || width === 1440) {
          await page.screenshot({ path: join(SHOTS, `${profile}-${section}-${width}.png`) });
          expect(await serious(page), `${profile} ${section} at ${width}px`).toEqual([]);
        }
      }
    }
  });
}

test("R2 a phone lists the sections, then opens one with a way back", async ({ as }) => {
  const { page } = await as("vendor", 390);
  await page.goto("/vendor/settings");
  const nav = page.getByRole("navigation", { name: "Sections des paramètres" });
  await expect(nav.getByRole("link")).toHaveCount(10);
  await nav.getByRole("link", { name: "Paiements & Facturation" }).click();
  await expect(page).toHaveURL(/section=payments/);
  await expect(page.getByRole("heading", { level: 1, name: "Paiements & Facturation" })).toBeVisible();
  await page.getByRole("link", { name: "Retour aux paramètres" }).click();
  await expect(nav).toBeVisible();
});

test("R3 an agency cannot read nor change another agency's settings and zones", async ({ as }) => {
  const { page, me } = await as("agency");
  const list = (await (await page.request.get("/api/proxy/agencies?per_page=50")).json()) as Json;
  const other = (list.data?.partners ?? []).map((partner: Json) => String(partner.id)).find((id: string) => id !== String(me.delivery_partner_id));
  test.skip(!other, "no other agency on this server");
  expect((await page.request.get(`/api/proxy/agencies/${other}/settings`)).status()).toBe(403);
  expect((await page.request.get(`/api/proxy/agencies/${other}/zones`)).status()).toBe(403);
  const write = await page.request.put(`/api/proxy/agencies/${other}/settings`, { data: { description: "Pris" }, headers: { origin: new URL(page.url() || "http://x").origin } });
  expect([403, 419]).toContain(write.status());
});

test("R4 the closing of an account says what still ties it, and offers nothing to press", async ({ as }) => {
  const { page } = await as("vendor");
  await page.goto("/vendor/settings?section=delete");
  await settle(page);
  const check = (await (await page.request.get("/api/proxy/sellers/settings/account/deletion-check")).json()) as Json;
  const blockers = (check.data?.blockers ?? []) as Json[];
  if (blockers.length > 0) {
    await expect(page.getByText("Votre compte ne peut pas encore être fermé")).toBeVisible();
    await expect(page.getByRole("button", { name: "Supprimer mon compte" })).toBeDisabled();
  } else {
    await expect(page.getByRole("button", { name: "Supprimer mon compte" })).toBeEnabled();
  }
});

test("R5 a wrong current password is refused under its field, and nothing is said saved", async ({ as }) => {
  const { page } = await as("agency");
  await page.goto("/agency/settings?section=security");
  await settle(page);
  await page.getByLabel(/Mot de passe actuel/).fill("pas-le-bon-mot-de-passe");
  await page.getByLabel(/Nouveau mot de passe/).fill("Nouveau-mot-2026");
  await page.getByLabel(/^Confirmation/).fill("Nouveau-mot-2026");
  const answer = page.waitForResponse((response) => response.url().includes("security/password"));
  await page.getByRole("button", { name: "Changer le mot de passe" }).click();
  expect((await answer).status()).toBe(422);
  await expect(page.getByText("Le mot de passe actuel est incorrect.")).toBeVisible();
});

test("R6 the courier sees his checked identity and vehicle locked", async ({ as }) => {
  const { page } = await as("courier");
  const settings = (await (await page.request.get("/api/proxy/courier/settings")).json()) as Json;
  test.skip(!settings.data?.locks?.identity, "this courier's documents are not approved");
  await page.goto("/driver/settings?section=profile");
  await settle(page);
  await expect(page.getByLabel("Prénom")).toBeDisabled();
  await page.goto("/driver/settings?section=vehicle");
  await settle(page);
  await expect(page.getByLabel("Immatriculation")).toBeDisabled();
  await expect(page.getByLabel("Marque")).toBeEnabled();
});

// ── Write ───────────────────────────────────────────────────

test.describe("[write]", () => {
  test.beforeEach(() => test.skip(!mayWrite, "STAGING_ALLOW_MUTATIONS=1 is not set"));

  test("W1 the seller's description is saved, read back after a reload, then put back", async ({ as }) => {
    test.setTimeout(5 * 60_000);
    const { page } = await as("vendor");
    await page.goto("/vendor/settings?section=profile");
    await settle(page);
    const field = page.getByLabel(/^Description/);
    const before = await field.inputValue();
    const marked = `${before.replace(/ \[QA V9 [^\]]*\]$/, "")} [QA V9 ${STAMP}]`;
    await field.fill(marked);
    const saved = page.waitForResponse((response) => response.url().includes("sellers/settings/identity") && response.request().method() === "PUT");
    await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
    expect((await saved).status()).toBe(200);
    await page.reload();
    await settle(page);
    await expect(page.getByLabel(/^Description/)).toHaveValue(marked);
    await page.getByLabel(/^Description/).fill(before);
    const restored = page.waitForResponse((response) => response.url().includes("sellers/settings/identity"));
    await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
    expect((await restored).status()).toBe(200);
  });

  test("W2 an agency adds a QA zone, changes its price, pauses it — the checkout follows — and removes it", async ({ as }) => {
    test.setTimeout(10 * 60_000);
    const { page, me } = await as("agency");
    const name = `QA V9 ${STAMP}`;
    await page.goto("/agency/settings?section=zones");
    await settle(page);

    // 0 F is refused before asking.
    await page.getByRole("button", { name: "Ajouter une zone" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^Zone/).fill(name);
    await dialog.getByLabel(/^Tarif/).fill("0");
    await dialog.getByRole("button", { name: "Ajouter la zone" }).click();
    await expect(dialog.getByText(/au moins 1 FCFA/)).toBeVisible();

    await dialog.getByLabel(/^Tarif/).fill("1500");
    const created = page.waitForResponse((response) => response.url().endsWith("/zones") && response.request().method() === "POST");
    await dialog.getByRole("button", { name: "Ajouter la zone" }).click();
    const body = (await (await created).json()) as Json;
    expect(body.data.tarif).toBe(1500);
    const zoneId = String(body.data.id);
    const row = page.locator("tr", { hasText: name });
    await expect(row).toContainText("1 500");
    await expect(row).toContainText("Actif");

    const offered = async () => {
      const options = (await (await page.request.get("/api/proxy/checkout/shipping-options?country_code=BF")).json()) as Json;
      const mine = (options.data?.partners ?? []).find((partner: Json) => String(partner.id) === String(me.delivery_partner_id));
      return (mine?.rates ?? []).some((rate: Json) => String(rate.zone_id) === zoneId);
    };
    expect(await offered()).toBe(true);

    await row.getByRole("button", { name: `Actions pour ${name}` }).click();
    await page.getByRole("menuitem", { name: "Mettre en pause" }).click();
    await expect(row).toContainText("En pause");
    expect(await offered()).toBe(false);

    await row.getByRole("button", { name: `Actions pour ${name}` }).click();
    await page.getByRole("menuitem", { name: "Modifier le tarif ou le délai" }).click();
    await page.getByRole("dialog").getByLabel(/^Tarif/).fill("1750");
    await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
    await expect(row).toContainText("1 750");

    await page.reload();
    await settle(page);
    await expect(page.locator("tr", { hasText: name })).toContainText("1 750");

    await page.locator("tr", { hasText: name }).getByRole("button", { name: `Actions pour ${name}` }).click();
    await page.getByRole("menuitem", { name: "Retirer la zone" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Retirer la zone" }).click();
    await expect(page.locator("tr", { hasText: name })).toHaveCount(0);
  });

  test("W3 the courier's vehicle brand and model are saved, read back, then put back", async ({ as }) => {
    const { page } = await as("courier");
    await page.goto("/driver/settings?section=vehicle");
    await settle(page);
    const brand = await page.getByLabel("Marque").inputValue();
    const model = await page.getByLabel("Modèle").inputValue();
    await page.getByLabel("Marque").fill("Yamaha");
    await page.getByLabel("Modèle").fill(`YBR ${STAMP.slice(-3)}`);
    const saved = page.waitForResponse((response) => response.url().includes("courier/settings/vehicle"));
    await page.getByRole("button", { name: "Enregistrer" }).first().click();
    expect((await saved).status()).toBe(200);
    await page.reload();
    await settle(page);
    await expect(page.getByLabel("Modèle")).toHaveValue(`YBR ${STAMP.slice(-3)}`);
    await page.getByLabel("Marque").fill(brand);
    await page.getByLabel("Modèle").fill(model);
    const restored = page.waitForResponse((response) => response.url().includes("courier/settings/vehicle"));
    await page.getByRole("button", { name: "Enregistrer" }).first().click();
    expect((await restored).status()).toBe(200);
  });

  test("W4 the e-mail of new missions is turned off, read back, and turned on again", async ({ as }) => {
    test.setTimeout(5 * 60_000);
    const { page } = await as("courier");
    await page.goto("/driver/settings?section=notifications");
    await settle(page);
    const toggle = page.getByRole("switch", { name: "E-mail des nouvelles missions" });
    test.skip(await toggle.isDisabled(), "this courier has no e-mail address");
    const initial = (await toggle.getAttribute("aria-checked")) === "true";
    const flip = async () => {
      const saved = page.waitForResponse((response) => response.url().includes("courier/settings/notifications"));
      await toggle.click();
      expect((await saved).status()).toBe(200);
    };
    await flip();
    await page.reload();
    await settle(page);
    await expect(page.getByRole("switch", { name: "E-mail des nouvelles missions" })).toHaveAttribute("aria-checked", String(!initial));
    await flip();
  });
});
