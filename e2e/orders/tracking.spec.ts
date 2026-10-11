import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { signIn } from "./helpers";

// Order tracking (V1.2) on the production build.
//
// The `order-track-*` orders of the stand-in API answer the `tracking` block
// of laravel-order-tracking.json, which the Laravel projection produced
// (../sugu, OrderTrackingProjectionTest). The same file is the oracle here:
// the screen must show those steps, in that order, with those dates, and
// nothing else.

interface Step {
  key: string;
  title: string;
  summary: string | null;
  kind: string;
  status: "done" | "current" | "upcoming";
  timestamp: string | null;
}
interface Tracking {
  flow: string;
  state: string;
  steps: Step[];
  current: number | null;
  next: number | null;
  progress: { done: number; total: number } | null;
}

const SCENARIOS: Record<string, Tracking> = JSON.parse(
  readFileSync(join(__dirname, "laravel-order-tracking.json"), "utf8"),
).scenarios;

const WIDTHS = [375, 390, 768, 1280] as const;

const SHOTS = join(__dirname, "..", "..", "docs", "captures", "v1.2-tracking");
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });

async function open(page: Page, baseURL: string | undefined, path: string, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await signIn(page, baseURL);
  await page.goto(path);
  await expect(page.locator('[data-shell="pro"][data-role="vendor"]')).toBeVisible();
}

async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target.join(" ")).slice(0, 3) }));
}

const rootOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const banner = (page: Page) => page.getByRole("region", { name: "Étape en cours de la commande" });
const journey = (page: Page) => page.getByRole("list", { name: "Étapes de la commande" }).getByRole("listitem");

const STATE_LABEL: Record<string, string> = {
  in_progress: "Étape en cours",
  completed: "Parcours terminé",
  canceled: "Parcours interrompu",
  failed: "Parcours interrompu",
  returned: "Parcours interrompu",
};

