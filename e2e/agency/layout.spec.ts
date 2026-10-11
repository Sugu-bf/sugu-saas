import { expect, test, type Page } from "@playwright/test";
import { PHONE, TOUCH_TARGET, WIDTHS, blockingViolations, box, open, sidewaysOverflow } from "./helpers";

// Every agency page at the six widths: nothing to drag sideways, nothing cut
// by the edge of the screen, tables that keep their actions in view, forms
// whose bar of decisions rests on the phone tab bar, and no blocking
// accessibility violation.

const PAGES = [
  { name: "dashboard", path: "/agency/dashboard", title: "Bonjour, Faso Express !" },
  { name: "deliveries", path: "/agency/deliveries", title: "Livraisons" },
  { name: "delivery", path: "/agency/deliveries/ship-16", title: "Livraison SU-2026-078437" },
  { name: "new delivery", path: "/agency/deliveries/new", title: "Nouvelle course" },
  { name: "couriers", path: "/agency/drivers", title: "Livreurs" },
  { name: "courier", path: "/agency/drivers/courier-1", title: "Moussa Kaboré" },
  { name: "new courier", path: "/agency/drivers/new", title: "Nouveau livreur" },
  { name: "edit courier", path: "/agency/drivers/courier-1/edit", title: "Modifier Moussa Kaboré" },
] as const;

/** What sticks out of the page content on the right, in pixels, element by element. */
async function cutOnTheRight(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return ["no <main>"];
    const limit = main.getBoundingClientRect().right;
    const cut: string[] = [];
    for (const element of main.querySelectorAll<HTMLElement>("h1, h2, button, a, input, select, textarea, [role='img']")) {
      const bounds = element.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) continue;
      // Inside a scroller of its own (a table) an element may sit past the edge: that is what the scroller is for.
      let scroller = element.parentElement;
      let scrolled = false;
      while (scroller && scroller !== main) {
        const overflowX = getComputedStyle(scroller).overflowX;
        if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden") {
          scrolled = true;
          break;
        }
        scroller = scroller.parentElement;
      }
      if (!scrolled && bounds.right > limit + 1) cut.push(`${element.tagName.toLowerCase()} "${(element.textContent ?? "").trim().slice(0, 30)}" +${Math.round(bounds.right - limit)}px`);
    }
    return cut;
  });
}

for (const { name, path, title } of PAGES) {
  test.describe(`${name} page`, () => {
    for (const width of WIDTHS) {
      test(`fits ${width}px`, async ({ page, baseURL }) => {
        await open(page, baseURL, path, { width, height: width < PHONE ? 812 : 900 });
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
        await page.waitForLoadState("networkidle");

        expect(await sidewaysOverflow(page), "the page cannot be dragged sideways").toBe(0);
        expect(await cutOnTheRight(page), "nothing is cut by the right edge").toEqual([]);

        // The title is whole: it wraps, it is not clipped.
        const heading = await box(page.getByRole("heading", { level: 1 }));
        expect(heading.x).toBeGreaterThanOrEqual(0);
        expect(heading.x + heading.width).toBeLessThanOrEqual(width);
      });
    }

    test("has no blocking accessibility violation, on a phone and on a desktop", async ({ page, baseURL }) => {
      for (const width of [375, 1440]) {
        await open(page, baseURL, path, { width, height: width < PHONE ? 812 : 900 });
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
        await page.waitForLoadState("networkidle");
        expect(await blockingViolations(page), `at ${width}px`).toEqual([]);
      }
    });
  });
}

