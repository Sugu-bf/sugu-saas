import { describe, it, expect } from "vitest";
import { formatCentsToXof } from "./format-cents";

// fr-FR uses a narrow no-break space (U+202F) as the thousands separator and a
// comma as the decimal separator. We normalize spaces before asserting so the
// tests are robust to the exact whitespace codepoint Intl emits.
const norm = (s: string) => s.replace(/ | /g, " ");

describe("formatCentsToXof", () => {
  it("formats zero", () => {
    expect(norm(formatCentsToXof(0))).toBe("0 FCFA");
  });

  it("formats a round amount (multiple of 100 centimes)", () => {
    expect(norm(formatCentsToXof(450000))).toBe("4 500 FCFA");
  });

  it("formats a small round amount with no thousands separator", () => {
    expect(norm(formatCentsToXof(150000))).toBe("1 500 FCFA");
    expect(norm(formatCentsToXof(50000))).toBe("500 FCFA");
  });

  it("preserves residual centimes (not a multiple of 100)", () => {
    expect(norm(formatCentsToXof(12345))).toBe("123,45 FCFA");
    expect(norm(formatCentsToXof(99))).toBe("0,99 FCFA");
  });

  it("formats negative amounts with a minus sign", () => {
    expect(norm(formatCentsToXof(-500000))).toBe("-5 000 FCFA");
  });

  it("formats very large amounts", () => {
    expect(norm(formatCentsToXof(99999999999))).toBe("999 999 999,99 FCFA");
  });

  it("falls back to 0 for non-finite input instead of 'NaN FCFA'", () => {
    expect(norm(formatCentsToXof(Number.NaN))).toBe("0 FCFA");
    expect(norm(formatCentsToXof(Number.POSITIVE_INFINITY))).toBe("0 FCFA");
  });
});
