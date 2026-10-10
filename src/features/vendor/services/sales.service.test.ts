import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  calls: [] as unknown[][],
  response: undefined as unknown,
  failure: null as Error | null,
}));

vi.mock("@/lib/http/client", () => ({
  api: {
    get: (...args: unknown[]) => {
      state.calls.push(args);
      return state.failure ? Promise.reject(state.failure) : Promise.resolve(state.response);
    },
  },
}));

import { getDeliveryPartners, mapDeliveryPartners } from "./sales.service";

describe("delivery partners for a manual sale", () => {
  beforeEach(() => {
    state.calls = [];
    state.response = undefined;
    state.failure = null;
  });

  it("reads the canonical agencies listing, active only", async () => {
    state.response = {
      success: true,
      data: { partners: [{ id: "01AG", name: "Express Ouaga", code: "EXO", logoUrl: null, isActive: true }] },
    };

    const partners = await getDeliveryPartners();

    expect(state.calls).toEqual([["agencies", { params: { is_active: 1, per_page: 100 } }]]);
    expect(partners).toEqual([
      { id: "01AG", name: "Express Ouaga", slug: "EXO", type: "agency", logo: undefined, deliveryModes: [] },
    ]);
  });

  it("does not turn an API failure into an empty list", async () => {
    state.failure = new Error("HTTP 500");
    await expect(getDeliveryPartners()).rejects.toThrow("HTTP 500");
  });

  it("drops inactive agencies and never invents delivery modes", () => {
    const mapped = mapDeliveryPartners([
      { id: "1", name: "A", code: "A", isActive: true },
      { id: "2", name: "B", code: "B", isActive: false },
      { id: "3", name: null, code: "C3" },
    ]);
    expect(mapped.map((p) => p.id)).toEqual(["1", "3"]);
    expect(mapped[1].name).toBe("C3");
    expect(mapped.every((p) => p.deliveryModes.length === 0)).toBe(true);
  });
});
