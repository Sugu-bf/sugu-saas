import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "../tokens.css"), "utf8");
const globals = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!match) throw new Error(`Token --${name} not found or not a 6-digit hex colour`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const WHITE = "#ffffff";
const TONES = ["success", "warning", "danger", "info", "neutral"] as const;

describe("design tokens — WCAG AA contrast", () => {
  it.each([
    ["foreground on background", token("foreground"), token("background")],
    ["foreground on surface", token("foreground"), token("color-surface")],
    ["muted text on surface", token("color-foreground-muted"), token("color-surface")],
    ["muted text on subtle surface", token("color-foreground-muted"), token("color-surface-subtle")],
    ["muted text on background", token("color-foreground-muted"), token("background")],
    ["subtle text on surface", token("color-foreground-subtle"), token("color-surface")],
    ["subtle text on subtle surface", token("color-foreground-subtle"), token("color-surface-subtle")],
    ["white on primary", WHITE, token("color-primary")],
    ["white on primary hover", WHITE, token("color-primary-hover")],
    ["white on destructive", WHITE, token("color-danger-solid")],
    ["white on destructive hover", WHITE, token("color-danger-solid-hover")],
  ])("%s reaches 4.5:1", (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TONES)("%s status text reaches 4.5:1 on its own background", (tone) => {
    expect(contrast(token(`color-${tone}-fg`), token(`color-${tone}-bg`))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TONES)("%s status icon reaches 3:1 on its own background", (tone) => {
    expect(contrast(token(`color-${tone}-icon`), token(`color-${tone}-bg`))).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ["focus ring on surface", token("color-focus-ring"), token("color-surface")],
    ["focus ring on background", token("color-focus-ring"), token("background")],
    ["control border on surface", token("color-border-control"), token("color-surface")],
    ["brand accent on surface", token("color-brand"), token("color-surface")],
  ])("%s reaches 3:1 (non-text)", (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(3);
  });
});

describe("design tokens — structure", () => {
  it("keeps the SUGU orange as the brand colour", () => {
    expect(token("color-brand").toLowerCase()).toBe("#f15412");
  });

  it("uses a short radius scale", () => {
    expect(css).toMatch(/--radius-compact:\s*4px/);
    expect(css).toMatch(/--radius-control:\s*8px/);
    expect(css).toMatch(/--radius-panel:\s*12px/);
  });

  it("makes buttons fully rounded from a single token", () => {
    expect(css).toMatch(/--radius-button:\s*9999px/);
  });

  it("never sets a font size under 12px", () => {
    const sizes = [...css.matchAll(/--text-[a-z-]+:\s*([\d.]+)rem/g)].map((match) => Number(match[1]));
    expect(sizes.length).toBeGreaterThanOrEqual(6);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(0.75);
  });

  it("defines no dark-mode value", () => {
    expect(css).not.toMatch(/\.dark\b/);
  });
});

describe("design tokens — legacy compatibility", () => {
  it("leaves the legacy root variables untouched", () => {
    const root = globals.slice(globals.indexOf(":root {"), globals.indexOf(".dark {"));
    expect(root).toContain("--background: #f9f9fb");
    expect(root).toContain("--foreground: #0f172a");
    expect(root).toContain("--border: #e2e8f0");
  });

  it("re-points the shared names only inside the .sugu-ui scope", () => {
    const beforeScope = css.slice(0, css.indexOf(".sugu-ui {"));
    expect(beforeScope).not.toMatch(/--(background|foreground|border|ring|muted):/);
  });

  it("does not redefine a Tailwind default or legacy theme key", () => {
    const theme = css.slice(css.indexOf("@theme {"), css.indexOf("/* ── Structure tokens"));
    for (const name of [
      "--color-background:",
      "--color-foreground:",
      "--color-border:",
      "--color-muted:",
      "--color-muted-foreground:",
      "--color-ring:",
      "--color-sugu-",
      "--radius-sm:",
      "--radius-md:",
      "--radius-lg:",
      "--text-sm:",
      "--text-base:",
      "--shadow-sm:",
    ]) {
      expect(theme).not.toContain(name);
    }
  });
});
