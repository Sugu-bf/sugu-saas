import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { TOKEN, WIDTHS, blockingViolations, open, sidewaysOverflow, squareCorners, type Account, type SellerScenario } from "./helpers";

// The Lanaya screens at the six widths: nothing dragged sideways, buttons
// and badges fully rounded, no serious accessibility violation at a phone
// and a desktop width. With CAPTURE=1, a whole-page capture of each into
// docs/captures/lanaya/<CAPTURE_DIR or lot1>/doublure/ (stand-in data, not real data).

const CAPTURE = process.env.CAPTURE === "1";
const SHOTS = join(__dirname, "..", "..", "docs", "captures", "lanaya", process.env.CAPTURE_DIR ?? "lot1", "doublure");
if (CAPTURE) mkdirSync(SHOTS, { recursive: true });
// With CAPTURE_ONLY=a,b only those screens run (a capture set for one delivery).
const ONLY = process.env.CAPTURE_ONLY?.split(",");

const SCREENS: { name: string; path: string; account?: Account; scenario?: SellerScenario }[] = [
  { name: "tableau-de-bord", path: "/lanabaga/dashboard" },
  { name: "prospects", path: "/lanabaga/prospects" },
  { name: "invitations", path: "/lanabaga/invitations" },
  { name: "vendeurs", path: "/lanabaga/sellers" },
  { name: "commandes-suivies", path: "/lanabaga/orders" },
  { name: "candidature-admis", path: "/lanabaga/application" },
  { name: "documents", path: "/lanabaga/documents" },
  { name: "conformite", path: "/lanabaga/compliance" },
  { name: "candidature-brouillon", path: "/lanabaga/application", account: "candidate" },
  { name: "vendeur-programme", path: "/vendor/lanaya", account: "seller" },
  { name: "vendeur-decision", path: `/vendor/lanaya?invitation=${TOKEN}`, account: "seller" },
  { name: "vendeur-proposition", path: "/vendor/lanaya", account: "seller", scenario: "replacing" },
  { name: "vendeur-lanabaga-principal", path: "/vendor/lanaya", account: "seller", scenario: "active" },
];

for (const { name, path, account, scenario } of SCREENS.filter((screen) => !ONLY || ONLY.includes(screen.name))) {
  test(`${name}: six widths, nothing sideways, fully rounded, accessible`, async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await open(page, baseURL, path, { account, scenario });
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await page.waitForTimeout(150);
      expect(await sidewaysOverflow(page), `${name} at ${width}px`).toBe(0);
      expect(await squareCorners(page), `${name} at ${width}px`).toEqual([]);
      if (width === 390 || width === 1440) expect(await blockingViolations(page), `${name} at ${width}px`).toEqual([]);
      if (CAPTURE) {
        const height = await page.evaluate(() => Math.max(900, ...Array.from(document.querySelectorAll("main, main *")).map((node) => node.scrollHeight)) + 200);
        await page.setViewportSize({ width, height: Math.min(height, 6000) });
        await page.waitForTimeout(150);
        await page.screenshot({ path: join(SHOTS, `${name}-${width}.png`) });
      }
    }
  });
}
