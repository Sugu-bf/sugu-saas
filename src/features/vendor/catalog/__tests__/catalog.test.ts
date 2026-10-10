import { afterEach, describe, expect, it, vi } from "vitest";
import { formatMoneyFromFrancs } from "@/design-system";
import { ApiError } from "@/lib/http/api-error";
import { api } from "@/lib/http/client";
import { adjustStock, fetchInventory, fetchProducts } from "../api";
import {
  parseInventoryPage,
  parseInventoryRow,
  parseProductCounts,
  parseProductDetail,
  parseProductListItem,
  parseProductListPage,
} from "../contract";
import { describeFailure } from "../errors";
import { adjustableVariants, checkAdjustment, variantLabel } from "../stock";
import { inventoryRow, productDetail, productRow } from "./fixtures";

vi.mock("@/lib/http/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  apiFetch: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

describe("product row", () => {
  it("reads the price as francs, without conversion", () => {
    const row = parseProductListItem(productRow({ price: 7500, compareAtPrice: 9000, compareAtAmount: 900000 }));
    expect(row.priceFrancs).toBe(7500);
    expect(row.compareAtFrancs).toBe(9000);
    expect(formatMoneyFromFrancs(row.priceFrancs)).toMatch(/^7\s500\sFCFA$/);
  });

  it("has no crossed-out price when the backend sends none", () => {
    expect(parseProductListItem(productRow()).compareAtFrancs).toBeNull();
  });

  it.each([["submitted"], ["rejected"], ["changes_requested"], ["suspended"], ["archived"], ["a_status_added_later"]])(
    "keeps the real status %s, which the legacy field folds into draft",
    (code) => {
      expect(parseProductListItem(productRow({ status: "draft", statusCode: code })).status).toBe(code);
    },
  );

  it("reads an older backend, which only says published, draft or archived", () => {
    expect(parseProductListItem(productRow({ statusCode: undefined, status: "published" })).status).toBe("active");
    expect(parseProductListItem(productRow({ statusCode: undefined, status: "draft" })).status).toBe("draft");
  });

  it("shows no picture rather than the stand-in the backend answers", () => {
    expect(parseProductListItem(productRow()).image).toBeNull();
    expect(parseProductListItem(productRow({ main_image: "https://cdn.sugu.pro/p/1.jpg" })).image).toBe("https://cdn.sugu.pro/p/1.jpg");
  });

  it("keeps an unknown stock unknown, not zero", () => {
    expect(parseProductListItem(productRow({ stock: undefined })).stock).toBeNull();
    expect(parseProductListItem(productRow({ stock: 0 })).stock).toBe(0);
  });

  it("takes the page number and size it asked for, and the server total", () => {
    const page = parseProductListPage({ data: [productRow()], total: 61, page: 3, totalPages: 3 }, { page: 3, pageSize: 24 });
    expect(page).toMatchObject({ total: 61, page: 3, pageSize: 24 });
    expect(page.rows).toHaveLength(1);
  });
});

describe("counters", () => {
  it("reads one counter per status and per stock level", () => {
    const counts = parseProductCounts({
      total: 5,
      published: 2,
      drafts: 1,
      alerts: 2,
      outOfStock: 2,
      byStatus: { draft: 1, submitted: 1, active: 2, rejected: 0, archived: 1, changes_requested: 0, suspended: 0 },
      byStock: { in_stock: 2, low_stock: 1, out_of_stock: 2 },
    });
    expect(counts.byStatus.archived).toBe(1);
    expect(counts.byStock.low_stock).toBe(1);
  });

  it("never derives a missing counter from the total on an older backend", () => {
    const counts = parseProductCounts({ total: 10, published: 6, drafts: 3, alerts: 1, outOfStock: 1 });
    expect(counts.total).toBe(10);
    expect(counts.byStatus).toEqual({ active: 6 });
    // Not 10 - 6 - 3: archived is unknown.
    expect(counts.byStatus.archived).toBeUndefined();
    // Its `drafts` does not match what its draft filter returns.
    expect(counts.byStatus.draft).toBeUndefined();
    expect(counts.byStock).toEqual({ out_of_stock: 1 });
  });

  it("accepts the empty counters of a seller without store", () => {
    expect(parseProductCounts({ total: 0, published: 0, drafts: 0, alerts: 0, outOfStock: 0, byStatus: {}, byStock: {} })).toEqual({
      total: 0,
      byStatus: {},
      byStock: {},
    });
  });
});

describe("product detail", () => {
  it("lists variants, pictures and active price tiers as stored", () => {
    const product = parseProductDetail(productDetail());

    expect(product.variants.map((variant) => [variant.title, variant.priceFrancs, variant.stock, variant.isActive])).toEqual([
      ["Rouge / M", 7500, 4, true],
      ["Bleu / L", 8000, 3, true],
      ["Vert / S", 7500, 25, false],
    ]);
    expect(product.variants[0].options).toEqual({ Couleur: "Rouge", Taille: "M" });
    expect(product.pictures.map((picture) => [picture.id, picture.isMain])).toEqual([
      ["11", true],
      ["12", false],
    ]);
    // Sorted by quantity; the inactive tier is not offered.
    expect(product.bulkPrices.map((tier) => [tier.minQuantity, tier.priceFrancs])).toEqual([
      [10, 7000],
      [20, 6500],
    ]);
    expect(product.weightGrams).toBe(350);
    // No dimension stored: none shown.
    expect(product.dimensionsMm).toBeNull();
  });

  it("does not name the single variant of a simple product", () => {
    const product = parseProductDetail(productRow({ variants: [{ id: "v1", title: "Default", sku: "X", price: 7500, stock: 12, isActive: true, isDefault: true, options: {} }] }));
    expect(product.variants[0].title).toBeNull();
  });

  it("carries the moderation reason only when there is something to say", () => {
    const rejected = parseProductDetail(
      productDetail({ statusCode: "rejected", moderation: { rejectionReason: "Photo floue", notePublic: null, reviewedAt: null, submittedAt: null, logs: [] } }),
    );
    expect(rejected.moderation?.reason).toBe("Photo floue");

    const empty = parseProductDetail(productDetail({ moderation: { rejectionReason: null, notePublic: null, reviewedAt: null, submittedAt: null, logs: [] } }));
    expect(empty.moderation).toBeNull();
    expect(parseProductDetail(productRow()).moderation).toBeNull();
  });

  it("refuses a payload without a name or a price", () => {
    expect(() => parseProductDetail(productDetail({ name: undefined }))).toThrow();
    expect(() => parseProductDetail(productDetail({ price: "7500" }))).toThrow();
  });
});

describe("inventory", () => {
  it("reads the stock of each variant and the level code", () => {
    const row = parseInventoryRow(inventoryRow());
    expect(row).toMatchObject({ stock: 7, stockLevel: "low_stock", image: null });
    expect(row.variants?.map((variant) => [variant.title, variant.stock, variant.isDefault])).toEqual([
      ["Rouge / M", 4, true],
      ["Bleu / L", 3, false],
    ]);
  });

  it("reads an older backend: French level, stand-in picture, no variants", () => {
    const row = parseInventoryRow(
      inventoryRow({ imageUrl: undefined, stockStatusCode: undefined, updatedAt: undefined, variants: undefined, image: "https://via.placeholder.com/50", status: "rupture", stock_available: 0 }),
    );
    expect(row).toMatchObject({ stockLevel: "out_of_stock", image: null, updatedAt: null, variants: null });
  });

  it("reads the pagination total of the inventory endpoint", () => {
    const page = parseInventoryPage({ items: [inventoryRow()], pagination: { page: 2, limit: 25, total: 31, pages: 2 } }, { page: 2, pageSize: 25 });
    expect(page).toMatchObject({ total: 31, page: 2, pageSize: 25 });
  });
});

describe("stock adjustment", () => {
  const draft = (operation: "add" | "remove", quantity: string, currentStock = 10) => checkAdjustment({ operation, quantity, currentStock });

  it("signs the quantity by the operation and previews the result", () => {
    expect(draft("add", "6")).toEqual({ delta: 6, resultingStock: 16, error: null });
    expect(draft("remove", "4")).toEqual({ delta: -4, resultingStock: 6, error: null });
    expect(draft("remove", "10")).toMatchObject({ delta: -10, resultingStock: 0 });
  });

  it.each([[""], ["0"], ["-3"], ["2.5"], ["abc"], ["1e3"], ["100001"]])("refuses the quantity %j", (quantity) => {
    expect(draft("add", quantity)).toMatchObject({ delta: null, resultingStock: null });
    expect(draft("add", quantity).error).toBeTruthy();
  });

  it("refuses to remove more than the stock", () => {
    expect(draft("remove", "11").error).toMatch(/stock actuel \(10\)/);
  });

  it("offers the default variant first and names an untitled one by its SKU", () => {
    const row = parseInventoryRow(
      inventoryRow({
        variants: [
          { id: "v2", title: null, sku: "SKU-2", stock: 3, isDefault: false, isActive: true },
          { id: "v1", title: "Rouge", sku: "SKU-1", stock: 4, isDefault: true, isActive: true },
        ],
      }),
    );
    expect(adjustableVariants(row).map((variant) => variant.id)).toEqual(["v1", "v2"]);
    expect(adjustableVariants(row).map(variantLabel)).toEqual(["Rouge", "SKU-2"]);
    expect(adjustableVariants(parseInventoryRow(inventoryRow({ variants: undefined })))).toEqual([]);
  });
});

describe("requests", () => {
  it("sends search, sort, filters and page to the server", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [], total: 0 } });
    await fetchProducts({ status: "submitted", stock: "low_stock", search: "  pagne ", sort: "price", direction: "asc", page: 2 });
    expect(api.get).toHaveBeenCalledWith("sellers/products", {
      params: { status: "submitted", stock: "low_stock", search: "pagne", sort: "price", direction: "asc", page: 2, limit: 24 },
    });
  });

  it("names the stock level and the sort as the inventory endpoint expects", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [], pagination: { total: 0 } } });
    await fetchInventory({ level: "low_stock", sort: "stock", direction: "asc", page: 1 });
    expect(api.get).toHaveBeenCalledWith("sellers/inventory/products", {
      params: { status: "stock_faible", search: undefined, sort: "stock_asc", page: 1, limit: 25 },
    });
  });

  it("adjusts the named variant and answers the stock the server computed", async () => {
    vi.mocked(api.post).mockResolvedValue({ success: true, data: { variantId: "v2", stock: 9 } });
    const result = await adjustStock({ productId: "p 1", variantId: "v2", quantity: -3, reason: "damaged" });
    expect(api.post).toHaveBeenCalledWith("sellers/inventory/p%201/add-stock", { quantity: -3, variant_id: "v2", reason: "damaged" });
    expect(result).toEqual({ variantId: "v2", stock: 9 });
  });

  it("assumes no resulting stock when an older backend does not answer one", async () => {
    vi.mocked(api.post).mockResolvedValue({ success: true, message: "Stock ajouté avec succès" });
    expect(await adjustStock({ productId: "p1", quantity: 5 })).toBeNull();
    expect(api.post).toHaveBeenCalledWith("sellers/inventory/p1/add-stock", { quantity: 5 });
  });
});

describe("failures", () => {
  it("words a missing product as a product, not as an order", () => {
    expect(describeFailure(new ApiError({ message: "Produit non trouvé.", status: 404 })).message).toBe("Ce produit est introuvable.");
  });

  it("shows the sentence the server wrote for a refused stock change", () => {
    const failure = describeFailure(new ApiError({ message: "Le stock ne peut pas descendre sous zéro.", status: 400 }));
    expect(failure).toMatchObject({ kind: "refused", message: "Le stock ne peut pas descendre sous zéro." });
  });

  it("never shows a server error message", () => {
    const failure = describeFailure(new ApiError({ message: "SQLSTATE[42P01]: relation does not exist", status: 500 }));
    expect(failure.message).not.toContain("SQLSTATE");
  });
});
