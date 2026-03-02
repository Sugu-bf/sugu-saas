import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("loads login page with form elements", async ({ page }) => {
    await page.goto("/login");

    // Title
    await expect(page).toHaveTitle(/Connexion/);

    // Form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /Se connecter/i })).toBeVisible();
  });

  test("shows validation errors for empty form", async ({ page }) => {
    await page.goto("/login");

    // Submit empty form
    await page.getByRole("button", { name: /Se connecter/i }).click();

    // Expect validation error messages
    await expect(page.locator("#email-error")).toBeVisible();
    await expect(page.locator("#password-error")).toBeVisible();
  });
});
