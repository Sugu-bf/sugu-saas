import { expect, test, type Locator, type Route } from "@playwright/test";
import { ALL, PHONE, PROFILES, TOUCH_TARGET, WIDTHS, blockingViolations, box, dialog, figures, open, sidewaysOverflow, textOf, typeAmount, type Profile } from "./helpers";

// The money screens at the six widths: what must be read is on screen,
// no amount is cut, nothing is dragged sideways, a finger hits what it aims
// at, and no serious accessibility violation.

const SCREENS: { name: string; path: string; shows: (profile: Profile) => (string | RegExp)[] }[] = [
  { name: "overview", path: "", shows: (profile) => [PROFILES[profile].balance, "Retraits en cours", "Demander un retrait", "Méthodes de paiement", "Demandes de retrait", "SU-2026-002087"] },
  { name: "history", path: "/history", shows: () => ["Toutes", "Retraits", "SU-2026-002087", "PO-RT0012AA"] },
  { name: "requests", path: "/withdrawals", shows: () => ["Mes retraits", "En cours", "Payés", "PO-RT0012AA", "PO-RT0010CC"] },
  { name: "withdrawal", path: "/withdraw", shows: () => ["Demander un retrait", "Montant", "Méthode", "Validation", "Montant à retirer", "Montant net", "Continuer"] },
  { name: "methods", path: "/methods", shows: () => ["Mes méthodes", "Orange Money", "Moov Money", "Coris Bank", "En vérification", "Par défaut"] },
];

/** Texts whose box cuts them, among the elements of `selector`: an amount or a reference among them is a defect. */
const clipped = (root: Locator, selector: string) =>
  root.evaluate(
    (element, scope) =>
      [...element.querySelectorAll<HTMLElement>(scope)]
        .filter((node) => node.children.length === 0 && node.offsetParent !== null && node.scrollWidth > node.clientWidth + 1 && getComputedStyle(node).overflow !== "visible")
        .map((node) => node.textContent?.trim() ?? "")
        .filter(Boolean),
    selector,
  );

for (const profile of ALL) {
  for (const { name, path, shows } of SCREENS) {
    test(`${profile} ${name}: at the six widths everything is on screen and no amount is cut`, async ({ page, baseURL }) => {
      await open(page, baseURL, profile, path, { width: WIDTHS[0] });
      await page.waitForLoadState("networkidle");

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: width < PHONE ? 844 : 900 });
        for (const text of shows(profile)) {
          await expect(page.locator("main").getByText(text).filter({ visible: true }).first(), `« ${text} » at ${width}`).toBeVisible();
        }
        expect(await sidewaysOverflow(page), `nothing is dragged sideways at ${width}`).toBe(0);
        const cut = await clipped(page.locator("main"), "h1, h2, h3, span, p, dd, dt, button, a");
        expect(cut.filter((text) => /\d{3}|FCFA|SU-|PO-/.test(text)), `no amount or reference is cut at ${width}`).toEqual([]);
      }
    });

    test(`${profile} ${name}: no serious accessibility violation`, async ({ page, baseURL }) => {
      for (const width of [390, 1440]) {
        await open(page, baseURL, profile, path, { width });
        await page.waitForLoadState("networkidle");
        expect(await blockingViolations(page), `at ${width}`).toEqual([]);
      }
    });
  }
}

