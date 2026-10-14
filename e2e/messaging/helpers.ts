import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

// Shared by the V8 specs (messaging and support). Data:
// e2e/messaging/mock-messaging.mjs, built around today at 16:00.

export const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;
/** Below this width one of the two panes is shown at a time, and the shell has its tab bar. */
export const PHONE = 768;
/** Smallest side of something a finger must hit. */
export const TOUCH_TARGET = 44;

export const SELLER = "vendeur@qa.test";
export const AGENCY = "agence@qa.test";
export const COURIER = "coursier@qa.test";
const PASSWORD = "Passw0rd!";

const ROLE = { [SELLER]: "vendor", [AGENCY]: "agency", [COURIER]: "courier" } as const;

export const SCREENS = {
  vendorList: { path: "/vendor/messages", account: SELLER, title: "Messages" },
  vendorThread: { path: "/vendor/messages/conv-shop-01", account: SELLER, title: "Messages" },
  courierList: { path: "/driver/messages", account: COURIER, title: "Messages" },
  courierThread: { path: "/driver/messages/conv-delivery-01", account: COURIER, title: "Messages" },
  agencyList: { path: "/agency/messages", account: AGENCY, title: "Conversations" },
  agencyThread: { path: "/agency/messages/conv-delivery-01", account: AGENCY, title: "Conversations" },
  tickets: { path: "/vendor/tickets", account: SELLER, title: "Support" },
  ticket: { path: "/vendor/tickets?ticket=ticket-0045", account: SELLER, title: "Support" },
  newTicket: { path: "/vendor/tickets?new=1", account: SELLER, title: "Support" },
} as const;
export type Screen = keyof typeof SCREENS;
export const ALL = Object.keys(SCREENS) as Screen[];

/** Today at 16:00, as the stand-in. */
export function fixtureNow() {
  const now = new Date();
  now.setHours(16, 0, 0, 0);
  return now;
}

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
  const account = options.account ?? (path.startsWith("/agency") ? AGENCY : path.startsWith("/driver") ? COURIER : SELLER);
  await page.setViewportSize({ width, height: options.height ?? (width < PHONE ? 844 : 900) });
  // "Today", "Hier" and "il y a 2 h" hold whatever the hour the suite runs at.
  await page.clock.setFixedTime(fixtureNow());
  await signIn(page, baseURL, account);
  await page.goto(path);
  await expect(page.locator(`[data-shell="pro"][data-role="${ROLE[account as keyof typeof ROLE]}"]`)).toBeVisible();
}

export const openScreen = (page: Page, baseURL: string | undefined, screen: Screen, options: { width?: number } = {}) => open(page, baseURL, SCREENS[screen].path, { ...options, account: SCREENS[screen].account });

// ── The stand-in, driven by a spec ──────────────────────────

const control = (page: Page, baseURL: string | undefined, path: string, data?: unknown) =>
  overResetConnection(() => (data === undefined ? page.request.get(`/api/proxy/__messaging/${path}`) : page.request.post(`/api/proxy/__messaging/${path}`, { data, headers: { Origin: baseURL ?? "" } })));

/** A fresh data set. Needs a session: call it after `signIn` or `open`. */
export const resetStandIn = (page: Page, baseURL: string | undefined) => control(page, baseURL, "reset");

export interface Received {
  received: Array<Record<string, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
  typing: number;
  reads: number;
}
/** What the stand-in was sent since its last reset. */
export async function received(page: Page, baseURL: string | undefined): Promise<Received> {
  return (await (await control(page, baseURL, "received")).json()).data;
}
/** The other side writes: the message exists on the server and, unless `silent`, the event leaves on the socket. */
export const incoming = (page: Page, baseURL: string | undefined, conversation: string, body: string, options: { silent?: boolean; from?: "courier" } = {}) =>
  control(page, baseURL, "incoming", { conversation, body, ...options });
/** What the next sends answer: `error` (nothing written), `lost` (written, answer lost), `throttled`. */
export const failNext = (page: Page, baseURL: string | undefined, next: Array<"error" | "lost" | "throttled">) => control(page, baseURL, "fail", { next });
export const peerRead = (page: Page, baseURL: string | undefined, conversation: string) => control(page, baseURL, "peer-read", { conversation });
export const peerTyping = (page: Page, baseURL: string | undefined, conversation: string) => control(page, baseURL, "peer-typing", { conversation });
/** Cut the socket and refuse new connections, or accept them again. */
export const socket = (page: Page, baseURL: string | undefined, down: boolean) => control(page, baseURL, "socket", { down });

// ── What a screen shows ─────────────────────────────────────

export const conversations = (page: Page) => page.locator("[data-conversation]");
export const conversation = (page: Page, id: string) => page.locator(`[data-conversation="${id}"]`);
export const thread = (page: Page) => page.locator("[data-thread]");
export const bubbles = (page: Page) => thread(page).locator("[data-message]");
export const pendingBubbles = (page: Page) => thread(page).locator("[data-pending]");
export const field = (page: Page) => page.locator("[data-composer] textarea");
export const sendButton = (page: Page) => page.locator("[data-composer] [data-send]");
export const scroller = (page: Page) => page.locator("[data-thread-scroller]");

/** The thread has loaded and nothing is on its way. */
export async function settled(page: Page) {
  await expect(page.locator("main [aria-busy='true'], [data-thread-cover] [aria-busy='true']")).toHaveCount(0);
}

export const plain = (text: string) => text.replace(/\s/g, " ");
export const textOf = async (locator: Locator) => plain(await locator.innerText());

/** Serious and critical WCAG 2.1 A/AA violations. */
export async function blockingViolations(page: Page, scope = "body") {
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

/** Pixels the page itself can still be scrolled down: 0 when the screen is exactly as tall as the window. */
export const pageScroll = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    return main ? main.scrollHeight - main.clientHeight : 0;
  });

export const toast = (page: Page, text: string | RegExp) => page.locator("[data-sonner-toast]").filter({ hasText: text });
