import { describe, it, expect } from "vitest";
import { checkProxyPath, clientAddressHeaders, downstreamHeaders, upstreamHeaders } from "./upstream";
import { checkSameOrigin } from "./same-origin";

describe("checkProxyPath — the relay is not an open proxy", () => {
  it("accepts API paths and rebuilds them segment by segment", () => {
    expect(checkProxyPath(["sellers", "orders", "01HXYZ"])).toEqual({ ok: true, path: "sellers/orders/01HXYZ" });
    expect(checkProxyPath(["agencies", "ag_1", "couriers", "c-2", "kyc-documents"])).toMatchObject({ ok: true });
  });

  it("refuses traversal, separators and absolute targets", () => {
    const bad = [
      [".."],
      ["sellers", "..", "admin"],
      ["sellers", "."],
      ["sellers", ""],
      ["sellers", "a/b"],
      ["sellers", "a\\b"],
      ["sellers", "%2e%2e"],
      ["sellers", "a%2fb"],
      ["https:", "", "evil.test"],
      ["sellers", "a b"],
      ["sellers", "a?b=c"],
      ["sellers", "a#b"],
    ];
    for (const segments of bad) expect(checkProxyPath(segments).ok).toBe(false);
    expect(checkProxyPath(undefined).ok).toBe(false);
    expect(checkProxyPath([]).ok).toBe(false);
  });

  it("refuses the endpoints that issue tokens, and the admin API", () => {
    for (const first of ["web-auth", "auth", "admin", "WEB-AUTH"]) {
      expect(checkProxyPath([first, "login"]).ok).toBe(false);
    }
  });
});

describe("header hygiene", () => {
  it("takes Authorization from the cookie only, never from the browser", () => {
    const incoming = new Headers({
      authorization: "Bearer attacker",
      cookie: "sugu_session=secret",
      "content-type": "application/json",
      "idempotency-key": "k1",
      host: "pro.sugu.pro",
      "x-evil": "1",
    });
    const out = upstreamHeaders(incoming, "real-token");
    expect(out.get("authorization")).toBe("Bearer real-token");
    expect(out.get("cookie")).toBeNull();
    expect(out.get("host")).toBeNull();
    expect(out.get("x-evil")).toBeNull();
    expect(out.get("idempotency-key")).toBe("k1");
    expect(upstreamHeaders(incoming, null).get("authorization")).toBeNull();
  });

  it("passes on the address the proxy in front of the portal wrote, and invents none", () => {
    const behind = new Headers({ "x-forwarded-for": "198.18.0.9, 41.203.64.10", "x-real-ip": "198.18.0.9", "cf-connecting-ip": "198.18.0.9", forwarded: "for=198.18.0.9" });
    // The whole chain, untouched: Laravel picks the entry its trusted proxies appended.
    expect(clientAddressHeaders(behind)).toEqual({ "x-forwarded-for": "198.18.0.9, 41.203.64.10" });
    expect(upstreamHeaders(behind, null).get("x-forwarded-for")).toBe("198.18.0.9, 41.203.64.10");
    // Headers a visitor can set and no proxy of ours writes are not relayed.
    expect(upstreamHeaders(behind, null).get("x-real-ip")).toBeNull();
    expect(upstreamHeaders(behind, null).get("cf-connecting-ip")).toBeNull();
    expect(upstreamHeaders(behind, null).get("forwarded")).toBeNull();
    expect(clientAddressHeaders(new Headers())).toEqual({});
  });

  it("never relays cookies, CORS or auth headers back, and forbids caching", () => {
    const out = downstreamHeaders(
      new Headers({
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="bon.pdf"',
        "set-cookie": "laravel_session=x",
        "access-control-allow-origin": "*",
        authorization: "Bearer leaked",
        "cache-control": "public, max-age=600",
      }),
    );
    expect(out.get("content-type")).toBe("application/pdf");
    expect(out.get("content-disposition")).toContain("bon.pdf");
    expect(out.get("set-cookie")).toBeNull();
    expect(out.get("access-control-allow-origin")).toBeNull();
    expect(out.get("authorization")).toBeNull();
    expect(out.get("cache-control")).toBe("private, no-store");
  });
});

describe("checkSameOrigin — CSRF", () => {
  const h = (init: Record<string, string>) => new Headers({ host: "pro.sugu.pro", ...init });

  it("accepts same-origin mutations", () => {
    expect(checkSameOrigin("POST", h({ "sec-fetch-site": "same-origin" })).ok).toBe(true);
    expect(checkSameOrigin("DELETE", h({ origin: "https://pro.sugu.pro" })).ok).toBe(true);
  });

  it("refuses cross-site and same-site-but-other-origin mutations", () => {
    expect(checkSameOrigin("POST", h({ "sec-fetch-site": "cross-site", origin: "https://pro.sugu.pro" })).ok).toBe(false);
    expect(checkSameOrigin("POST", h({ "sec-fetch-site": "same-site" })).ok).toBe(false);
    expect(checkSameOrigin("PUT", h({ origin: "https://evil.test" })).ok).toBe(false);
    expect(checkSameOrigin("POST", h({ origin: "https://pro.sugu.pro.evil.test" })).ok).toBe(false);
  });

  it("refuses a mutation that proves nothing about its origin", () => {
    expect(checkSameOrigin("POST", h({})).ok).toBe(false);
    expect(checkSameOrigin("PATCH", h({ origin: "null" })).ok).toBe(false);
  });

  it("lets reads and navigations through, but not cross-site scripted reads", () => {
    expect(checkSameOrigin("GET", h({})).ok).toBe(true);
    expect(checkSameOrigin("GET", h({ "sec-fetch-site": "cross-site", "sec-fetch-mode": "navigate" })).ok).toBe(true);
    expect(checkSameOrigin("GET", h({ "sec-fetch-site": "cross-site", "sec-fetch-mode": "cors" })).ok).toBe(false);
  });

  it("honours the forwarded host behind a reverse proxy", () => {
    const headers = new Headers({ host: "10.0.0.5:3000", "x-forwarded-host": "pro.sugu.pro", origin: "https://pro.sugu.pro" });
    expect(checkSameOrigin("POST", headers).ok).toBe(true);
  });
});
