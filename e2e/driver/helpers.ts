import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

// Shared by the courier specs. Data: e2e/driver/mock-driver.mjs, one fresh
// data set per sign-in, so every test may progress its missions and send
// its documents.

export const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;
/** Below this width the shell shows its phone tab bar. */
export const PHONE = 768;
/** Smallest side of something a finger must hit. */
export const TOUCH_TARGET = 44;

/** The QA couriers of the stand-in: one who works, and three who cannot, each for another reason. */
export const COURIERS = {
  active: "coursier@qa.test",
  incomplete: "coursier-attente@qa.test",
  rejected: "coursier-refuse@qa.test",
  suspended: "coursier-suspendu@qa.test",
} as const;
export type Courier = keyof typeof COURIERS;

const PASSWORD = "Passw0rd!";

/** The moment the data set is built around (mock-driver.mjs, `fixtureNow`): today at 16:00. */
export function fixtureNow(): Date {
  const now = new Date();
  now.setHours(16, 0, 0, 0);
  return now;
}

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

export async function signIn(page: Page, baseURL: string | undefined, courier: Courier = "active") {
  const response = await overResetConnection(() => page.request.post("/api/auth/login", { data: { email: COURIERS[courier], password: PASSWORD }, headers: { Origin: baseURL ?? "" } }));
  expect(response.ok(), `login: ${response.status()}`).toBe(true);
}

/** A drawn tile, served in place of the map tiles (the portal relays them from OpenStreetMap): no test reaches the network. */
const BLANK_TILE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#eef0ec"/>' +
  '<path d="M0 70h256M0 190h256M60 0v256M170 0v256" stroke="#fff" stroke-width="10"/><path d="M0 128h256M118 0v256" stroke="#fff" stroke-width="4"/>' +
  '<rect x="76" y="86" width="30" height="30" rx="3" fill="#e2e6de"/><rect x="186" y="14" width="56" height="42" rx="3" fill="#dfe9d6"/></svg>';

export async function open(page: Page, baseURL: string | undefined, path: string, options: { width?: number; height?: number; courier?: Courier } = {}) {
  const width = options.width ?? 390;
  await page.setViewportSize({ width, height: options.height ?? (width < PHONE ? 844 : 900) });
  // The page lives at the moment the data set was built for: hours and days hold at any time.
  await page.clock.setFixedTime(fixtureNow());
  await page.route(/\/api\/map-tiles\//, (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: BLANK_TILE }));
  await signIn(page, baseURL, options.courier);
  await page.goto(path);
  await expect(page.locator('[data-shell="pro"][data-role="courier"]')).toBeVisible();
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

/** The card of a mission, by its number. */
export const mission = (page: Page, reference: string) => page.locator("[data-mission]").filter({ hasText: reference });
export const dialog = (page: Page) => page.getByRole("dialog");
export const confirmation = (page: Page) => page.getByRole("alertdialog");
/** The message of the page content. Next keeps an alert of its own outside it, to announce navigations. */
export const pageAlert = (page: Page) => page.locator("main").getByRole("alert");
/** A message of the page, whatever its weight: an alert (error, warning) or a status (information, success). */
export const notice = (page: Page, text: string | RegExp) => page.locator("main").locator('[role="alert"], [role="status"]').filter({ hasText: text });
/** What is announced once the server has answered. */
export const toast = (page: Page, text: string | RegExp) => page.locator("[data-sonner-toast]").filter({ hasText: text });

/** What the stand-in API received from the forms and the actions, request after request. */
export async function received(page: Page): Promise<{ path: string; body?: Record<string, unknown>; fields?: Record<string, string | null>; files?: string[] }[]> {
  const response = await overResetConnection(() => page.request.get("/api/proxy/__driver/received"));
  expect(response.ok(), `received: ${response.status()}`).toBe(true);
  return (await response.json()).received;
}

async function plumbing(page: Page, baseURL: string | undefined, path: string, data: Record<string, unknown>) {
  const response = await overResetConnection(() => page.request.post(`/api/proxy/__driver/${path}`, { data, headers: { Origin: baseURL ?? "" } }));
  expect(response.ok(), `${path}: ${response.status()}`).toBe(true);
}

/** Makes every read of the courier fail, or work again. */
export const outage = (page: Page, baseURL: string | undefined, on: boolean) => plumbing(page, baseURL, "outage", { on });
/** The customer of a COD Mixte pays: the delivery fee, and the goods too with `product`. */
export const customerPays = (page: Page, baseURL: string | undefined, id: string, product = false) => plumbing(page, baseURL, "pay", { id, product });

export async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  expect(bounds, "the element is laid out").not.toBeNull();
  return bounds!;
}
