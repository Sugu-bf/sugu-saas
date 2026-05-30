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

const postMock = vi.fn();
vi.mock("@/lib/http/client", () => ({
  api: { get: vi.fn(), post: (...args: unknown[]) => postMock(...args) },
  apiRequest: vi.fn(),
}));

import { bulkStatus } from "./deliveries.service";

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
