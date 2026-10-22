import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homePathFor } from "@/lib/auth/session-user";
import type { User, UserRole } from "@/types";
import {
  MOBILE_TAB_COUNT,
  WORKSPACES,
  findActiveItem,
  flattenItems,
  getWorkspace,
  isImmersiveRoute,
  mobileMenuGroups,
  mobileTabs,
  shellContextFor,
  userMenuItems,
  visibleGroups,
  workspaceName,
  type WorkspaceNavigation,
} from "../navigation";

const src = join(__dirname, "..", "..", "..");
const ROLES: UserRole[] = ["vendor", "agency", "courier", "lanabaga"];
const PREFIX: Record<UserRole, string> = { vendor: "/vendor/", agency: "/agency/", courier: "/driver/", lanabaga: "/lanabaga/" };
/** An admitted Lanabaga who can act: their home is the dashboard. */
const ADMITTED = { profile_id: "p1", public_code: "LNB-7K2Q9M", application_status: "approved", account_status: "active", can_work: true };

/** Does an App Router page exist for this pathname (route groups ignored)? */
function pageExists(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  const groups = ["(vendor)", "(agency)", "(driver)", "(lanabaga)", "(marketing)", "(auth)", "(public)", ""];
  return groups.some((group) => existsSync(join(src, "app", group, ...segments, "page.tsx")));
}

const user = (role: UserRole, extra: Partial<User> = {}): User => ({
  id: 1,
  name: "Awa Traoré",
  email: "awa@example.com",
  role,
  avatar_url: null,
  email_verified_at: null,
  created_at: "2026-01-01T00:00:00Z",
  delivery_partner_id: null,
  business_name: null,
  store_id: null,
  courier_status: null,
  ...extra,
});

const hrefs = (workspace: WorkspaceNavigation) => flattenItems(workspace.groups).map((item) => item.href);

