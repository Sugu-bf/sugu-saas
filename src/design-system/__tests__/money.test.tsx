import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Money,
  asCents,
  asFrancs,
  centsToFrancs,
  formatMoneyFromCents,
  formatMoneyFromFrancs,
  francsToCents,
} from "../money/money";

const NBSP = " ";
/** Readable expectations: write ordinary spaces, compare against no-break spaces. */
const nb = (text: string) => text.replace(/ /g, NBSP);

describe("money — 50 000 FCFA from each backend representation", () => {
  it("formats the centimes representation (5 000 000) as 50 000 FCFA", () => {
    expect(formatMoneyFromCents(5_000_000)).toBe(nb("50 000 FCFA"));
  });

  it("formats the francs representation (50 000) as 50 000 FCFA", () => {
    expect(formatMoneyFromFrancs(50_000)).toBe(nb("50 000 FCFA"));
  });

  it("makes a ×100 mistake visible rather than plausible", () => {
    // Feeding centimes to the francs formatter is the historical bug.
    expect(formatMoneyFromFrancs(5_000_000)).toBe(nb("5 000 000 FCFA"));
    expect(formatMoneyFromFrancs(5_000_000)).not.toBe(formatMoneyFromCents(5_000_000));
  });

  it("converts once, in a named direction", () => {
    expect(centsToFrancs(asCents(5_000_000))).toBe(50_000);
    expect(francsToCents(asFrancs(50_000))).toBe(5_000_000);
    expect(centsToFrancs(francsToCents(asFrancs(50_000)))).toBe(50_000);
  });
});

describe("money — edge cases", () => {
  it("shows zero as zero", () => {
    expect(formatMoneyFromCents(0)).toBe(nb("0 FCFA"));
    expect(formatMoneyFromFrancs(0)).toBe(nb("0 FCFA"));
  });

  it("never shows a missing amount as zero", () => {
    for (const missing of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(formatMoneyFromCents(missing)).toBe("—");
      expect(formatMoneyFromFrancs(missing)).toBe("—");
    }
    expect(formatMoneyFromFrancs(null, { fallback: "Non renseigné" })).toBe("Non renseigné");
  });

  it("formats negative amounts", () => {
    expect(formatMoneyFromCents(-1_250_000)).toBe(nb("-12 500 FCFA"));
    expect(formatMoneyFromFrancs(-500)).toBe(nb("-500 FCFA"));
  });

  it("formats large amounts with grouping", () => {
    expect(formatMoneyFromFrancs(1_234_567_890)).toBe(nb("1 234 567 890 FCFA"));
    expect(formatMoneyFromCents(123_456_789_000)).toBe(nb("1 234 567 890 FCFA"));
  });

  it("keeps residual centimes instead of rounding them away", () => {
    expect(formatMoneyFromCents(12_345)).toBe(nb("123,45 FCFA"));
    expect(formatMoneyFromCents(450_000)).toBe(nb("4 500 FCFA"));
  });

  it("supports the XOF label, no label and an explicit plus sign", () => {
    expect(formatMoneyFromFrancs(50_000, { currency: "XOF" })).toBe(nb("50 000 XOF"));
    expect(formatMoneyFromFrancs(50_000, { currency: false })).toBe(nb("50 000"));
    expect(formatMoneyFromFrancs(7_500, { showPlus: true })).toBe(nb("+7 500 FCFA"));
    expect(formatMoneyFromFrancs(0, { showPlus: true })).toBe(nb("0 FCFA"));
  });

  it("uses only no-break spaces, so an amount never wraps", () => {
    expect(formatMoneyFromFrancs(1_234_567)).not.toMatch(/[  ]/);
  });
});

describe("<Money />", () => {
  it("renders either unit with tabular figures", () => {
    render(
      <>
        <Money cents={5_000_000} />
        <Money francs={50_000} />
      </>,
    );
    // Testing Library normalises no-break spaces when matching text.
    const amounts = screen.getAllByText("50 000 FCFA");
    expect(amounts).toHaveLength(2);
    for (const amount of amounts) expect(amount).toHaveClass("tabular-nums", "whitespace-nowrap");
  });

  it("renders the fallback for a null amount in either unit", () => {
    render(
      <>
        <Money cents={null} />
        <Money francs={undefined} />
      </>,
    );
    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});
