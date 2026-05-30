import { describe, it, expect } from "vitest";
import { mapPaymentStatusCode } from "./payment-status";

describe("mapPaymentStatusCode", () => {
  it("maps cod_pending to the cash-on-delivery label (warning)", () => {
    expect(mapPaymentStatusCode("cod_pending")).toEqual({
      label: "Paiement à la livraison",
      tone: "warning",
    });
  });

  it("maps paid (success)", () => {
    expect(mapPaymentStatusCode("paid")).toEqual({ label: "Payé", tone: "success" });
  });

  it("maps partial (warning)", () => {
    expect(mapPaymentStatusCode("partial")).toEqual({
      label: "Partiellement payé",
      tone: "warning",
    });
  });

  it("maps pending (warning)", () => {
    expect(mapPaymentStatusCode("pending")).toEqual({
      label: "En attente de paiement",
      tone: "warning",
    });
  });

  it("maps refunded (neutral)", () => {
    expect(mapPaymentStatusCode("refunded")).toEqual({ label: "Remboursé", tone: "neutral" });
  });

  it("maps failed (danger)", () => {
    expect(mapPaymentStatusCode("failed")).toEqual({
      label: "Paiement échoué",
      tone: "danger",
    });
  });

  it("maps hold (neutral)", () => {
    expect(mapPaymentStatusCode("hold")).toEqual({
      label: "En attente de validation",
      tone: "neutral",
    });
  });

  it("returns an empty label (no badge) for null/undefined", () => {
    expect(mapPaymentStatusCode(null)).toEqual({ label: "", tone: "neutral" });
    expect(mapPaymentStatusCode(undefined)).toEqual({ label: "", tone: "neutral" });
  });

  it("degrades an unknown code to a safe generic label (never the raw code)", () => {
    const r = mapPaymentStatusCode("some_future_code");
    expect(r.label).toBe("En attente de paiement");
    expect(r.tone).toBe("neutral");
    expect(r.label).not.toContain("some_future_code");
  });
});
