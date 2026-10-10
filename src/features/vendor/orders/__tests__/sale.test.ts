import { describe, expect, it, vi, beforeEach } from "vitest";
import { asFrancs } from "@/design-system";

const postMock = vi.fn();
const getMock = vi.fn();
vi.mock("@/lib/http/client", () => ({
  api: { get: (...args: unknown[]) => getMock(...args), post: (...args: unknown[]) => postMock(...args) },
}));

import {
  EMPTY_SALE,
  buildSaleRequest,
  computeSaleTotals,
  createSale,
  fetchSaleAgencies,
  parseWholeNumber,
  saleFieldOfApiError,
  searchSaleProducts,
  validateSale,
  type SaleDraft,
  type SaleLine,
} from "../sale";

const line = (overrides: Partial<SaleLine> = {}): SaleLine => ({
  productId: "p1",
  name: "Pagne tissé",
  sku: "PG-01",
  imageUrl: null,
  unitPriceFrancs: asFrancs(5000),
  quantity: 2,
  stock: 10,
  ...overrides,
});

const draft = (overrides: Partial<SaleDraft> = {}): SaleDraft => ({
  ...EMPTY_SALE,
  lines: [line()],
  customerMode: "new",
  newCustomer: { name: "Aminata Sawadogo", phone: "70 11 22 33", email: "" },
  ...overrides,
});

beforeEach(() => {
  postMock.mockReset();
  getMock.mockReset();
});

describe("amounts of a sale (francs)", () => {
  it("adds the lines", () => {
    const totals = computeSaleTotals(draft({ lines: [line(), line({ productId: "p2", unitPriceFrancs: asFrancs(1250), quantity: 3 })] }));
    expect(totals).toEqual({ itemCount: 5, subtotalFrancs: 13750, discountFrancs: 0, totalFrancs: 13750 });
  });

  it("subtracts a fixed discount", () => {
    expect(computeSaleTotals(draft({ discountInput: "1 500" }))).toMatchObject({
      subtotalFrancs: 10000,
      discountFrancs: 1500,
      totalFrancs: 8500,
    });
  });

  it("rounds a percentage discount to the franc so the three figures add up", () => {
    const totals = computeSaleTotals(
      draft({ lines: [line({ unitPriceFrancs: asFrancs(3333), quantity: 1 })], discountKind: "percent", discountInput: "15" }),
    );
    // 3333 × 15 % = 499,95 → 500
    expect(totals.discountFrancs).toBe(500);
    expect(totals.subtotalFrancs - totals.discountFrancs).toBe(totals.totalFrancs);
    expect(Number.isInteger(totals.totalFrancs)).toBe(true);
  });

  it.each([
    ["amount", "12000"],
    ["percent", "150"],
    ["amount", "abc"],
    ["amount", "-5"],
  ] as const)("ignores an impossible discount in the total (%s %s) and reports it", (discountKind, discountInput) => {
    const sale = draft({ discountKind, discountInput });
    expect(computeSaleTotals(sale).totalFrancs).toBe(10000);
    expect(validateSale(sale, "items").discount).toBeTruthy();
  });

  it("reads a typed number with spaces", () => {
    expect(parseWholeNumber("12 500")).toBe(12500);
    expect(parseWholeNumber("")).toBe(0);
    expect(parseWholeNumber("12,5")).toBeNull();
  });
});

describe("validation, step by step", () => {
  it("requires an article", () => {
    expect(validateSale(draft({ lines: [] }), "items").lines).toBe("Ajoutez au moins un article.");
  });

  it("refuses a quantity above the stock", () => {
    expect(validateSale(draft({ lines: [line({ quantity: 11 })] }), "items").lines).toContain("Stock insuffisant");
  });

  it("requires a chosen customer, or a name and a phone for a new one", () => {
    expect(validateSale(draft({ customerMode: "existing", customer: null }), "customer")).toEqual({
      customer: "Choisissez un client.",
    });
    expect(
      validateSale(draft({ newCustomer: { name: " ", phone: "7011", email: "pas-un-email" } }), "customer"),
    ).toEqual({
      customerName: expect.any(String),
      customerPhone: expect.any(String),
      customerEmail: expect.any(String),
    });
  });

  it("requires an agency and an address only when the sale is shipped", () => {
    expect(validateSale(draft({ delivery: "pickup" }), "delivery")).toEqual({});
    expect(validateSale(draft({ delivery: "shipping" }), "delivery")).toEqual({
      agency: expect.any(String),
      addressLine: expect.any(String),
    });
  });

  it("only reports the step asked for, and everything at the review", () => {
    const broken = draft({ lines: [], delivery: "shipping" });
    expect(Object.keys(validateSale(broken, "items"))).toEqual(["lines"]);
    expect(Object.keys(validateSale(broken, "review")).sort()).toEqual(["addressLine", "agency", "lines"]);
  });
});

