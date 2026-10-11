import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

// Shared by the agency specs. Data: e2e/agency/mock-agency.mjs, one fresh data
// set per sign-in, so every test may mutate its deliveries and couriers.

export const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;
/** Below this width the shell shows its phone tab bar. */
export const PHONE = 768;
/** Smallest side of something a finger must hit. */
export const TOUCH_TARGET = 44;

const AGENCY = "agence@qa.test";
const PASSWORD = "Passw0rd!";

/** The moment the data set is built around (mock-agency.mjs, `fixtureNow`): today at 16:00. */
export function fixtureNow(): Date {
  const now = new Date();
  now.setHours(16, 0, 0, 0);
  return now;
}

/**
 * A request made by this process, not by the browser, to `next start`. It
 * travels over a kept-alive connection the server may have just closed:
 * unlike a browser, the client does not try again by itself, so a reset
 * connection is tried again here. Nothing else is.
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

/** Signs the agency in through the portal's own endpoint. */
export async function signIn(page: Page, baseURL: string | undefined) {
  const response = await overResetConnection(() => page.request.post("/api/auth/login", { data: { email: AGENCY, password: PASSWORD }, headers: { Origin: baseURL ?? "" } }));
  expect(response.ok(), `login: ${response.status()}`).toBe(true);
}

/** A drawn tile, served in place of the map tiles: no test reaches the network. */
const BLANK_TILE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#eef0ec"/>' +
  '<path d="M0 70h256M0 190h256M60 0v256M170 0v256" stroke="#fff" stroke-width="10"/><path d="M0 128h256M118 0v256" stroke="#fff" stroke-width="4"/>' +
  '<rect x="76" y="86" width="30" height="30" rx="3" fill="#e2e6de"/><rect x="186" y="14" width="56" height="42" rx="3" fill="#dfe9d6"/></svg>';

export async function open(page: Page, baseURL: string | undefined, path: string, options: { width?: number; height?: number } = {}) {
  await page.setViewportSize({ width: options.width ?? 1280, height: options.height ?? 900 });
  // The page lives at the moment the data set was built for: "today", "late" and "il y a 5 min" hold at any hour.
  await page.clock.setFixedTime(fixtureNow());
  await page.route(/tile\.openstreetmap\.org/, (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: BLANK_TILE }));
  await signIn(page, baseURL);
  await page.goto(path);
  await expect(page.locator('[data-shell="pro"][data-role="agency"]')).toBeVisible();
}

/** Serious and critical WCAG 2.1 A/AA violations in the page content. */
export async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze();
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

// By its exact name: "Livraisons" is also the start of "Livraisons par situation", the figures above the list.
export const table = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
export const rows = (page: Page, name: string) => table(page, name).locator("tbody tr");
export const cards = (page: Page, name: string) => page.getByRole("list", { name }).locator("> li");
export const confirmation = (page: Page) => page.getByRole("alertdialog");

/** The message of the page content. Next keeps an alert of its own outside it, to announce navigations. */
export const pageAlert = (page: Page) => page.locator("main").getByRole("alert");

/**
 * Picks a choice shown as a card (a courier, a delivery): the card is the
 * target, its radio is there for the keyboard and assistive tech.
 */
export async function choose(scope: Page | Locator, text: string | RegExp) {
  const card = scope.locator("label").filter({ hasText: text });
  await card.click();
  await expect(card.getByRole("radio")).toBeChecked();
}
export const dialog = (page: Page) => page.getByRole("dialog");

/** What the stand-in API received from the forms and the actions, request after request. */
export async function received(page: Page): Promise<{ path: string; body?: Record<string, unknown>; fields?: Record<string, string | null>; files?: string[] }[]> {
  const response = await overResetConnection(() => page.request.get("/api/proxy/__agency/received"));
  expect(response.ok(), `received: ${response.status()}`).toBe(true);
  return (await response.json()).received;
}

/** Makes every read of the agency fail, or work again. */
export async function outage(page: Page, baseURL: string | undefined, on: boolean) {
  const response = await overResetConnection(() => page.request.post("/api/proxy/__agency/outage", { data: { on }, headers: { Origin: baseURL ?? "" } }));
  expect(response.ok(), `outage: ${response.status()}`).toBe(true);
}

export async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  expect(bounds, "the element is laid out").not.toBeNull();
  return bounds!;
}
