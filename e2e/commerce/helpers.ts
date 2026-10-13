import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

// Shared by the V7 specs (clients, marketing, statistics). Data:
// e2e/commerce/mock-commerce.mjs, built around 12 October 2026 at 16:00.

export const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;
/** Below this width the shell shows its phone tab bar. */
export const PHONE = 768;
/** Smallest side of something a finger must hit. */
export const TOUCH_TARGET = 44;

export const SELLER = "vendeur@qa.test";
export const AGENCY = "agence@qa.test";

export const SCREENS = {
  clients: { path: "/vendor/clients", title: "Mes clients", account: SELLER },
  client: { path: "/vendor/clients?client=cust-001", title: "Awa Traoré", account: SELLER },
  codes: { path: "/vendor/marketing", title: "Marketing", account: SELLER },
  promotions: { path: "/vendor/marketing?onglet=promotions", title: "Marketing", account: SELLER },
  statistics: { path: "/vendor/statistics", title: "Statistiques", account: SELLER },
  agency: { path: "/agency/statistics", title: "Statistiques", account: AGENCY },
} as const;
export type Screen = keyof typeof SCREENS;
export const ALL = Object.keys(SCREENS) as Screen[];

const PASSWORD = "Passw0rd!";
export const fixtureNow = () => new Date(Date.UTC(2026, 9, 12, 16, 0, 0));

/** A kept-alive connection `next start` has just closed is tried again, as a browser would by itself. */
async function overResetConnection<T>(send: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await send();
    } catch (error) {
      if (attempt >= 3 || !/ECONNRESET|socket hang up/.test(String(error))) throw error;
    }
  }
}

export async function signIn(page: Page, baseURL: string | undefined, email: string = SELLER) {
  const response = await overResetConnection(() => page.request.post("/api/auth/login", { data: { email, password: PASSWORD }, headers: { Origin: baseURL ?? "" } }));
  expect(response.ok(), `login: ${response.status()}`).toBe(true);
}

export async function open(page: Page, baseURL: string | undefined, path: string, options: { width?: number; height?: number; account?: string } = {}) {
  const width = options.width ?? 1280;
  const account = options.account ?? (path.startsWith("/agency") ? AGENCY : SELLER);
  await page.setViewportSize({ width, height: options.height ?? (width < PHONE ? 844 : 900) });
  await page.clock.setFixedTime(fixtureNow());
  await signIn(page, baseURL, account);
  await page.goto(path);
  await expect(page.locator(`[data-shell="pro"][data-role="${account === AGENCY ? "agency" : "vendor"}"]`)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

export const openScreen = (page: Page, baseURL: string | undefined, screen: Screen, options: { width?: number } = {}) => open(page, baseURL, SCREENS[screen].path, { ...options, account: SCREENS[screen].account });

/** What the stand-in received since it started or was reset (bodies of the writes, periods asked). */
export async function received(page: Page): Promise<Array<Record<string, any>>> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const response = await overResetConnection(() => page.request.get("/api/proxy/__commerce/received"));
  return (await response.json()).data;
}
export const resetStandIn = (page: Page) => overResetConnection(() => page.request.get("/api/proxy/__commerce/reset"));

export const plain = (text: string) => text.replace(/\s/g, " ");
export const textOf = async (locator: Locator) => plain(await locator.innerText());

/** The rows of the list of a page: table rows on a wide container, cards on a narrow one. */
export const rows = (page: Page) => page.locator("main").locator("tbody tr, [data-row-card]");
/** A list is settled once it is no longer loading or refreshing. */
export async function settled(page: Page) {
  await expect(page.locator("main [aria-busy='true']")).toHaveCount(0);
}

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

export const toast = (page: Page, text: string | RegExp) => page.locator("[data-sonner-toast]").filter({ hasText: text });
export const figures = (page: Page, name: string) => page.getByRole("region", { name });
