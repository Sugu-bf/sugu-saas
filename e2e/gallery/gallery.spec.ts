import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [375, 390, 768, 1280, 1440] as const;

/** Requests the gallery is allowed to make: itself, Next assets, fonts. */
function isBusinessRequest(url: string): boolean {
  const { pathname } = new URL(url);
  return pathname.startsWith("/api/");
}

async function openGallery(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/dev/ui");
  await expect(page.getByRole("heading", { level: 1, name: "Design system SUGU Pro" })).toBeVisible();
}

for (const width of WIDTHS) {
  test.describe(`gallery at ${width}px`, () => {
    test.use({ hasTouch: width < 1024, isMobile: width < 768 });

    test("renders without horizontal overflow or business requests", async ({ page }) => {
      const businessRequests: string[] = [];
      page.on("request", (request) => {
        if (isBusinessRequest(request.url())) businessRequests.push(request.url());
      });

      await openGallery(page, width);

      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        const offenders: string[] = [];
        if (root.scrollWidth > root.clientWidth) {
          for (const element of document.querySelectorAll<HTMLElement>("main *")) {
            // Regions that scroll sideways on purpose clip their own content.
            if (element.closest("[role=region], .overflow-x-auto")) continue;
            if (element.getBoundingClientRect().right > root.clientWidth + 1) {
              offenders.push(`${element.tagName.toLowerCase()}.${element.className}`.slice(0, 120));
            }
          }
        }
        return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, offenders: offenders.slice(0, 5) };
      });
      expect(overflow.offenders, JSON.stringify(overflow)).toEqual([]);
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
      expect(businessRequests).toEqual([]);
    });

    test("has no serious or critical Axe violation", async ({ page }) => {
      await openGallery(page, width);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        // Development-only chrome injected by Next and the PWA prompt, not the gallery.
        .exclude("nextjs-portal")
        .analyze();
      const blocking = results.violations
        .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
        .map((violation) => ({
          id: violation.id,
          nodes: violation.nodes
            .map((node) => node.target.join(" "))
            // The tab bar scrolls sideways on phones. Its tabs use a roving
            // tabindex (one tab stop, arrow keys move and scroll), which this
            // rule does not recognise as keyboard access to the region.
            .filter(
              (target) =>
                !(violation.id === "scrollable-region-focusable" && target.includes("scrollbar-none")),
            )
            .slice(0, 3),
        }))
        .filter((violation) => violation.nodes.length > 0);
      expect(blocking).toEqual([]);
    });

    test("main touch targets are at least 44px on touch widths", async ({ page }) => {
      test.skip(width >= 1024, "pointer devices use the dense sizes");
      await openGallery(page, width);
      const primary = page.getByRole("button", { name: "Nouvelle vente" });
      const box = await primary.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      const field = page.getByRole("textbox", { name: /Client/ });
      expect((await field.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    });
  });
}

