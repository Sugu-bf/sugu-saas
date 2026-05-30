import { describe, it, expect, vi } from "vitest";

// orders-content pulls hooks → vendor service graph; isolate from env validation.
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_API_BASE_URL: "https://api.test/api/v1",
    NEXT_PUBLIC_APP_NAME: "SUGU",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_MARKETPLACE_URL: "https://sugu.pro",
    NEXT_PUBLIC_ENABLE_MSW: false,
    NEXT_PUBLIC_REVERB_APP_KEY: "k",
    NEXT_PUBLIC_REVERB_HOST: "localhost",
    NEXT_PUBLIC_REVERB_PORT: 8080,
    NEXT_PUBLIC_REVERB_SCHEME: "https",
  },
}));

import { orderListPaymentBadge, badgeDisplayLabel } from "./orders-content";

describe("orderListPaymentBadge — Mixte / Legacy / prepaid disambiguation", () => {
  it("returns a Mixte badge with the current flow step", () => {
    expect(
      orderListPaymentBadge({
        codFlowType: "mixte",
        isCod: true,
        codCurrentStep: "awaiting_vendor",
        paymentStatusCode: "cod_pending",
      }),
    ).toEqual({ variant: "mixte", label: "COD Mixte · Confirmation requise" });
  });

  it("returns a bare Mixte badge when no step is known", () => {
    expect(
      orderListPaymentBadge({
        codFlowType: "mixte",
        isCod: true,
        codCurrentStep: null,
        paymentStatusCode: "cod_pending",
      }),
    ).toEqual({ variant: "mixte", label: "COD Mixte" });
  });

  it("returns the cash-collection badge for Legacy COD", () => {
    expect(
      orderListPaymentBadge({
        codFlowType: "legacy",
        isCod: true,
        codCurrentStep: null,
        paymentStatusCode: "cod_pending",
      }),
    ).toEqual({ variant: "legacy", label: "COD · cash" });
  });

  it("returns the prepaid payment badge for a non-COD paid order", () => {
    expect(
      orderListPaymentBadge({
        codFlowType: "none",
        isCod: false,
        codCurrentStep: null,
        paymentStatusCode: "paid",
      }),
    ).toEqual({ variant: "payment", label: "Payé", tone: "success" });
  });

  it("returns null when a non-COD order has no payment status to show", () => {
    expect(
      orderListPaymentBadge({
        codFlowType: "none",
        isCod: false,
        codCurrentStep: null,
        paymentStatusCode: null,
      }),
    ).toBeNull();
  });
});

describe("badgeDisplayLabel — compact mobile label (Chantier 4)", () => {
  it("drops the Mixte flow step in compact mode (mobile)", () => {
    const mixte = { variant: "mixte", label: "COD Mixte · Confirmation requise" } as const;
    expect(badgeDisplayLabel(mixte, true)).toBe("COD Mixte");
    expect(badgeDisplayLabel(mixte, false)).toBe("COD Mixte · Confirmation requise");
  });

  it("leaves the Legacy label unchanged in compact mode", () => {
    const legacy = { variant: "legacy", label: "COD · cash" } as const;
    expect(badgeDisplayLabel(legacy, true)).toBe("COD · cash");
  });

  it("leaves the prepaid payment label unchanged in compact mode", () => {
    const payment = { variant: "payment", label: "Payé", tone: "success" } as const;
    expect(badgeDisplayLabel(payment, true)).toBe("Payé");
  });
});