test.describe("order tracking", () => {
  for (const [scenario, tracking] of Object.entries(SCENARIOS)) {
    test(`${scenario}: the screen shows the backend projection, step for step`, async ({ page, baseURL }) => {
      await open(page, baseURL, `/vendor/orders/order-track-${scenario}`);

      // 1. Where the order stands.
      const current = tracking.steps[tracking.current!];
      await expect(banner(page)).toContainText(STATE_LABEL[tracking.state]);
      await expect(banner(page)).toContainText(current.title);
      await expect(banner(page)).toContainText(current.summary!);

      // 3. What comes next, when something does.
      if (tracking.next === null) {
        await expect(banner(page)).not.toContainText("Prochaine étape");
      } else {
        await expect(banner(page)).toContainText(`Prochaine étape : ${tracking.steps[tracking.next].title}.`);
      }

      const progress = banner(page).getByRole("progressbar", { name: "Progression de la commande" });
      if (tracking.progress) {
        await expect(progress).toHaveAttribute("aria-valuenow", String(tracking.progress.done));
        await expect(progress).toHaveAttribute("aria-valuemax", String(tracking.progress.total));
        await expect(banner(page)).toContainText(`Étape ${tracking.progress.done} sur ${tracking.progress.total}`);
      } else {
        await expect(progress).toHaveCount(0);
      }

      // 2. What happened: the backend steps, all of them, in its order.
      const items = journey(page);
      await expect(items).toHaveCount(tracking.steps.length);
      for (const [index, step] of tracking.steps.entries()) {
        const item = items.nth(index);
        await expect(item).toContainText(step.title);
        await expect(item).toContainText(step.summary!);

        // A date only where the backend recorded one; never on a step to come.
        await expect(item.locator("time")).toHaveCount(step.timestamp ? 1 : 0);
        if (step.timestamp) await expect(item.locator("time")).toHaveAttribute("datetime", step.timestamp);
        if (step.status !== "upcoming" && !step.timestamp) await expect(item).toContainText("Date non enregistrée");
        if (step.status === "upcoming") await expect(item).not.toContainText("Date non enregistrée");
      }
      await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
      await expect(page.locator('[aria-current="step"]')).toContainText(current.title);

      await shot(page, `${scenario}-1280`);
    });
  }

  test("a counter sale has no shipping, courier or delivery step", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/order-track-counter_sale");
    await expect(journey(page)).toHaveCount(2);
    const section = page.getByRole("list", { name: "Étapes de la commande" });
    await expect(section).toContainText("Vente enregistrée");
    await expect(section).toContainText("Remise au client");
    for (const absent of ["coursier", "Coursier", "livraison", "Livraison", "expédi", "Expédi", "colis"]) {
      await expect(section).not.toContainText(absent);
      await expect(banner(page)).not.toContainText(absent);
    }
  });

  test("the tracking replaces the guidance sentence instead of repeating it", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/order-track-marketplace_pending");
    await expect(banner(page)).toContainText("Prochaine étape : Commande confirmée. À faire : confirmer que les articles sont disponibles.");
    await expect(page.getByText("Cette commande attend votre confirmation")).toHaveCount(0);

    // A backend without `tracking` cannot say what comes next: the sentence stays.
    await page.goto("/vendor/orders/order-pending");
    await expect(page.getByText("Cette commande attend votre confirmation")).toBeVisible();
  });

  test("a canceled order is shown as interrupted, with nothing left to expect", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/orders/order-track-canceled");
    await expect(banner(page)).toContainText("Parcours interrompu");
    await expect(banner(page)).toContainText("Commande annulée");
    await expect(page.getByText("À venir")).toHaveCount(0);
    await expect(banner(page).getByRole("progressbar")).toHaveCount(0);
  });

  test("a backend older than V1.2 still gets its timeline, without a progress it cannot know", async ({ page, baseURL }) => {
    // order-processing answers `canonical_timeline` only.
    await open(page, baseURL, "/vendor/orders/order-processing");
    await expect(banner(page)).toContainText("Étape en cours");
    await expect(banner(page)).toContainText("En préparation");
    await expect(banner(page).getByRole("progressbar")).toHaveCount(0);
    await expect(journey(page)).toHaveCount(3);
    await expect(journey(page).nth(0)).toContainText("Commande reçue");
  });

  for (const width of WIDTHS) {
    test(`is readable and accessible at ${width}px`, async ({ page, baseURL }) => {
      for (const scenario of ["marketplace_collected", "cod_mixte_product_unpaid", "delivery_failed"]) {
        await open(page, baseURL, `/vendor/orders/order-track-${scenario}`, width);
        await expect(banner(page)).toBeVisible();

        // The current step is on screen without scrolling.
        const box = (await banner(page).boundingBox())!;
        expect(box.y + box.height).toBeLessThanOrEqual(900);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);

        if (width < 1024) {
          // One column: the current step comes before every other block.
          const client = (await page.getByRole("heading", { name: "Client", exact: true }).boundingBox())!;
          expect(box.y + box.height).toBeLessThanOrEqual(client.y);
        }

        // No step is cut or pushed out of its card.
        for (const item of await journey(page).all()) {
          const step = (await item.boundingBox())!;
          expect(step.x).toBeGreaterThanOrEqual(0);
          expect(step.x + step.width).toBeLessThanOrEqual(width + 0.5);
        }

        expect(await rootOverflow(page)).toBeLessThanOrEqual(0);
        expect(await blockingViolations(page)).toEqual([]);
        await shot(page, `${scenario}-${width}`);
        // The page scrolls inside the shell: the steps get their own capture.
        const steps = page.getByRole("list", { name: "Étapes de la commande" });
        await steps.scrollIntoViewIfNeeded();
        await steps.screenshot({ path: join(SHOTS, `${scenario}-steps-${width}.png`) });
      }
    });
  }
});
