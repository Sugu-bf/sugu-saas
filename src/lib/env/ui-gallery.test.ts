import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";
import { isUiGalleryEnabled } from "./ui-gallery";

describe("design-system gallery gate", () => {
  it("is on outside production", () => {
    expect(isUiGalleryEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(isUiGalleryEnabled({ NODE_ENV: "test" })).toBe(true);
  });

  it("is off in production unless the server opts in explicitly", () => {
    expect(isUiGalleryEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(isUiGalleryEnabled({ NODE_ENV: "production", SUGU_UI_GALLERY: "0" })).toBe(false);
    expect(isUiGalleryEnabled({ NODE_ENV: "production", SUGU_UI_GALLERY: "true" })).toBe(false);
    expect(isUiGalleryEnabled({ NODE_ENV: "production", SUGU_UI_GALLERY: "1" })).toBe(true);
  });

  it("ignores a public variable: the switch is server-only", () => {
    expect(isUiGalleryEnabled({ NODE_ENV: "production", NEXT_PUBLIC_SUGU_UI_GALLERY: "1" })).toBe(false);
  });
});

describe("proxy — /dev/ui", () => {
  afterEach(() => vi.unstubAllEnvs());

  const run = (path: string) => proxy(new NextRequest(`http://localhost:3000${path}`));

  it("lets the gallery through without a session in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(run("/dev/ui").headers.get("location")).toBeNull();
  });

  it("answers 404 in production, with or without a session", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUGU_UI_GALLERY", "");
    expect(run("/dev/ui").status).toBe(404);
    expect(run("/dev").status).toBe(404);
    const withSession = proxy(
      new NextRequest("http://localhost:3000/dev/ui", { headers: { cookie: "sugu_session=abc" } }),
    );
    expect(withSession.status).toBe(404);
  });

  it("can be opened on a production build by the server-only switch", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUGU_UI_GALLERY", "1");
    const response = run("/dev/ui");
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not open anything else", () => {
    vi.stubEnv("NODE_ENV", "development");
    for (const path of ["/vendor/dashboard", "/developer", "/devtools/x"]) {
      expect(run(path).headers.get("location")).toContain("/login");
    }
  });
});
