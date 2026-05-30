import { describe, it, expect, vi } from "vitest";

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

import { courierPanelPaymentLabel } from "./detail-panel";
import type { DriverCodMixte } from "@/features/driver/schema";

const mixte: DriverCodMixte = {
  isCodMixte: true,
  currentStep: "awaiting_delivery_payment",
  deliveryFeePaid: false,
  productFeePaid: false,
  deliveryFeeAmount: 200000,
  productFeeAmount: 300000,
  deliveryFeePaidAt: null,
  productFeePaidAt: null,
};

describe("courierPanelPaymentLabel — Mixte / Legacy / prepaid", () => {
  it("returns 'COD Mixte' for a Mixte order", () => {
    expect(courierPanelPaymentLabel({ orderPayment: "cod", codMixte: mixte })).toBe("COD Mixte");
  });

  it("returns the cash-collection label for Legacy COD", () => {
    expect(courierPanelPaymentLabel({ orderPayment: "cod", codMixte: null })).toBe(
      "COD · À encaisser cash",
    );
  });

  it("returns 'Payé en ligne' for a prepaid order", () => {
    expect(courierPanelPaymentLabel({ orderPayment: "paid", codMixte: null })).toBe("Payé en ligne");
  });
});
