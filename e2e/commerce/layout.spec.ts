import { expect, test } from "@playwright/test";
import { ALL, PHONE, SCREENS, TOUCH_TARGET, WIDTHS, blockingViolations, figures, openScreen, settled, sidewaysOverflow } from "./helpers";

// The six screens of V7 at the six widths: nothing to drag sideways, nothing
// cut, nothing under the tab bar of the phone, fingers given room, and the
// rules of the portal (pills, two figures a row on a phone) kept.

for (const screen of ALL) {
  test.describe(`${screen}`, () => {
    test("fits the six widths, bars included", async ({ page, baseURL }) => {
      test.slow();
      await openScreen(page, baseURL, screen, { width: WIDTHS[0] });
      await settled(page);

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: width < PHONE ? 844 : 900 });
        await page.waitForTimeout(120);
        await expect(page.getByRole("heading", { level: 1 }), `${width}px: title`).toHaveText(SCREENS[screen].title);
        expect(await sidewaysOverflow(page), `${width}px: nothing to drag sideways`).toBeLessThanOrEqual(0);

        // No figure, title or button of the page is cut by its own box.
        const cut = await page.locator("main").evaluate((main) =>
          [...main.querySelectorAll<HTMLElement>("h1, h2, button, .text-kpi, [data-status]")]
            .filter((element) => element.offsetParent !== null && !element.closest(".sr-only") && !element.querySelector(".truncate") && !element.classList.contains("truncate"))
            .filter((element) => element.scrollWidth > element.clientWidth + 1)
            .map((element) => element.textContent?.trim().slice(0, 40)),
        );
        expect(cut, `${width}px: nothing cut`).toEqual([]);

        if (width < PHONE) {
          // The end of the page can be scrolled above the tab bar.
          const clear = await page.evaluate(() => {
            const main = document.querySelector("main")!;
            main.scrollTo(0, main.scrollHeight);
            const bar = document.querySelector('nav[aria-label="Navigation rapide"]');
            const last = [...main.querySelectorAll<HTMLElement>(".sugu-ui > *")].filter((element) => element.offsetParent !== null).pop();
            const edge = bar ? bar.getBoundingClientRect().top : window.innerHeight;
            const result = last ? last.getBoundingClientRect().bottom <= edge + 1 : true;
            main.scrollTo(0, 0);
            return result;
          });
          expect(clear, `${width}px: the end of the page is above the tab bar`).toBe(true);
        }
      }
    });

    test("is usable with a finger on a phone, and by a screen reader", async ({ page, baseURL }) => {
      await openScreen(page, baseURL, screen, { width: 390 });
      await settled(page);

      const small = await page.locator("main").evaluate((main, minimum) =>
        [...main.querySelectorAll<HTMLElement>("button, a[class*='rounded-button'], select, input")]
          .filter((element) => element.offsetParent !== null && !element.closest(".sr-only"))
          .map((element) => ({ element, box: element.getBoundingClientRect() }))
          .filter(({ box }) => box.width > 0 && (box.height < minimum - 0.5 || box.width < minimum - 0.5))
          // A link inside a sentence is text, not a button.
          .filter(({ element }) => element.tagName !== "A" || element.className.includes("rounded-button"))
          // A card that is a button is hit through the whole card: its label is stretched over it.
          .filter(({ element }) => !element.className.includes("after:absolute"))
          .map(({ element, box }) => `${element.tagName} "${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`),
        // 44 px for the controls of a page; 36 px for the compact size of the design system.
        TOUCH_TARGET - 8,
      );
      expect(small, "touch targets").toEqual([]);
      expect(await blockingViolations(page)).toEqual([]);
    });

    test("has no blocking accessibility fault on a desktop, and keeps the pills", async ({ page, baseURL }) => {
      await openScreen(page, baseURL, screen, { width: 1280 });
      await settled(page);
      expect(await blockingViolations(page)).toEqual([]);
      // Buttons and badges are pills, everywhere in the portal.
      const square = await page.locator("main").evaluate((main) =>
        [...main.querySelectorAll<HTMLElement>("button[class*='rounded-button'], a[class*='rounded-button'], [data-status]")]
          .filter((element) => element.offsetParent !== null)
          // The buttons of a segmented control are joined: their inner sides are straight on purpose.
          .filter((element) => !element.parentElement?.matches("[role='group']"))
          .filter((element) => parseFloat(getComputedStyle(element).borderTopLeftRadius) < Math.min(element.offsetHeight, element.offsetWidth) / 2 - 1)
          .map((element) => element.textContent?.trim().slice(0, 30)),
      );
      expect(square, "full rounded").toEqual([]);
    });
  });
}