test.describe("interactions", () => {
  test("data table: server sort, pagination and selection are wired", async ({ page }) => {
    await openGallery(page, 1280);
    const table = page.getByRole("table", { name: "Commandes de démonstration" });
    await expect(table).toBeVisible();

    // Sort: the header drives the query, the whole dataset is reordered.
    const totalHeader = table.getByRole("columnheader", { name: "Total" });
    const firstTotal = table.locator("tbody tr").first().locator("td").nth(-2);
    await totalHeader.getByRole("button").click();
    await expect(totalHeader).toHaveAttribute("aria-sort", "ascending");
    // 2 500 FCFA is the smallest total of all 57 rows, not of the first page.
    await expect(firstTotal).toHaveText(/^2\s500\sFCFA$/);
    await totalHeader.getByRole("button").click();
    await expect(totalHeader).toHaveAttribute("aria-sort", "descending");
    await expect(firstTotal).toHaveText(/^96\s000\sFCFA$/);

    // A non-sortable column exposes no sort control.
    await expect(table.getByRole("columnheader", { name: "Client" }).getByRole("button")).toHaveCount(0);

    // Pagination.
    const region = page.locator("#table");
    await expect(region.getByText("1–10 sur 57 commandes")).toBeVisible();
    await region.getByRole("button", { name: "Page suivante" }).click();
    await expect(region.getByText("11–20 sur 57 commandes")).toBeVisible();

    // Selection and bulk action behind a confirmation.
    await table.getByRole("checkbox", { name: "Sélectionner toutes les lignes de cette page" }).check();
    await expect(region.getByText(/sélectionnés?$/).first()).toBeVisible();
    await region.getByRole("button", { name: "Marquer comme préparées" }).click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await expect(confirm.getByRole("button", { name: "Annuler" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(confirm).toBeHidden();
  });

  test("data table: loading, error and empty states", async ({ page }) => {
    await openGallery(page, 1280);
    const region = page.locator("#table");
    await region.getByRole("button", { name: "Erreur" }).click();
    await expect(region.getByRole("alert")).toContainText("Impossible de charger les commandes");
    await region.getByRole("button", { name: "Réessayer" }).click();
    await expect(region.getByRole("table")).toBeVisible();
    await region.getByRole("button", { name: "Vide" }).click();
    await expect(region.getByText("Aucune commande")).toBeVisible();
    await region.getByRole("button", { name: "Chargement" }).click();
    await expect(region.getByRole("status").filter({ hasText: "Chargement" })).toBeAttached();
  });

  test("data table turns into cards on a phone and keeps its actions", async ({ page }) => {
    await openGallery(page, 375);
    const region = page.locator("#table");
    await expect(region.getByRole("table")).toBeHidden();
    const list = region.getByRole("list", { name: "Commandes de démonstration" });
    await expect(list.getByRole("listitem").first()).toBeVisible();
    await list.getByRole("button", { name: /Actions pour la commande/ }).first().click();
    await expect(page.getByRole("menuitem", { name: "Voir la commande" })).toBeVisible();
    await page.keyboard.press("Escape");

    // Filters move into a sheet instead of being squeezed.
    await region.getByRole("button", { name: /Filtres/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filtres" });
    await sheet.getByLabel("Statut").selectOption("delivered");
    await sheet.getByRole("button", { name: "Voir les résultats" }).click();
    await expect(sheet).toBeHidden();
    await expect(region.getByText(/^7 commandes/)).toBeVisible();
  });

  test("form: errors are announced and linked, then submission succeeds", async ({ page }) => {
    await openGallery(page, 1280);
    const form = page.getByRole("form", { name: "Vente de démonstration" });
    await form.getByRole("button", { name: "Enregistrer la vente" }).click();
    await expect(form.getByText("4 champs à corriger")).toBeVisible();
    const customer = form.getByRole("textbox", { name: /Client/ });
    await expect(customer).toHaveAttribute("aria-invalid", "true");
    await expect(customer).toHaveAccessibleDescription(/Indiquez le nom du client/);

    await customer.fill("Awa Démo");
    await form.getByRole("textbox", { name: /Téléphone/ }).fill("70 00 00 00");
    await form.getByRole("textbox", { name: /Montant/ }).fill("50000");
    await form.getByRole("combobox", { name: /Agence/ }).selectOption("agence-demo-1");
    await form.getByRole("button", { name: "Enregistrer la vente" }).click();
    await expect(form.getByText("Vente enregistrée (démonstration)")).toBeVisible();
  });

  test("dialog: focus is trapped, Escape closes and focus returns", async ({ page }) => {
    await openGallery(page, 1280);
    const trigger = page.getByRole("button", { name: "Ouvrir un dialogue" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Modifier le stock" });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("dialog fits a phone screen", async ({ page }) => {
    await openGallery(page, 375);
    await page.getByRole("button", { name: "Ouvrir un dialogue" }).click();
    const dialog = page.getByRole("dialog", { name: "Modifier le stock" });
    // Measured at rest: read while the sheet slides in, its box ends a fraction of a pixel under the screen.
    await dialog.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
    expect(box!.y + box!.height).toBeLessThanOrEqual(900);
  });

  test("a narrow window without touch still gets 44px targets", async ({ page }) => {
    // Default context: fine pointer. The width alone must trigger the touch sizes.
    await openGallery(page, 375);
    const box = await page.getByRole("button", { name: "Nouvelle vente" }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test("buttons are fully rounded", async ({ page }) => {
    await openGallery(page, 1280);
    const radius = await page
      .getByRole("button", { name: "Nouvelle vente" })
      .evaluate((element) => getComputedStyle(element).borderTopLeftRadius);
    expect(parseFloat(radius)).toBeGreaterThanOrEqual(18);
  });

  test("page header folds secondary actions into a menu on phones", async ({ page }) => {
    await openGallery(page, 375);
    await expect(page.getByRole("button", { name: "Nouvelle vente" })).toBeVisible();
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await expect(page.getByRole("menuitem", { name: "Exporter" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Imprimer" })).toBeVisible();
  });
});
