import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Acceptance run of SUGU LANAYA (Lot 1) against a REAL backend: the
// Lanabaga space (admitted, draft, in review, complement asked), the seller's
// side (introduced, not introduced), the public pages, each figure against
// what Laravel answers, the six widths and accessibility; the stores SUGU
// entrusts and the orders it attributes (DEC-29 to DEC-32). With
// STAGING_ALLOW_MUTATIONS=1, the writes on QA accounts only: a prospect, an
// invitation answered by seller A, a whole application by a new account, and
// seller A's answer to the proposal Ops made in the back-office.
//
// The portal under STAGING_URL talks to its own Laravel, seeded by
// QaProPortalSeeder then QaLanayaSeeder.
//
//   STAGING_URL=http://localhost:3240
//   STAGING_AGENCY_PASSWORD=…         the QA password, the same for every QA account
//   STAGING_ALLOW_MUTATIONS=1         the W tests
//   STAGING_LARAVEL_LOG=…             local only: laravel.log, where the e-mail code of a sign-up is read
//   STAGING_SHOTS=…                   captures (default docs/captures/lanaya/lot1/recette-<local|staging>)
//
//   npx playwright test -c playwright.staging.config.ts lanaya

const env = process.env;
const password = env.STAGING_LANAYA_PASSWORD ?? env.STAGING_AGENCY_PASSWORD ?? "";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.STAGING_URL ?? "");
const WRITES = env.STAGING_ALLOW_MUTATIONS === "1";
const SHOTS = env.STAGING_SHOTS ?? join(__dirname, "..", "..", "docs", "captures", "lanaya", "lot1", `recette-${LOCAL ? "local" : "staging"}`);
mkdirSync(SHOTS, { recursive: true });
const STAMP = env.STAGING_RUN_STAMP ?? String(Date.now()).slice(-8);

const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const ACCOUNTS = {
  lanabaga: "qa-lanabaga@qa.sugu.test",
  draft: "qa-lanabaga-candidat@qa.sugu.test",
  review: "qa-lanabaga-revue@qa.sugu.test",
  complement: "qa-lanabaga-complement@qa.sugu.test",
  sellerA: "qa-vendeur-a@qa.sugu.test",
  sellerB: "qa-vendeur-b@qa.sugu.test",
} as const;
type Account = keyof typeof ACCOUNTS;

// ── Sessions ────────────────────────────────────────────────

const sessions = new Map<string, Awaited<ReturnType<BrowserContext["storageState"]>>>();

