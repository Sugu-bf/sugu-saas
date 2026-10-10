// Seller catalogue endpoints for the V2 smoke (playwright.catalog.config.ts),
// plugged into e2e/shell/mock-api.mjs. Payloads follow ProductResource and
// SellerInventoryController (../sugu): prices in francs, backend status codes,
// stock summed over the active variants, the same refusals as the real
// endpoints. One independent data set per session token, so tests can mutate
// the catalogue without seeing each other. Nothing here reaches a real backend.

const STORE_ID = "store-11";
const LOW = 10;
const DAY = 86_400_000;

const CATEGORIES = ["Textile", "Beauté", "Maison", "Épicerie"];
const NAMES = ["Pagne tissé", "Savon au karité", "Panier tressé", "Miel de Fada", "Bogolan", "Beurre de karité", "Calebasse gravée"];

function product(sequence, overrides = {}) {
  const base = {
    id: `product-${String(sequence).padStart(3, "0")}`,
    storeId: STORE_ID,
    name: `${NAMES[sequence % NAMES.length]} n°${sequence}`,
    sku: `SKU-${String(sequence).padStart(4, "0")}`,
    category: CATEGORIES[sequence % CATEGORIES.length],
    price: 1500 + (sequence % 9) * 750,
    compareAt: null,
    status: "active",
    hasVariants: false,
    image: null,
    createdAt: new Date(Date.UTC(2026, 8, 1) + sequence * DAY).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 9, 1) + sequence * 3_600_000).toISOString(),
    description: "<p>Fabriqué à Ouagadougou.</p><p>Lavage à la main.</p>",
    shortDescription: null,
    moderation: null,
    variants: [{ id: `variant-${sequence}-1`, title: "Default", sku: `SKU-${String(sequence).padStart(4, "0")}`, price: 1500 + (sequence % 9) * 750, stock: 20 + sequence, isDefault: true, isActive: true }],
    ...overrides,
  };
  return base;
}

const STATUS_CYCLE = ["active", "active", "active", "draft", "active", "archived"];

/**
 * 46 products: 40 of volume, then the six scenarios the tests act on.
 * By status: 30 active, 8 draft, 6 archived, 1 submitted, 1 rejected.
 * By stock: 43 in stock, 2 low, 1 out.
 */
function seed() {
  const products = [];
  for (let sequence = 1; sequence <= 40; sequence++) {
    products.push(product(sequence, { status: STATUS_CYCLE[sequence % STATUS_CYCLE.length] }));
  }

  // The oldest product: only a server-side search can find it from page 1.
  products[0] = product(1, { name: "Tabouret Sénoufo", sku: "TAB-0001", status: "active", createdAt: new Date(Date.UTC(2025, 0, 5)).toISOString() });

  products.push(
    product(41, {
      id: "product-variants",
      name: "Chemise en Faso Dan Fani",
      sku: "CHM-0041",
      status: "active",
      hasVariants: true,
      price: 7500,
      compareAt: 9000,
      image: "/next.svg",
      shortDescription: "Chemise tissée, coupe droite",
      variants: [
        { id: "variant-41-rm", title: "Rouge / M", sku: "CHM-R-M", price: 7500, stock: 4, isDefault: true, isActive: true, options: { Couleur: "Rouge", Taille: "M" } },
        { id: "variant-41-bl", title: "Bleu / L", sku: "CHM-B-L", price: 8000, stock: 3, isDefault: false, isActive: true, options: { Couleur: "Bleu", Taille: "L" } },
        { id: "variant-41-vs", title: "Vert / S", sku: "CHM-V-S", price: 7500, stock: 25, isDefault: false, isActive: false, options: { Couleur: "Vert", Taille: "S" } },
      ],
    }),
    product(42, { id: "product-out", name: "Sac en cuir de Kaya", sku: "SAC-0042", status: "active", variants: [{ id: "variant-42-1", title: "Default", sku: "SAC-0042", price: 12000, stock: 0, isDefault: true, isActive: true }], price: 12000 }),
    product(43, { id: "product-low", name: "Bracelet en bronze", sku: "BRA-0043", status: "active", variants: [{ id: "variant-43-1", title: "Default", sku: "BRA-0043", price: 2500, stock: 3, isDefault: true, isActive: true }], price: 2500 }),
    product(44, { id: "product-submitted", name: "Tunique brodée", sku: "TUN-0044", status: "submitted" }),
    product(45, {
      id: "product-rejected",
      name: "Sandales tressées",
      sku: "SAN-0045",
      status: "rejected",
      moderation: { rejectionReason: "La photo principale est floue.", notePublic: "Ajoutez une photo nette sur fond clair.", reviewedAt: "2026-10-02T09:00:00.000000Z", submittedAt: "2026-10-01T09:00:00.000000Z" },
    }),
    product(46, { id: "product-to-delete", name: "Coussin en bogolan", sku: "COU-0046", status: "draft" }),
  );

  // A product of another store: must never be listed nor opened.
  products.push(product(99, { id: "product-foreign", name: "Produit d'une autre boutique", storeId: "store-other" }));
  return products;
}

