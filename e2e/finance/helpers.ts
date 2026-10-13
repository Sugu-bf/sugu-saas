import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

// Shared by the money specs. Data: e2e/finance/mock-finance.mjs, one fresh
// wallet per sign-in, so every test may ask for a withdrawal and declare a
// method.

export const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;
/** Below this width the shell shows its phone tab bar. */
export const PHONE = 768;
/** Smallest side of something a finger must hit. */
export const TOUCH_TARGET = 44;

/** The three profiles of the stand-in, and where the money of each lives. */
export const PROFILES = {
  vendor: { email: "vendeur@qa.test", base: "/vendor/wallet", role: "vendor", title: "Portefeuille", wallet: "sellers/wallet", request: "sellers/wallet/request-payout", methods: "stores/11/payout-settings", balance: "Solde disponible" },
  agency: { email: "agence@qa.test", base: "/agency/earnings", role: "agency", title: "Finances de l'agence", wallet: "agencies/21/wallet", request: "agencies/21/withdrawals", methods: "agencies/21/payout-settings", balance: "Solde disponible" },
  courier: { email: "coursier@qa.test", base: "/driver/earnings", role: "courier", title: "Mes gains", wallet: "courier/wallet", request: "courier/withdrawals", methods: "courier/payout-settings", balance: "Gains disponibles" },
} as const;
export type Profile = keyof typeof PROFILES;
export const ALL = Object.keys(PROFILES) as Profile[];

const PASSWORD = "Passw0rd!";

/** The moment the data set is built around (mock-finance.mjs, `fixtureNow`): 12 October 2026 at 16:00. */
export const fixtureNow = () => new Date(2026, 9, 12, 16, 0, 0, 0);

/**
 * A request made by this process, not by the browser, to `next start`: a
 * kept-alive connection the server has just closed is tried again here, as a
 * browser would by itself. Nothing else is.
 */
async function overResetConnection<T>(send: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await send();
    } catch (error) {
      if (attempt >= 3 || !/ECONNRESET|socket hang up/.test(String(error))) throw error;
    }
  }
}

export async function signIn(page: Page, baseURL: string | undefined, profile: Profile) {
  const response = await overResetConnection(() => page.request.post("/api/auth/login", { data: { email: PROFILES[profile].email, password: PASSWORD }, headers: { Origin: baseURL ?? "" } }));
  expect(response.ok(), `login: ${response.status()}`).toBe(true);
}

export async function open(page: Page, baseURL: string | undefined, profile: Profile, screen = "", options: { width?: number; height?: number } = {}) {
  const width = options.width ?? 390;
  await page.setViewportSize({ width, height: options.height ?? (width < PHONE ? 844 : 900) });
  // The page lives at the moment the data set was built for: months and days hold at any time.
  await page.clock.setFixedTime(fixtureNow());
  await signIn(page, baseURL, profile);
  await page.goto(`${PROFILES[profile].base}${screen}`);
  await expect(page.locator(`[data-shell="pro"][data-role="${PROFILES[profile].role}"]`)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/** What the stand-in answers, read as the portal reads it. */
export async function api(page: Page, path: string): Promise<{ status: number; body: Record<string, any> }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const response = await overResetConnection(() => page.request.get(`/api/proxy/${path}`));
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

export async function post(page: Page, baseURL: string | undefined, path: string, data: Record<string, unknown>): Promise<{ status: number; body: Record<string, any> }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const response = await overResetConnection(() => page.request.post(`/api/proxy/${path}`, { data, headers: { Origin: baseURL ?? "" } }));
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

/** 12 345 600 centimes → "123 456 FCFA", spaces made plain. */
export const francs = (cents: number) => `${Math.trunc(cents / 100).toLocaleString("fr-FR").replace(/\s/g, " ")} FCFA`;
export const plain = (text: string) => text.replace(/\s/g, " ");
export const textOf = async (locator: Locator) => plain(await locator.innerText());

/** Serious and critical WCAG 2.1 A/AA violations in the page content. */
export async function blockingViolations(page: Page, scope = "main") {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include(scope).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target.join(" ")).slice(0, 3) }));
}

/** Pixels the document, or the scroller the pages live in, can be dragged sideways: 0 on a page that fits. */
export const sidewaysOverflow = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, main ? main.scrollWidth - main.clientWidth : 0);
  });

export const figures = (page: Page) => page.getByRole("region", { name: "Chiffres clés" });
export const dialog = (page: Page) => page.getByRole("dialog");
export const confirmation = (page: Page) => page.getByRole("alertdialog");
/** The message of the page content. Next keeps an alert of its own outside it, to announce navigations. */
export const notice = (page: Page, text: string | RegExp) => page.locator("main").locator('[role="alert"], [role="status"]').filter({ hasText: text });
export const toast = (page: Page, text: string | RegExp) => page.locator("[data-sonner-toast]").filter({ hasText: text });

export async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  expect(bounds, "the element is laid out").not.toBeNull();
  return bounds!;
}

/** Fills the amount and waits for the server's quote of it. */
export async function typeAmount(page: Page, francsTyped: string) {
  await page.getByLabel("Montant à retirer").fill(francsTyped);
  await expect(page.getByRole("region", { name: "Récapitulatif" })).not.toHaveAttribute("aria-busy", "true");
}
