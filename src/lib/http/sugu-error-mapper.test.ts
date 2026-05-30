import { describe, it, expect } from "vitest";
import { mapSuguErrorMessage, mapSuguCodeToMessage, SUGU_MESSAGES } from "./sugu-error-mapper";
import { ApiError } from "./api-error";

const GENERIC = "Une erreur est survenue, veuillez réessayer.";

function apiError(message: string, status = 422): ApiError {
  return new ApiError({ message, status, code: `HTTP_${status}` });
}

describe("mapSuguErrorMessage", () => {
  it("maps SUGU-COD-MIXTE-FEES-UNPAID to its curated FR message", () => {
    const err = apiError(
      "SUGU-COD-MIXTE-FEES-UNPAID: Les frais ne sont pas payés (texte backend brut).",
    );
    expect(mapSuguErrorMessage(err)).toBe(
      SUGU_MESSAGES["SUGU-COD-MIXTE-FEES-UNPAID"],
    );
    expect(mapSuguErrorMessage(err)).not.toContain("SUGU-");
  });

  it("maps SUGU-DELIVERY-CODE-NOT-VERIFIED to its curated FR message", () => {
    const err = apiError("SUGU-DELIVERY-CODE-NOT-VERIFIED: code non vérifié", 403);
    expect(mapSuguErrorMessage(err)).toBe(
      SUGU_MESSAGES["SUGU-DELIVERY-CODE-NOT-VERIFIED"],
    );
  });

  it("tolerates missing space after the colon", () => {
    const err = apiError("SUGU-COD-MIXTE-FEES-UNPAID:Les frais...");
    expect(mapSuguErrorMessage(err)).toBe(
      SUGU_MESSAGES["SUGU-COD-MIXTE-FEES-UNPAID"],
    );
  });

  it("strips the prefix of an UNKNOWN SUGU code and shows the backend text", () => {
    const err = apiError("SUGU-SOMETHING-NEW: Le message lisible du backend.");
    const result = mapSuguErrorMessage(err);
    expect(result).toBe("Le message lisible du backend.");
    expect(result).not.toContain("SUGU-");
  });

  it("falls back generically when an unknown SUGU code has empty text", () => {
    const err = apiError("SUGU-EMPTY-CODE:   ");
    expect(mapSuguErrorMessage(err)).toBe(GENERIC);
  });

  it("returns a non-SUGU message as-is", () => {
    const err = apiError("Le paiement à la livraison est limité à 50 000 FCFA.");
    expect(mapSuguErrorMessage(err)).toBe(
      "Le paiement à la livraison est limité à 50 000 FCFA.",
    );
  });

  it("does not treat a mid-string SUGU mention as a prefix", () => {
    const err = apiError("Erreur interne liée à SUGU-COD-MIXTE-FEES-UNPAID survenue.");
    // No leading prefix → returned verbatim (still user-readable, no stripping).
    expect(mapSuguErrorMessage(err)).toBe(
      "Erreur interne liée à SUGU-COD-MIXTE-FEES-UNPAID survenue.",
    );
  });

  it("falls back when ApiError has an empty message", () => {
    expect(mapSuguErrorMessage(apiError(""))).toBe(GENERIC);
  });

  it("handles a plain Error", () => {
    expect(mapSuguErrorMessage(new Error("Boom"))).toBe("Boom");
  });

  it("handles a raw string with a known SUGU prefix", () => {
    expect(
      mapSuguErrorMessage("SUGU-COD-MIXTE-FEES-UNPAID: brut"),
    ).toBe(SUGU_MESSAGES["SUGU-COD-MIXTE-FEES-UNPAID"]);
  });

  it("handles undefined and null with the generic fallback", () => {
    expect(mapSuguErrorMessage(undefined)).toBe(GENERIC);
    expect(mapSuguErrorMessage(null)).toBe(GENERIC);
  });

  it("handles a plain object carrying a message", () => {
    expect(mapSuguErrorMessage({ message: "objet message" })).toBe("objet message");
  });

  it("handles a multi-line backend text after a known code", () => {
    const err = apiError("SUGU-DELIVERY-CODE-NOT-VERIFIED: ligne1\nligne2");
    expect(mapSuguErrorMessage(err)).toBe(
      SUGU_MESSAGES["SUGU-DELIVERY-CODE-NOT-VERIFIED"],
    );
  });
});

describe("mapSuguCodeToMessage — bare structured codes (bulk rejected[].reason)", () => {
  it("maps the two bulk reason codes to their curated FR messages", () => {
    expect(mapSuguCodeToMessage("SUGU-COD-MIXTE-FEES-UNPAID")).toBe(
      SUGU_MESSAGES["SUGU-COD-MIXTE-FEES-UNPAID"],
    );
    expect(mapSuguCodeToMessage("SUGU-DELIVERY-CODE-NOT-VERIFIED")).toBe(
      SUGU_MESSAGES["SUGU-DELIVERY-CODE-NOT-VERIFIED"],
    );
  });

  it("tolerates surrounding whitespace on the code", () => {
    expect(mapSuguCodeToMessage("  SUGU-COD-MIXTE-FEES-UNPAID  ")).toBe(
      SUGU_MESSAGES["SUGU-COD-MIXTE-FEES-UNPAID"],
    );
  });

  it("degrades an unknown code to the generic fallback (never the raw code)", () => {
    const r = mapSuguCodeToMessage("SUGU-FUTURE-CODE");
    expect(r).toBe(GENERIC);
    expect(r).not.toContain("SUGU-");
  });

  it("returns the generic fallback for null/undefined/empty", () => {
    expect(mapSuguCodeToMessage(null)).toBe(GENERIC);
    expect(mapSuguCodeToMessage(undefined)).toBe(GENERIC);
    expect(mapSuguCodeToMessage("")).toBe(GENERIC);
  });
});
