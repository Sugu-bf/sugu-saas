import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { signIn } from "./helpers";
import { pngFile } from "./pictures";

// Captures of the catalogue pages, for visual review. No assertion on the
// design itself: this file only produces the images.
//
// Every capture shows the WHOLE page. The shell scrolls inside <main>, so the
// viewport is grown to the content before the shot: nothing is hidden behind
// the phone tab bar by the framing.
//
//   CAPTURE_DIR       where to write (default docs/captures/v2.1-catalog/apres)
//   CAPTURE_BASELINE  "1" on a build older than the V2 polish: only the five
//                     pages are captured, with no interaction.

const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;
const BASELINE = process.env.CAPTURE_BASELINE === "1";
const DIR = process.env.CAPTURE_DIR ?? join(__dirname, "..", "..", "docs", "captures", "v2.1-catalog", "apres");
mkdirSync(DIR, { recursive: true });

test.skip(!process.env.CAPTURE, "Set CAPTURE=1 to produce the review captures.");

async function open(page: Page, baseURL: string | undefined, path: string, width: number, view: "grid" | "list" = "grid") {
  await page.setViewportSize({ width, height: 900 });
  // The view of the product list is a stored preference: set before the page reads it.
  await page.addInitScript((stored) => window.localStorage.setItem("sugu.vendor.products.view", stored), view);
  // A new sign-in: a fresh data set, whatever the previous page did to it.
  await signIn(page, baseURL);
  await page.goto(path);
  await expect(page.locator('[data-shell="pro"][data-role="vendor"]')).toBeVisible();
  // Lists and forms are filled by client requests: wait for them to settle.
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main [aria-busy='true']")).toHaveCount(0);
}

/** Every picture of the page has either loaded or failed: the fallbacks are drawn. */
async function picturesSettled(page: Page) {
  await page.evaluate(async () => {
    const pending = Array.from(document.querySelectorAll("main img")).filter((image) => !(image as HTMLImageElement).complete);
    await Promise.all(pending.map((image) => new Promise((resolve) => ["load", "error"].forEach((type) => image.addEventListener(type, resolve, { once: true })))));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function shot(page: Page, name: string) {
  const size = page.viewportSize()!;
  // Grown until nothing is left to scroll: pictures loading late change the height.
  for (let pass = 0; pass < 4; pass += 1) {
    await picturesSettled(page);
    const overflow = await page.evaluate(() => {
      const main = document.querySelector("main");
      return main ? Math.max(0, main.scrollHeight - main.clientHeight) : 0;
    });
    if (overflow === 0) break;
    const current = page.viewportSize()!;
    await page.setViewportSize({ width: current.width, height: current.height + overflow });
  }
  await picturesSettled(page);
  // Toasts are transient: they are not part of the page.
  await page.addStyleTag({ content: "[data-sonner-toaster]{visibility:hidden!important}" });
  await page.screenshot({ path: join(DIR, `${name}.png`), fullPage: true });
  await page.setViewportSize(size);
}

/** What the screen really shows, with the bars where they sit: no growing. */
async function screen(page: Page, name: string) {
  await picturesSettled(page);
  await page.addStyleTag({ content: "[data-sonner-toaster]{visibility:hidden!important}" });
  await page.screenshot({ path: join(DIR, `${name}.png`) });
}

/** Moves to a step of the product form through its stepper. */
async function step(page: Page, label: string) {
  await page.getByRole("navigation", { name: /^Étapes de la/ }).getByRole("button", { name: label }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`: ${label}$`) })).toBeAttached();
  await page.waitForLoadState("networkidle");
}

const PAGES: [string, string, ("grid" | "list")?][] = BASELINE
  ? [
      ["produits", "/vendor/products"],
      ["fiche-produit", "/vendor/products/product-variants"],
      ["inventaire", "/vendor/inventory"],
      ["formulaire-creation", "/vendor/products/new"],
      ["formulaire-edition", "/vendor/products/product-variants/edit"],
    ]
  : [
      ["produits-grille", "/vendor/products", "grid"],
      ["produits-liste", "/vendor/products", "list"],
      ["fiche-produit", "/vendor/products/product-variants"],
      ["inventaire", "/vendor/inventory"],
      ["formulaire-creation-1-informations", "/vendor/products/new"],
    ];

