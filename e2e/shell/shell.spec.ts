import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;
const PASSWORD = "Passw0rd!";
const ACCOUNTS = {
  vendor: { email: "vendeur@qa.test", name: "Boutique Awa", home: "/vendor/dashboard" },
  agency: { email: "agence@qa.test", name: "Faso Express", home: "/agency/dashboard" },
  courier: { email: "coursier@qa.test", name: "Moussa Kaboré", home: "/driver/dashboard" },
} as const;
type Role = keyof typeof ACCOUNTS;
const ROLES = Object.keys(ACCOUNTS) as Role[];

/**
 * Expected navigation, written out by hand: an oracle independent from
 * src/components/app-shell/navigation.ts. `tab` is the label in the phone tab bar.
 */
interface Entry {
  label: string;
  href: string;
  tab?: string;
}
const NAVIGATION: Record<Role, Entry[]> = {
  vendor: [
    { label: "Tableau de bord", href: "/vendor/dashboard", tab: "Accueil" },
    { label: "Commandes", href: "/vendor/orders", tab: "Commandes" },
    { label: "Produits", href: "/vendor/products", tab: "Catalogue" },
    { label: "Clients", href: "/vendor/clients" },
    { label: "Inventaire", href: "/vendor/inventory" },
    { label: "Statistiques", href: "/vendor/statistics" },
    { label: "Finances", href: "/vendor/wallet", tab: "Finances" },
    { label: "Marketing", href: "/vendor/marketing" },
    { label: "Messages", href: "/vendor/messages" },
    { label: "Vue d'ensemble", href: "/vendor/sugubox" },
    { label: "Mon stock", href: "/vendor/sugubox/stock" },
    { label: "Réceptions", href: "/vendor/sugubox/inbound" },
    { label: "Expéditions", href: "/vendor/sugubox/outbound" },
    { label: "Mouvements", href: "/vendor/sugubox/movements" },
    { label: "Paramètres", href: "/vendor/settings" },
    { label: "Support", href: "/vendor/tickets" },
  ],
  agency: [
    { label: "Tableau de bord", href: "/agency/dashboard", tab: "Accueil" },
    { label: "Livraisons", href: "/agency/deliveries", tab: "Livraisons" },
    { label: "Livreurs", href: "/agency/drivers", tab: "Livreurs" },
    { label: "Finances", href: "/agency/earnings", tab: "Finances" },
    { label: "Statistiques", href: "/agency/statistics" },
    { label: "Messages", href: "/agency/messages" },
    { label: "Paramètres", href: "/agency/settings" },
  ],
  courier: [
    { label: "Accueil", href: "/driver/dashboard", tab: "Accueil" },
    { label: "Missions", href: "/driver/deliveries", tab: "Missions" },
    { label: "Gains", href: "/driver/earnings", tab: "Gains" },
    { label: "Historique", href: "/driver/history" },
    { label: "Profil", href: "/driver/profile", tab: "Profil" },
    { label: "Documents", href: "/driver/documents" },
    { label: "Messages", href: "/driver/messages" },
    { label: "Paramètres", href: "/driver/settings" },
  ],
};

const SHOTS = join(__dirname, "..", "..", "docs", "captures", "phase-b");
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

const mode = (width: number) => (width < 768 ? "phone" : width < 1024 ? "tablet" : "desktop");

/**
 * A request made by this process, not by the browser, to `next start`. It
 * travels over a kept-alive connection the server may have just closed:
 * unlike a browser, the client does not try again by itself, so a reset
 * connection is tried again here. Nothing else is.
 */
async function overResetConnection<T>(send: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await send();
    } catch (error) {
      if (attempt >= 3 || !/ECONNRESET|socket hang up/.test(String(error))) throw error;
    }
  }
}

/** Sign in through the BFF (same cookie jar as the page). */
async function signIn(page: Page, email: string, baseURL: string | undefined) {
  const response = await overResetConnection(() =>
    page.request.post("/api/auth/login", {
      data: { email, password: PASSWORD },
      headers: { Origin: baseURL ?? "" },
    }),
  );
  expect(response.ok(), `login ${email}: ${response.status()}`).toBe(true);
}

