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

import { showsLegacyPaymentBadge } from "./sections";
import type { DeliveryDetailRow } from "@/features/agency/schema";

const mixte = {
  isCodMixte: true,
  currentStep: "awaiting_product_payment",
  deliveryFeePaid: true,
  productFeePaid: false,
  deliveryFeeAmount: 200000,
  productFeeAmount: 300000,
  deliveryFeePaidAt: null,
  productFeePaidAt: null,
} satisfies NonNullable<DeliveryDetailRow["codMixte"]>;

describe("showsLegacyPaymentBadge — hide binary badge for Mixte (Chantier 5)", () => {
  it("hides the badge for a Mixte order (card carries the info)", () => {
    expect(showsLegacyPaymentBadge({ codMixte: mixte })).toBe(false);
  });

  it("shows the badge for a non-Mixte order (codMixte undefined)", () => {
    expect(showsLegacyPaymentBadge({ codMixte: undefined })).toBe(true);
  });
});
