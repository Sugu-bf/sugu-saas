import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { isPublicPath, proxy } from "./proxy";

function run(path: string, cookie?: string) {
  const req = new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
  return proxy(req);
}

describe("proxy — public paths", () => {
  it("lets the first-access link through without a session", () => {
    expect(isPublicPath("/reset-password/abc123")).toBe(true);
    const res = run("/reset-password/abc123?email=a%40b.test");
    expect(res.headers.get("location")).toBeNull();
  });

  it("does not widen the public surface beyond one token segment", () => {
    expect(isPublicPath("/reset-password/abc/extra")).toBe(false);
    expect(isPublicPath("/reset-passwordx/abc")).toBe(false);
  });

  it("still protects dashboards and keeps the destination", () => {
    for (const path of ["/vendor/dashboard", "/agency/deliveries", "/driver/deliveries"]) {
      expect(isPublicPath(path)).toBe(false);
      const location = run(path).headers.get("location");
      expect(location).toContain("/login");
      expect(location).toContain(`redirect=${encodeURIComponent(path)}`);
    }
  });

  it("no longer accepts the old script-readable cookie as a session", () => {
    expect(run("/vendor/dashboard", "sugu_token=x").headers.get("location")).toContain("/login");
  });

  it("lets a request with a session cookie through", () => {
    expect(run("/vendor/dashboard", "sugu_session=x").headers.get("location")).toBeNull();
  });
});
