import { mkdirSync } from "node:fs";
import { test } from "@playwright/test";
import { ALL, PHONE, SCREENS, WIDTHS, open, type Screen } from "./helpers";

// Review captures of the seven Sugu Box screens, at the six widths, for the
// comparison with their mock-ups (docs/captures/references/v6-sugubox-*.png).
// Not part of the suite: run with CAPTURE=1.
//
//   CAPTURE=1 npx playwright test -c playwright.sugubox.config.ts e2e/sugubox/captures.spec.ts
//
// `CAPTURE_DIR` chooses the folder (the "before" captures of the old screens
// are taken with this same spec, from a copy of the previous commit),
// `CAPTURE_ONLY=stock,movements` and `CAPTURE_WIDTHS=390,1440` narrow a run.
// The data is the fixture of e2e/sugubox/mock-sugubox.mjs, not real data: the
// captures show the composition, not an account.

const DIR = process.env.CAPTURE_DIR ?? "docs/captures/v6-sugu-box/apres";
const only = process.env.CAPTURE_ONLY?.split(",") as Screen[] | undefined;
const widths = process.env.CAPTURE_WIDTHS ? process.env.CAPTURE_WIDTHS.split(",").map(Number) : WIDTHS;

const NAMES: Record<Screen, string> = {
  overview: "vue-ensemble",
  stock: "mon-stock",
  receptions: "receptions",
  reception: "fiche-reception",
  expeditions: "expeditions",
  expedition: "fiche-expedition",
  movements: "mouvements",
};

test.describe("captures", () => {
  test.skip(!process.env.CAPTURE, "set CAPTURE=1 to take the review captures");
  test.beforeAll(() => mkdirSync(DIR, { recursive: true }));

  for (const screen of ALL.filter((entry) => !only || only.includes(entry))) {
    test(NAMES[screen], async ({ page, baseURL }) => {
      await open(page, baseURL, SCREENS[screen].path, { width: widths[0] });
      await page.waitForLoadState("networkidle");

      for (const width of widths) {
        // The screen as it is seen: one viewport, bars included.
        await page.setViewportSize({ width, height: width < PHONE ? 844 : 1086 });
        await page.waitForTimeout(200);
        await page.screenshot({ path: `${DIR}/${NAMES[screen]}-${width}.png` });
      }

      // Then the whole page on a phone: the scroller of the pages is made as tall as its content.
      await page.setViewportSize({ width: 390, height: 844 });
      const height = await page.locator("main").evaluate((main) => main.scrollHeight + (main.getBoundingClientRect().top + 8));
      await page.setViewportSize({ width: 390, height: Math.min(Math.max(height + 80, 844), 7000) });
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${DIR}/${NAMES[screen]}-390-page.png` });
    });
  }
});