async function openSpace(page: Page, role: Role, width: number, baseURL: string | undefined, path?: string) {
  await page.setViewportSize({ width, height: 800 });
  await signIn(page, ACCOUNTS[role].email, baseURL);
  await page.goto(path ?? ACCOUNTS[role].home);
  await expect(page.locator(`[data-shell="pro"][data-role="${role}"]`)).toBeVisible();
}

async function blockingViolations(page: Page, include: string[]) {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  for (const selector of include) builder = builder.include(selector);
  const results = await builder.analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target.join(" ")).slice(0, 3) }));
}

async function rootOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

const tabBar = (page: Page) => page.getByRole("navigation", { name: "Navigation rapide" });
const sidebar = (page: Page) => page.locator("#shell-sidebar");

// ─────────────────────────────────────────────────────────────
// Frame: 6 widths × 3 roles
// ─────────────────────────────────────────────────────────────
for (const width of WIDTHS) {
  for (const role of ROLES) {
    test.describe(`${role} at ${width}px`, () => {
      test.use({ hasTouch: width < 1024, isMobile: width < 768 });

      test("frame matches the breakpoint, no overflow, accessible chrome", async ({ page, baseURL }) => {
        await openSpace(page, role, width, baseURL);
        const layout = mode(width);

        await expect(tabBar(page)).toBeVisible({ visible: layout === "phone" });
        await expect(sidebar(page)).toBeVisible({ visible: layout === "desktop" });
        await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toBeVisible({ visible: layout === "tablet" });
        await expect(page.getByRole("button", { name: /(Réduire|Étendre) le menu/ })).toBeVisible({
          visible: layout === "desktop",
        });
        await expect(page.getByRole("button", { name: /Menu du compte/ })).toBeVisible();

        expect(await rootOverflow(page)).toBeLessThanOrEqual(0);
        const header = await page.locator("#shell-topbar").boundingBox();
        expect(header!.x).toBeGreaterThanOrEqual(0);
        expect(header!.x + header!.width).toBeLessThanOrEqual(width + 0.5);

        const chrome = ["#shell-topbar"];
        if (layout === "desktop") chrome.push("#shell-sidebar");
        if (layout === "phone") chrome.push('nav[aria-label="Navigation rapide"]');
        expect(await blockingViolations(page, chrome)).toEqual([]);
        await shot(page, `shell-${role}-${width}`);
      });

      test("navigation overlay opens, is accessible, closes and gives focus back", async ({ page, baseURL }) => {
        await openSpace(page, role, width, baseURL);
        const layout = mode(width);

        if (layout === "desktop") {
          // Desktop has no navigation overlay: the account menu is the overlay.
          const trigger = page.getByRole("button", { name: /Menu du compte/ });
          await trigger.click();
          const menu = page.getByRole("menu");
          await expect(menu.getByRole("menuitem", { name: "Se déconnecter" })).toBeVisible();
          expect(await blockingViolations(page, ['[role="menu"]'])).toEqual([]);
          await page.keyboard.press("Escape");
          await expect(menu).toBeHidden();
          await expect(trigger).toBeFocused();
          return;
        }

        const trigger =
          layout === "phone"
            ? tabBar(page).getByRole("button", { name: "Menu" })
            : page.getByRole("button", { name: "Ouvrir le menu" });
        await trigger.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole("link", { name: "Paramètres" })).toBeVisible();
        await expect(dialog.getByRole("button", { name: "Se déconnecter" })).toBeVisible();

        // The overlay slides in: it is measured once it has come to rest, not on its way.
        await dialog.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
        const box = await dialog.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 0.5);
        expect(box!.y + box!.height).toBeLessThanOrEqual(800 + 0.5);
        expect(await blockingViolations(page, ['[role="dialog"]'])).toEqual([]);
        await shot(page, `menu-${role}-${width}`);

        // Focus is trapped inside while open.
        for (let i = 0; i < 4; i += 1) await page.keyboard.press("Tab");
        expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);

        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
      });
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Phone specifics
// ─────────────────────────────────────────────────────────────
test.describe("phone tab bar", () => {
  test.use({ hasTouch: true, isMobile: true });

  for (const role of ROLES) {
    test(`${role}: comfortable targets, content not covered, every entry reachable`, async ({ page, baseURL }) => {
      await openSpace(page, role, 375, baseURL);
      const tabs = NAVIGATION[role].filter((entry) => entry.tab);
      const others = NAVIGATION[role].filter((entry) => !entry.tab);

      const slots = tabBar(page).locator("a, button");
      await expect(slots).toHaveCount(tabs.length + 1);
      for (const slot of await slots.all()) {
        const box = await slot.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
      }

      // The scroll area keeps a bottom padding at least as tall as the bar.
      const { padding, bar, inset } = await page.evaluate(() => {
        const main = document.querySelector("main")!;
        const nav = document.querySelector('nav[aria-label="Navigation rapide"]')!;
        const shell = document.querySelector('[data-shell="pro"]')!;
        return {
          padding: parseFloat(getComputedStyle(main).paddingBottom),
          bar: nav.getBoundingClientRect().height,
          inset: getComputedStyle(shell).getPropertyValue("--shell-bottom-inset"),
        };
      });
      expect(padding).toBeGreaterThanOrEqual(bar);
      expect(inset).toContain("4rem");

      for (const tab of tabs) {
        await tabBar(page).getByRole("link", { name: tab.tab }).click();
        await expect(page).toHaveURL(new RegExp(`${tab.href}$`));
        await expect(tabBar(page).getByRole("link", { name: tab.tab })).toHaveAttribute("aria-current", "page");
      }

      for (const item of others) {
        await tabBar(page).getByRole("button", { name: "Menu" }).click();
        await page.getByRole("dialog").getByRole("link", { name: item.label, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`${item.href}$`));
        await expect(page.getByRole("dialog")).toBeHidden();
        await expect(page.locator(`[data-shell="pro"][data-role="${role}"]`)).toBeVisible();
      }
    });
  }

  test("the tab bar leaves the screen on a chat page", async ({ page, baseURL }) => {
    await openSpace(page, "vendor", 375, baseURL, "/vendor/messages/42");
    await expect(page.locator("#shell-topbar")).toBeVisible();
    await expect(tabBar(page)).toHaveCount(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Desktop navigation, sidebar, keyboard
// ─────────────────────────────────────────────────────────────
for (const role of ROLES) {
  test(`${role}: every sidebar entry opens its page inside the shell`, async ({ page, baseURL }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await openSpace(page, role, 1280, baseURL);

    // Nothing more in the sidebar than what is expected (plus the public help link).
    const hrefs = await sidebar(page).locator("nav a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs.filter((href) => href !== "/faq")).toEqual(NAVIGATION[role].map((entry) => entry.href));

    for (const item of NAVIGATION[role]) {
      const link = sidebar(page).getByRole("link", { name: item.label, exact: true });
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${item.href}$`));
      await expect(link).toHaveAttribute("aria-current", "page");
      await expect(sidebar(page).locator('[aria-current="page"]')).toHaveCount(1);
      await expect(page.locator("main")).toBeVisible();
    }
    expect(pageErrors).toEqual([]);
  });
}

test.describe("desktop sidebar and keyboard", () => {
  test("collapses to a rail, keeps names, survives a reload", async ({ page, baseURL }) => {
    await openSpace(page, "vendor", 1280, baseURL, "/vendor/orders");
    const expanded = (await sidebar(page).boundingBox())!.width;
    await page.getByRole("button", { name: "Réduire le menu" }).click();
    await expect(page.getByRole("button", { name: "Étendre le menu" })).toHaveAttribute("aria-expanded", "false");
    const collapsed = (await sidebar(page).boundingBox())!.width;
    expect(expanded).toBe(240);
    expect(collapsed).toBe(56);
    await expect(sidebar(page).getByRole("link", { name: "Commandes", exact: true })).toHaveAttribute("aria-current", "page");
    await shot(page, "sidebar-collapsed-1280");

    await page.reload();
    await expect(page.getByRole("button", { name: "Étendre le menu" })).toBeVisible();
    expect((await sidebar(page).boundingBox())!.width).toBe(56);
  });

  test("sidebar scrolls on its own when the screen is short", async ({ page, baseURL }) => {
    await openSpace(page, "vendor", 1280, baseURL);
    await page.setViewportSize({ width: 1280, height: 480 });
    const last = sidebar(page).getByRole("link", { name: "Aide et FAQ" });
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    expect(await page.evaluate(() => document.querySelector("main")!.scrollTop)).toBe(0);
  });

  test("skip link, visible focus and keyboard-only account menu", async ({ page, baseURL }) => {
    await openSpace(page, "agency", 1280, baseURL);
    await page.locator("body").focus();
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Aller au contenu" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contenu$/);

    const link = sidebar(page).getByRole("link", { name: "Livraisons" });
    await link.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
    const outline = await link.evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.style).not.toBe("none");
    expect(outline.width).toBeGreaterThanOrEqual(2);

    const account = page.getByRole("button", { name: /Menu du compte/ });
    await account.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    // Opened from the keyboard: the first entry is focused straight away.
    await expect(page.getByRole("menuitem", { name: "Paramètres" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Se déconnecter" })).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/agency\/settings$/);
  });
});

// ─────────────────────────────────────────────────────────────
// Access rules, session, logout
// ─────────────────────────────────────────────────────────────
test.describe("access and session", () => {
  test("without a session every space leads to login", async ({ page }) => {
    for (const path of ["/vendor/dashboard", "/agency/earnings", "/driver/deliveries"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?redirect=${encodeURIComponent(path)}$`));
    }
  });

  test("a typed URL of another role does not open it", async ({ page, baseURL }) => {
    await openSpace(page, "vendor", 1280, baseURL);
    for (const path of ["/agency/earnings", "/driver/deliveries"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/vendor\/dashboard$/);
      await expect(page.locator('[data-shell="pro"]')).toHaveAttribute("data-role", "vendor");
    }
    await signIn(page, ACCOUNTS.courier.email, baseURL);
    await page.goto("/vendor/wallet");
    await expect(page).toHaveURL(/\/driver\/dashboard$/);
  });

  test("a courier awaiting approval is kept to their file: never a mission page", async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await signIn(page, "coursier-attente@qa.test", baseURL);
    // The mission pages send them to their file, where it is completed (V4):
    // the waiting screen of the sign-up left them nothing to do.
    for (const path of ["/driver/dashboard", "/driver/deliveries", "/driver/deliveries/42"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/driver\/documents$/);
    }
    await expect(page.locator('[data-shell="pro"][data-role="courier"]')).toBeVisible();
    await expect(tabBar(page).getByRole("link")).toHaveText(["Dossier", "Gains", "Profil"]);
    await expect(tabBar(page).getByRole("link", { name: "Missions" })).toHaveCount(0);

    // What they did and earned before stays readable.
    await page.goto("/driver/earnings");
    await expect(page).toHaveURL(/\/driver\/earnings$/);

    // The waiting screen of the sign-up still answers, and leads to the file.
    await page.goto("/signup/driver?step=pending");
    await expect(page.getByRole("heading", { name: "Compte en attente de validation" })).toBeVisible();
    await expect(page.getByText("skip")).toHaveCount(0);
    await page.getByRole("button", { name: "Vérifier mon statut" }).click();
    await expect(page.getByText(/toujours en cours d'examen/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir ou compléter mon dossier" })).toHaveAttribute("href", "/driver/documents");
    expect(await blockingViolations(page, ["body"])).toEqual([]);
    await shot(page, "courier-pending-390");
  });

  test("the session cookie is httpOnly and the browser only talks to this origin", async ({ page, baseURL, context }) => {
    const foreign: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith("http") && url.origin !== baseURL) foreign.push(request.url());
    });
    await openSpace(page, "vendor", 1280, baseURL);
    await page.goto("/vendor/orders");
    await page.waitForLoadState("networkidle");

    const cookie = (await context.cookies()).find((entry) => entry.name === "sugu_session");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    expect(await page.evaluate(() => document.cookie)).not.toContain("sugu_session");
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("qa-101");
    expect(foreign.filter((url) => !url.startsWith("ws"))).toEqual([]);
  });

  for (const width of [375, 1280] as const) {
    test(`logout at ${width}px ends the session`, async ({ page, baseURL }) => {
      await openSpace(page, "agency", width, baseURL);
      if (width < 768) {
        await tabBar(page).getByRole("button", { name: "Menu" }).click();
        await page.getByRole("dialog").getByRole("button", { name: "Se déconnecter" }).click();
      } else {
        await page.getByRole("button", { name: /Menu du compte/ }).click();
        await page.getByRole("menuitem", { name: "Se déconnecter" }).click();
      }
      await expect(page).toHaveURL(/\/login$/);
      await page.goto("/agency/dashboard");
      await expect(page).toHaveURL(/\/login\?redirect=/);
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Legacy pages keep working inside the new frame
// ─────────────────────────────────────────────────────────────
const LEGACY_ROUTES: Array<[Role, string]> = [
  ["vendor", "/vendor/dashboard"],
  ["vendor", "/vendor/orders"],
  ["vendor", "/vendor/products"],
  ["agency", "/agency/dashboard"],
  ["agency", "/agency/deliveries"],
  ["courier", "/driver/dashboard"],
  ["courier", "/driver/deliveries"],
];

for (const width of [375, 1280] as const) {
  test.describe(`legacy pages at ${width}px`, () => {
    test.use({ hasTouch: width < 1024, isMobile: width < 768 });

    for (const [role, path] of LEGACY_ROUTES) {
      test(`${path} renders inside the shell`, async ({ page, baseURL }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        await openSpace(page, role, width, baseURL, path);
        await page.waitForLoadState("networkidle");

        await expect(page.locator("main")).toBeVisible();
        expect((await page.locator("main").innerText()).trim().length).toBeGreaterThan(0);
        await expect(page.getByText("Application error")).toHaveCount(0);
        expect(await rootOverflow(page)).toBeLessThanOrEqual(0);
        expect(pageErrors).toEqual([]);

        // The page keeps its legacy look: it is not inside the new scope.
        expect(await page.evaluate(() => Boolean(document.querySelector("main")?.closest(".sugu-ui")))).toBe(false);
        await shot(page, `legacy-${path.slice(1).replace(/\//g, "-")}-${width}`);
      });
    }
  });
}

test("a page whose data is not what was agreed keeps the shell and offers a retry", async ({ page, baseURL }) => {
  // The Sugu Box overview used to read its payload without checking it, and
  // an unexpected shape threw while rendering. Since V6 it validates what it
  // reads: the page says the loading failed, inside the frame, and retries.
  await page.route("**/api/proxy/sellers/sugubox/board/summary", (route) =>
    route.fulfill({ json: { success: true, data: [] } }),
  );
  await openSpace(page, "vendor", 1280, baseURL, "/vendor/sugubox");
  await expect(page.locator("main").getByText("Chargement impossible")).toBeVisible();
  await expect(page.getByText("Cette page a rencontré un problème")).toHaveCount(0);
  await expect(sidebar(page).getByRole("link", { name: "Commandes", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Menu du compte/ })).toBeVisible();
  expect(await blockingViolations(page, ["main"])).toEqual([]);
  await shot(page, "page-error-1280");
  await expect(page.locator("main").getByRole("button", { name: "Réessayer" })).toBeVisible();
});
