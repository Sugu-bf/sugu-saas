import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

// Shared by the catalogue specs. Data: e2e/catalog/mock-catalog.mjs, one fresh
// data set per sign-in, so every test may mutate its products.

export const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;
/** Below this width the shell shows its phone tab bar. */
export const PHONE = 768;
/** Smallest side of something a finger must hit. */
export const TOUCH_TARGET = 44;

const VENDOR = "vendeur@qa.test";
const PASSWORD = "Passw0rd!";

export type ProductsView = "grid" | "list";

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

/** Signs the seller in through the portal's own endpoint. */
export async function signIn(page: Page, baseURL: string | undefined) {
  const response = await overResetConnection(() => page.request.post("/api/auth/login", { data: { email: VENDOR, password: PASSWORD }, headers: { Origin: baseURL ?? "" } }));
  expect(response.ok(), `login: ${response.status()}`).toBe(true);
}

export async function open(page: Page, baseURL: string | undefined, path: string, options: { width?: number; height?: number; view?: ProductsView } = {}) {
  await page.setViewportSize({ width: options.width ?? 1280, height: options.height ?? 900 });
  // The view of the product list is a stored preference; a test that needs one says so.
  if (options.view) {
    await page.addInitScript((view) => {
      if (window.sessionStorage.getItem("e2e.view-set")) return;
      window.sessionStorage.setItem("e2e.view-set", "1");
      window.localStorage.setItem("sugu.vendor.products.view", view);
    }, options.view);
  }
  await signIn(page, baseURL);
  await page.goto(path);
  await expect(page.locator('[data-shell="pro"][data-role="vendor"]')).toBeVisible();
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

export const table = (page: Page, name: string) => page.getByRole("region", { name });
export const rows = (page: Page, name: string) => table(page, name).locator("tbody tr");
export const cards = (page: Page, name: string) => page.getByRole("list", { name }).locator("> li");
export const tab = (page: Page, name: RegExp) => page.getByRole("tab", { name });
export const search = (page: Page) => page.getByRole("searchbox", { name: "Nom ou référence" });
export const confirmation = (page: Page) => page.getByRole("alertdialog");
export const viewSwitch = (page: Page) => page.getByRole("group", { name: "Affichage des produits" });

/** What the product form sent to the API, request after request. */
export async function received(page: Page): Promise<{ path: string; fields: Record<string, string[]>; files: string[] }[]> {
  const response = await overResetConnection(() => page.request.get("/api/proxy/__catalog/received"));
  expect(response.ok(), `received: ${response.status()}`).toBe(true);
  return (await response.json()).received;
}

// ── Product form ────────────────────────────────────────────

export const stepper = (page: Page) => page.getByRole("navigation", { name: /^Étapes de la/ });

/** Moves to a step of the product form through its stepper, and waits to be there. */
export async function goToStep(page: Page, label: string) {
  await stepper(page).getByRole("button", { name: new RegExp(label) }).click();
  await expect(stepper(page).getByRole("button", { name: new RegExp(label) })).toHaveAttribute("aria-current", "step");
}

export const currentStep = (page: Page) => stepper(page).locator('[aria-current="step"]');
/** The search of the category field, and the list it opens. */
export const categorySearch = (page: Page) => page.getByRole("combobox", { name: /Catégorie/ });
export const categoryList = (page: Page) => page.getByRole("listbox", { name: "Catégories" });

/** Files the product under a category the way a seller does: a few letters, then the name. */
export async function chooseCategory(page: Page, name: string) {
  await categorySearch(page).fill(name.slice(0, 4));
  await categoryList(page).getByRole("option", { name, exact: true }).click();
  await expect(page.getByRole("list", { name: "Catégories choisies" })).toContainText(name);
}
export const description = (page: Page) => page.getByRole("textbox", { name: "Description" });
export const photoInput = (page: Page) => page.locator("#product-photos input[type='file']");
export const descriptionPictureInput = (page: Page) => page.getByLabel("Images à ajouter à la description");

/** The bar of decisions at the bottom of the form. */
export const actionBar = (page: Page) => page.locator("form .sticky").last();

export async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  expect(bounds, "the element is laid out").not.toBeNull();
  return bounds!;
}