for (const width of WIDTHS) {
  test(`pages at ${width}px`, async ({ page, baseURL }) => {
    test.setTimeout(240_000);
    for (const [name, path, view] of PAGES) {
      await open(page, baseURL, path, width, view);
      await shot(page, `${name}-${width}`);
    }
    if (BASELINE) return;

    // The four steps of the form, on a product that fills them all.
    await open(page, baseURL, "/vendor/products/product-variants/edit", width);
    await shot(page, `formulaire-edition-1-informations-${width}`);
    await step(page, "Photos");
    await shot(page, `formulaire-edition-2-photos-${width}`);
    await step(page, "Prix et stock");
    await shot(page, `formulaire-edition-3-prix-stock-${width}`);
    await step(page, "Récapitulatif");
    await shot(page, `formulaire-edition-4-recapitulatif-${width}`);
  });
}

if (!BASELINE) {
  // 1536px: the width of the mock-up the product list was drawn from, to set one beside the other.
  test("product list at 1536px", async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await open(page, baseURL, "/vendor/products", 1536, "grid");
    await shot(page, "produits-grille-1536");
    await open(page, baseURL, "/vendor/products", 1536, "list");
    await shot(page, "produits-liste-1536");
  });

  // What a phone really shows when a page opens, bars included: the framing a
  // whole-page capture cannot give. `-bas` is the same page scrolled to its end.
  for (const [width, height] of [
    [375, 667],
    [390, 844],
  ] as const) {
    test(`screens at ${width}px`, async ({ page, baseURL }) => {
      test.setTimeout(240_000);
      const SCREENS: [string, string, ("grid" | "list")?][] = [
        ["produits-grille", "/vendor/products", "grid"],
        ["produits-liste", "/vendor/products", "list"],
        ["fiche-produit", "/vendor/products/product-variants"],
        ["formulaire-creation", "/vendor/products/new"],
        ["formulaire-edition", "/vendor/products/product-variants/edit"],
      ];
      for (const [name, path, view] of SCREENS) {
        await open(page, baseURL, path, width, view);
        await page.setViewportSize({ width, height });
        await screen(page, `ecran-${name}-${width}`);
        await page.locator("main").evaluate((main) => main.scrollTo(0, main.scrollHeight));
        await screen(page, `ecran-${name}-${width}-bas`);
      }
    });
  }

  for (const width of [390, 768, 1280] as const) {
    test(`states at ${width}px`, async ({ page, baseURL }) => {
      test.setTimeout(300_000);
      const phone = width < 672;

      // Product without picture, product with a picture that no longer loads.
      await open(page, baseURL, "/vendor/products/product-out", width);
      await shot(page, `etat-fiche-sans-photo-${width}`);
      await open(page, baseURL, "/vendor/products/product-low", width);
      await shot(page, `etat-fiche-photo-indisponible-${width}`);
      await open(page, baseURL, "/vendor/products/product-rejected", width);
      await shot(page, `etat-fiche-rejetee-${width}`);

      // The list narrowed by a search: count, way back and view switch on one row.
      await open(page, baseURL, "/vendor/products?q=bracelet&stock=low_stock", width);
      await shot(page, `etat-produits-recherche-${width}`);
      await open(page, baseURL, "/vendor/products?q=introuvable", width);
      await shot(page, `etat-produits-aucun-resultat-${width}`);

      // The menu of a card, as the screen shows it.
      await open(page, baseURL, "/vendor/products", width);
      await page.getByRole("button", { name: /^Actions pour/ }).first().click();
      await expect(page.getByRole("menu")).toBeVisible();
      await screen(page, `etat-produits-grille-menu-${width}`);
      await page.keyboard.press("Escape");

      if (phone) {
        await page.getByRole("button", { name: /^Filtres/ }).click();
        await expect(page.getByRole("dialog", { name: "Filtres" })).toBeVisible();
        await screen(page, `etat-produits-filtres-${width}`);

        await open(page, baseURL, "/vendor/products", width, "list");
        await page.getByRole("button", { name: "Voir plus" }).first().click();
        await shot(page, `etat-produits-liste-carte-ouverte-${width}`);
      }

      // Stock adjustment.
      await open(page, baseURL, "/vendor/inventory?level=low_stock", width);
      await page.getByRole("button", { name: "Ajuster le stock de Chemise en Faso Dan Fani" }).click();
      await page.getByLabel("Quantité").fill("6");
      await expect(page.getByText("Stock après ajustement : 10 unités.")).toBeVisible();
      await screen(page, `etat-inventaire-ajustement-${width}`);

      // Form, as the screen shows it: the bar of decisions above the tab bar.
      await open(page, baseURL, "/vendor/products/new", width);
      await screen(page, `etat-formulaire-ecran-creation-${width}`);

      // Form: a step refused, then a submission refused.
      await page.getByRole("button", { name: "Suivant" }).click();
      await expect(page.getByText("1 champ à corriger")).toBeVisible();
      await shot(page, `etat-formulaire-etape-refusee-${width}`);

      await page.getByLabel("Nom du produit").fill("Panier tressé de Bobo");
      await step(page, "Récapitulatif");
      await shot(page, `etat-formulaire-recapitulatif-incomplet-${width}`);
      await page.getByRole("button", { name: "Soumettre à validation" }).click();
      await expect(page.getByText(/champs à corriger/)).toBeVisible();
      await shot(page, `etat-formulaire-soumission-refusee-${width}`);

      // Form: one variant opened.
      await open(page, baseURL, "/vendor/products/product-variants/edit", width);
      await step(page, "Prix et stock");
      await page.getByRole("button", { name: "Plus de réglages pour Rouge / M" }).click();
      await shot(page, `etat-formulaire-variante-ouverte-${width}`);

      // Form: a photo being compared with its detoured version.
      await step(page, "Photos");
      await page.getByRole("button", { name: "Actions pour la photo 2" }).click();
      await page.getByRole("menuitem", { name: "Détourer le fond" }).click();
      await expect(page.getByRole("group", { name: "Détourage de la photo 2" })).toBeVisible();
      await shot(page, `etat-formulaire-detourage-${width}`);

      // Description: what the editor writes (title, table, picture), then how it reads.
      await open(page, baseURL, "/vendor/products/new", width);
      await page.getByLabel("Nom du produit").fill("Boubou brodé");
      const description = page.getByRole("textbox", { name: "Description" });
      await description.click();
      await page.getByRole("button", { name: "Style du texte" }).click();
      await page.getByRole("menuitem", { name: "Titre 2" }).click();
      await page.keyboard.type("Guide des tailles");
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: "Tableau" }).click();
      await page.getByRole("menuitem", { name: "Insérer un tableau" }).click();
      const cells = ["Taille", "Poitrine", "Longueur", "M", "98 cm", "72 cm", "L", "104 cm", "74 cm"];
      for (const [index, cell] of cells.entries()) {
        await page.keyboard.type(cell);
        if (index < cells.length - 1) await page.keyboard.press("Tab");
      }
      await page.keyboard.press("Control+End");
      await page.getByLabel("Images à ajouter à la description").setInputFiles(pngFile("detail-du-tissage.png"));
      await expect(description.locator("img")).toHaveCount(1);
      await shot(page, `etat-formulaire-description-riche-${width}`);

      await description.locator("td").first().click();
      await page.getByRole("button", { name: "Tableau" }).click();
      await expect(page.getByRole("menu")).toBeVisible();
      await screen(page, `etat-formulaire-description-menu-tableau-${width}`);
      await page.keyboard.press("Escape");

      await step(page, "Récapitulatif");
      await shot(page, `etat-formulaire-description-recapitulatif-${width}`);

      // Form: a product sent back by moderation.
      await open(page, baseURL, "/vendor/products/product-rejected/edit", width);
      await shot(page, `etat-formulaire-rejete-${width}`);
    });
  }
}
