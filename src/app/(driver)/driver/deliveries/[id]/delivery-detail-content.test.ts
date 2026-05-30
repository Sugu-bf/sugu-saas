import { describe, it, expect, vi } from "vitest";

// The component module pulls hooks → service → env; isolate from env validation.
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

import { courierPaymentLabel } from "./delivery-detail-content";
import type { DriverCodMixte } from "@/features/driver/schema";

const mixte: DriverCodMixte = {
  isCodMixte: true,
  currentStep: "awaiting_product_payment",
  deliveryFeePaid: true,
  productFeePaid: false,
  deliveryFeeAmount: 150000,
  productFeeAmount: 450000,
  deliveryFeePaidAt: null,
  productFeePaidAt: null,
};

describe("courierPaymentLabel — Mixte / Legacy / non-COD disambiguation", () => {
  it("returns null for COD Mixte (the split-payment card is shown instead)", () => {
    expect(courierPaymentLabel({ orderPayment: "cod", codMixte: mixte })).toBeNull();
  });

  it("returns the cash-collection label for Legacy COD", () => {
    expect(courierPaymentLabel({ orderPayment: "cod", codMixte: null })).toBe(
      "COD · À encaisser cash",
    );
  });

  it("returns 'Payé' for a prepaid (non-COD) order", () => {
    expect(courierPaymentLabel({ orderPayment: "paid", codMixte: null })).toBe("Payé");
  });

  it("treats a codMixte block with isCodMixte=false like its plain payment", () => {
    const notMixte: DriverCodMixte = { ...mixte, isCodMixte: false };
    expect(courierPaymentLabel({ orderPayment: "cod", codMixte: notMixte })).toBe(
      "COD · À encaisser cash",
    );
  });
});