describe("navigation config", () => {
  it("has unique ids across all roles", () => {
    const ids = ROLES.flatMap((role) => flattenItems(WORKSPACES[role].groups).map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("points every entry to a page that exists", () => {
    const all = ROLES.flatMap((role) => hrefs(WORKSPACES[role]));
    expect(all.length).toBeGreaterThan(25);
    expect(all.filter((href) => !pageExists(href))).toEqual([]);
  });

  it.each(ROLES)("keeps the %s space to its own routes", (role) => {
    const workspace = WORKSPACES[role];
    const internal = flattenItems(workspace.groups).filter((item) => !item.external);
    expect(internal.filter((item) => !item.href.startsWith(PREFIX[role]))).toEqual([]);
    expect(workspace.home).toBe(homePathFor({ role, courier_status: null, lanaya: role === "lanabaga" ? ADMITTED : null }));
    expect(pageExists(workspace.home)).toBe(true);
  });

  it("carries every destination of the previous sidebar and tab bar", () => {
    const legacy = new Set<string>();
    for (const file of ["sidebar.tsx", "bottom-tab-bar.tsx"]) {
      const source = readFileSync(join(src, "components", "shell", file), "utf8");
      for (const match of source.matchAll(/href: "([^"]+)"/g)) legacy.add(match[1]);
    }
    const current = new Set(ROLES.flatMap((role) => hrefs(WORKSPACES[role])));
    expect([...legacy].filter((href) => !current.has(href))).toEqual([]);
  });

  it("returns nothing for a role that is not a pro role", () => {
    expect(getWorkspace("vendor")?.role).toBe("vendor");
    for (const role of ["admin", "buyer", "", "toString", "constructor", undefined, null, 3]) {
      expect(getWorkspace(role)).toBeNull();
    }
  });
});

describe("phone navigation is derived from the same config", () => {
  it.each(ROLES)("%s: every entry is either a tab or in the menu", (role) => {
    const groups = WORKSPACES[role].groups;
    const tabs = mobileTabs(groups);
    const menu = flattenItems(mobileMenuGroups(groups));
    expect(tabs.length).toBeGreaterThan(0);
    expect(tabs.length).toBeLessThanOrEqual(MOBILE_TAB_COUNT);
    const reachable = [...tabs, ...menu].map((item) => item.id).sort();
    expect(reachable).toEqual(flattenItems(groups).map((item) => item.id).sort());
    // No entry twice.
    expect(new Set(reachable).size).toBe(reachable.length);
  });

  it("orders the tabs by priority, home first", () => {
    for (const role of ROLES) {
      const tabs = mobileTabs(WORKSPACES[role].groups);
      expect(tabs[0].href).toBe(WORKSPACES[role].home);
      const ranks = tabs.map((tab) => tab.mobilePriority ?? 0);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }
  });

  it("keeps the sections that used to be unreachable on phones", () => {
    const reachable = (role: UserRole) => {
      const groups = WORKSPACES[role].groups;
      return [...mobileTabs(groups), ...flattenItems(mobileMenuGroups(groups))].map((item) => item.href);
    };
    expect(reachable("vendor")).toEqual(
      expect.arrayContaining([
        "/vendor/wallet",
        "/vendor/sugubox",
        "/vendor/sugubox/stock",
        "/vendor/sugubox/inbound",
        "/vendor/sugubox/outbound",
        "/vendor/sugubox/movements",
        "/vendor/settings",
        "/vendor/tickets",
        "/faq",
      ]),
    );
    expect(reachable("agency")).toEqual(expect.arrayContaining(["/agency/earnings", "/agency/settings"]));
    expect(reachable("courier")).toEqual(
      expect.arrayContaining(["/driver/history", "/driver/earnings", "/driver/messages", "/driver/settings"]),
    );
  });

  it("hides the tab bar on chat screens only", () => {
    expect(isImmersiveRoute(WORKSPACES.vendor, "/vendor/messages/42")).toBe(true);
    expect(isImmersiveRoute(WORKSPACES.vendor, "/vendor/messages")).toBe(false);
    expect(isImmersiveRoute(WORKSPACES.courier, "/driver/messages/abc")).toBe(true);
    expect(isImmersiveRoute(WORKSPACES.agency, "/agency/deliveries/7")).toBe(false);
  });
});

describe("active entry", () => {
  const { groups } = WORKSPACES.vendor;

  it("matches the exact page", () => {
    expect(findActiveItem(groups, "/vendor/orders")?.id).toBe("vendor-orders");
  });

  it("lights the list on detail and edit pages", () => {
    expect(findActiveItem(groups, "/vendor/orders/42")?.id).toBe("vendor-orders");
    expect(findActiveItem(groups, "/vendor/products/9/edit")?.id).toBe("vendor-products");
    expect(findActiveItem(groups, "/vendor/wallet/withdraw")?.id).toBe("vendor-wallet");
  });

  it("picks the longest match, never two entries", () => {
    expect(findActiveItem(groups, "/vendor/sugubox")?.id).toBe("vendor-sugubox-overview");
    expect(findActiveItem(groups, "/vendor/sugubox/stock")?.id).toBe("vendor-sugubox-stock");
    expect(findActiveItem(groups, "/vendor/sugubox/inbound/3")?.id).toBe("vendor-sugubox-inbound");
  });

  it("does not match on a shared prefix or outside the space", () => {
    expect(findActiveItem(groups, "/vendor/orders-archive")).toBeNull();
    expect(findActiveItem(groups, "/agency/dashboard")).toBeNull();
    expect(findActiveItem(groups, "/faq")).toBeNull();
  });

  it("describes the location for the topbar", () => {
    expect(shellContextFor(groups, "/vendor/wallet")).toEqual({ group: "Activité", page: "Finances", parentHref: null });
    expect(shellContextFor(groups, "/vendor/orders/42")).toEqual({ group: null, page: "Commandes", parentHref: "/vendor/orders" });
    expect(shellContextFor(groups, "/vendor/unknown")).toEqual({ group: null, page: null, parentHref: null });
  });
});

describe("visibility and identity", () => {
  it("drops entries whose condition fails, and empty groups with them", () => {
    const workspace: WorkspaceNavigation = {
      ...WORKSPACES.agency,
      groups: WORKSPACES.agency.groups.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.id === "agency-settings" ? { ...item, visible: (u: User) => u.business_name === "Owner" } : item,
        ),
      })),
    };
    const seen = (u: User | null) => flattenItems(visibleGroups(workspace, u)).map((item) => item.id);
    expect(seen(user("agency", { business_name: "Owner" }))).toContain("agency-settings");
    expect(seen(user("agency"))).not.toContain("agency-settings");
    // No session yet: a conditional entry is hidden, never shown by default.
    expect(seen(null)).not.toContain("agency-settings");
    expect(visibleGroups(workspace, user("agency")).some((group) => group.id === "agency-account")).toBe(false);
  });

  it("declares no frontend-invented permission: only what the session says of a courier, and of a seller in the programme", () => {
    expect(flattenItems(WORKSPACES.agency.groups).filter((item) => item.visible)).toEqual([]);
    // « Lanaya » follows `lanaya_seller.linked`, which the server computes and enforces (DEC-38).
    expect(flattenItems(WORKSPACES.vendor.groups).filter((item) => item.visible).map((item) => item.id)).toEqual(["vendor-lanaya"]);
    const sellerSees = (extra: Partial<User>) => flattenItems(visibleGroups(WORKSPACES.vendor, user("vendor", extra))).map((item) => item.id);
    expect(sellerSees({})).not.toContain("vendor-lanaya");
    expect(sellerSees({ lanaya_seller: true })).toContain("vendor-lanaya");
    // The mission entries follow `courier_operational`, which the server
    // enforces on its own (courier.operational); the file is offered instead.
    const conditional = flattenItems(WORKSPACES.courier.groups).filter((item) => item.visible).map((item) => item.id);
    expect(conditional).toEqual(["courier-dashboard", "courier-deliveries", "courier-file", "courier-documents"]);

    const seen = (extra: Partial<User>) => flattenItems(visibleGroups(WORKSPACES.courier, user("courier", extra))).map((item) => item.id);
    expect(seen({ courier_status: 1, courier_operational: true })).toEqual(expect.arrayContaining(["courier-dashboard", "courier-deliveries", "courier-documents"]));
    expect(seen({ courier_status: 1, courier_operational: true })).not.toContain("courier-file");
    expect(seen({ courier_status: 4, courier_operational: false })).toEqual(["courier-file", "courier-earnings", "courier-history", "courier-profile", "courier-messages", "courier-settings", "courier-help"]);
  });

  it("gives the courier the four tabs of their mock-ups", () => {
    const tabs = (extra: Partial<User>) => mobileTabs(visibleGroups(WORKSPACES.courier, user("courier", extra))).map((item) => item.shortLabel ?? item.label);
    expect(tabs({ courier_status: 1, courier_operational: true })).toEqual(["Accueil", "Missions", "Gains", "Profil"]);
    expect(tabs({ courier_status: 4, courier_operational: false })).toEqual(["Dossier", "Gains", "Profil"]);
  });

  it("offers real destinations in the user menu", () => {
    expect(userMenuItems(WORKSPACES.vendor.groups).map((item) => item.href)).toEqual([
      "/vendor/settings",
      "/vendor/tickets",
      "/faq",
    ]);
    expect(userMenuItems(WORKSPACES.courier.groups).map((item) => item.href)).toEqual(["/driver/profile", "/driver/settings", "/faq"]);
  });

  it("names the space from the session, with a neutral fallback", () => {
    expect(workspaceName(WORKSPACES.vendor, user("vendor", { business_name: "Chez Awa" }))).toBe("Chez Awa");
    expect(workspaceName(WORKSPACES.vendor, user("vendor"))).toBe("Ma boutique");
    expect(workspaceName(WORKSPACES.courier, user("courier"))).toBe("Awa Traoré");
    expect(workspaceName(WORKSPACES.agency, null)).toBe("Mon agence");
  });
});