test.describe("tables", () => {
  for (const { path, caption } of [
    { path: "/agency/deliveries", caption: "Livraisons" },
    { path: "/agency/dashboard", caption: "Livraisons prioritaires" },
  ]) {
    test(`${caption}: every column fits a 1440px screen with the menu open, and the action of a row never leaves the view`, async ({ page, baseURL }) => {
      await open(page, baseURL, path, { width: 1440 });
      const region = page.getByRole("region", { name: caption, exact: true });
      await expect(region.locator("tbody tr").first()).toBeVisible();
      expect(await region.evaluate((element) => element.scrollWidth - element.clientWidth), "no column is hidden at 1440px").toBe(0);

      // Narrower, the table scrolls under its last column: the action stays where it is.
      for (const width of [1024, 768]) {
        await page.setViewportSize({ width, height: 900 });
        if (!(await region.isVisible())) continue;
        const frame = await box(region);
        // The action of a row is the first control of its last cell: a button, or a link when it only opens the page.
        const button = await box(region.locator("tbody tr").first().locator("td").last().locator("a, button").first());
        expect(button.x + button.width, `the action is inside the table at ${width}px`).toBeLessThanOrEqual(frame.x + frame.width + 1);
        expect(button.x, `the action is inside the table at ${width}px`).toBeGreaterThanOrEqual(frame.x);
      }
    });
  }

  test("Livreurs: the alerts sit beside the list when the page has the room, and under it when it has not", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/drivers", { width: 1440 });
    const list = page.getByRole("region", { name: "Livreurs", exact: true });
    const alerts = page.getByRole("complementary", { name: "Alertes et recrutement" });
    await expect(list.locator("tbody tr").first()).toBeVisible();
    expect((await box(alerts)).x, "beside the list at 1440px").toBeGreaterThan((await box(list)).x + (await box(list)).width - 1);
    expect(await list.evaluate((element) => element.scrollWidth - element.clientWidth), "no column is hidden at 1440px").toBeLessThanOrEqual(1);

    // 1280px with the menu open: the page is 976px wide, the list takes it all.
    await page.setViewportSize({ width: 1280, height: 900 });
    expect((await box(alerts)).y, "under the list at 1280px").toBeGreaterThan((await box(list)).y + (await box(list)).height - 1);
    expect(await list.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);

    // Folding the menu gives the room back.
    await page.getByRole("button", { name: "Réduire le menu" }).click();
    await expect.poll(async () => (await box(alerts)).x > (await box(list)).x + (await box(list)).width - 1, { message: "beside the list again with the menu folded" }).toBe(true);
  });
});

test.describe("key figures", () => {
  test("are drawn without colour: the icon alone and dark, the figure, its label, and no indicator beside it", async ({ page, baseURL }) => {
    for (const [path, name] of [
      ["/agency/dashboard", "Chiffres du jour"],
      ["/agency/deliveries", "Livraisons par situation"],
      ["/agency/drivers", "Livreurs par situation"],
      ["/agency/drivers/courier-1", "Chiffres du livreur"],
    ] as const) {
      await open(page, baseURL, path, { width: 1440 });
      const row = page.getByRole("region", { name });
      await expect(row.locator(".text-kpi").first()).toBeVisible();

      const cards = await row.locator("> div").evaluateAll((elements) =>
        elements.map((card) => {
          const icon = card.querySelector("svg");
          const figure = card.querySelector(".text-kpi");
          const tinted = [...card.querySelectorAll("*")].filter((element) => {
            const background = getComputedStyle(element).backgroundColor;
            return background !== "rgba(0, 0, 0, 0)" && background !== "transparent";
          });
          return {
            // Neither in a tile nor tinted: the icon sits in the card itself, in the colour of the figure.
            iconInTile: icon ? icon.parentElement !== card : null,
            iconColour: icon ? getComputedStyle(icon).color : null,
            figureColour: figure ? getComputedStyle(figure).color : null,
            // Nothing inside the card has a background of its own: no tile, no pill.
            tinted: tinted.length,
            // The figure is drawn above its label.
            figureAboveLabel: figure && card.querySelector("button, span:not(.text-kpi)") ? figure.getBoundingClientRect().top < (card.querySelector("button, span:not(.text-kpi)") as HTMLElement).getBoundingClientRect().top : null,
          };
        }),
      );
      expect(cards.length, `${path}: its key figures`).toBeGreaterThanOrEqual(4);
      for (const card of cards) {
        expect(card.iconInTile, `${path}: the icon is not in a tile`).toBe(false);
        expect(card.iconColour, `${path}: the icon has the colour of the figure`).toBe(card.figureColour);
        expect(card.tinted, `${path}: nothing tinted in the card`).toBe(0);
        expect(card.figureAboveLabel, `${path}: the figure is above its label`).toBe(true);
      }
      await expect(row, `${path}: no indicator beside a figure`).not.toContainText(/En hausse|En baisse|Stable|[+−-]\d+ ?%/);
    }
  });
});