/** Signs an account in once per worker, through the form of the portal (each login counts against the IP limit). */
async function sessionOf(browser: Browser, baseURL: string | undefined, email: string, secret = password) {
  const known = sessions.get(email);
  if (known) return known;
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto("/login");
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(secret);
  await page.getByRole("button", { name: /Se connecter/ }).click();
  await expect(page, `${email} is signed in`).toHaveURL(/\/(vendor|lanabaga)\//, { timeout: 120_000 });
  const state = await context.storageState();
  sessions.set(email, state);
  await context.close();
  return state;
}

const test = base.extend<{ as: (account: Account, width?: number) => Promise<Page> }>({
  as: async ({ browser, baseURL }, provide) => {
    const contexts: BrowserContext[] = [];
    await provide(async (account, width = 1440) => {
      const state = await sessionOf(browser, baseURL, ACCOUNTS[account]);
      const context = await browser.newContext({ baseURL, storageState: state, viewport: { width, height: width < 768 ? 844 : 900 } });
      contexts.push(context);
      return context.newPage();
    });
    for (const context of contexts) await context.close();
  },
});

expect.configure({ timeout: 45_000 });

test.beforeEach(() => {
  test.skip(!password, "STAGING_AGENCY_PASSWORD (or STAGING_LANAYA_PASSWORD) is not set");
});

const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze()).violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`);

/** Pixels the document, or the scroller the pages live in, can be dragged sideways. */
const overflow = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, main ? main.scrollWidth - main.clientWidth : 0);
  });

async function settle(page: Page) {
  await expect(page.locator("main").getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 120_000 });
  await expect(page.locator("main [aria-busy='true']")).toHaveCount(0, { timeout: 90_000 });
  await expect(page.locator("main").getByRole("button", { name: /Réessayer/ })).toHaveCount(0);
}

async function api(page: Page, path: string): Promise<Json> {
  const response = await page.request.get(`/api/proxy/${path}`);
  expect(response.status(), path).toBe(200);
  return ((await response.json()) as Json).data;
}

/**
 * The six widths: no sideways scroll, a whole-page capture at each width,
 * and the accessibility of the phone and desktop renderings.
 */
async function widths(page: Page, name: string, { a11y = true }: { a11y?: boolean } = {}) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.waitForTimeout(200);
    expect(await overflow(page), `${name} at ${width}px overflows`).toBeLessThanOrEqual(0);
    if (width === 390) await page.screenshot({ path: join(SHOTS, `${name}-${width}-ecran.png`) });
    // At the height of a real screen: a region that scrolls must be reachable with the keyboard.
    if (a11y && (width === 390 || width === 1440)) expect(await serious(page), `${name} at ${width}px`).toEqual([]);
    const height = await page.evaluate(() => Math.max(900, ...Array.from(document.querySelectorAll("main, main *")).map((node) => node.scrollHeight)) + 200);
    await page.setViewportSize({ width, height: Math.min(height, 6000) });
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(SHOTS, `${name}-${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

/** Buttons and badges stay fully rounded (product rule, above the mockups). */
async function fullRounded(page: Page) {
  const square = await page.evaluate(() =>
    Array.from(document.querySelectorAll("main button, main a[class*='rounded-button'], main [class*='rounded-badge']"))
      .filter((node) => (node as HTMLElement).offsetParent !== null && (node as HTMLElement).getBoundingClientRect().height > 0)
      .filter((node) => {
        const element = node as HTMLElement;
        const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius);
        return /rounded-(button|badge|pill)/.test(element.className) && radius < element.getBoundingClientRect().height / 2 - 1;
      })
      .map((node) => (node as HTMLElement).textContent?.trim()),
  );
  expect(square, "buttons and badges are fully rounded").toEqual([]);
}

// ── R: reading ──────────────────────────────────────────────