const states = new Map();
function stateOf(token) {
  if (!states.has(token)) states.set(token, { products: seed() });
  return states.get(token);
}

// ── Projections ─────────────────────────────────────────────

const stockOf = (item) => item.variants.filter((variant) => variant.isActive).reduce((sum, variant) => sum + variant.stock, 0);
const levelOf = (stock) => (stock <= 0 ? "out_of_stock" : stock <= LOW ? "low_stock" : "in_stock");
const LEGACY_STATUS = { active: "published", archived: "archived" };

function variantResource(variant) {
  return {
    id: variant.id,
    title: variant.title,
    sku: variant.sku,
    price_amount: variant.price * 100,
    price: variant.price,
    stock: variant.stock,
    isActive: variant.isActive,
    isDefault: variant.isDefault,
    options: variant.options ?? {},
    bulkPrices: [],
  };
}

function resource(item, detail = false) {
  const stock = stockOf(item);
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    brand: "",
    image: item.image ?? "https://cdn.sugu.pro/s/theme/fallback-product.png",
    main_image: item.image,
    gallery: item.image ? [{ id: 1, url: item.image, type: "image/svg+xml", is_main: true }] : [],
    price: item.price,
    compareAtAmount: item.compareAt ? item.compareAt * 100 : null,
    compareAtPrice: item.compareAt,
    currency: "XOF",
    hasVariants: item.hasVariants,
    minOrderQuantity: 1,
    stock,
    status: LEGACY_STATUS[item.status] ?? "draft",
    statusCode: item.status,
    stockStatus: levelOf(stock),
    condition: 0,
    category: item.category,
    country_of_origin: "BF",
    weight: detail ? 350 : null,
    dimensions: { length: null, width: null, height: null },
    bulkPrices: detail && item.hasVariants ? [{ id: "tier-1", minQty: 10, price: item.price - 500, currency: "XOF", isActive: true }] : [],
    variants: item.variants.map(variantResource),
    description: item.description,
    shortDescription: item.shortDescription,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    ...(detail && item.moderation ? { moderation: { ...item.moderation, logs: [] } } : {}),
  };
}

function inventoryRow(item) {
  const stock = stockOf(item);
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    image: item.image ?? "/images/fallback-product.png",
    category: item.category,
    variants_count: item.variants.length,
    stock_available: stock,
    stock_reserved: 0,
    stock_alert_threshold: LOW,
    status: { in_stock: "disponible", low_stock: "faible", out_of_stock: "rupture" }[levelOf(stock)],
    last_updated: "il y a 2 heures",
    imageUrl: item.image,
    stockStatusCode: levelOf(stock),
    updatedAt: item.updatedAt,
    hasVariants: item.hasVariants,
    variants: item.variants.map((variant) => ({
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      stock: variant.stock,
      isDefault: variant.isDefault,
      isActive: variant.isActive,
      allowBackorder: false,
    })),
  };
}

// ── Queries ─────────────────────────────────────────────────