test.describe("full rounded", () => {
  test("buttons, badges and page numbers are fully rounded here as in the rest of the portal", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/deliveries", { width: 1440 });
    const main = page.locator("main");
    const list = page.getByRole("region", { name: "Livraisons", exact: true });
    await expect(list.locator("tbody tr")).toHaveCount(10);

    const shapes = {
      "the main action": main.getByRole("link", { name: "Nouvelle course" }),
      "the day of the page": main.locator("p").filter({ has: page.locator("time") }),
      "the export": main.getByRole("button", { name: "Exporter", exact: true }),
      "the advanced filters": main.getByRole("button", { name: /Filtres avancés/ }),
      "the action of a row": list.locator("tbody tr").first().locator("button, a").filter({ hasText: /Accepter|Assigner|Suivi|Relancer/ }),
      "the menu of a row": list.locator("tbody tr").first().getByRole("button", { name: /^Autres actions/ }),
      "a status": list.locator("tbody tr").first().locator(".rounded-badge").first(),
      "the current page": main.getByRole("button", { name: "Page 1", exact: true }),
      "another page": main.getByRole("button", { name: "Page 2", exact: true }),
    };
    for (const [what, locator] of Object.entries(shapes)) {
      await expect(locator, what).toHaveCount(1);
      const { radius, height } = await locator.evaluate((element) => ({
        radius: parseFloat(getComputedStyle(element).borderTopLeftRadius),
        height: element.getBoundingClientRect().height,
      }));
      // A pill: its corners are rounded by half its height at least.
      expect(radius, `${what} is fully rounded`).toBeGreaterThanOrEqual(height / 2);
    }

    // The same in what opens over the page: a dialog is rendered outside the shell.
    await list.locator("tbody tr").first().getByRole("button", { name: /^Autres actions/ }).click();
    await page.getByRole("menuitem", { name: /^(Refuser la livraison|Déclarer un échec)$/ }).first().click();
    const confirm = page.getByRole("dialog").or(page.getByRole("alertdialog")).getByRole("button").last();
    const dialogShape = await confirm.evaluate((element) => ({ radius: parseFloat(getComputedStyle(element).borderTopLeftRadius), height: element.getBoundingClientRect().height }));
    expect(dialogShape.radius, "the button of a dialog is fully rounded").toBeGreaterThanOrEqual(dialogShape.height / 2);
  });
});

