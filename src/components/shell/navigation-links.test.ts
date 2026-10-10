import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homePathFor } from "@/lib/auth/session-user";

const root = join(__dirname, "..", "..");
const read = (file: string) => readFileSync(join(root, "components", "shell", file), "utf8");

/** Does an App Router page exist for this pathname (route groups ignored)? */
function pageExists(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  const groups = ["(vendor)", "(agency)", "(driver)", "(marketing)", "(auth)", "(public)", ""];
  return groups.some((group) => existsSync(join(root, "app", group, ...segments, "page.tsx")));
}

describe("shell navigation targets", () => {
  it("every menu entry points to a page that exists", () => {
    const hrefs = new Set<string>();
    for (const file of ["sidebar.tsx", "bottom-tab-bar.tsx"]) {
      for (const match of read(file).matchAll(/href: "([^"]+)"/g)) hrefs.add(match[1]);
    }
    expect(hrefs.size).toBeGreaterThan(20);
    const missing = [...hrefs].filter((href) => !pageExists(href));
    expect(missing).toEqual([]);
  });

  it("the logo of each space leads to an existing dashboard", () => {
    for (const role of ["vendor", "agency", "courier"] as const) {
      expect(pageExists(homePathFor({ role, courier_status: null }))).toBe(true);
    }
    // The courier space lives under /driver, not /courier.
    expect(homePathFor({ role: "courier", courier_status: null })).toBe("/driver/dashboard");
    for (const file of ["sidebar.tsx", "topbar.tsx"]) {
      expect(read(file)).not.toContain("/${role}/dashboard");
    }
  });
});
