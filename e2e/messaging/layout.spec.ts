import { expect, test } from "@playwright/test";
import { ALL, PHONE, SCREENS, TOUCH_TARGET, WIDTHS, blockingViolations, openScreen, pageScroll, resetStandIn, settled, sidewaysOverflow, signIn, thread } from "./helpers";

// The seven screens of V8, at the six widths: what fits, what stays within
// reach of a thumb, and what a screen reader and a keyboard get.

test.beforeEach(async ({ page, baseURL }) => {
  await signIn(page, baseURL);
  await resetStandIn(page, baseURL);
});

for (const screen of ALL) {
  test(`${screen}: fits at the six widths, with no blocking accessibility violation`, async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await openScreen(page, baseURL, screen, { width: WIDTHS[0] });
    await settled(page);

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < PHONE ? 844 : 900 });
      await page.waitForTimeout(150);

      expect(await sidewaysOverflow(page), `sideways overflow at ${width}px`).toBe(0);

      if (width >= PHONE) {
        // From 768px the screen is exactly as tall as the window: only the list and the thread scroll.
        expect(await pageScroll(page), `page scroll at ${width}px`).toBeLessThanOrEqual(1);
      }

      // Buttons and badges are fully rounded, at every width.
      const squared = await page.locator("main button:visible, [data-thread-cover] button:visible").evaluateAll((buttons) =>
        buttons.filter((button) => {
          const style = getComputedStyle(button);
          const box = button.getBoundingClientRect();
          return box.height > 0 && parseFloat(style.borderTopLeftRadius) < Math.min(box.height / 2, 16) - 1 && !button.closest("[role='group']")?.matches("[aria-label^='Filtrer']");
        }).length,
      );
      expect(squared, `squared buttons at ${width}px`).toBe(0);

      if (width < PHONE) {
        // What a finger must hit is at least 44px tall.
        const small = await page.locator("main a:visible, main button:visible, [data-thread-cover] a:visible, [data-thread-cover] button:visible").evaluateAll(
          (targets, minimum) =>
            targets
              .filter((target) => {
                const box = target.getBoundingClientRect();
                // Links inside a sentence are text, not targets.
                const inline = getComputedStyle(target).display === "inline";
                return box.width > 0 && !inline && box.height < minimum - 0.5;
              })
              .map((target) => `${target.tagName} ${(target.getAttribute("aria-label") ?? target.textContent ?? "").trim().slice(0, 30)}`),
          TOUCH_TARGET,
        );
        expect(small, `small touch targets at ${width}px`).toEqual([]);
      }
    }

    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: width < PHONE ? 844 : 900 });
      await page.waitForTimeout(150);
      expect(await blockingViolations(page), `axe at ${width}px`).toEqual([]);
    }
    void SCREENS;
  });
}

test("phone: an open conversation covers the screen and its field stays on it, above nothing", async ({ page, baseURL }) => {
  for (const [screen, width] of [["vendorThread", 375], ["courierThread", 390]] as const) {
    await openScreen(page, baseURL, screen, { width });
    await settled(page);

    const viewport = page.viewportSize()!;
    const cover = await page.locator("[data-thread-cover]").boundingBox();
    expect(cover).toMatchObject({ x: 0, y: 0, width: viewport.width, height: viewport.height });

    const composer = (await page.locator("[data-composer]").boundingBox())!;
    expect(composer.y + composer.height).toBeLessThanOrEqual(viewport.height + 0.5);
    expect(composer.y).toBeGreaterThan(viewport.height / 2);
    // The tab bar of the shell is not drawn over a conversation.
    await expect(page.locator("[data-shell='pro'] nav").filter({ hasText: "Menu" })).toHaveCount(0);

    // A shorter window (the keyboard opened): the field is still inside it.
    await page.setViewportSize({ width, height: 420 });
    await page.waitForTimeout(200);
    const short = (await page.locator("[data-composer]").boundingBox())!;
    expect(short.y + short.height).toBeLessThanOrEqual(420.5);
    await expect(thread(page).getByRole("link", { name: "Retour aux conversations" })).toBeInViewport();
  }
});

