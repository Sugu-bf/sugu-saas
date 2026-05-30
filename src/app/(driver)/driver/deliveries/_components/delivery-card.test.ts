import { describe, it, expect, vi } from "vitest";

// delivery-card pulls hooks → driver service (top-level env import); isolate it.
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

import { courierCardCodChip } from "./delivery-card";
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

describe("courierCardCodChip — Mixte vs Legacy vs prepaid", () => {
  it("returns a distinct Mixte chip", () => {
    expect(courierCardCodChip({ orderPayment: "cod", codMixte: mixte })).toEqual({
      label: "COD Mixte",
      kind: "mixte",
    });
  });

  it("returns the cash chip for Legacy COD", () => {
    expect(courierCardCodChip({ orderPayment: "cod", codMixte: null })).toEqual({
      label: "COD · cash",
      kind: "legacy",
    });
  });

  it("returns null for a prepaid order (no chip — V4 decision)", () => {
    expect(courierCardCodChip({ orderPayment: "paid", codMixte: null })).toBeNull();
  });
});