test("R1 admitted Lanabaga: the dashboard says what the server counted, without badge nor amount", async ({ as }) => {
  test.setTimeout(10 * 60_000);
  const page = await as("lanabaga");
  await page.goto("/lanabaga/dashboard");
  await settle(page);
  const data = await api(page, "lanaya/me/overview");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Bonjour, \S+$/);
  await expect(page.getByText("Compte admis")).toBeVisible();
  const figures = page.getByRole("region", { name: "Votre activité" });
  await expect(figures).toContainText(`${data.capacity.active} / ${data.capacity.effective}`);
  await expect(figures).toContainText(String(data.counts.invitations_open));
  await expect(figures).toContainText(String(data.capacity.available));
  for (const seller of data.sellers as Json[]) await expect(page.getByRole("table", { name: "Mes vendeurs" }).getByText(seller.store.name)).toBeVisible();
  for (const lead of data.recent_leads as Json[]) await expect(page.getByText(lead.contact_name).first()).toBeVisible();
  // Commissions: shown, and honestly empty; no badge before Lot 6.
  await expect(page.getByText(/Pas encore ouvert : aucune commission n'est calculée/)).toBeVisible();
  await expect(page.getByText(/^Vérifié$|Badge en revue|FCFA|\d F$/)).toHaveCount(0);
  await expect(page.getByText(`Niveau : ${data.level.label}`)).toBeVisible();
  await fullRounded(page);
  await widths(page, "lanabaga-tableau-de-bord");
});

test("R2 prospects: the figures, the filters and the list are the server's", async ({ as }) => {
  test.setTimeout(10 * 60_000);
  const page = await as("lanabaga");
  await page.goto("/lanabaga/prospects");
  await settle(page);
  const all = await api(page, "lanaya/me/leads");
  const figures = page.getByRole("region", { name: "Vos prospects" });
  await expect(figures).toContainText(String(all.summary.active));
  await expect(figures).toContainText(String(all.summary.invitations_open));
  if (all.summary.total > 0) await expect(figures).toContainText(`${Math.round((all.summary.converted / all.summary.total) * 100)} %`);
  await expect(page.getByRole("table", { name: "Prospects" }).locator("tbody tr")).toHaveCount(Math.min(all.items.length, 10));

  // Status filter: the list holds what the server answers for it.
  const contacted = await api(page, "lanaya/me/leads?status=contacted");
  await page.getByRole("combobox", { name: "Statut" }).first().selectOption("contacted");
  expect(contacted.items.length, "a lead in discussion (QaLanayaSeeder)").toBeGreaterThan(0);
  await expect(page.getByRole("table", { name: "Prospects" }).locator("tbody tr")).toHaveCount(contacted.items.length);
  await expect(page.getByRole("table", { name: "Prospects" })).toContainText(contacted.items[0].contact_name);
  await page.getByRole("combobox", { name: "Statut" }).first().selectOption("");

  // A lead opens its sheet; a lead already converted offers no invitation.
  await page.getByRole("table", { name: "Prospects" }).getByRole("button", { name: "Voir" }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Téléphone")).toBeVisible();
  await page.keyboard.press("Escape");

  // The invitation form is SUGU's: no shop list, a 300-character note.
  const form = page.locator("#invitation");
  await expect(form.getByText(/0\/300/)).toBeVisible();
  await expect(form.getByRole("combobox")).toHaveCount(0);
  await fullRounded(page);
  await widths(page, "lanabaga-prospects");
});

test("R3 invitations and sellers: the lists of the server, the link never shown again", async ({ as }) => {
  test.setTimeout(10 * 60_000);
  const page = await as("lanabaga");
  await page.goto("/lanabaga/invitations");
  await settle(page);
  const invitations = await api(page, "lanaya/me/invitations");
  for (const invitation of invitations.items.slice(0, 5) as Json[]) await expect(page.getByRole("table", { name: "Invitations" }).getByText(invitation.contact_name).first()).toBeVisible();
  // An open invitation can be revoked; nothing else can.
  const open = (invitations.items as Json[]).filter((invitation) => invitation.status.value === "open").length;
  await expect(page.getByRole("table", { name: "Invitations" }).getByRole("button", { name: "Révoquer" })).toHaveCount(open);
  await expect(page.locator("main").getByText(/\/invitation\/[A-Za-z0-9]{16,}/)).toHaveCount(0);
  await widths(page, "lanabaga-invitations");

  await page.goto("/lanabaga/sellers");
  await settle(page);
  const sellers = await api(page, "lanaya/me/sellers");
  for (const seller of sellers.items as Json[]) await expect(page.getByRole("table", { name: "Vendeurs présentés" }).getByText(seller.store.name)).toBeVisible();
  await expect(page.getByText("Une boutique présentée n'est pas forcément confiée")).toBeVisible();
  await widths(page, "lanabaga-vendeurs");
});

test("R4 admitted Lanabaga: application, documents and compliance read the file; nothing is editable", async ({ as }) => {
  test.setTimeout(10 * 60_000);
  const page = await as("lanabaga");
  const me = await (async () => {
    await page.goto("/lanabaga/application");
    await settle(page);
    return api(page, "lanaya/me");
  })();
  await expect(page.getByText("Vous êtes Lanabaga")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ouvrir mon tableau de bord" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Télécharger|Remplacer/ })).toHaveCount(0);
  await widths(page, "lanabaga-candidature-admis");

  // One's own document opens through the relay of the portal, never the API host.
  const doc = (me.documents as Json[])[0];
  const file = await page.request.get(`/api/proxy/lanaya/me/documents/${doc.id}/file`);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toContain("application/pdf");

  await page.goto("/lanabaga/documents");
  await settle(page);
  await expect(page.getByText("Vos pièces ne se modifient plus depuis cet espace")).toBeVisible();
  await widths(page, "lanabaga-documents");

  await page.goto("/lanabaga/compliance");
  await settle(page);
  await expect(page.getByText(me.profile.agreement.reference)).toBeVisible();
  await expect(page.getByText("Encaisser de l'argent, en espèces ou autrement, au nom de SUGU ou d'un vendeur.")).toBeVisible();
  await widths(page, "lanabaga-conformite");
});

test("R5 a draft: the network is closed, the wizard opens on the first step left to do", async ({ as }) => {
  test.setTimeout(10 * 60_000);
  const page = await as("draft");
  await page.goto("/lanabaga/prospects");
  await expect(page).toHaveURL(/\/lanabaga\/application$/, { timeout: 60_000 });
  await settle(page);
  const nav = page.getByRole("navigation", { name: "Navigation principale" }).first();
  for (const name of ["Tableau de bord", "Prospects", "Invitations", "Mes vendeurs"]) await expect(nav.getByRole("link", { name })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Candidature Lanabaga");
  await expect(page.getByText(/Profil complété à \d+ %/)).toBeVisible();
  await expect(page.getByText("Signature après validation")).toBeVisible();
  // The server refuses the network to a candidate, whatever the portal shows.
  expect((await page.request.get("/api/proxy/lanaya/me/leads")).status()).toBe(403);
  await widths(page, "candidat-etape-courante");
  // Each step, at a phone and a desktop width.
  for (const [index, name] of [[0, "profil"], [1, "identite"], [2, "references"], [3, "validation"]] as const) {
    await page.getByRole("navigation", { name: "Étapes de la candidature" }).getByRole("button").nth(index).click();
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await page.waitForTimeout(200);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
      await page.screenshot({ path: join(SHOTS, `candidat-${name}-${width}-ecran.png`) });
    }
  }
  // The consents are never ticked in advance.
  for (const box of await page.getByRole("checkbox").all()) await expect(box).not.toBeChecked();
});

test("R6 in review and complement asked: what the candidate sees of SUGU's work", async ({ as }) => {
  test.setTimeout(10 * 60_000);
  const page = await as("review");
  await page.goto("/lanabaga/application");
  await settle(page);
  await expect(page.getByText("Votre candidature est en cours d'examen")).toBeVisible();
  await expect(page.getByText("Examen commencé par SUGU")).toBeVisible();
  await widths(page, "candidat-en-revue");

  const second = await as("complement");
  await second.goto("/lanabaga/application");
  await settle(second);
  await expect(second.getByText("SUGU vous demande un complément")).toBeVisible();
  await expect(second.getByText(/photo professionnelle est floue/)).toBeVisible();
  await second.getByRole("navigation", { name: "Étapes de la candidature" }).getByRole("button", { name: /Identité/ }).click();
  await expect(second.getByText("Refusée : Photo floue")).toBeVisible();
  await expect(second.getByRole("button", { name: "Remplacer" }).first()).toBeVisible();
  await widths(second, "candidat-complement");
});

test("R7 the seller's side: who introduced store B, an honest empty state for A", async ({ as }) => {
  test.setTimeout(10 * 60_000);
  const page = await as("sellerB");
  await page.goto("/vendor/lanaya");
  await settle(page);
  const data = await api(page, "sellers/lanaya");
  const introduced = (data.stores as Json[]).find((store) => store.introduced_by);
  expect(introduced, "store B was introduced (QaLanayaSeeder)").toBeTruthy();
  await expect(page.getByText(introduced!.introduced_by.name).first()).toBeVisible();
  await expect(page.getByText(`Code ${introduced!.introduced_by.public_code}`, { exact: true })).toBeVisible();
  await expect(page.getByText(/^Vérifié$|visibilité pour vos produits|Contacter|Envoyer un message/)).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Navigation principale" }).first().getByRole("link", { name: "Lanaya" })).toHaveAttribute("aria-current", "page");
  await fullRounded(page);
  await widths(page, "vendeur-programme-lanaya-presente");

  const other = await as("sellerA");
  await other.goto("/vendor/lanaya");
  await settle(other);
  const a = await api(other, "sellers/lanaya");
  if ((a.stores as Json[]).every((store) => !store.introduced_by)) {
    await expect(other.getByText(/Aucun Lanabaga ne vous a présenté SUGU/)).toBeVisible();
    await widths(other, "vendeur-programme-lanaya-vide");
  }
});

test("R8 public pages: the sign-up of a candidate, an unknown invitation", async ({ browser, baseURL }) => {
  test.setTimeout(6 * 60_000);
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto("/signup/lanabaga");
  await expect(page.getByRole("heading", { name: "Devenir Lanabaga" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("link", { name: "Connectez-vous" })).toHaveAttribute("href", "/login?redirect=%2Flanabaga%2Fapplication");
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 1400 });
    await page.waitForTimeout(150);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: join(SHOTS, `inscription-lanabaga-${width}.png`) });
  }
  await page.goto(`/invitation/${"0".repeat(64)}`);
  await expect(page.getByText("Ce lien n'est plus valable")).toBeVisible({ timeout: 60_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(SHOTS, "invitation-introuvable-390.png") });
  await context.close();
});

