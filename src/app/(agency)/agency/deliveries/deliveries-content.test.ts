import { describe, it, expect, vi } from "vitest";

// deliveries-content pulls hooks → agency service graph; isolate from env validation.
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

import { buildBulkFeedback } from "./deliveries-content";
import { SUGU_MESSAGES } from "@/lib/http/sugu-error-mapper";

// Identity labeller for tests (real component maps shipment_id → orderId).
const idLabel = (sid: string) => `#${sid}`;

describe("buildBulkFeedback — aggregated partial-rejects feedback (Chantier 4)", () => {
  it("returns success when nothing is rejected", () => {
    const fb = buildBulkFeedback({ updated_count: 3, updated: ["a", "b", "c"], rejected: [] }, idLabel);
    expect(fb.kind).toBe("success");
    expect(fb.title).toBe("3 livraisons mises à jour");
    expect(fb.rejects).toEqual([]);
  });

  it("returns a partial warning with mapped reasons when some are rejected", () => {
    const fb = buildBulkFeedback(
      {
        updated_count: 3,
        updated: ["a", "b", "c"],
        rejected: [
          { shipment_id: "d", reason: "SUGU-COD-MIXTE-FEES-UNPAID" },
          { shipment_id: "e", reason: "SUGU-DELIVERY-CODE-NOT-VERIFIED" },
        ],
      },
      idLabel,
    );
    expect(fb.kind).toBe("warning");
    expect(fb.title).toBe("3 mises à jour · 2 rejetées");
    expect(fb.rejects).toEqual([
      { label: "#d", message: SUGU_MESSAGES["SUGU-COD-MIXTE-FEES-UNPAID"] },
      { label: "#e", message: SUGU_MESSAGES["SUGU-DELIVERY-CODE-NOT-VERIFIED"] },
    ]);
  });

  it("returns an error in the degenerate case where everything is rejected", () => {
    const fb = buildBulkFeedback(
      {
        updated_count: 0,
        updated: [],
        rejected: [{ shipment_id: "x", reason: "SUGU-COD-MIXTE-FEES-UNPAID" }],
      },
      idLabel,
    );
    expect(fb.kind).toBe("error");
    expect(fb.title).toBe("Aucune livraison mise à jour");
    expect(fb.rejects).toHaveLength(1);
    expect(fb.rejects[0].message).not.toContain("SUGU-");
  });
});
