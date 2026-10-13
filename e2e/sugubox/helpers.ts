import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

// Shared by the Sugu Box specs. Data: e2e/sugubox/mock-sugubox.mjs, built
// around 12 October 2026 at 16:00.

export const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;
/** Below this width the shell shows its phone tab bar. */
export const PHONE = 768;
/** Smallest side of something a finger must hit. */
export const TOUCH_TARGET = 44;

export const BASE = "/vendor/sugubox";
export const SCREENS = {
  overview: { path: "", title: "Vue d'ensemble Sugu Box" },
  stock: { path: "/stock", title: "Mon stock" },
  receptions: { path: "/inbound", title: "Réceptions" },
  reception: { path: "/inbound/inb-121", title: "Réception REC-2026-00121" },
  expeditions: { path: "/outbound", title: "Expéditions" },
  expedition: { path: "/outbound/out-85", title: "Expédition EXP-2026-00085" },
  movements: { path: "/movements", title: "Mouvements" },
} as const;
export type Screen = keyof typeof SCREENS;
export const ALL = Object.keys(SCREENS) as Screen[];

const PASSWORD = "Passw0rd!";
export const fixtureNow = () => new Date(2026, 9, 12, 16, 0, 0, 0);

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

export async function signIn(page: Page, baseURL: string | undefined, email = "vendeur@qa.test") {
  const response = await overResetConnection(() => page.request.post("/api/auth/login", { data: { email, password: PASSWORD }, headers: { Origin: baseURL ?? "" } }));
  expect(response.ok(), `login: ${response.status()}`).toBe(true);
}

export async function open(page: Page, baseURL: string | undefined, path = "", options: { width?: number; height?: number } = {}) {
  const width = options.width ?? 1280;
  await page.setViewportSize({ width, height: options.height ?? (width < PHONE ? 844 : 900) });
  await page.clock.setFixedTime(fixtureNow());
  await signIn(page, baseURL);
  await page.goto(`${BASE}${path}`);
  await expect(page.locator('[data-shell="pro"][data-role="vendor"]')).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/** What the stand-in answers, read as the portal reads it. */
export async function api(page: Page, path: string): Promise<{ status: number; body: Record<string, any> }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const response = await overResetConnection(() => page.request.get(`/api/proxy/sellers/sugubox/board/${path}`));
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

export const plain = (text: string) => text.replace(/\s/g, " ");
export const textOf = async (locator: Locator) => plain(await locator.innerText());

/** The rows of the list of a page: table rows on a wide container, cards on a narrow one. */
export const rows = (page: Page) => page.locator("main").locator("tbody tr, [data-row-card]");
export const table = (page: Page, name: string) => page.getByRole("table", { name });
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
