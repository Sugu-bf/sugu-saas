import { describe, it, expect, vi, beforeEach } from "vitest";

// Isolate the service from env validation and the real HTTP layer.
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
vi.mock("@/lib/http/client", () => ({
  api: { get: (...args: unknown[]) => getMock(...args), post: vi.fn() },
  apiRequest: vi.fn(),
}));

import { getDriverDeliveryDetail, getDriverDeliveries } from "./service";
import { formatCentsToXof } from "@/lib/utils/format-cents";

// fr-FR groups thousands with a narrow no-break space (U+202F); normalize any
// Unicode space separator to a plain space so assertions are codepoint-robust.
const norm = (s: string) => s.replace(/[    ]/g, " ");

const rawDetailBase = {
  id: "d1",
  order_id: "#LIV-1",
  status: "in_transit",
  status_label: "ignored",
  priority: "normal",
  security_code: "SU-1",
  amount: 1800,
  order_total: 12500,
  order_payment: "cod",
  distance_km: 3,
  estimated_minutes: 20,
  parcel_count: 2,
  stops: [],
  client: { name: "Mme Traoré", phone: "+22600", address: "addr", note: null, is_regular: false },
  timeline: [],
  accepted_at: null,
  completed_at: null,
};

const rawRowBase = {
  id: "r1",
  order_id: "#LIV-1",
  status: "in_transit",
  priority: "normal",
  pickup: { name: "P", address: "pa" },
  delivery: { name: "D", address: "da" },
  client: { name: "Mme Traoré", phone: "+1", address: "a", note: null },
  distance_km: 3,
  duration_min: 18,
  order_items: 2,
  order_payment: "cod",
  order_total: 12500,
  amount: 1500,
  parcel_count: 2,
  time_label: "now",
  timeline: [{ id: "t1", label: "x", time: null, done: true, current: false }],
};

describe("getDriverDeliveryDetail — codMixte mapping", () => {
  beforeEach(() => getMock.mockReset());

  it("maps a Mixte payload, preserving raw centimes", async () => {
    getMock.mockResolvedValue({
      data: {
        ...rawDetailBase,
        cod_mixte: {
          isCodMixte: true,
          currentStep: "awaiting_product_payment",
          deliveryFeePaid: true,
          productFeePaid: false,
          deliveryFeeAmount: 150000,
          productFeeAmount: 450000,
          deliveryFeePaidAt: "2026-05-30T10:00:00Z",
          productFeePaidAt: null,
        },
      },
    });

    const detail = await getDriverDeliveryDetail("d1");

    expect(detail.codMixte).not.toBeNull();
    expect(detail.codMixte?.isCodMixte).toBe(true);
    expect(detail.codMixte?.currentStep).toBe("awaiting_product_payment");
    expect(detail.codMixte?.deliveryFeePaid).toBe(true);
    expect(detail.codMixte?.productFeePaid).toBe(false);
    // RAW CENTIMES preserved through the transformer (no /100 here).
    expect(detail.codMixte?.productFeeAmount).toBe(450000);
    expect(detail.codMixte?.deliveryFeeAmount).toBe(150000);
    // Real-condition rendering via the foundation helper.
    expect(norm(formatCentsToXof(detail.codMixte!.productFeeAmount))).toBe("4 500 FCFA");
    expect(norm(formatCentsToXof(detail.codMixte!.deliveryFeeAmount))).toBe("1 500 FCFA");
  });

  it("returns codMixte = null for a Legacy COD order (cod_mixte: null)", async () => {
    getMock.mockResolvedValue({ data: { ...rawDetailBase, order_payment: "cod", cod_mixte: null } });
    const detail = await getDriverDeliveryDetail("d1");
    expect(detail.codMixte).toBeNull();
    expect(detail.orderPayment).toBe("cod");
  });

  it("returns codMixte = null for a non-COD order (cod_mixte absent)", async () => {
    getMock.mockResolvedValue({ data: { ...rawDetailBase, order_payment: "paid" } });
    const detail = await getDriverDeliveryDetail("d1");
    expect(detail.codMixte).toBeNull();
    expect(detail.orderPayment).toBe("paid");
  });
});

describe("getDriverDeliveries — codMixte mapping on list rows", () => {
  beforeEach(() => getMock.mockReset());

  it("maps Mixte rows (centimes preserved) and nulls Legacy rows", async () => {
    getMock.mockResolvedValue({
      data: {
        summary: { total: 2, delivered: 0, in_progress: 2, failed: 0 },
        status_counts: { all: 2, to_accept: 0, en_route: 2, delivered: 0, failed: 0 },
        rows: [
          {
            ...rawRowBase,
            id: "mixte",
            cod_mixte: {
              isCodMixte: true,
              currentStep: "awaiting_delivery_payment",
              deliveryFeePaid: false,
              productFeePaid: false,
              deliveryFeeAmount: 200000,
              productFeeAmount: 300000,
              deliveryFeePaidAt: null,
              productFeePaidAt: null,
            },
          },
          { ...rawRowBase, id: "legacy", cod_mixte: null },
        ],
      },
    });

    const res = await getDriverDeliveries();
    const mixte = res.rows.find((r) => r.id === "mixte")!;
    const legacy = res.rows.find((r) => r.id === "legacy")!;

    expect(mixte.codMixte?.isCodMixte).toBe(true);
    expect(mixte.codMixte?.deliveryFeeAmount).toBe(200000);
    expect(norm(formatCentsToXof(mixte.codMixte!.productFeeAmount))).toBe("3 000 FCFA");
    expect(legacy.codMixte).toBeNull();
  });
});
