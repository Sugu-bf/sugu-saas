import { expect, test } from "@playwright/test";
import { ALL, PHONE, SCREENS, TOUCH_TARGET, WIDTHS, blockingViolations, open, settled, sidewaysOverflow } from "./helpers";

// The seven screens at the six widths: nothing to drag sideways, nothing cut,
// nothing under the tab bar of the phone, fingers given room, and the rules
// of the portal (pills, two figures a row on a phone) kept.

for (const screen of ALL) {
  test.describe(`${screen}`, () => {
    test("fits the six widths, bars included", async ({ page, baseURL }) => {
      test.slow();
      await open(page, baseURL, SCREENS[screen].path, { width: WIDTHS[0] });
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
      await open(page, baseURL, SCREENS[screen].path, { width: 390 });
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
        // 44 px for the controls of a page; 36 px for the compact size of the design system (a secondary button of a panel, the arrows of the pagination).
        TOUCH_TARGET - 8,
      );
      expect(small, "touch targets").toEqual([]);
      expect(await blockingViolations(page)).toEqual([]);
    });

    test("has no blocking accessibility fault on a desktop", async ({ page, baseURL }) => {
      await open(page, baseURL, SCREENS[screen].path, { width: 1280 });
      await settled(page);
      expect(await blockingViolations(page)).toEqual([]);
      // Buttons and badges are pills, everywhere in the portal.
      const square = await page.locator("main").evaluate((main) =>
        [...main.querySelectorAll<HTMLElement>("button[class*='rounded-button'], a[class*='rounded-button'], [data-status]")]
          .filter((element) => element.offsetParent !== null)
          .filter((element) => parseFloat(getComputedStyle(element).borderTopLeftRadius) < Math.min(element.offsetHeight, element.offsetWidth) / 2 - 1)
          .map((element) => element.textContent?.trim().slice(0, 30)),
      );
      expect(square, "full rounded").toEqual([]);
    });
  });
}

test("on a phone the lists are cards, and the figures two a row", async ({ page, baseURL }) => {
  await open(page, baseURL, "/outbound", { width: 390 });
  await settled(page);
  await expect(page.getByRole("table", { name: "Expéditions" })).toBeHidden();
  const cards = page.getByRole("list", { name: "Expéditions" }).getByRole("listitem");
  await expect(cards).toHaveCount(10);
  await expect(cards.first()).toContainText("EXP-2026-00087");
  await expect(cards.first().getByRole("link", { name: "Voir l'expédition EXP-2026-00087" })).toBeVisible();

  const figures = page.getByRole("region", { name: "Expéditions par situation" });
  const boxes = await figures.locator(":scope > *").evaluateAll((items) => items.map((item) => item.getBoundingClientRect()).map((box) => ({ x: Math.round(box.x), y: Math.round(box.y), right: Math.round(box.right) })));
  expect(boxes).toHaveLength(4);
  expect(boxes[0].y).toBe(boxes[1].y);
  expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
  expect(Math.max(...boxes.map((box) => box.right))).toBeLessThanOrEqual(390);
  expect(await figures.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);

  // The filters of a phone are behind one button, and still filter.
  await page.getByRole("button", { name: /Filtres/ }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("combobox", { name: "Statut" }).selectOption({ label: "Prêtes à expédier" });
  await sheet.getByRole("button", { name: "Voir les résultats" }).click();
  await expect(cards).toHaveCount(2);
});

test("on a phone a card opens its secondary fields, and its document", async ({ page, baseURL }) => {
  await open(page, baseURL, "/movements", { width: 390 });
  await settled(page);
  const card = page.getByRole("list", { name: "Mouvements de stock" }).getByRole("listitem").first();
  await expect(card).toContainText("T-shirt essentiel");
  await card.getByRole("button", { name: /Voir plus/ }).click();
  await expect(card).toContainText("Aminata S.");
  await expect(card).toContainText("Réception à l'entrepôt");
});

test("the menu of the phone reaches the five Sugu Box entries", async ({ page, baseURL }) => {
  await open(page, baseURL, "", { width: 390 });
  await page.getByRole("navigation", { name: "Navigation rapide" }).getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("dialog");
  for (const name of ["Vue d'ensemble", "Mon stock", "Réceptions", "Expéditions", "Mouvements"]) await expect(menu.getByRole("link", { name, exact: true })).toBeVisible();
  await menu.getByRole("link", { name: "Mouvements", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mouvements");
});
