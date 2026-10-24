import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// ============================================================
// No emoji in the interface: icons come from lucide-react. Characters that
// look like plain text in an editor (↗ ↘ ↔ ✔ ⚠) are drawn as emoji by
// phones, so they count too. © ® ™ stay text everywhere and are allowed.
// One exception, by decision: the wave of the seller dashboard greeting.
// ============================================================

const ROOT = join(__dirname, "..", "..");
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/gu;
const TEXT_SYMBOLS = new Set(["©", "®", "™"]);
const ALLOWED = [{ file: "features/vendor/dashboard/components/screen.tsx", char: "👋" }];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : sources(path);
    return /\.(ts|tsx|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("no emoji in the portal", () => {
  it("draws icons, never emoji, except the dashboard greeting", () => {
    const found: string[] = [];
    for (const path of sources(ROOT)) {
      const file = relative(ROOT, path).replaceAll("\\", "/");
      readFileSync(path, "utf8")
        .split("\n")
        .forEach((line, index) => {
          for (const [char] of line.matchAll(EMOJI)) {
            if (TEXT_SYMBOLS.has(char)) continue;
            if (ALLOWED.some((allowed) => allowed.file === file && allowed.char === char)) continue;
            found.push(`${file}:${index + 1} ${char}`);
          }
        });
    }

    expect(found).toEqual([]);
  });
});