const fold = (text) => (text ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const compare = (a, b) => (a > b ? 1 : a < b ? -1 : 0);

function searched(rows, text, withVariantSku) {
  const search = fold(text).trim();
  if (!search) return rows;
  return rows.filter((item) =>
    [item.name, item.sku, ...(withVariantSku ? item.variants.map((variant) => variant.sku) : [])].some((value) => fold(value).includes(search)),
  );
}

function listed(products, params) {
  let rows = searched(products.filter((item) => item.storeId === STORE_ID), params.get("search"), false);
  const status = params.get("status");
  if (status && status !== "all") {
    const code = status === "published" ? "active" : status;
    rows = rows.filter((item) => item.status === code);
  }
  const stock = params.get("stock");
  if (stock) rows = rows.filter((item) => levelOf(stockOf(item)) === stock);

  const direction = params.get("direction") === "asc" ? 1 : -1;
  const key = { name: (item) => fold(item.name), price: (item) => item.price, stock: stockOf }[params.get("sort")] ?? ((item) => item.createdAt);
  return [...rows].sort((a, b) => direction * (compare(key(a), key(b)) || compare(a.id, b.id)));
}

function inventoried(products, params) {
  let rows = searched(products.filter((item) => item.storeId === STORE_ID), params.get("search"), true);
  const level = { disponible: "in_stock", stock_faible: "low_stock", rupture: "out_of_stock" }[params.get("status")];
  if (level) rows = rows.filter((item) => levelOf(stockOf(item)) === level);

  const [field, way] = (params.get("sort") ?? "updated_desc").split("_");
  const direction = way === "asc" ? 1 : -1;
  const key = { name: (item) => fold(item.name), stock: stockOf }[field] ?? ((item) => item.updatedAt);
  return [...rows].sort((a, b) => direction * compare(key(a), key(b)) || compare(a.id, b.id));
}

function stats(products) {
  const mine = products.filter((item) => item.storeId === STORE_ID);
  const count = (codes, of) => Object.fromEntries(codes.map((code) => [code, mine.filter((item) => of(item) === code).length]));
  const byStatus = count(["draft", "submitted", "active", "rejected", "archived", "changes_requested", "suspended"], (item) => item.status);
  const byStock = count(["in_stock", "low_stock", "out_of_stock"], (item) => levelOf(stockOf(item)));
  return { total: mine.length, published: byStatus.active, drafts: byStatus.draft, alerts: byStock.out_of_stock, outOfStock: byStock.out_of_stock, byStatus, byStock };
}

export default async function catalogExtension({ req, res, url, path, method, token, send, readJson }) {
  const state = stateOf(token);
  const own = (id) => state.products.find((item) => item.id === id && item.storeId === STORE_ID);
  const notFound = () => send(res, 404, { success: false, message: "Produit non trouvé." });
  const paged = (rows) => {
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(url.searchParams.get("limit") ?? 10));
    return { page, limit, slice: rows.slice((page - 1) * limit, page * limit), pages: Math.ceil(rows.length / limit) };
  };

  // ── Inventory ──
  if (method === "GET" && path === "/sellers/inventory/products") {
    const rows = inventoried(state.products, url.searchParams);
    const { page, limit, slice, pages } = paged(rows);
    return send(res, 200, { success: true, data: { items: slice.map(inventoryRow), pagination: { page, limit, total: rows.length, pages } } }), true;
  }
  if (method === "POST" && path === "/sellers/inventory/export") {
    const body = await readJson(req);
    if (body.format !== "csv") return send(res, 200, { success: true, data: { format: "csv", rows: 0, columns: [], data: [] } }), true;
    const lines = state.products
      .filter((item) => item.storeId === STORE_ID)
      .flatMap((item) => item.variants.map((variant) => [item.name, variant.title, variant.sku, item.category, variant.stock, variant.isActive ? "Oui" : "Non", item.updatedAt.slice(0, 16).replace("T", " ")].join(";")));
    res.writeHead(200, { "Content-Type": "text/csv; charset=UTF-8", "Content-Disposition": 'attachment; filename="inventaire.csv"' });
    res.end(`﻿${["Produit;Variante;SKU;Catégorie;Stock;Variante active;Mis à jour le", ...lines].join("\n")}\n`);
    return true;
  }
  const adjustment = path.match(/^\/sellers\/inventory\/([^/]+)\/add-stock$/);
  if (method === "POST" && adjustment) {
    const item = own(adjustment[1]);
    if (!item) return notFound(), true;
    const body = await readJson(req);
    if (!Number.isInteger(body.quantity) || body.quantity === 0) {
      return send(res, 422, { message: "La quantité est invalide.", errors: { quantity: ["La quantité est invalide."] } }), true;
    }
    const variant = body.variant_id ? item.variants.find((candidate) => candidate.id === body.variant_id) : item.variants.find((candidate) => candidate.isDefault) ?? item.variants[0];
    if (!variant) return notFound(), true;
    if (variant.stock + body.quantity < 0) {
      return send(res, 400, { success: false, message: "Le stock ne peut pas descendre sous zéro.", error_code: "SUGU-STOCK-NEGATIVE" }), true;
    }
    variant.stock += body.quantity;
    item.updatedAt = new Date().toISOString();
    return send(res, 200, { success: true, message: body.quantity > 0 ? "Stock ajouté avec succès" : "Stock réduit avec succès", data: { variantId: variant.id, stock: variant.stock } }), true;
  }

  // ── Products ──
  if (!path.startsWith("/sellers/products")) return false;

  if (method === "GET" && path === "/sellers/products") {
    const rows = listed(state.products, url.searchParams);
    const { page, slice, pages } = paged(rows);
    return send(res, 200, { success: true, data: { data: slice.map((item) => resource(item)), total: rows.length, page, totalPages: pages } }), true;
  }
  if (method === "GET" && path === "/sellers/products/stats") {
    return send(res, 200, { success: true, data: stats(state.products) }), true;
  }

  const match = path.match(/^\/sellers\/products\/([^/]+)$/);
  if (!match || ["categories", "brands", "variant-options"].includes(match[1])) return false;
  const item = own(match[1]);
  if (!item) return notFound(), true;

  if (method === "GET") return send(res, 200, { success: true, data: resource(item, true) }), true;
  if (method === "DELETE") {
    state.products = state.products.filter((candidate) => candidate !== item);
    return send(res, 200, { success: true, message: "Produit supprimé avec succès" }), true;
  }
  return false;
}
