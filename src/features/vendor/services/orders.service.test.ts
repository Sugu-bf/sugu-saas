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
vi.mock("@/lib/http/client", () => ({
  api: { get: (...args: unknown[]) => getMock(...args), post: vi.fn() },
  apiRequest: vi.fn(),
}));

import { getVendorOrders, getVendorOrderDetail } from "./orders.service";

const baseItem = {
  customer: { name: "Client X" },
  totalAmount: 12500,
  statusCode: "pending",
  items: [{ name: "Produit", quantity: 1 }],
};

const rawItems = [
  {
    ...baseItem,
    id: "o-mixte",
    displayId: "CMD-MIXTE",
    paymentStatusCode: "cod_pending",
    is_cod: true,
    cod_flow_type: "mixte",
    cod_current_step: "awaiting_vendor",
    delivery_fee_paid: false,
    product_fee_paid: false,
    vendor_confirmed_at: null,
  },
  {
    ...baseItem,
    id: "o-legacy",
    displayId: "CMD-LEGACY",
    paymentStatusCode: "cod_pending",
    is_cod: true,
    cod_flow_type: "legacy",
    cod_current_step: null,
    delivery_fee_paid: false,
    product_fee_paid: false,
    vendor_confirmed_at: null,
  },
  {
    ...baseItem,
    id: "o-paid",
    displayId: "CMD-PAID",
    paymentStatusCode: "paid",
    is_cod: false,
    cod_flow_type: "none",
    cod_current_step: null,
    delivery_fee_paid: false,
    product_fee_paid: false,
    vendor_confirmed_at: "2026-05-30T10:00:00.000Z",
  },
  {
    ...baseItem,
    id: "o-bogus",
    displayId: "CMD-BOGUS",
    paymentStatusCode: null,
    is_cod: false,
    cod_flow_type: "weird-future-value",
    cod_current_step: null,
  },
];

describe("getVendorOrders — Trou n°4 COD field mapping", () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockImplementation((path: string) => {
      if (path === "sellers/orders") {
        return Promise.resolve({ data: { data: rawItems, total: rawItems.length } });
      }
      if (path === "sellers/orders/stats") {
        return Promise.resolve({
          data: { total: rawItems.length, pending: rawItems.length, confirmed: 0, shipping: 0, delivered: 0 },
        });
      }
      return Promise.reject(new Error(`unexpected path ${path}`));
    });
  });

  it("maps the Mixte order's COD fields", async () => {
    const { orders } = await getVendorOrders();
    const o = orders.find((x) => x.id === "o-mixte")!;
    expect(o.isCod).toBe(true);
    expect(o.codFlowType).toBe("mixte");
    expect(o.codCurrentStep).toBe("awaiting_vendor");
    expect(o.paymentStatusCode).toBe("cod_pending");
  });

  it("maps the Legacy COD order (codCurrentStep null)", async () => {
    const { orders } = await getVendorOrders();
    const o = orders.find((x) => x.id === "o-legacy")!;
    expect(o.isCod).toBe(true);
    expect(o.codFlowType).toBe("legacy");
    expect(o.codCurrentStep).toBeNull();
  });

  it("maps the non-COD order and keeps vendorConfirmedAt as audit timestamp", async () => {
    const { orders } = await getVendorOrders();
    const o = orders.find((x) => x.id === "o-paid")!;
    expect(o.isCod).toBe(false);
    expect(o.codFlowType).toBe("none");
    expect(o.paymentStatusCode).toBe("paid");
    expect(o.vendorConfirmedAt).toBe("2026-05-30T10:00:00.000Z");
  });

  it("clamps an unknown cod_flow_type to 'none'", async () => {
    const { orders } = await getVendorOrders();
    const o = orders.find((x) => x.id === "o-bogus")!;
    expect(o.codFlowType).toBe("none");
    expect(o.paymentStatusCode).toBeNull();
  });
});

describe("getVendorOrderDetail — paymentStatus label via mapPaymentStatusCode (Chantier 5)", () => {
  beforeEach(() => getMock.mockReset());

  const rawDetail = (paymentStatus: string | undefined) => ({
    data: {
      order: {
        id: "o1",
        reference: "CMD-1",
        statusCode: "pending",
        parties: { client: { name: "Client X", phone: "+1", email: "e@x.co", location: "Rue 1, Ville", orderCount: 0 } },
        items: [{ id: "i1", name: "Produit", quantity: 1, price: 1000, total: 1000, status: "ready" }],
        pricing: { subtotal: 1000, total: 1000, discount: 0, deliveryFees: 0, paymentStatus, paymentMethod: "Cash (COD)" },
        timeline: [],
        createdAt: "2026-05-30T10:00:00.000Z",
      },
    },
  });

  it("maps a Legacy COD code (cod_pending) to 'Paiement à la livraison' instead of the misleading generic", async () => {
    getMock.mockResolvedValue(rawDetail("cod_pending"));
    const detail = await getVendorOrderDetail("o1");
    expect(detail.financial.paymentStatus).toBe("Paiement à la livraison");
  });

  it("maps 'paid' to 'Payé'", async () => {
    getMock.mockResolvedValue(rawDetail("paid"));
    const detail = await getVendorOrderDetail("o1");
    expect(detail.financial.paymentStatus).toBe("Payé");
  });

  it("falls back discreetly when paymentStatus is missing", async () => {
    getMock.mockResolvedValue(rawDetail(undefined));
    const detail = await getVendorOrderDetail("o1");
    expect(detail.financial.paymentStatus).toBe("En attente de paiement");
  });
});
