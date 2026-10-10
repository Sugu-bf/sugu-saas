import { describe, it, expect, beforeEach } from "vitest";
import { ApiError } from "@/lib/http/api-error";
import { expiredLoginUrl, handleSessionExpired, resetSessionExpiryForTests } from "./session-expiry";

const apiError = (status: number) => new ApiError({ message: "x", status });

function harness(pathname: string, search = "", clearFails = false) {
  const assigned: string[] = [];
  let cleared = 0;
  return {
    assigned,
    cleared: () => cleared,
    deps: {
      location: { pathname, search, assign: (url: string | URL) => void assigned.push(String(url)) },
      clearSession: () => {
        cleared += 1;
        return clearFails ? Promise.reject(new Error("offline")) : Promise.resolve();
      },
    },
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("expired session handling", () => {
  beforeEach(() => resetSessionExpiryForTests());

  it("clears the session and returns to login with the destination on 401", async () => {
    const h = harness("/vendor/orders", "?page=2");
    expect(handleSessionExpired(apiError(401), h.deps)).toBe(true);
    await flush();
    expect(h.cleared()).toBe(1);
    expect(h.assigned).toEqual([`/login?reason=expired&redirect=${encodeURIComponent("/vendor/orders?page=2")}`]);
  });

  it("still redirects when clearing the session fails", async () => {
    const h = harness("/driver/deliveries", "", true);
    handleSessionExpired(apiError(401), h.deps);
    await flush();
    expect(h.assigned).toHaveLength(1);
  });

  it("does not log out on a 403 or on other errors", async () => {
    const h = harness("/agency/earnings");
    for (const error of [apiError(403), apiError(422), apiError(500), apiError(0), new Error("boom")]) {
      expect(handleSessionExpired(error, h.deps)).toBe(false);
    }
    await flush();
    expect(h.cleared()).toBe(0);
    expect(h.assigned).toEqual([]);
  });

  it("redirects once for a burst of 401s", async () => {
    const h = harness("/vendor/dashboard");
    expect(handleSessionExpired(apiError(401), h.deps)).toBe(true);
    expect(handleSessionExpired(apiError(401), h.deps)).toBe(false);
    await flush();
    expect(h.assigned).toHaveLength(1);
  });

  it("never loops on the auth pages", async () => {
    for (const path of ["/login", "/forgot-password", "/reset-password/tok", "/signup/driver"]) {
      resetSessionExpiryForTests();
      const h = harness(path);
      expect(handleSessionExpired(apiError(401), h.deps)).toBe(false);
      await flush();
      expect(h.assigned).toEqual([]);
    }
  });

  it("builds a login URL without a redirect for auth paths", () => {
    expect(expiredLoginUrl("/login")).toBe("/login?reason=expired");
    expect(expiredLoginUrl("/vendor/wallet")).toBe("/login?reason=expired&redirect=%2Fvendor%2Fwallet");
  });
});
