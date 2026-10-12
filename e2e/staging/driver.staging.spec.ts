import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Acceptance run of the COURIER space (V4) against a REAL backend: what it
// reads, what it changes, and what the server refuses to a courier who
// cannot work.
//
// Nothing here is a stand-in: the portal under STAGING_URL talks to its own
// Laravel, seeded by QaProPortalSeeder then QaCourierSeeder. It runs on the
// staging portal, and on a local portal started in front of a local Laravel
// — the report says which, check by check ("staging" / "local").
//
//   STAGING_URL=https://pro-zk47m.sugu.pro
//   STAGING_COURIER_PASSWORD=…        the QA password (or STAGING_AGENCY_PASSWORD: it is the same one)
//   STAGING_COURIER_EMAIL=…           default qa-coursier@qa.sugu.test
//   STAGING_ALLOW_MUTATIONS=1         required for the tests that write, tagged [write]
//   STAGING_FOREIGN_SHIPMENT_ID=…     a delivery of ANOTHER agency, where one is known
//   STAGING_SHOTS=…                   where the captures go (default docs/captures/v4-recette/<staging|local>)
//
//   npx playwright test -c playwright.staging.config.ts driver
//
// Only accounts of the QA seeder (@qa.sugu.test) are used. The tests that
// write progress the SEEDED missions of the QA courier (SU-2099-000601…) and
// send a synthetic document: run QaCourierSeeder again to put them back.
// The codes a boutique and a customer tell are those the seeder fixes; the
// run plays both. Nothing prints the credentials; the config records no trace.

const env = process.env;
const password = env.STAGING_COURIER_PASSWORD ?? env.STAGING_AGENCY_PASSWORD ?? "";
const ACCOUNTS = {
  active: env.STAGING_COURIER_EMAIL ?? "qa-coursier@qa.sugu.test",
  incomplete: "qa-coursier-attente@qa.sugu.test",
  rejected: "qa-coursier-refuse@qa.sugu.test",
  suspended: "qa-coursier-suspendu@qa.sugu.test",
} as const;
type Account = keyof typeof ACCOUNTS;

const hasAccount = Boolean(password);
const isQaAccount = /@qa\.sugu\.test$/i.test(ACCOUNTS.active);
const mayWrite = env.STAGING_ALLOW_MUTATIONS === "1";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.STAGING_URL ?? "");
const TARGET = LOCAL ? "local" : "staging";

const SHOTS = env.STAGING_SHOTS ?? join(__dirname, "..", "..", "docs", "captures", "v4-recette", TARGET);
mkdirSync(SHOTS, { recursive: true });

const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;

/** The missions of the seeder, by the stage it leaves them in. */
const REF = (sequence: number) => `SU-2099-000${sequence}`;
const pickupCode = (sequence: number) => `QAP00${sequence}`;
const deliveryCode = (sequence: number) => `QAD00${sequence}`;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** A synthetic identity document: one page that says what it is. A real PDF, so that it opens. */
function syntheticPdf(): Buffer {
  const stream = "BT /F1 14 Tf 30 100 Td (PIECE FACTICE DE RECETTE SUGU - AUCUNE VALEUR) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 440 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = body.length;
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

// ── Sessions ────────────────────────────────────────────────

const sessions = new Map<Account, Awaited<ReturnType<BrowserContext["storageState"]>>>();

/** Signs an account in once per worker, through the form of the portal. The session lives in memory only. */
async function sessionOf(browser: Browser, baseURL: string | undefined, account: Account) {
  const known = sessions.get(account);
  if (known) return known;
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto("/login");
  await page.locator('input[type="email"], input[name="email"]').first().fill(ACCOUNTS[account]);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /Se connecter/ }).click();
  // A courier who can work lands on their home; the others on their file.
  await expect(page, `${account} is signed in`).toHaveURL(account === "active" ? /\/driver\/dashboard/ : /\/driver\/documents/, { timeout: 60_000 });
  const state = await context.storageState();
  sessions.set(account, state);
  await context.close();
  return state;
}

const test = base.extend<{ as: (account: Account, width?: number) => Promise<Page> }>({
  as: async ({ browser, baseURL }, provide) => {
    const contexts: BrowserContext[] = [];
    await provide(async (account, width = 390) => {
      const context = await browser.newContext({ baseURL, storageState: await sessionOf(browser, baseURL, account), viewport: { width, height: width < 768 ? 844 : 900 } });
      contexts.push(context);
      return context.newPage();
    });
    for (const context of contexts) await context.close();
  },
});

