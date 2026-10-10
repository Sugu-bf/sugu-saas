import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const PASSWORD = "Passw0rd!";
const WIDTHS = [375, 390, 768, 1024, 1280, 1440] as const;
const AUTH_PAGES = [
  ["login", "/login", "Connexion"],
  ["forgot-password", "/forgot-password", "Mot de passe oublié"],
  ["first-access", "/reset-password/valid-token?email=vendeur%40qa.test", "Définir votre mot de passe"],
  ["courier-signup", "/signup/driver", "Rejoindre une agence"],
] as const;

const SHOTS = join(__dirname, "..", "..", "docs", "captures", "phase-b");
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });

async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target.join(" ")).slice(0, 3) }));
}

async function fillLogin(page: Page, email: string, password = PASSWORD) {
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: false }).first().fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

for (const width of WIDTHS) {
  test.describe(`auth screens at ${width}px`, () => {
    test.use({ hasTouch: width < 1024, isMobile: width < 768 });

    for (const [name, path, heading] of AUTH_PAGES) {
      test(`${name}: readable, no overflow, accessible`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
        if (name === "first-access") await expect(page.getByLabel("Nouveau mot de passe")).toBeVisible();

        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
        ).toBeLessThanOrEqual(0);
        expect(await blockingViolations(page)).toEqual([]);

        const primary = page.locator('button[type="submit"]').first();
        const box = await primary.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        await shot(page, `auth-${name}-${width}`);
      });
    }
  });
}