test.describe("phones", () => {
  test("the figures form a grid of small cards, two a row and the fifth under the four others, and nothing scrolls sideways", async ({ page, baseURL }) => {
    for (const width of [375, 390]) {
      await open(page, baseURL, "/agency/deliveries", { width, height: 812 });
      const grid = page.getByRole("region", { name: "Livraisons par situation" });
      await expect(grid.getByRole("button")).toHaveCount(5);
      // The whole card is the target of its button.
      const cards = await Promise.all([0, 1, 2, 3, 4].map((index) => box(grid.locator("> div").nth(index))));

      // Two a row: the first two side by side, the next two under them, each half of the row.
      expect(cards[1].y, "the second card sits beside the first").toBeCloseTo(cards[0].y, 0);
      expect(cards[1].x).toBeGreaterThan(cards[0].x + cards[0].width);
      expect(cards[2].y, "the third card starts a new row").toBeGreaterThanOrEqual(cards[0].y + cards[0].height);
      expect(cards[3].y).toBeCloseTo(cards[2].y, 0);
      expect(cards[0].width).toBeCloseTo(cards[1].width, 0);
      // The fifth takes the row under the four others, from edge to edge of the grid.
      expect(cards[4].y, "the fifth card is under the four others").toBeGreaterThanOrEqual(cards[2].y + cards[2].height);
      expect(cards[4].x).toBeCloseTo(cards[0].x, 0);
      expect(cards[4].x + cards[4].width).toBeCloseTo(cards[1].x + cards[1].width, 0);

      // Every card is on screen without moving anything sideways, and is a target a finger can hit.
      for (const card of cards) {
        expect(card.x).toBeGreaterThanOrEqual(0);
        expect(card.x + card.width).toBeLessThanOrEqual(width);
        expect(card.height).toBeGreaterThanOrEqual(TOUCH_TARGET);
      }
      expect(await grid.evaluate((element) => element.scrollWidth - element.clientWidth), "the grid has nothing to scroll").toBe(0);
      expect(await sidewaysOverflow(page)).toBe(0);
    }
  });

  test("the four figures of a courier are a grid of two rows on a phone", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/drivers/courier-1", { width: 375, height: 812 });
    const grid = page.getByRole("region", { name: "Chiffres du livreur" });
    const cards = await Promise.all([0, 1, 2, 3].map((index) => box(grid.locator("> div").nth(index))));
    expect(cards[1].y).toBeCloseTo(cards[0].y, 0);
    expect(cards[2].y).toBeGreaterThanOrEqual(cards[0].y + cards[0].height);
    expect(cards[3].y).toBeCloseTo(cards[2].y, 0);
    expect(cards[3].x + cards[3].width).toBeLessThanOrEqual(375);
    expect(await sidewaysOverflow(page)).toBe(0);
  });

  test("no key figure is cut: in a narrow card the unit goes under the number", async ({ page, baseURL }) => {
    for (const path of ["/agency/dashboard", "/agency/deliveries", "/agency/drivers", "/agency/drivers/courier-1"]) {
      for (const width of [375, 390]) {
        await open(page, baseURL, path, { width, height: 812 });
        // A figure is drawn once its number is known: until then its card shows a placeholder.
        const figures = page.locator("main .text-kpi");
        await expect(figures.first()).toBeVisible();
        const cut = await figures.evaluateAll((elements) =>
          elements
            .filter((element) => {
              const card = element.closest(".rounded-panel");
              const clipped = element.scrollWidth > element.clientWidth + 1;
              const outside = card !== null && element.getBoundingClientRect().right > card.getBoundingClientRect().right - 1;
              return clipped || outside;
            })
            .map((element) => (element.textContent ?? "").trim()),
        );
        expect(cut, `${path} at ${width}px: every key figure is whole`).toEqual([]);
      }
    }
    // The amount the two-by-two grid of a courier used to cut: the number, then its unit.
    await expect(page.getByRole("region", { name: "Chiffres du livreur" })).toContainText("1 018 800 FCFA");
  });

  test("the bar of decisions of a form rests on the tab bar, and covers neither it nor the last field", async ({ page, baseURL }) => {
    for (const path of ["/agency/deliveries/new", "/agency/drivers/new", "/agency/drivers/courier-1/edit"]) {
      await open(page, baseURL, path, { width: 375, height: 812 });
      const submit = page.getByRole("button", { name: /^(Suivant|Enregistrer)$/ });
      await expect(submit).toBeVisible();
      const tabBar = await box(page.getByRole("navigation", { name: "Navigation rapide" }));
      const button = await box(submit);
      expect(button.y + button.height, `${path}: the button is above the tab bar`).toBeLessThanOrEqual(tabBar.y + 1);
      expect(button.height, `${path}: the button is a target a finger can hit`).toBeGreaterThanOrEqual(TOUCH_TARGET);

      // Scrolled to the end, the last field is above the bar, not under it.
      await page.locator("main").evaluate((main) => main.scrollTo(0, main.scrollHeight));
      const lastField = page.locator("main form").locator("input, textarea, select").last();
      const field = await box(lastField);
      expect(field.y + field.height, `${path}: the last field is not under the bar`).toBeLessThanOrEqual((await box(submit)).y + 1);
    }
  });

  test("the delivery page stacks its cards, the customer first", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/deliveries/ship-16", { width: 390, height: 844 });
    // As the eye meets them, top to bottom — which is also the order they are read and tabbed in.
    const headings = page.locator("main section h2");
    const titles = await headings.allTextContents();
    const tops = await headings.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top));
    expect([...tops].sort((a, b) => a - b), "the cards are in the document in the order they are shown").toEqual(tops);
    expect(titles).toEqual(["Colis en route", "Client destinataire", "Adresse de livraison", "Livreur assigné", "Suivi de livraison", "Informations du colis", "Informations de paiement", "Notes internes"]);
    // Everything but the main action is behind one menu.
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await expect(page.getByRole("menuitem")).toHaveText(["Imprimer le bon", "Appeler le client", "Ouvrir la carte", "Déclarer un échec", "Modifier le prix"]);
  });
});