test.beforeEach(() => {
  test.skip(!hasAccount, "STAGING_COURIER_PASSWORD (or STAGING_AGENCY_PASSWORD) is not set");
  test.skip(!isQaAccount, "only an account of the QA seeder (@qa.sugu.test) is accepted");
});

const write = (title: string) => `[write] ${title}`;
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`) });
const api = async (page: Page, path: string): Promise<{ status: number; body: Json }> => {
  const response = await page.request.get(`/api/proxy/${path}`);
  return { status: response.status(), body: await response.json().catch(() => ({})) };
};
const notice = (page: Page, text: string | RegExp) => page.locator("main").locator('[role="alert"], [role="status"]').filter({ hasText: text });
const card = (page: Page, sequence: number) => page.locator("[data-mission]").filter({ hasText: REF(sequence) });
const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze()).violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical").map((violation) => violation.id);

/** The id of a seeded mission, read from the lists as the courier sees them. */
async function missionId(page: Page, sequence: number): Promise<string> {
  for (const scope of ["in_progress", "offered", "done"]) {
    const { body } = await api(page, `courier/deliveries?scope=${scope}&per_page=50`);
    const found = (body.data?.rows as Json[] | undefined)?.find((row) => row.reference === REF(sequence));
    if (found) return found.id;
  }
  throw new Error(`mission ${REF(sequence)} is not in the lists of the QA courier: run QaCourierSeeder`);
}

// ── A. What the courier reads ───────────────────────────────

test.describe("A. reads", () => {
  test("A1 the home counts what the lists hold", async ({ as }) => {
    const page = await as("active");
    await page.goto("/driver/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Bonjour");

    const { status, body } = await api(page, "courier/dashboard");
    expect(status).toBe(200);
    const counts = body.data.counts as Json;
    const lists = (await api(page, "courier/deliveries?scope=in_progress&per_page=1")).body.data.counts as Json;
    // Two readings of the same server: the home never counts by itself.
    expect(counts.to_accept).toBe(lists.offered);
    expect(counts.in_progress).toBe(lists.in_progress);
    expect(counts.delivered + counts.failed).toBe(lists.done);

    const figures = page.getByRole("region", { name: "Vos missions en chiffres" });
    await expect(figures.getByRole("link", { name: /À accepter/ })).toContainText(String(counts.to_accept));
    await expect(figures.getByRole("link", { name: /En cours/ })).toContainText(String(counts.in_progress));
    await expect(page.locator("[data-mission]").first()).toBeVisible();
    await shot(page, "A1-accueil-390");
  });

  test("A2 the three lists, their amounts in francs, and no code anywhere", async ({ as }) => {
    const page = await as("active");
    const answers: string[] = [];
    page.on("response", async (response) => {
      if (response.url().includes("/api/proxy/courier/")) answers.push(await response.text().catch(() => ""));
    });

    await page.goto("/driver/deliveries?liste=disponibles");
    await expect(page.locator("[data-mission]").first()).toBeVisible();
    await shot(page, "A2-missions-disponibles-390");

    await page.getByRole("tab", { name: /En cours/ }).click();
    await expect(page.locator("[data-mission]").first()).toBeVisible();
    // 4 000 F of goods and 1 000 F of delivery, cash on delivery: 5 000 F to collect, read from centimes.
    const { body } = await api(page, "courier/deliveries?scope=in_progress&per_page=50");
    const cod = (body.data.rows as Json[]).find((row) => row.payment_mode === "cod");
    expect(cod, "a cash-on-delivery mission is in hand").toBeTruthy();
    const francs = new Intl.NumberFormat("fr-FR").format(cod!.cash_to_collect / 100).replace(/\s/g, " ");
    await expect.poll(async () => ((await card(page, Number(String(cod!.reference).slice(-3))).textContent()) ?? "").replace(/\s/g, " ")).toContain(`${francs} FCFA`);
    await shot(page, "A2-missions-en-cours-390");

    await page.getByRole("tab", { name: /Terminées/ }).click();
    await expect(page.locator("[data-mission]").first()).toBeVisible();

    // The codes the seeder fixed are in no answer the courier received.
    for (const sequence of [601, 602, 603, 604, 605]) {
      expect(answers.join("\n")).not.toContain(pickupCode(sequence));
      expect(answers.join("\n")).not.toContain(deliveryCode(sequence));
    }
  });

  test("A3 the page of a mission: its stage, its places, its steps as the server projects them", async ({ as }) => {
    const page = await as("active");
    await page.goto("/driver/deliveries");
    const id = await missionId(page, 603);
    await page.goto(`/driver/deliveries/${id}`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Mission ${REF(603)}`);
    const { body } = await api(page, `courier/deliveries/${id}`);
    expect(body.data.stage).toBe("in_transit");
    expect(body.data.security_code).toBe("N/A");
    expect(JSON.stringify(body)).not.toContain(deliveryCode(603));
    expect(JSON.stringify(body)).not.toContain(pickupCode(603));

    await expect(page.getByRole("list", { name: "Avancement de la mission" }).getByRole("listitem")).toHaveText([/Assignée : fait/, /Collectée : fait/, /En transit : en cours/, /Livrée : à venir/]);
    await expect(page.getByRole("button", { name: "Confirmer l'arrivée" })).toBeVisible();
    // Coordinates are seeded for this one: the map is drawn, its tiles relayed by the portal.
    await expect(page.getByRole("img", { name: /^Carte/ })).toBeVisible();
    expect(await serious(page)).toEqual([]);
    await shot(page, "A3-mission-en-transit-390");
  });

  test("A4 a COD Mixte says what holds it, and asks for no cash", async ({ as }) => {
    const page = await as("active");
    await page.goto("/driver/deliveries");
    const id = await missionId(page, 605);
    await page.goto(`/driver/deliveries/${id}`);

    await expect(notice(page, "Le client n'a pas encore réglé les frais de livraison")).toBeVisible();
    await expect(page.getByRole("button", { name: "Démarrer la livraison" })).toHaveCount(0);
    await expect(page.locator("main")).toContainText("Vous n'encaissez rien en espèces.");
    await expect(page.locator("main")).not.toContainText("À encaisser");

    // And the server refuses by itself what the screen does not offer.
    const forced = await page.request.post(`/api/proxy/courier/deliveries/${id}/start-transit`, { headers: { Origin: new URL(page.url()).origin } });
    expect(forced.status()).toBe(422);
    expect((await api(page, `courier/deliveries/${id}`)).body.data.status).toBe("assigned");
    await shot(page, "A4-mission-cod-mixte-390");
  });

  test("A5 the history, its counters and a failure with its reason", async ({ as }) => {
    const page = await as("active", 1280);
    await page.goto("/driver/history");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Historique des missions");

    const { body } = await api(page, "courier/history?per_page=50");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(`(${body.data.status_counts.all} mission`);
    await page.getByRole("tab", { name: /Échecs/ }).click();
    const rows = page.getByRole("region", { name: "Missions terminées" }).locator("tbody tr");
    await expect(rows).toHaveCount(body.data.status_counts.failed);
    await expect(rows.first()).toContainText("Le client ne répond pas");
    await shot(page, "A5-historique-1280");
  });

  test("A6 the six widths: nothing is dragged sideways, nothing serious for accessibility", async ({ as }) => {
    // Each screen is loaded once and resized: a real backend limits how often it is read.
    const page = await as("active");
    for (const path of ["/driver/dashboard", "/driver/deliveries", "/driver/history", "/driver/profile", "/driver/documents"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible({ timeout: 20_000 });
      await page.waitForLoadState("networkidle");
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
        await page.waitForTimeout(150);
        const overflow = await page.evaluate(() => {
          const main = document.querySelector("main");
          return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, main ? main.scrollWidth - main.clientWidth : 0);
        });
        expect(overflow, `${path} at ${width}`).toBe(0);
        if (width === 390 || width === 1280) expect(await serious(page), `${path} at ${width}`).toEqual([]);
      }
    }
  });
});

