import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// Shared by the Lanaya specs. Data: e2e/lanaya/mock-lanaya.mjs, one fresh
// data set per sign-in, so every test may write without seeing the others.

export const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;
export const PHONE = 768;

/** The QA accounts of the stand-in (e2e/shell/mock-api.mjs). */
export const ACCOUNTS = {
  lanabaga: "lanabaga@qa.test",
  candidate: "candidat@qa.test",
  seller: "vendeur@qa.test",
} as const;
export type Account = keyof typeof ACCOUNTS;

/** The invitation the seller opens (mock-lanaya.mjs, KNOWN_TOKEN). */
export const TOKEN = "a".repeat(64);

const PASSWORD = "Passw0rd!";

async function overResetConnection<T>(send: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await send();
    } catch (error) {
      if (attempt >= 3 || !/ECONNRESET|socket hang up/.test(String(error))) throw error;
    }
  }
}

export async function signIn(page: Page, baseURL: string | undefined, account: Account) {
  const response = await overResetConnection(() => page.request.post("/api/auth/login", { data: { email: ACCOUNTS[account], password: PASSWORD }, headers: { Origin: baseURL ?? "" } }));
  expect(response.ok(), `login: ${response.status()}`).toBe(true);
}

export async function open(page: Page, baseURL: string | undefined, path: string, { account = "lanabaga", width = 1440 }: { account?: Account; width?: number } = {}) {
  await page.setViewportSize({ width, height: width < PHONE ? 844 : 900 });
  await signIn(page, baseURL, account);
  await page.goto(path);
  await expect(page.locator("main").getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.locator("main [aria-busy='true']")).toHaveCount(0);
}

/** What the stand-in received from the forms, request after request. */
export async function received(page: Page): Promise<{ path: string; body: Record<string, unknown> }[]> {
  const response = await overResetConnection(() => page.request.get("/api/proxy/__lanaya/received"));
  expect(response.ok(), `received: ${response.status()}`).toBe(true);
  return (await response.json()).received;
}

export async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target.join(" ")).slice(0, 3) }));
}

/** Pixels the document, or the scroller the pages live in, can be dragged sideways. */
export const sidewaysOverflow = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    return Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, main ? main.scrollWidth - main.clientWidth : 0);
  });

/** Buttons and badges stay fully rounded (product rule, above the mockups). */
export const squareCorners = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("main button, main a, main span"))
      .filter((element) => element.offsetParent !== null && /rounded-(button|badge|pill)/.test(element.className))
      .filter((element) => parseFloat(getComputedStyle(element).borderTopLeftRadius) < element.getBoundingClientRect().height / 2 - 1)
      .map((element) => element.textContent?.trim()),
  );

export const toast = (page: Page, text: string | RegExp) => page.locator("[data-sonner-toast]").filter({ hasText: text });
