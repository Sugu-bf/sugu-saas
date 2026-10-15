import { expect, test, type Page } from "@playwright/test";
import { closeSync, openSync, readdirSync, readSync, statSync } from "node:fs";
import { join } from "node:path";

// The login verification by e-mail, end to end, on a LOCAL stack only: turned
// on from the settings (password, then the code received), asked at the next
// sign-in, then turned off with the password (V10: the relay dropped the body
// of that DELETE, and Laravel answered 422).
//
// The code is read where a local Laravel with MAIL_MAILER=log writes its
// mail: its log directory. On a deployed backend the code would go to a real
// mailbox: these checks skip there.
//
//   STAGING_URL=http://localhost:3240
//   STAGING_AGENCY_PASSWORD=…                 the QA password
//   STAGING_MAIL_LOG_DIR=…/sugu/storage/logs  where the local Laravel logs its mail
//   STAGING_ALLOW_MUTATIONS=1
//
// Account: qa-vendeur-c@qa.sugu.test (QaDashboardSeeder). It ends as it began:
// the verification is off.
const env = process.env;
const password = env.STAGING_AGENCY_PASSWORD ?? "";
const LOG_DIR = env.STAGING_MAIL_LOG_DIR ?? "";
const LOCAL = /^https?:\/\/localhost(:|\/|$)/.test(env.STAGING_URL ?? "");
const ACCOUNT = "qa-vendeur-c@qa.sugu.test";

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);
test.beforeEach(() => {
  test.skip(!LOCAL, "local stack only: the code is read from the local Laravel's mail log");
  test.skip(!password || !LOG_DIR, "STAGING_AGENCY_PASSWORD and STAGING_MAIL_LOG_DIR are required");
  test.skip(env.STAGING_ALLOW_MUTATIONS !== "1", "STAGING_ALLOW_MUTATIONS=1 is required");
});

/** The end of a log file: a local log can weigh hundreds of megabytes. */
function tail(path: string, bytes = 4 * 1024 * 1024): string {
  const size = statSync(path).size;
  const fd = openSync(path, "r");
  const buffer = Buffer.alloc(Math.min(bytes, size));
  readSync(fd, buffer, 0, buffer.length, size - buffer.length);
  closeSync(fd);
  return buffer.toString("utf8");
}

/** The last code mailed to the account in the newest log files, or "". */
function lastMailedCode(): string {
  let found = "";
  const files = readdirSync(LOG_DIR)
    .filter((f) => f.endsWith(".log"))
    .map((f) => join(LOG_DIR, f))
    .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs)
    .slice(-3);
  for (const path of files) {
    const text = tail(path);
    // "To: qa-vendeur-c@…" or "To: Name <qa-vendeur-c@…>": the last mail to the account.
    const headers = [...text.matchAll(/^To: .*$/gm)].filter((m) => m[0].includes(ACCOUNT));
    if (headers.length === 0) continue;
    const last = headers[headers.length - 1].index ?? 0;
    const mail = text.slice(last, last + 20_000);
    // The code sits in <div class='code'>: the mail also holds CSS colours of six digits.
    const code = /class=(?:3D)?['"]code['"]>\s*(\d{4,8})\s*</.exec(mail.replace(/=\r?\n/g, ""));
    if (code) found = code[1];
  }
  return found;
}

/**
 * The code mailed for the action just made: a code other than `before`, the
 * last one seen before the action. Laravel mails no new code while an unused
 * one is still valid: after a while without a new mail, the last one is it.
 */
async function mailedCode(before: string): Promise<string> {
  const deadline = Date.now() + 20_000;
  await expect
    .poll(() => {
      const code = lastMailedCode();
      return code !== "" && (code !== before || Date.now() > deadline);
    }, { timeout: 60_000, message: "a code is mailed to the account" })
    .toBe(true);
  return lastMailedCode();
}

async function signIn(page: Page): Promise<"in" | "code"> {
  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill(ACCOUNT);
  await page.getByLabel("Mot de passe", { exact: false }).first().fill(password);
  await page.getByRole("button", { name: /Se connecter/ }).click();
  const outcome = await Promise.race([
    page.waitForURL(/\/vendor\//, { timeout: 60_000 }).then(() => "in" as const),
    page.getByLabel("Code de vérification").waitFor({ timeout: 60_000 }).then(() => "code" as const),
  ]);
  return outcome;
}

async function securitySection(page: Page) {
  await page.goto("/vendor/settings?section=security");
  await expect(page.getByText("Vérification en deux étapes").first()).toBeVisible({ timeout: 30_000 });
}

test("V1 turned on from the settings: the password, then the code received by e-mail", async ({ page }) => {
  expect(await signIn(page)).toBe("in");
  await securitySection(page);
  await page.getByRole("button", { name: "Activer" }).click();
  await page.getByRole("dialog").getByRole("textbox", { name: /^Mot de passe/ }).fill(password);
  const before = lastMailedCode();
  await page.getByRole("dialog").getByRole("button", { name: "Recevoir le code" }).click();
  const code = await mailedCode(before);
  await page.getByRole("dialog").getByRole("textbox", { name: /^Code reçu par e-mail/ }).fill(code);
  await page.getByRole("dialog").getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByText("Vérification en deux étapes activée.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Désactiver" })).toBeVisible();
});

test("V2 the next sign-in asks for a code sent by e-mail; V3 in that session, turned off with the password (the body of the DELETE reaches Laravel), and the sign-in asks for nothing", async ({ page }) => {
  // One session for both: Laravel mails no new sign-in code for a while
  // after the last one, so signing in again at once would wait for nothing.
  const before = lastMailedCode();
  expect(await signIn(page)).toBe("code");
  const code = await mailedCode(before);
  await page.getByLabel("Code de vérification").fill(code);
  await page.getByRole("button", { name: /Vérifier et se connecter/ }).click();
  await page.waitForURL(/\/vendor\//, { timeout: 60_000 });

  await securitySection(page);
  await page.getByRole("button", { name: "Désactiver" }).click();
  await page.getByRole("dialog").getByRole("textbox", { name: /^Mot de passe/ }).fill(password);
  const answered = page.waitForResponse((r) => r.url().includes("account/security/login-verification") && r.request().method() === "DELETE");
  await page.getByRole("dialog").getByRole("button", { name: "Désactiver" }).click();
  expect((await answered).status(), "Laravel received the password").toBe(200);
  await expect(page.getByText("Vérification en deux étapes désactivée.")).toBeVisible();

  await page.context().clearCookies();
  expect(await signIn(page)).toBe("in");
});