test("amounts of billions are written in full at 375, on the overview and in a withdrawal", async ({ page, baseURL }) => {
  // What a very large account would answer: the figures of the stand-in, a hundred thousand times larger.
  await page.route(/\/api\/proxy\/sellers\/wallet\/summary/, async (route: Route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.balance = { available: 987_654_321_000, in_withdrawal: 123_456_789_000, withdrawn: 55_555_555_500 };
    body.data.earned.total = 1_234_567_890_100;
    body.data.period.earned = 345_678_901_200;
    await route.fulfill({ response, json: body });
  });
  await open(page, baseURL, "vendor", "", { width: 375 });

  const shown = await textOf(figures(page));
  for (const amount of ["9 876 543 210 FCFA", "1 234 567 890 FCFA", "12 345 678 901 FCFA", "3 456 789 012 FCFA"]) expect(shown).toContain(amount);
  expect(await sidewaysOverflow(page)).toBe(0);

  // Every figure lies inside its card, whole.
  for (const figure of await figures(page).locator("span.tabular-nums, span.whitespace-nowrap").all()) {
    const [inner, outer] = [await box(figure), await box(figures(page))];
    expect(inner.x, "left edge").toBeGreaterThanOrEqual(outer.x - 1);
    expect(inner.x + inner.width, "right edge").toBeLessThanOrEqual(outer.x + outer.width + 1);
  }
  expect(await clipped(figures(page), "span, a")).toEqual([]);

  await page.goto("/vendor/wallet/withdraw");
  await expect(page.locator("main")).toContainText(/9\s876\s543\s210\sFCFA/);
  expect(await sidewaysOverflow(page)).toBe(0);
});

test("on a phone, what a thumb presses is at least 44px tall", async ({ page, baseURL }) => {
  for (const [profile, path] of [["vendor", ""], ["agency", "/history"], ["courier", "/withdrawals"], ["vendor", "/withdraw"], ["courier", "/methods"]] as const) {
    await open(page, baseURL, profile, path, { width: 375 });
    await page.waitForLoadState("networkidle");
    const small = await page.locator("main").evaluate(
      (main, minimum) =>
        [...main.querySelectorAll<HTMLElement>("button, a[href], select, input:not([type=radio])")]
          .filter((element) => element.offsetParent !== null && !element.closest(".sr-only"))
          .map((element) => ({ text: (element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40), height: Math.round(element.getBoundingClientRect().height) }))
          // A link inside a sentence or beside a heading is text, not a button.
          .filter((entry) => entry.height < minimum && !["Voir tout", "Gérer mes méthodes de paiement"].includes(entry.text)),
      TOUCH_TARGET - 8,
    );
    expect(small, `${profile}${path}`).toEqual([]);
  }
});

test("buttons and badges are fully rounded, fields and cards are not", async ({ page, baseURL }) => {
  await open(page, baseURL, "vendor", "/withdrawals", { width: 1280 });
  const radius = (selector: string) => page.locator("main").locator(selector).first().evaluate((element) => ({ radius: parseFloat(getComputedStyle(element).borderTopLeftRadius), height: element.getBoundingClientRect().height }));

  for (const selector of ['a:has-text("Nouveau retrait")', "[data-status]", '[role="tab"]']) {
    const { radius: value, height } = await radius(selector);
    expect(value, selector).toBeGreaterThanOrEqual(height / 2 - 1);
  }
  await page.goto("/vendor/wallet/withdraw");
  const field = await page.getByLabel("Montant à retirer").evaluate((element) => ({ radius: parseFloat(getComputedStyle(element).borderTopLeftRadius), height: element.getBoundingClientRect().height }));
  expect(field.radius).toBeLessThan(field.height / 2 - 2);
});

test("the wizard is used with the keyboard alone, and its dialogs keep the focus", async ({ page, baseURL }) => {
  await open(page, baseURL, "vendor", "/withdraw", { width: 1280 });
  await page.getByLabel("Montant à retirer").focus();
  await page.keyboard.type("15000");
  await typeAmount(page, "15000");

  await page.getByRole("button", { name: "Continuer" }).focus();
  await page.keyboard.press("Enter");
  const choice = page.getByRole("group", { name: "Méthode de paiement" });
  await choice.getByRole("radio").first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(choice.getByRole("radio").nth(1)).toBeChecked();
  await page.getByRole("button", { name: "Continuer" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Vérifiez avant de confirmer" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Moov Money");

  // A form in a dialog: the focus goes in, Escape closes it, the focus comes back.
  await page.goto("/vendor/wallet/methods");
  const add = page.locator("main").getByRole("button", { name: "Ajouter", exact: true });
  await add.focus();
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeVisible();
  expect(await dialog(page).evaluate((element) => element.contains(document.activeElement))).toBe(true);
  expect(await blockingViolations(page, '[role="dialog"]')).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(add).toBeFocused();
});