test("phone: a courier reads the whole number of the mission in the header, beside the call button", async ({ page, baseURL }) => {
  for (const width of [375, 390]) {
    await openScreen(page, baseURL, "courierThread", { width });
    await settled(page);
    const title = thread(page).getByRole("heading", { level: 2, name: "Client – SU-2026-000205" });
    await expect(thread(page).getByRole("link", { name: "Appeler Fatoumata Compaoré" })).toBeVisible();
    // Not cut: what is drawn is as wide as the text.
    expect(await title.evaluate((node) => node.scrollWidth - node.clientWidth), `title cut at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test("phone: the field of a ticket sits above the tab bar, not under it", async ({ page, baseURL }) => {
  await openScreen(page, baseURL, "ticket", { width: 390 });
  await settled(page);

  const composer = (await page.locator("[data-composer]").boundingBox())!;
  const bar = (await page.locator("[data-shell='pro'] nav").filter({ hasText: "Menu" }).boundingBox())!;
  // The bar draws its top border on the half pixel above its box.
  expect(composer.y + composer.height).toBeLessThanOrEqual(bar.y + 1);
  expect(bar.y + bar.height).toBeLessThanOrEqual(844.5);
});

test("from tablet up: the list and the conversation stand side by side, each scrolling by itself", async ({ page, baseURL }) => {
  for (const width of [768, 1024, 1440]) {
    await openScreen(page, baseURL, "vendorThread", { width });
    await settled(page);

    const list = (await page.locator("[data-conversation-rows]").boundingBox())!;
    const open = (await thread(page).boundingBox())!;
    expect(list.x + list.width, `list left of the thread at ${width}px`).toBeLessThanOrEqual(open.x + 1);
    expect(open.width, `thread wide enough at ${width}px`).toBeGreaterThanOrEqual(400);
    expect(open.y + open.height).toBeLessThanOrEqual(900.5);

    const composer = (await page.locator("[data-composer]").boundingBox())!;
    expect(composer.y + composer.height).toBeLessThanOrEqual(900.5);
  }
});

test("the search of the list is wide enough to read its placeholder, at every width", async ({ page, baseURL }) => {
  for (const width of WIDTHS) {
    await openScreen(page, baseURL, "vendorList", { width });
    await settled(page);

    const search = (await page.getByRole("searchbox", { name: "Rechercher une conversation" }).boundingBox())!;
    expect(search.width, `search wide enough at ${width}px`).toBeGreaterThanOrEqual(140);
    // One way to filter at a time: the select or the two tabs.
    const filters = page.getByRole("combobox", { name: "Filtrer les conversations" }).or(page.getByRole("group", { name: "Filtrer les conversations" }));
    await expect(filters.filter({ visible: true })).toHaveCount(1);
  }
});

test("keyboard: the list, the thread and the field are reached and used without a mouse", async ({ page, baseURL }) => {
  await openScreen(page, baseURL, "vendorList", { width: 1280 });
  await settled(page);

  // The search, the filter, the refresh, then the first conversation.
  await page.getByRole("searchbox", { name: "Rechercher une conversation" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("combobox", { name: "Filtrer les conversations" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Actualiser" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("[data-conversation]").first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/vendor\/messages\/conv-shop-01$/);

  const input = page.getByRole("textbox", { name: "Écrire à Aminata Traoré" });
  await input.focus();
  await page.keyboard.type("Bonjour, au clavier.");
  await page.keyboard.press("Enter");
  await expect(thread(page).locator("[data-message]").last()).toContainText("Bonjour, au clavier.");
  // The focus stays in the field: the next message can be typed at once.
  await expect(input).toBeFocused();

  // The menu opens, is read, and closes with Escape, the focus back on its button.
  const actions = thread(page).getByRole("button", { name: "Actions de la conversation" });
  await actions.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Partager un produit" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(actions).toBeFocused();
});
