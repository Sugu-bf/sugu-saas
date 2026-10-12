import { describe, it, expect } from "vitest";
import { homePathFor, mapRole, postLoginPath, sessionMaxAge, toSessionUser, courierCanWork, isOpenToEveryCourier } from "./session-user";

describe("mapRole", () => {
  it("maps the backend user types of the pro portal", () => {
    expect(mapRole({ user_type: "seller" })).toBe("vendor");
    expect(mapRole({ user_type: "both" })).toBe("vendor");
    expect(mapRole({ user_type: "delivery_partner" })).toBe("agency");
    expect(mapRole({ user_type: "courier" })).toBe("courier");
  });

  it("falls back to roles, then to business entities", () => {
    expect(mapRole({ roles: ["courier"] })).toBe("courier");
    expect(mapRole({ roles: ["delivery_partner"] })).toBe("agency");
    expect(mapRole({ roles: ["seller"] })).toBe("vendor");
    expect(mapRole({ agency: { id: "a" } })).toBe("agency");
    expect(mapRole({ store: { id: "s" } })).toBe("vendor");
  });

  it("never turns an unknown profile into a vendor", () => {
    expect(mapRole({ user_type: "buyer", roles: ["buyer"], can_sell: false })).toBeNull();
    expect(mapRole({ user_type: "something_new" })).toBeNull();
    expect(mapRole({ roles: ["admin"] })).toBeNull();
    expect(mapRole({})).toBeNull();
    expect(toSessionUser({ id: 1, name: "B", email: "b@x.test", user_type: "buyer" })).toBeNull();
  });
});

describe("toSessionUser", () => {
  it("builds a vendor with its store", () => {
    const user = toSessionUser({
      id: "u1",
      name: "Awa",
      email: "awa@x.test",
      user_type: "seller",
      email_verified: true,
      created_at: "2026-01-01T00:00:00Z",
      store: { id: 42, name: "Boutique", logo_url: "l.png" },
    });
    expect(user).toMatchObject({
      role: "vendor",
      store_id: "42",
      business_name: "Boutique",
      avatar_url: "l.png",
      delivery_partner_id: null,
      courier_status: null,
    });
  });

  it("keeps the courier status and the agency of the courier", () => {
    const user = toSessionUser({
      id: "u2",
      name: "Issa",
      email: "i@x.test",
      user_type: "courier",
      courier: { id: "c1", status: 4, delivery_partner: { id: "ag9", name: "Express" } },
    });
    expect(user).toMatchObject({ role: "courier", courier_status: 4, delivery_partner_id: "ag9" });
  });

  it("builds an agency owner", () => {
    const user = toSessionUser({
      id: "u3",
      name: "M",
      email: "m@x.test",
      user_type: "delivery_partner",
      agency: { id: "ag1", name: "Express Ouaga" },
    });
    expect(user).toMatchObject({ role: "agency", delivery_partner_id: "ag1", business_name: "Express Ouaga" });
  });
});

describe("post-login destination", () => {
  const vendor = { role: "vendor" as const, courier_status: null };
  const courier = { role: "courier" as const, courier_status: 1 };

  it("sends each role home", () => {
    expect(homePathFor(vendor)).toBe("/vendor/dashboard");
    expect(homePathFor({ role: "agency", courier_status: null })).toBe("/agency/dashboard");
    expect(homePathFor(courier)).toBe("/driver/dashboard");
    // A courier who cannot work yet lands on their file, where it is completed.
    expect(homePathFor({ role: "courier", courier_status: 4 })).toBe("/driver/documents");
    expect(homePathFor({ role: "courier", courier_status: 2, courier_operational: false })).toBe("/driver/documents");
    expect(homePathFor({ role: "courier", courier_status: 1, courier_operational: true })).toBe("/driver/dashboard");
  });

  it("reads whether a courier can work from the server, and falls back on the status", () => {
    expect(courierCanWork({ role: "courier", courier_status: 1, courier_operational: true })).toBe(true);
    // Active on paper, suspended for a while: the server says no.
    expect(courierCanWork({ role: "courier", courier_status: 1, courier_operational: false })).toBe(false);
    // A backend that does not say it yet: everybody but a pending file, as before.
    expect(courierCanWork({ role: "courier", courier_status: 1 })).toBe(true);
    expect(courierCanWork({ role: "courier", courier_status: 4, courier_operational: null })).toBe(false);
    expect(courierCanWork({ role: "vendor", courier_status: null })).toBe(false);
  });

  it("keeps the file, the profile and the past open to a courier who cannot work", () => {
    for (const path of ["/driver/documents", "/driver/documents/new", "/driver/profile", "/driver/settings", "/driver/history", "/driver/earnings/withdraw", "/driver/messages/42"]) {
      expect(isOpenToEveryCourier(path)).toBe(true);
    }
    for (const path of ["/driver/dashboard", "/driver/deliveries", "/driver/deliveries/01h", "/driver/documentsx"]) {
      expect(isOpenToEveryCourier(path)).toBe(false);
    }
  });

  it("honours a redirect inside the space of the user", () => {
    expect(postLoginPath(vendor, "/vendor/orders/123")).toBe("/vendor/orders/123");
    expect(postLoginPath(courier, "/driver/deliveries")).toBe("/driver/deliveries");
  });

  it("ignores external, cross-role and malformed redirects", () => {
    const bad = ["https://evil.test", "//evil.test", "/\\evil.test", "/agency/dashboard", "/login", "vendor/orders", "", null];
    for (const redirect of bad) {
      expect(postLoginPath(vendor, redirect)).toBe("/vendor/dashboard");
    }
  });

  it("sends a courier who cannot work to their file, whatever mission page was asked for", () => {
    const pending = { role: "courier" as const, courier_status: 4 };
    expect(postLoginPath(pending, "/driver/deliveries")).toBe("/driver/documents");
    expect(postLoginPath(pending, "/driver/dashboard")).toBe("/driver/documents");
    // What stays open to them is honoured.
    expect(postLoginPath(pending, "/driver/documents/new?type=id_card")).toBe("/driver/documents/new?type=id_card");
    expect(postLoginPath(pending, "/driver/history")).toBe("/driver/history");
  });
});

describe("sessionMaxAge", () => {
  const now = Date.parse("2026-10-10T00:00:00Z");
  const sevenDays = 604800;

  it("never outlives the token", () => {
    expect(sessionMaxAge("2026-10-10T01:00:00Z", now)).toBe(3600);
    expect(sessionMaxAge("2026-10-09T00:00:00Z", now)).toBe(0);
  });

  it("is capped at 7 days and falls back to it without a usable expiry", () => {
    expect(sessionMaxAge("2027-01-01T00:00:00Z", now)).toBe(sevenDays);
    expect(sessionMaxAge(undefined, now)).toBe(sevenDays);
    expect(sessionMaxAge("not-a-date", now)).toBe(sevenDays);
  });
});