for (const [screen, region] of [
  ["clients", "Vos clients en chiffres"],
  ["client", "Chiffres du client"],
  ["codes", "Vos codes promotionnels en chiffres"],
  ["statistics", "Chiffres de la période"],
  ["agency", "Chiffres de la période"],
] as const) {
  test(`${screen}: on a phone the figures are two a row, plain icons, never a row to scroll`, async ({ page, baseURL }) => {
    await openScreen(page, baseURL, screen, { width: 390 });
    await settled(page);
    const group = figures(page, region);
    const boxes = await group.locator(":scope > *").evaluateAll((items) => items.map((item) => item.getBoundingClientRect()).map((box) => ({ y: Math.round(box.y), right: Math.round(box.right) })));
    expect(boxes).toHaveLength(4);
    expect(boxes[0].y).toBe(boxes[1].y);
    expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
    expect(Math.max(...boxes.map((box) => box.right))).toBeLessThanOrEqual(390);
    expect(await group.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);

    // Icons of the figures sit straight on their card, with no tile of their own behind them.
    const tiled = await group.locator(":scope > * > * > svg").evaluateAll((icons) => icons.filter((icon) => getComputedStyle(icon.parentElement!).backgroundColor !== "rgba(0, 0, 0, 0)").length);
    expect(tiled).toBe(0);

    // No figure is cut: its whole text is inside its card.
    const clipped = await group.locator(".text-kpi").evaluateAll((values) => values.filter((value) => value.scrollWidth > value.clientWidth + 1).map((value) => value.textContent));
    expect(clipped).toEqual([]);
  });
}

test("on a phone the customers are cards, with their status as pills", async ({ page, baseURL }) => {
  await openScreen(page, baseURL, "clients", { width: 390 });
  await settled(page);
  await expect(page.getByRole("table", { name: "Clients de la boutique" })).toBeHidden();
  const cards = page.getByRole("list", { name: "Clients de la boutique" }).getByRole("listitem");
  await expect(cards).toHaveCount(10);
  await expect(cards.first()).toContainText("commandes ·");
  await expect(cards.first()).toContainText("FCFA");

  const pills = page.getByRole("group", { name: "Filtrer les clients par statut" });
  await expect(pills.getByRole("button", { name: /Tous/ })).toHaveAttribute("aria-pressed", "true");
  await pills.getByRole("button", { name: /Inactif/ }).click();
  await settled(page);
  await expect(cards).toHaveCount(5);
  await expect(page).toHaveURL(/statut=inactive/);
});

test("on a phone the sheet of a customer has its two tabs and its orders button", async ({ page, baseURL }) => {
  await openScreen(page, baseURL, "client", { width: 390 });
  const tabs = page.getByRole("tablist", { name: "Sections de la fiche" });
  await expect(tabs.getByRole("tab", { name: "Vue d'ensemble" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Informations" })).toBeVisible();
  await tabs.getByRole("tab", { name: /Commandes/ }).click();
  await expect(page.getByRole("heading", { name: "Historique des commandes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir toutes les commandes" })).toBeVisible();
});

test("on a phone a code is created in a dialog that fits, with a numeric keyboard for its amounts", async ({ page, baseURL }) => {
  await openScreen(page, baseURL, "codes", { width: 375 });
  await page.getByRole("button", { name: "Créer un code" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Créer un code promotionnel" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  await expect(dialog.getByLabel("Valeur")).toHaveAttribute("inputmode", "numeric");
  await expect(dialog.getByLabel("Commande minimum")).toHaveAttribute("inputmode", "numeric");
  // Its buttons are reachable: not under the tab bar of the phone.
  await expect(dialog.getByRole("button", { name: "Créer le code" })).toBeInViewport();
  expect(await blockingViolations(page, "[role='dialog']")).toEqual([]);
});

test("on a phone the charts stay inside the page and say their figures", async ({ page, baseURL }) => {
  await openScreen(page, baseURL, "statistics", { width: 375 });
  await settled(page);
  const chart = page.getByRole("img", { name: /^Ventes du/ });
  await expect(chart).toBeVisible();
  const box = await chart.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  expect(box!.height).toBeGreaterThan(150);
  // The same figures as a table, for who cannot see the curve.
  await expect(page.getByRole("table", { name: /^Ventes par jour/ })).toBeAttached();
  await expect(page.getByText("FCFA").first()).toBeVisible();
});
