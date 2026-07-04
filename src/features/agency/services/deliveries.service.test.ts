import { describe, it, expect, vi, beforeEach } from "vitest";

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

const getMock = vi.fn();
const postMock = vi.fn();
vi.mock("@/lib/http/client", () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
  apiRequest: vi.fn(),
}));

import { bulkStatus, getDeliveryDetail } from "./deliveries.service";

describe("getDeliveryDetail — COD Mixte money mapping", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("converts COD Mixte fee centimes to FCFA display units", async () => {
    getMock.mockResolvedValue({
      success: true,
      data: {
        id: "shipment_1",
        order: {
          id: "order_1",
          order_number: "CMD-1",
          items_count: 1,
          total: 500000,
          payment_status: "pending",
          shipping_address: {
            name: "Client",
            phone: "",
            line1: "Rue 1",
            city: "Ouaga",
          },
          store: {
            id: "store_1",
            name: "Boutique",
            slug: "boutique",
            address_line1: "Rue A",
          },
          created_at: "2026-07-04T10:00:00.000Z",
          items: [],
        },
        courier: null,
        status: "pending",
        shipping_amount: 250000,
        items_count: 1,
        created_at: "2026-07-04T10:00:00.000Z",
        cod_mixte: {
          isCodMixte: true,
          currentStep: "awaiting_product_payment",
          deliveryFeePaid: true,
          productFeePaid: false,
          deliveryFeeAmount: 200000,
          productFeeAmount: 300000,
          deliveryFeePaidAt: null,
          productFeePaidAt: null,
        },
      },
    });

    const detail = await getDeliveryDetail("agency_1", "shipment_1");

    expect(detail.orderTotal).toBe(5000);
    expect(detail.shippingAmount).toBe(2500);
    expect(detail.codMixte?.deliveryFeeAmount).toBe(2000);
    expect(detail.codMixte?.productFeeAmount).toBe(3000);
  });
});

describe("bulkStatus — structured partial-rejects parsing (Chantier 4)", () => {
  beforeEach(() => postMock.mockReset());

  it("parses a mixed response (some updated, some rejected) with both reason codes", async () => {
    postMock.mockResolvedValue({
      success: true,
      data: {
        updated_count: 3,
        updated: ["s1", "s2", "s3"],
        rejected: [
          { shipment_id: "s4", reason: "SUGU-COD-MIXTE-FEES-UNPAID" },
          { shipment_id: "s5", reason: "SUGU-DELIVERY-CODE-NOT-VERIFIED" },
        ],
      },
    });

    const res = await bulkStatus("ag1", ["s1", "s2", "s3", "s4", "s5"], "delivered");
    expect(res.updated_count).toBe(3);
    expect(res.updated).toEqual(["s1", "s2", "s3"]);
    expect(res.rejected).toHaveLength(2);
    expect(res.rejected[0]).toEqual({ shipment_id: "s4", reason: "SUGU-COD-MIXTE-FEES-UNPAID" });
    expect(res.rejected[1].reason).toBe("SUGU-DELIVERY-CODE-NOT-VERIFIED");
  });

  it("is backwards-compatible: defaults updated/rejected to [] when absent", async () => {
    postMock.mockResolvedValue({ success: true, data: { updated_count: 2 } });
    const res = await bulkStatus("ag1", ["s1", "s2"], "delivered");
    expect(res.updated_count).toBe(2);
    expect(res.updated).toEqual([]);
    expect(res.rejected).toEqual([]);
  });

  it("coerces numeric shipment ids to strings", async () => {
    postMock.mockResolvedValue({
      success: true,
      data: { updated_count: 0, updated: [], rejected: [{ shipment_id: 42, reason: "SUGU-COD-MIXTE-FEES-UNPAID" }] },
    });
    const res = await bulkStatus("ag1", ["42"], "delivered");
    expect(res.rejected[0].shipment_id).toBe("42");
  });

  it("throws if the backend silently changes the contract (strict parse)", async () => {
    postMock.mockResolvedValue({ success: true, data: { wrong: "shape" } });
    await expect(bulkStatus("ag1", ["s1"], "delivered")).rejects.toThrow();
  });
});