test("R9 entrusted stores and followed orders: the server's lists, no amount, no buyer", async ({ as }) => {
  test.setTimeout(10 * 60_000);
  const page = await as("lanabaga");
  await page.goto("/lanabaga/sellers");
  await settle(page);
  const assignments = await api(page, "lanaya/me/assignments");
  expect((assignments.items as Json[]).some((item) => item.status.value === "active"), "store B is entrusted (QaLanayaSeeder)").toBe(true);
  const entrusted = page.getByRole("table", { name: "Boutiques confiées" });
  for (const item of assignments.items as Json[]) await expect(entrusted.getByRole("row").filter({ hasText: item.store.name })).toContainText(item.status.label);
  await widths(page, "lanabaga-boutiques-confiees");

  await page.goto("/lanabaga/orders");
  await settle(page);
  const orders = await api(page, "lanaya/me/orders");
  const table = page.getByRole("table", { name: "Commandes suivies" });
  for (const item of orders.items as Json[]) await expect(table.getByRole("row").filter({ hasText: item.order.number })).toContainText(item.store.name);
  // The server sends neither amount nor buyer; the page shows none.
  expect(JSON.stringify(orders.items)).not.toMatch(/amount|buyer|address|phone/);
  await expect(page.locator("main").getByText(/FCFA|\d F$/)).toHaveCount(0);
  await fullRounded(page);
  await widths(page, "lanabaga-commandes-suivies");
});