test.describe("login", () => {
  test("shows no social button and no remember-me", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /google|apple|facebook/i })).toHaveCount(0);
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });

  test("validation errors are announced on the fields", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.locator("#email-error")).toBeVisible();
    await expect(page.locator("#password-error")).toBeVisible();
    await expect(page.getByLabel("Adresse e-mail")).toHaveAttribute("aria-invalid", "true");
    expect(await blockingViolations(page)).toEqual([]);
    await shot(page, "auth-login-errors");
  });

  test("wrong password and non-pro profile get the same plain refusal", async ({ page }) => {
    await page.goto("/login");
    await fillLogin(page, "vendeur@qa.test", "mauvais-mot-de-passe");
    await expect(page.getByText("Email ou mot de passe incorrect.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    await page.reload();
    await fillLogin(page, "acheteur@qa.test");
    await expect(page.getByText(/identifiants fournis sont incorrects/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect((await page.context().cookies()).some((cookie) => cookie.name === "sugu_session")).toBe(false);
  });

  for (const [email, home, role] of [
    ["vendeur@qa.test", "/vendor/dashboard", "vendor"],
    ["agence@qa.test", "/agency/dashboard", "agency"],
    ["coursier@qa.test", "/driver/dashboard", "courier"],
  ] as const) {
    test(`${role} lands in its own space`, async ({ page }) => {
      await page.goto("/login");
      await fillLogin(page, email);
      await expect(page).toHaveURL(new RegExp(`${home}$`));
      await expect(page.locator(`[data-shell="pro"][data-role="${role}"]`)).toBeVisible();
    });
  }

  test("returns to the page asked for, never to an outside address", async ({ page }) => {
    await page.goto("/agency/deliveries");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fagency%2Fdeliveries$/);
    await fillLogin(page, "agence@qa.test");
    await expect(page).toHaveURL(/\/agency\/deliveries$/);

    await page.context().clearCookies();
    await page.goto(`/login?redirect=${encodeURIComponent("https://example.org/agency/")}`);
    await fillLogin(page, "agence@qa.test");
    await expect(page).toHaveURL(/\/agency\/dashboard$/);
  });

  test("two-step verification: wrong code, then the right one", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/login");
    await fillLogin(page, "otp@qa.test");
    await expect(page.getByText("Vérification en deux étapes")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(await blockingViolations(page)).toEqual([]);
    await shot(page, "auth-login-otp-390");

    const code = page.getByLabel("Code de vérification");
    await code.fill("000000");
    await page.getByRole("button", { name: "Vérifier et se connecter" }).click();
    await expect(page.getByText("Code invalide ou expiré.")).toBeVisible();

    await code.fill("123456");
    await page.getByRole("button", { name: "Vérifier et se connecter" }).click();
    await expect(page).toHaveURL(/\/vendor\/dashboard$/);
  });
});

test.describe("password recovery and first access", () => {
  test("e-mail, code, new password, then login", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);

    await page.getByLabel("Adresse e-mail").fill("inconnu@qa.test");
    await page.getByRole("button", { name: "Envoyer le code" }).click();
    await expect(page.getByText("Aucun compte avec cette adresse.")).toBeVisible();

    await page.getByLabel("Adresse e-mail").fill("vendeur@qa.test");
    await page.getByRole("button", { name: "Envoyer le code" }).click();
    await expect(page.getByText("Code envoyé")).toBeVisible();

    await page.getByLabel("Code de vérification").fill("999999");
    await page.getByLabel("Nouveau mot de passe").fill("NouveauPass1");
    await page.getByLabel("Confirmer le mot de passe").fill("NouveauPass1");
    await page.getByRole("button", { name: "Réinitialiser le mot de passe" }).click();
    await expect(page.locator("#code-error")).toHaveText("Code invalide ou expiré.");
    await shot(page, "auth-reset-code-error");

    await page.getByLabel("Code de vérification").fill("123456");
    await page.getByRole("button", { name: "Réinitialiser le mot de passe" }).click();
    await expect(page.getByText("Mot de passe modifié")).toBeVisible();
    await page.getByRole("link", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("first access needs no session and opens the space of the profile", async ({ page }) => {
    await page.goto("/reset-password/valid-token?email=agence%40qa.test");
    await expect(page).toHaveURL(/\/reset-password\/valid-token/);
    await page.getByLabel("Nouveau mot de passe").fill("NouveauPass1");
    await page.getByLabel("Confirmer le mot de passe").fill("NouveauPass1");
    await page.getByRole("button", { name: "Définir mon mot de passe" }).click();
    await expect(page).toHaveURL(/\/agency\/dashboard$/);
    await expect(page.locator('[data-shell="pro"][data-role="agency"]')).toBeVisible();
  });

  test("an expired or incomplete link says so", async ({ page }) => {
    await page.goto("/reset-password/expired-token?email=vendeur%40qa.test");
    await expect(page.getByText("Lien expiré ou invalide")).toBeVisible();
    await expect(page.getByLabel("Nouveau mot de passe")).toHaveCount(0);
    await shot(page, "auth-first-access-expired");

    await page.goto("/reset-password/valid-token");
    await expect(page.getByText("Lien incomplet")).toBeVisible();
    await page.getByRole("link", { name: "Demander un nouveau code" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });
});

test.describe("courier signup", () => {
  test("an unknown code is refused, a known one opens the identity step", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/signup/driver");
    await page.getByLabel("Code de recrutement").fill("inconnu1");
    await page.getByRole("button", { name: "Vérifier le code" }).click();
    await expect(page.getByText("Code de recrutement inconnu.")).toBeVisible();

    await page.getByLabel("Code de recrutement").fill("faso2026");
    await page.getByRole("button", { name: "Vérifier le code" }).click();
    await expect(page.getByRole("heading", { name: "Créer votre compte" })).toBeVisible();
    await expect(page.getByText("Agence : Faso Express")).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(0);
    await shot(page, "auth-courier-identity-390");
  });

  test("the pending screen cannot be used to enter the courier space", async ({ page }) => {
    await page.goto("/signup/driver?step=pending");
    await expect(page.getByRole("heading", { name: "Compte en attente de validation" })).toBeVisible();
    await expect(page.getByRole("link", { name: /livraisons/i })).toHaveCount(0);
    // Not signed in: asking for the status leads to login, not to the dashboard.
    await page.getByRole("button", { name: "Vérifier mon statut" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
