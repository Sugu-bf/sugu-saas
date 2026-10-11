import { expect, type Page } from "@playwright/test";

// Shared by the orders specs: the sign-in of the QA vendor of the stand-in API.

const VENDOR = "vendeur@qa.test";
const PASSWORD = "Passw0rd!";

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

/** Signs the vendor in through the portal's own endpoint. */
export async function signIn(page: Page, baseURL: string | undefined) {
  const response = await overResetConnection(() => page.request.post("/api/auth/login", { data: { email: VENDOR, password: PASSWORD }, headers: { Origin: baseURL ?? "" } }));
  expect(response.ok(), `login: ${response.status()}`).toBe(true);
}