describe("request sent to POST sellers/sales", () => {
  it("sends francs, a discount, and a total the server can recompute", () => {
    const request = buildSaleRequest(draft({ discountInput: "1500" }));
    expect(request).toMatchObject({
      products: [{ productId: "p1", quantity: 2, unitPrice: 5000 }],
      subtotal: 10000,
      tax: 0,
      discount: 1500,
      total: 8500,
      currency: "XOF",
      delivery: { method: "pickup" },
    });
    expect(request.subtotal + request.tax - request.discount).toBe(request.total);
  });

  it("names the agency and the address of a shipped sale, and no delivery mode", () => {
    const request = buildSaleRequest(
      draft({ delivery: "shipping", agencyId: "21", addressLine: " Secteur 15 ", addressCity: "Ouagadougou", note: " Appeler " }),
    );
    expect(request.delivery).toEqual({
      method: "shipping",
      provider: "21",
      address: { line1: "Secteur 15", city: "Ouagadougou" },
    });
    expect(request.note).toBe("Appeler");
    expect(JSON.stringify(request)).not.toContain("deliveryModeKey");
  });

  it("sends an existing customer by id, a new one inline", () => {
    const existing = buildSaleRequest(
      draft({ customerMode: "existing", customer: { id: "c9", name: "Awa", phone: null, email: null } }),
    );
    expect(existing.customerId).toBe("c9");
    expect(existing.client).toBeUndefined();

    const created = buildSaleRequest(draft());
    expect(created.customerId).toBeUndefined();
    expect(created.client).toEqual({ fullName: "Aminata Sawadogo", phone: "70 11 22 33", countryCode: "BF" });
  });

  it("carries the idempotency key it is given, unchanged across attempts", async () => {
    postMock.mockResolvedValue({ data: { id: "o1", reference: "SU-2026-000050", status: "delivered" } });
    const request = buildSaleRequest(draft());

    await createSale(request, "key-1");
    await createSale(request, "key-1");

    expect(postMock).toHaveBeenCalledTimes(2);
    for (const call of postMock.mock.calls) {
      expect(call[0]).toBe("sellers/sales");
      expect(call[2]).toEqual({ headers: { "Idempotency-Key": "key-1" } });
    }
  });

  it("returns the reference and status the server gave to the sale", async () => {
    postMock.mockResolvedValue({ data: { id: "o1", reference: "SU-2026-000050", status: "confirmed" } });
    await expect(createSale(buildSaleRequest(draft()), "k")).resolves.toEqual({
      id: "o1",
      reference: "SU-2026-000050",
      status: "confirmed",
    });
  });
});

describe("catalogue and agencies", () => {
  it("reads catalogue prices as francs", async () => {
    getMock.mockResolvedValue({ data: [{ id: "p1", name: "Pagne", sku: "", price: 2500, stock: 4, imageUrl: "" }] });
    await expect(searchSaleProducts("pag")).resolves.toEqual([
      { id: "p1", name: "Pagne", sku: null, priceFrancs: 2500, stock: 4, imageUrl: null },
    ]);
    expect(getMock).toHaveBeenCalledWith("sellers/sales/products/search", {
      params: { q: "pag", include_out_of_stock: true },
    });
  });

  it("loads agencies from GET agencies and keeps the active ones", async () => {
    getMock.mockResolvedValue({
      data: {
        partners: [
          { id: 21, name: "Faso Express", code: "FASO", isActive: true },
          { id: 22, name: "Fermée", code: "X", isActive: false },
        ],
      },
    });
    await expect(fetchSaleAgencies()).resolves.toEqual([{ id: "21", name: "Faso Express" }]);
    expect(getMock).toHaveBeenCalledWith("agencies", { params: { is_active: 1, per_page: 100 } });
  });

  it("lets an agency outage surface instead of answering an empty list", async () => {
    getMock.mockRejectedValue(new Error("boom"));
    await expect(fetchSaleAgencies()).rejects.toThrow("boom");
  });
});

describe("server field errors", () => {
  it.each([
    ["client.phone", "customerPhone"],
    ["customerId", "customer"],
    ["delivery.provider", "agency"],
    ["delivery.address.line1", "addressLine"],
    ["products.0.quantity", "lines"],
    ["total", "lines"],
    ["discount", "discount"],
    ["something.else", null],
  ])("%s → %s", (path, field) => {
    expect(saleFieldOfApiError(path)).toBe(field);
  });
});