// ── B. The file, and who is kept out of the missions ────────

test.describe("B. file and access", () => {
  test("B1 an approved courier reads their documents through the portal, byte for byte a PDF", async ({ as }) => {
    const page = await as("active");
    await page.goto("/driver/documents");
    await expect(notice(page, "Votre dossier est validé")).toBeVisible();

    const link = page.locator('[data-document="id_card"]').getByRole("link", { name: /Voir le fichier/ });
    const available = (await link.count()) > 0;
    if (!available) {
      // The record outlived its file: said, with no link that cannot work (a storage replaced by a deployment).
      await expect(page.locator('[data-document="id_card"]')).toContainText("Le fichier n'est plus sur le serveur");
      test.info().annotations.push({ type: "storage", description: "the file of the seeded document is not on the server: private KYC storage to check" });
    } else {
      const href = await link.getAttribute("href");
      expect(href).toMatch(/^\/api\/proxy\/courier\/settings\/kyc\/[^/]+\/file$/);
      const file = await page.request.get(href!);
      expect(file.status()).toBe(200);
      expect(file.headers()["content-type"]).toBe("application/pdf");
      expect(file.headers()["cache-control"]).toContain("no-store");
      expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");

      // Without a session, the same address answers nothing.
      const anonymous = await page.context().browser()!.newContext();
      expect((await anonymous.request.get(new URL(href!, page.url()).toString())).status()).toBe(401);
      await anonymous.close();
    }

    // No link of the page leaves the portal.
    for (const target of await page.locator("main a[href]").evaluateAll((links) => links.map((anchor) => (anchor as HTMLAnchorElement).href))) {
      expect(new URL(target).origin, target).toBe(new URL(page.url()).origin);
    }
    await shot(page, "B1-documents-390");
  });

  test("B2 a courier whose file is incomplete lands on it, and gets no mission from the server", async ({ as }) => {
    const page = await as("incomplete");
    await page.goto("/driver/deliveries");
    await expect(page).toHaveURL(/\/driver\/documents$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes documents");

    for (const path of ["courier/dashboard", "courier/deliveries?scope=in_progress", "courier/deliveries/available"]) {
      const { status, body } = await api(page, path);
      expect(status, path).toBe(403);
      expect(body.error_code, path).toBe("COURIER_KYC_PENDING");
    }
    // A business refusal, not an expired session.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes documents");
    await shot(page, "B2-dossier-390");
  });

  test("B3 a refused file says why; a suspended account says so and keeps its history", async ({ as }) => {
    const rejected = await as("rejected");
    await rejected.goto("/driver/dashboard");
    await expect(rejected).toHaveURL(/\/driver\/documents$/);
    await expect(notice(rejected, "Dossier refusé")).toContainText("La photo du permis est floue");
    await expect(rejected.locator('[data-document="driver_license"]')).toContainText("Refusé");
    await shot(rejected, "B3-dossier-refuse-390");

    const suspended = await as("suspended");
    await suspended.goto("/driver/deliveries");
    await expect(suspended).toHaveURL(/\/driver\/documents$/);
    await expect(notice(suspended, "Compte suspendu")).toBeVisible();
    expect((await api(suspended, "courier/deliveries?scope=in_progress")).body.error_code).toBe("COURIER_NOT_ACTIVE");
    await suspended.goto("/driver/history");
    await expect(suspended.getByRole("heading", { level: 1 })).toContainText("(1 mission)");
    await shot(suspended, "B3-compte-suspendu-390");
  });

  test("B4 somebody else's mission and document do not exist for this courier", async ({ as }) => {
    const page = await as("active");
    await page.goto("/driver/dashboard");

    // The mission of the suspended colleague of the same agency (SU-2099-000609) is in none of their lists.
    for (const scope of ["offered", "in_progress", "done"]) {
      const { body } = await api(page, `courier/deliveries?scope=${scope}&per_page=50`);
      expect((body.data.rows as Json[]).map((row) => row.reference), scope).not.toContain(REF(609));
    }
    const foreign = env.STAGING_FOREIGN_SHIPMENT_ID;
    if (foreign) {
      expect((await api(page, `courier/deliveries/${foreign}`)).status).toBe(404);
      const accept = await page.request.post(`/api/proxy/courier/deliveries/${foreign}/accept`, { headers: { Origin: new URL(page.url()).origin } });
      expect(accept.status()).toBe(404);
    }
    expect((await api(page, "courier/settings/kyc/01hzzzzzzzzzzzzzzzzzzzzzzz/file")).status).toBe(404);
    await page.goto("/driver/deliveries/01hzzzzzzzzzzzzzzzzzzzzzzz");
    await expect(page.locator("main")).toContainText("Mission introuvable");
  });
});

// ── C. What the courier changes ─────────────────────────────

test.describe("C. writes", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(() => test.skip(!mayWrite, "set STAGING_ALLOW_MUTATIONS=1 to run the tests that write"));

  test(write("C1 accepts a mission given by the agency, once"), async ({ as }) => {
    const page = await as("active");
    await page.goto("/driver/deliveries?liste=disponibles");
    await card(page, 601).getByRole("button", { name: "Accepter" }).dblclick();

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Mission ${REF(601)}`);
    const id = page.url().split("/").pop()!;
    const { body } = await api(page, `courier/deliveries/${id}`);
    expect(body.data.stage).toBe("to_collect");
    expect(body.data.accepted_at).toBeTruthy();
    // Accepting issued a code for the customer; the courier is not told it.
    expect(body.data.delivery_code_issued).toBe(true);
    expect(body.data.security_code).toBe("N/A");
  });

  test(write("C2 walks a mission from the collection to the delivery, with the codes the boutique and the customer tell"), async ({ as }) => {
    const page = await as("active");
    await page.goto("/driver/deliveries");
    const id = await missionId(page, 602);
    await page.goto(`/driver/deliveries/${id}`);
    const dialog = page.getByRole("dialog");

    await page.getByRole("button", { name: "Confirmer la collecte" }).click();
    await dialog.getByLabel("Code de collecte").fill("FAUX0000");
    await dialog.getByRole("button", { name: "Confirmer la collecte" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Code de collecte invalide");
    expect((await api(page, `courier/deliveries/${id}`)).body.data.picked_at).toBeNull();

    await dialog.getByLabel("Code de collecte").fill(pickupCode(602));
    await expect(dialog.getByLabel("Code de collecte")).toHaveValue(pickupCode(602));
    const collected = page.waitForResponse((response) => response.url().includes("/confirm-collection/") && response.request().method() === "POST");
    await dialog.getByRole("button", { name: "Confirmer la collecte" }).click();
    // What the server answered is part of the failure message: a refusal says why.
    const answer = await collected;
    expect(answer.status(), `${answer.request().postData()} → ${await answer.text()}`).toBe(200);
    await expect(page.locator("header").getByText("Collectée")).toBeVisible();

    await page.getByRole("button", { name: "Démarrer la livraison" }).click();
    await expect(page.locator("header").getByText("En transit")).toBeVisible();
    await page.getByRole("button", { name: "Confirmer l'arrivée" }).click();
    await expect(page.locator("header").getByText("Arrivé")).toBeVisible();
    await shot(page, "C2-mission-arrivee-390");

    await page.getByRole("button", { name: "J'ai livré le colis" }).click();
    await dialog.getByLabel("Code de livraison").fill("FAUX0000");
    await dialog.getByRole("button", { name: "Valider la livraison" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Le code de sécurité est invalide");
    expect((await api(page, `courier/deliveries/${id}`)).body.data.status).toBe("arrived");

    await dialog.getByLabel("Code de livraison").fill(deliveryCode(602));
    await expect(dialog.getByLabel("Code de livraison")).toHaveValue(deliveryCode(602));
    await dialog.getByRole("button", { name: "Valider la livraison" }).click();
    await expect(page.locator("header").getByText("Terminée")).toBeVisible();

    const after = (await api(page, `courier/deliveries/${id}`)).body.data;
    expect(after.status).toBe("delivered");
    expect(after.delivered_at).toBeTruthy();
    expect(after.next_actions).toEqual([]);
    await shot(page, "C2-mission-livree-390");
  });

  test(write("C3 reports a failure at the door, with its reason"), async ({ as }) => {
    const page = await as("active");
    await page.goto("/driver/deliveries");
    const id = await missionId(page, 604);
    await page.goto(`/driver/deliveries/${id}`);

    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Signaler un échec" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Que s'est-il passé ?").selectOption({ label: "Le client refuse le colis" });
    await dialog.getByLabel("Précisions").fill("QA Recette : colis refusé à la porte.");
    await dialog.getByRole("button", { name: "Signaler un échec" }).click();

    await expect(notice(page, "Livraison en échec")).toContainText("QA Recette : colis refusé à la porte.");
    const after = (await api(page, `courier/deliveries/${id}`)).body.data;
    expect(after.status).toBe("delivery_failed");
    expect(after.failure).toMatchObject({ code: "CLIENT_REFUSED", reason: "QA Recette : colis refusé à la porte." });
  });

  test(write("C4 a courier whose file is incomplete sends the missing document, and still gets no mission"), async ({ as }) => {
    const page = await as("incomplete");
    await page.goto("/driver/documents/new?type=driver_license");
    await page.getByLabel("Fichier").setInputFiles({ name: "qa-recette-permis-factice.pdf", mimeType: "application/pdf", buffer: syntheticPdf() });
    await page.getByRole("button", { name: "Envoyer le document" }).click();

    await expect(page).toHaveURL(/\/driver\/documents$/);
    await expect(notice(page, "Dossier en cours de vérification")).toBeVisible();
    const document = page.locator('[data-document="driver_license"]');
    await expect(document).toContainText("En attente");

    // What was sent is what comes back, through the portal.
    const href = await document.getByRole("link", { name: /Voir le fichier/ }).getAttribute("href");
    const file = await page.request.get(href!);
    expect(file.status()).toBe(200);
    expect(Buffer.compare(await file.body(), syntheticPdf())).toBe(0);

    // Sending a document opens nothing.
    const { status, body } = await api(page, "courier/deliveries?scope=in_progress");
    expect(status).toBe(403);
    expect(body.error_code).toBe("COURIER_KYC_PENDING");
    await shot(page, "C4-dossier-en-verification-390");
  });
});