test("R10 seller B: the main Lanabaga of store B, and the way to end it", async ({ as }) => {
  test.setTimeout(10 * 60_000);
  const page = await as("sellerB");
  await page.goto("/vendor/lanaya");
  await settle(page);
  const data = await api(page, "sellers/lanaya");
  const store = (data.stores as Json[]).find((item) => item.assignment);
  expect(store, "store B has its main Lanabaga (QaLanayaSeeder)").toBeTruthy();
  await expect(page.getByRole("heading", { name: "Votre accompagnement" })).toBeVisible();
  await expect(page.getByText(new RegExp(`Lanabaga principal de ${store!.name} depuis le`))).toBeVisible();
  await expect(page.getByText(store!.assignment.lanabaga.name).first()).toBeVisible();
  // The way out is there; this run does not take it.
  await expect(page.getByRole("button", { name: "Mettre fin à l'accompagnement" })).toBeVisible();
  await expect(page.getByText(/^Vérifié$|FCFA/)).toHaveCount(0);
  await fullRounded(page);
  await widths(page, "vendeur-lanabaga-principal");
});

// ── W: writes on QA accounts ────────────────────────────────

test.describe("writes", () => {
  test.beforeEach(() => test.skip(!WRITES, "STAGING_ALLOW_MUTATIONS=1 is not set"));

  test("W1 a prospect, an invitation, and seller A's answer from the link", async ({ as, browser, baseURL }) => {
    test.setTimeout(12 * 60_000);
    const page = await as("lanabaga");
    await page.goto("/lanabaga/prospects");
    await settle(page);

    // A prospect: the contact permission is the Lanabaga's own tick.
    const phone = `6${STAMP.slice(-7)}`;
    await page.getByRole("button", { name: "Ajouter un prospect" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Ajouter un prospect" });
    await dialog.getByRole("textbox", { name: /^Nom de l'entreprise/ }).fill(`QA Recette ${STAMP}`);
    await dialog.getByRole("textbox", { name: /^Nom du contact/ }).fill("Contact Recette");
    await dialog.getByRole("textbox", { name: /^Téléphone/ }).fill(phone);
    await dialog.getByRole("textbox", { name: /^Ville/ }).fill("Ouagadougou");
    await dialog.getByRole("combobox", { name: /Comment l'avez-vous connu/ }).selectOption("recommendation");
    await dialog.getByRole("button", { name: "Ajouter le prospect" }).click();
    await expect(dialog.getByText("Confirmez que cette personne accepte d'être contactée.")).toBeVisible();
    await dialog.getByRole("checkbox").check();
    const created = page.waitForResponse((response) => response.url().includes("/api/proxy/lanaya/me/leads") && response.request().method() === "POST");
    await dialog.getByRole("button", { name: "Ajouter le prospect" }).click();
    expect((await created).status()).toBe(201);
    await expect(page.getByRole("table", { name: "Prospects" }).getByText(`QA Recette ${STAMP}`)).toBeVisible();

    // The invitation to seller A: the link is given once.
    const sellerA = await as("sellerA");
    await sellerA.goto("/vendor/lanaya");
    await settle(sellerA);
    const before = await api(sellerA, "sellers/lanaya");
    const storeA = (before.stores as Json[])[0];
    const alreadyIntroduced = Boolean(storeA.introduced_by && storeA.introduced_by.public_code === (await api(page, "lanaya/me")).profile.public_code);

    const form = page.locator("#invitation");
    await form.getByRole("textbox", { name: /^Nom du vendeur/ }).fill("QA Vendeur A");
    await form.getByRole("textbox", { name: /^Téléphone/ }).fill("+22670000101");
    await form.getByRole("textbox", { name: /^Nom de l'entreprise/ }).fill(storeA.name);
    await form.getByRole("textbox", { name: /^Mot personnel/ }).fill("Message de recette https://exemple.test 70 11 22 33");
    const invited = page.waitForResponse((response) => response.url().includes("/api/proxy/lanaya/me/invitations") && response.request().method() === "POST");
    await form.getByRole("button", { name: "Créer l'invitation" }).click();
    const answer = await invited;
    if (answer.status() === 422) {
      // An invitation to A is still open from an earlier run: revoke it and start again.
      const open = ((await api(page, "lanaya/me/invitations?status=open")).items as Json[]).find((invitation) => invitation.phone === "+22670000101");
      expect(open, "the refusal is the open invitation of an earlier run").toBeTruthy();
      // A write through the relay is same-origin only (CSRF guard): say where it comes from.
      expect((await page.request.post(`/api/proxy/lanaya/me/invitations/${open!.id}/revoke`, { headers: { Origin: baseURL ?? "" } })).status()).toBe(200);
      throw new Error("An invitation to seller A was left open by an earlier run: it is revoked now, run W1 again.");
    }
    expect(answer.status()).toBe(201);
    const body = ((await answer.json()) as Json).data;
    expect(body.link).toMatch(/\/invitation\/[a-f0-9]{64}$/);
    // The link and the phone number of the note are removed by the server.
    expect(body.invitation.message ?? "").not.toMatch(/https?:|70 11 22 33/);
    await expect(form.getByText(/Le lien ne sera plus affiché/)).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 1400 });
    await page.screenshot({ path: join(SHOTS, "lanabaga-invitation-creee-1440.png") });
    const token = String(body.link).split("/invitation/")[1];

    // The public page, without a session.
    const anonymous = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
    const visitor = await anonymous.newPage();
    await visitor.goto(`/invitation/${token}`);
    await expect(visitor.getByRole("link", { name: "Me connecter pour répondre" })).toBeVisible({ timeout: 60_000 });
    await expect(visitor.getByText(/ni une garantie de ventes, ni une assurance/)).toBeVisible();
    await visitor.setViewportSize({ width: 390, height: 1400 });
    await visitor.screenshot({ path: join(SHOTS, "invitation-publique-390.png") });
    await visitor.setViewportSize({ width: 1440, height: 1200 });
    await visitor.screenshot({ path: join(SHOTS, "invitation-publique-1440.png") });
    await anonymous.close();

    // Seller A opens the link: sent to its space, the decision card, nothing ticked.
    await sellerA.goto(`/invitation/${token}`);
    await expect(sellerA).toHaveURL(new RegExp(`/vendor/lanaya\\?invitation=${token}`), { timeout: 60_000 });
    await settle(sellerA);
    const consent = sellerA.getByRole("checkbox", { name: /présenté SUGU/ });
    await expect(consent).not.toBeChecked();
    await widths(sellerA, "vendeur-decision-invitation");
    if (alreadyIntroduced) {
      // A proposal of SUGU may be on the same page: its own « Refuser » is named after it.
      await sellerA.getByRole("button", { name: "Refuser", exact: true }).click();
      await sellerA.getByRole("button", { name: "Refuser l'invitation" }).click();
      await expect(sellerA).toHaveURL(/\/vendor\/lanaya$/);
      const after = ((await api(page, "lanaya/me/invitations")).items as Json[]).find((invitation) => invitation.id === body.invitation.id);
      expect(after?.status.value).toBe("declined");
      return;
    }
    await sellerA.getByRole("button", { name: "Accepter la mise en relation" }).click();
    await expect(sellerA.getByText("Cochez la case pour confirmer votre accord.")).toBeVisible();
    await consent.check();
    const accepted = sellerA.waitForResponse((response) => response.url().includes(`/lanaya/invitations/${token}/accept`));
    await sellerA.getByRole("button", { name: "Accepter la mise en relation" }).click();
    expect((await accepted).status()).toBe(200);
    await expect(sellerA).toHaveURL(/\/vendor\/lanaya$/);
    await expect(sellerA.getByText("Mise en relation acceptée").first()).toBeVisible();
    // The Lanabaga sees store A among its sellers; the seller's wallet and payout methods are untouched.
    const sellers = await api(page, "lanaya/me/sellers");
    expect((sellers.items as Json[]).some((seller) => seller.store?.id === storeA.id)).toBe(true);
    // The token is now spent.
    expect((await sellerA.request.get(`/api/proxy/lanaya/invitations/${token}`)).status()).toBe(404);
  });

  test("W2 a new account applies, from the sign-up to the submission", async ({ browser, baseURL }) => {
    test.skip(!LOCAL, "the e-mail code is read in the local laravel.log");
    test.setTimeout(15 * 60_000);
    const log = env.STAGING_LARAVEL_LOG ?? join(__dirname, "..", "..", "..", "sugu", "storage", "logs", "laravel.log");
    const email = `qa-lanabaga-inscrit-${STAMP}@qa.sugu.test`;
    const secret = `Recette-${STAMP}-Lb`;
    const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto("/signup/lanabaga");
    await page.getByRole("textbox", { name: /^Prénom/ }).fill("Recette");
    await page.getByRole("textbox", { name: /^Nom/ }).fill(`Inscrit ${STAMP}`);
    await page.getByRole("textbox", { name: /^Téléphone/ }).fill(`5${STAMP.slice(-7)}`);
    await page.getByRole("textbox", { name: /^E-mail/ }).fill(email);
    await page.getByRole("textbox", { name: /^Ville/ }).fill("Ouagadougou");
    await page.locator("#password").fill(secret);
    await page.locator("#password-confirm").fill(secret);
    const offset = existsSync(log) ? statSync(log).size : 0;
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByRole("heading", { name: "Vérifier votre e-mail" })).toBeVisible({ timeout: 120_000 });

    // The code of the e-mail, in the part of the log written since the sign-up.
    let code = "";
    await expect(async () => {
      const tail = readFileSync(log).subarray(offset).toString("utf8");
      const match = /<div class=['"]code['"][^>]*>\s*(\d{6})\s*</.exec(tail);
      code = match?.[1] ?? "";
      expect(code).toMatch(/^\d{6}$/);
    }).toPass({ timeout: 60_000 });
    await page.getByRole("textbox", { name: /Code de confirmation/ }).fill(code);
    await page.getByRole("button", { name: "Vérifier l'e-mail" }).click();
    await expect(page).toHaveURL(/\/lanabaga\/application$/, { timeout: 120_000 });
    await settle(page);

    // Step 1: profile.
    await page.getByRole("textbox", { name: /Spécialités/ }).fill("Électronique");
    await page.keyboard.press("Enter");
    await page.getByRole("combobox", { name: /Années d'expérience/ }).selectOption("3-5");
    await page.getByRole("button", { name: "Continuer" }).click();
    // Step 2: the two pieces (placeholder PDFs, written here, never kept).
    const pdf = Buffer.from("%PDF-1.4\n% Piece de recette fictive\n%%EOF\n");
    for (const label of ["Pièce d'identité", "Photo professionnelle"]) {
      const row = page.locator("li").filter({ hasText: label });
      const chooser = page.waitForEvent("filechooser");
      await row.getByRole("button", { name: "Télécharger" }).click();
      await (await chooser).setFiles({ name: "recette.pdf", mimeType: "application/pdf", buffer: pdf });
      await expect(row.getByText("À vérifier")).toBeVisible({ timeout: 60_000 });
    }
    await page.getByRole("button", { name: "Continuer" }).click();
    // Step 3: two references.
    const references = page.locator("fieldset");
    for (const [index, [name, company, phone, relation]] of [
      ["Référence Un", "QA Entreprise Un", "70111111", "regular_client"],
      ["Référence Deux", "QA Entreprise Deux", "70222222", "business_partner"],
    ].entries()) {
      const set = references.nth(index);
      await set.getByRole("textbox", { name: /^Nom complet/ }).fill(name);
      await set.getByRole("textbox", { name: /^Entreprise/ }).fill(company);
      await set.getByRole("textbox", { name: /^Téléphone/ }).fill(phone);
      await set.getByRole("combobox", { name: /^Relation/ }).selectOption(relation);
    }
    await page.getByRole("button", { name: "Continuer" }).click();
    // Step 4: nothing goes without the boxes.
    await page.getByRole("button", { name: "Soumettre ma candidature" }).click();
    await expect(page.getByText("Cochez chacun des engagements pour soumettre.")).toBeVisible();
    for (const box of await page.getByRole("checkbox").all()) await box.check();
    const submitted = page.waitForResponse((response) => response.url().includes("/lanaya/me/application/submit"));
    await page.getByRole("button", { name: "Soumettre ma candidature" }).click();
    expect((await submitted).status()).toBe(200);
    await expect(page.getByText("Votre candidature est en cours d'examen")).toBeVisible();
    const me = await api(page, "lanaya/me");
    expect(me.profile.application_status.value).toBe("submitted");
    expect((me.consents as Json[]).every((consent) => consent.given)).toBe(true);
    await page.setViewportSize({ width: 390, height: 1800 });
    await page.screenshot({ path: join(SHOTS, "candidature-soumise-390.png") });
    await context.close();
  });

  test("W3 seller A answers the proposal Ops made in the back-office: the consent is theirs", async ({ as }) => {
    test.setTimeout(10 * 60_000);
    const page = await as("sellerA");
    await page.goto("/vendor/lanaya");
    await settle(page);
    const before = await api(page, "sellers/lanaya");
    const store = (before.stores as Json[]).find((item) => item.proposal);
    test.skip(!store, "no proposal for seller A: Ops entrusts store A from the back-office first (Lanaya > Candidatures > dossier > Confier une boutique)");

    await expect(page.getByRole("heading", { name: "Proposition d'accompagnement" })).toBeVisible();
    const consent = page.getByRole("checkbox", { name: /Lanabaga principal de ma boutique/ });
    await expect(consent).not.toBeChecked();
    await expect(page.getByText(store!.proposal.consent.text)).toBeVisible();
    await widths(page, "vendeur-proposition");

    await page.getByRole("button", { name: "Accepter ce Lanabaga" }).click();
    await expect(page.locator("main").getByText("Cochez la case pour confirmer votre accord.")).toBeVisible();
    await consent.check();
    const accepted = page.waitForResponse((response) => response.url().includes(`/sellers/lanaya/assignments/${store!.proposal.id}/accept`));
    await page.getByRole("button", { name: "Accepter ce Lanabaga" }).click();
    expect((await accepted).status()).toBe(200);
    await expect(page.getByText(new RegExp(`Lanabaga principal de ${store!.name} depuis le`))).toBeVisible();

    const after = await api(page, "sellers/lanaya");
    const now = (after.stores as Json[]).find((item) => item.id === store!.id)!;
    expect(now.assignment.status.value).toBe("active");
    expect(now.assignment.lanabaga.public_code).toBe(store!.proposal.lanabaga.public_code);
    expect(now.proposal).toBeNull();
    await widths(page, "vendeur-lanabaga-principal-accepte");
  });
});
