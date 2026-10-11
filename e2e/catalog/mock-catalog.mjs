// Seller catalogue endpoints for the V2 smoke (playwright.catalog.config.ts),
// plugged into e2e/shell/mock-api.mjs. Payloads follow ProductResource,
// SellerProductController and SellerInventoryController (../sugu): prices in
// francs, backend status codes, stock summed over the active variants, the
// moderation workflow of ProductStatus, the same refusals as the real
// endpoints. One independent data set per session token, so tests can mutate
// the catalogue without seeing each other. Nothing here reaches a real backend.

const STORE_ID = "store-11";
const LOW = 10;
const DAY = 86_400_000;

// The five categories the products of the fixture are filed under, then the
// rest of a marketplace: 57 in all, too many for a list to scroll.
const OTHER_CATEGORIES = [
  "Accessoires de mode", "Alimentation générale", "Animaux", "Art et artisanat", "Auto et moto", "Bagagerie", "Bébé et puériculture",
  "Boissons", "Bricolage", "Céréales et farines", "Chaussures enfant", "Chaussures femme", "Chaussures homme", "Coiffure",
  "Condiments et épices", "Cosmétiques", "Cuisine et arts de la table", "Décoration", "Électroménager", "Électronique",
  "Fournitures scolaires", "Fruits et légumes", "Huiles et karité", "Informatique", "Instruments de musique", "Jardin", "Jeux et jouets",
  "Librairie", "Linge de maison", "Literie", "Luminaires", "Maroquinerie", "Matériel agricole", "Mercerie", "Meubles", "Montres",
  "Papeterie", "Parfums", "Pagnes et tissus", "Poterie", "Produits d'entretien", "Quincaillerie", "Santé et bien-être", "Sculptures",
  "Sport et loisirs", "Téléphones et accessoires", "Tenues traditionnelles", "Vannerie", "Vêtements enfant", "Vêtements femme",
  "Vêtements homme", "Volaille et élevage",
];
const CATEGORIES = [
  { id: "cat-textile", name: "Textile" },
  { id: "cat-beaute", name: "Beauté" },
  { id: "cat-maison", name: "Maison" },
  { id: "cat-epicerie", name: "Épicerie" },
  { id: "cat-bijoux", name: "Bijoux" },
  ...OTHER_CATEGORIES.map((name, index) => ({ id: `cat-${index + 6}`, name })),
];
const NAMES = ["Pagne tissé", "Savon au karité", "Panier tressé", "Miel de Fada", "Bogolan", "Beurre de karité", "Calebasse gravée"];

// ── Fixture pictures ────────────────────────────────────────
// Drawn here, so no test depends on a file or on the network. They stand for
// the seller's photos; the application's own "no picture" and "broken
// picture" marks are exercised by products that have none or a dead URL.

const PALETTES = [
  ["#f3ece2", "#1f3a68", "#e0792b", "#f7f3ea"],
  ["#eef2ea", "#7a4a25", "#d9a441", "#f4ead8"],
  ["#f1eaf0", "#5b2a55", "#c94f7c", "#f6eef4"],
  ["#eaf1f3", "#17555c", "#e3b23c", "#f2f7f8"],
  ["#f5efe6", "#8c2f1b", "#2f6f4f", "#faf5ec"],
];

function drawing(palette, transparent = false) {
  const [background, main, accent, light] = PALETTES[palette % PALETTES.length];
  const stripes = Array.from({ length: 7 }, (_, index) => `<rect x="${-105 + index * 32}" y="-130" width="14" height="260" fill="${index % 2 ? accent : light}" opacity="0.9"/>`).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">` +
    (transparent ? "" : `<rect width="400" height="400" fill="${background}"/><ellipse cx="200" cy="352" rx="120" ry="14" fill="#000" opacity="0.08"/>`) +
    `<g transform="translate(200 205)"><rect x="-118" y="-138" width="236" height="276" rx="20" fill="${main}"/>${stripes}` +
    `<rect x="-118" y="62" width="236" height="26" fill="${accent}"/><rect x="-118" y="-98" width="236" height="10" fill="${light}" opacity="0.7"/></g></svg>`
  );
}

const picture = (palette) => `data:image/svg+xml,${encodeURIComponent(drawing(palette))}`;

let mediaSequence = 100;
const media = (palette, isMain = false, extra = {}) => ({ id: ++mediaSequence, url: picture(palette), isMain, palette, ...extra });

/** A stable palette for an uploaded file: the same file always gives the same drawing. */
const paletteOf = (filename) => Array.from(filename).reduce((sum, character) => sum + character.charCodeAt(0), 0);

// ── Seed ────────────────────────────────────────────────────

function product(sequence, overrides = {}) {
  const price = 1500 + (sequence % 9) * 750;
  const sku = `SKU-${String(sequence).padStart(4, "0")}`;
  return {
    id: `product-${String(sequence).padStart(3, "0")}`,
    storeId: STORE_ID,
    name: `${NAMES[sequence % NAMES.length]} n°${sequence}`,
    sku,
    categoryIds: [CATEGORIES[sequence % 4].id],
    price,
    compareAt: null,
    status: "active",
    hasVariants: false,
    // Most products have a photo; one in five has none yet.
    pictures: sequence % 5 === 0 ? [] : [media(sequence, true)],
    createdAt: new Date(Date.UTC(2026, 8, 1) + sequence * DAY).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 9, 1) + sequence * 3_600_000).toISOString(),
    description: "<p>Fabriqué à Ouagadougou.</p><p>Lavage à la main.</p>",
    shortDescription: null,
    weight: null,
    originCountry: "BF",
    minOrderQuantity: 1,
    trackStock: true,
    lowStockThreshold: 10,
    bulkPrices: [],
    moderation: null,
    variants: [{ id: `variant-${sequence}-1`, title: "Default", sku, price, stock: 20 + sequence, isDefault: true, isActive: true, options: {} }],
    ...overrides,
  };
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
      categoryIds: ["cat-textile", "cat-bijoux"],
      pictures: [media(0, true), media(2), media(3)],
      shortDescription: "Chemise tissée, coupe droite",
      description: "<h2>Tissage</h2><p>Coton <strong>tissé main</strong> à Ouagadougou.</p><ul><li>Coupe droite</li><li>Lavage à la main</li></ul><script>window.__xss = true</script>",
      weight: 350,
      bulkPrices: [{ id: "tier-1", minQty: 10, price: 7000 }],
      variants: [
        { id: "variant-41-rm", title: "Rouge / M", sku: "CHM-R-M", price: 7500, stock: 4, isDefault: true, isActive: true, options: { Couleur: "Rouge", Taille: "M" } },
        { id: "variant-41-bl", title: "Bleu / L", sku: "CHM-B-L", price: 8000, stock: 3, isDefault: false, isActive: true, options: { Couleur: "Bleu", Taille: "L" } },
        { id: "variant-41-vs", title: "Vert / S", sku: "CHM-V-S", price: 7500, stock: 25, isDefault: false, isActive: false, options: { Couleur: "Vert", Taille: "S" } },
      ],
    }),
    // No picture at all: the application shows its own neutral mark.
    product(42, { id: "product-out", name: "Sac en cuir de Kaya", sku: "SAC-0042", status: "active", pictures: [], variants: [{ id: "variant-42-1", title: "Default", sku: "SAC-0042", price: 12000, stock: 0, isDefault: true, isActive: true, options: {} }], price: 12000 }),
    // A picture whose file is gone: the application shows its broken mark.
    product(43, { id: "product-low", name: "Bracelet en bronze", sku: "BRA-0043", status: "active", pictures: [{ id: 9043, url: "/__missing/bracelet.jpg", isMain: true }], variants: [{ id: "variant-43-1", title: "Default", sku: "BRA-0043", price: 2500, stock: 3, isDefault: true, isActive: true, options: {} }], price: 2500 }),
    product(44, { id: "product-submitted", name: "Tunique brodée", sku: "TUN-0044", status: "submitted" }),
    product(45, {
      id: "product-rejected",
      name: "Sandales tressées",
      sku: "SAN-0045",
      status: "rejected",
      moderation: { rejectionReason: "La photo principale est floue.", notePublic: "Ajoutez une photo nette sur fond clair.", reviewedAt: "2026-10-02T09:00:00.000000Z", submittedAt: "2026-10-01T09:00:00.000000Z" },
    }),
    // A complete draft: ready to be submitted.
    product(46, { id: "product-to-delete", name: "Coussin en bogolan", sku: "COU-0046", status: "draft" }),
    // An incomplete draft: no picture, no category, no description. Opened by
    // id only: it is not counted in the catalogue the list tests check.
    product(47, { id: "product-incomplete", name: "Natte de Dori", sku: "NAT-0047", status: "draft", pictures: [], categoryIds: [], description: null, unlisted: true }),
  );

  // A product of another store: must never be listed nor opened.
  products.push(product(99, { id: "product-foreign", name: "Produit d'une autre boutique", storeId: "store-other" }));
  return products;
}

const states = new Map();
function stateOf(token) {
  if (!states.has(token)) states.set(token, { products: seed(), previews: new Map(), descriptionPictures: new Map(), created: 0, received: [] });
  return states.get(token);
}

// ── Projections ─────────────────────────────────────────────

const stockOf = (item) => item.variants.filter((variant) => variant.isActive).reduce((sum, variant) => sum + variant.stock, 0);
const levelOf = (stock) => (stock <= 0 ? "out_of_stock" : stock <= LOW ? "low_stock" : "in_stock");
const LEGACY_STATUS = { active: "published", archived: "archived" };
const SUBMITTABLE = ["draft", "rejected", "changes_requested"];
const coverOf = (item) => (item.pictures.find((candidate) => candidate.isMain) ?? item.pictures[0])?.url ?? null;
const categoryName = (id) => CATEGORIES.find((category) => category.id === id)?.name ?? "";

function variantResource(item, variant) {
  return {
    id: variant.id,
    title: variant.title,
    sku: variant.sku,
    price_amount: variant.price * 100,
    price: variant.price,
    stock: variant.stock,
    trackStock: item.trackStock,
    allowBackorder: Boolean(variant.allowBackorder),
    lowStockThreshold: variant.lowStockThreshold ?? item.lowStockThreshold,
    minOrderQuantity: variant.minOrderQuantity ?? null,
    isActive: variant.isActive,
    isDefault: variant.isDefault,
    options: variant.options ?? {},
    bulkPrices: (variant.bulkPrices ?? []).map((tier, index) => ({ id: `${variant.id}-tier-${index}`, minQty: tier.minQty, price: tier.price, currency: "XOF", isActive: true })),
  };
}

function resource(item, detail = false) {
  const stock = stockOf(item);
  const cover = coverOf(item);
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    brand: "",
    image: cover ?? "https://cdn.sugu.pro/s/theme/fallback-product.png",
    main_image: cover,
    gallery: item.pictures.map((candidate) => ({ id: candidate.id, url: candidate.url, type: "image/jpeg", is_main: candidate.isMain, background_removed: Boolean(candidate.detoured) })),
    original_images: item.pictures.filter((candidate) => candidate.originalOf).map((candidate) => ({ id: candidate.originalOf, url: picture(0), replaced_by_media_id: candidate.id })),
    price: item.price,
    compareAtAmount: item.compareAt ? item.compareAt * 100 : null,
    compareAtPrice: item.compareAt,
    currency: "XOF",
    hasVariants: item.hasVariants,
    minOrderQuantity: item.minOrderQuantity,
    stock,
    status: LEGACY_STATUS[item.status] ?? "draft",
    statusCode: item.status,
    canSubmit: SUBMITTABLE.includes(item.status),
    stockStatus: levelOf(stock),
    condition: 0,
    category: categoryName(item.categoryIds[0]),
    primary_category_id: item.categoryIds[0] ?? null,
    category_ids: item.categoryIds,
    country_of_origin: item.originCountry,
    weight: item.weight,
    dimensions: { length: null, width: null, height: null },
    bulkPrices: item.bulkPrices.map((tier, index) => ({ id: tier.id ?? `tier-${index}`, minQty: tier.minQty, price: tier.price, currency: "XOF", isActive: true })),
    variants: item.variants.map((variant) => variantResource(item, variant)),
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
    image: coverOf(item) ?? "/images/fallback-product.png",
    category: categoryName(item.categoryIds[0]),
    variants_count: item.variants.length,
    stock_available: stock,
    stock_reserved: 0,
    stock_alert_threshold: LOW,
    status: { in_stock: "disponible", low_stock: "faible", out_of_stock: "rupture" }[levelOf(stock)],
    last_updated: "il y a 2 heures",
    imageUrl: coverOf(item),
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
const mine = (products) => products.filter((item) => item.storeId === STORE_ID && !item.unlisted);

function searched(rows, text, withVariantSku) {
  const search = fold(text).trim();
  if (!search) return rows;
  return rows.filter((item) =>
    [item.name, item.sku, ...(withVariantSku ? item.variants.map((variant) => variant.sku) : [])].some((value) => fold(value).includes(search)),
  );
}

function listed(products, params) {
  let rows = searched(mine(products), params.get("search"), false);
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
  let rows = searched(mine(products), params.get("search"), true);
  const level = { disponible: "in_stock", stock_faible: "low_stock", rupture: "out_of_stock" }[params.get("status")];
  if (level) rows = rows.filter((item) => levelOf(stockOf(item)) === level);

  const [field, way] = (params.get("sort") ?? "updated_desc").split("_");
  const direction = way === "asc" ? 1 : -1;
  const key = { name: (item) => fold(item.name), stock: stockOf }[field] ?? ((item) => item.updatedAt);
  return [...rows].sort((a, b) => direction * compare(key(a), key(b)) || compare(a.id, b.id));
}

function stats(products) {
  const rows = mine(products);
  const count = (codes, of) => Object.fromEntries(codes.map((code) => [code, rows.filter((item) => of(item) === code).length]));
  const byStatus = count(["draft", "submitted", "active", "rejected", "archived", "changes_requested", "suspended"], (item) => item.status);
  const byStock = count(["in_stock", "low_stock", "out_of_stock"], (item) => levelOf(stockOf(item)));
  return { total: rows.length, published: byStatus.active, drafts: byStatus.draft, alerts: byStock.out_of_stock, outOfStock: byStock.out_of_stock, byStatus, byStock };
}

// ── Multipart (what the product form sends) ─────────────────

async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** Fields (name → values, in order) and files of a multipart/form-data or JSON body. */
async function readForm(req) {
  const raw = await readRaw(req);
  const type = req.headers["content-type"] ?? "";
  const fields = new Map();
  const files = [];
  const push = (name, value) => fields.set(name, [...(fields.get(name) ?? []), value]);

  const boundary = type.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  if (!boundary) {
    try {
      for (const [name, value] of Object.entries(JSON.parse(raw.toString("utf8") || "{}"))) push(name, String(value));
    } catch {
      // Not JSON either: no field.
    }
    return { fields, files };
  }

  const delimiter = `--${boundary[1] ?? boundary[2]}`;
  for (const part of raw.toString("latin1").split(delimiter).slice(1, -1)) {
    const split = part.indexOf("\r\n\r\n");
    const head = part.slice(0, split);
    const body = part.slice(split + 4).replace(/\r\n$/, "");
    const name = head.match(/name="([^"]*)"/)?.[1];
    const filename = head.match(/filename="([^"]*)"/)?.[1];
    if (!name) continue;
    if (filename !== undefined) files.push({ name, filename: Buffer.from(filename, "latin1").toString("utf8"), size: body.length });
    else push(name, Buffer.from(body, "latin1").toString("utf8"));
  }
  return { fields, files };
}

const one = (form, name) => form.fields.get(name)?.[0];
const all = (form, name) => form.fields.get(name) ?? [];

/** `variants[0][options][Couleur]` style keys → list of variant objects. */
function nested(form, root) {
  const rows = [];
  for (const [name, values] of form.fields) {
    const match = name.match(new RegExp(`^${root}\\[(\\d+)\\]\\[([^\\]]+)\\](?:\\[([^\\]]+)\\])?(?:\\[([^\\]]+)\\])?$`));
    if (!match) continue;
    const [, index, key, sub, leaf] = match;
    const row = (rows[Number(index)] ??= {});
    if (sub === undefined) row[key] = values[0];
    else if (leaf === undefined) (row[key] ??= {})[sub] = values[0];
    else (((row[key] ??= [])[Number(sub)] ??= {})[leaf] = values[0]);
  }
  return rows.filter(Boolean);
}

function validation(form, products, current) {
  const errors = {};
  const name = (one(form, "name") ?? "").trim();
  if (!name) errors.name = ["Le nom du produit est obligatoire."];
  if (one(form, "price") === undefined || Number.isNaN(Number(one(form, "price")))) errors.price = ["Le prix est obligatoire."];
  if (one(form, "compareAtPrice") && Number(one(form, "compareAtPrice")) < Number(one(form, "price"))) {
    errors.compareAtPrice = ["Le prix barré doit être supérieur ou égal au prix de vente."];
  }
  // SKUs are unique across the whole catalogue (product_variants.sku).
  const taken = new Set(products.filter((item) => item !== current).flatMap((item) => item.variants.map((variant) => fold(variant.sku))));
  nested(form, "variants").forEach((variant, index) => {
    if (variant.sku && taken.has(fold(variant.sku))) errors[`variants.${index}.sku`] = ["Cette référence est déjà utilisée par un autre produit."];
  });
  return errors;
}

// Where the browser reaches this API: through the portal's own proxy.
const APP_ORIGIN = process.env.MOCK_APP_ORIGIN ?? "http://localhost:3220";

/**
 * What Laravel does to a description on save (HtmlSanitizer, then
 * DescriptionImageService): scripts and handlers are removed, and each
 * picture inlined by the editor is stored, the markup pointing to the file.
 */
function storedDescription(html, item, state) {
  if (!html) return null;
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/src="data:image\/(png|jpe?g|gif|webp);base64,([^"]+)"/g, (_, type, data) => {
      const id = `${item.id}-${state.descriptionPictures.size + 1}`;
      state.descriptionPictures.set(id, { type: `image/${type}`, data });
      return `src="${APP_ORIGIN}/api/proxy/__catalog/description/${id}"`;
    });
}

function applyForm(item, form, state, creating) {
  item.name = one(form, "name").trim();
  item.description = storedDescription(one(form, "description"), item, state);
  item.price = Number(one(form, "price"));
  item.compareAt = one(form, "compareAtPrice") ? Number(one(form, "compareAtPrice")) : null;
  item.categoryIds = all(form, "category[]");
  item.originCountry = one(form, "country_of_origin") ?? item.originCountry ?? null;
  if (one(form, "weight")) item.weight = Math.round(Number(one(form, "weight")) * (one(form, "weightUnit") === "kg" ? 1000 : 1));
  item.minOrderQuantity = Number(one(form, "minOrderQuantity") ?? 1);
  item.trackStock = one(form, "trackStock") !== "0";
  item.lowStockThreshold = Number(one(form, "lowStockThreshold") ?? 10);
  item.bulkPrices = one(form, "hasBulkPricing") === "1" ? nested(form, "bulkPrices").map((tier) => ({ minQty: Number(tier.minQty), price: Number(tier.price) })) : [];

  const variants = one(form, "hasVariants") === "1" ? nested(form, "variants") : [];
  item.hasVariants = variants.length > 0;
  if (item.hasVariants) {
    item.variants = variants.map((variant, index) => ({
      id: `${item.id}-variant-${index + 1}`,
      title: Object.values(variant.options).join(" / "),
      sku: variant.sku || `${item.id.toUpperCase()}-${index + 1}`,
      price: Number(variant.price),
      stock: Number(variant.stock),
      minOrderQuantity: Number(variant.minOrderQuantity ?? 1),
      lowStockThreshold: Number(variant.lowStockThreshold ?? 10),
      allowBackorder: variant.allowBackorder === "1",
      bulkPrices: (variant.bulkPrices ?? []).map((tier) => ({ minQty: Number(tier.minQty), price: Number(tier.price) })),
      isDefault: index === 0,
      isActive: true,
      options: variant.options,
    }));
  } else {
    const simple = item.variants.find((variant) => variant.isDefault) ?? item.variants[0];
    item.variants = [{ id: simple?.id ?? `${item.id}-variant-1`, title: "Default", sku: simple?.sku ?? item.sku, price: item.price, stock: Number(one(form, "stock") ?? 0), isDefault: true, isActive: true, options: {} }];
  }

  // ── Pictures ──
  const removedIds = all(form, "remove_media_ids[]").map(Number);
  item.pictures = item.pictures.filter((candidate) => !removedIds.includes(candidate.id));
  const files = form.files.filter((file) => file.name === (creating ? "images[]" : "gallery[]"));
  files.forEach((file) => item.pictures.push(media(paletteOf(file.filename), false, { filename: file.filename })));

  // A detoured preview becomes a picture of its own; the original stays stored.
  const mainPreview = one(form, "background_removal_main_preview_id");
  for (const previewId of all(form, "background_removal_preview_ids[]")) {
    const preview = state.previews.get(previewId);
    if (!preview) continue;
    item.pictures.push({ id: ++mediaSequence, url: `data:image/svg+xml,${encodeURIComponent(drawing(preview.palette, true))}`, isMain: false, detoured: true, originalOf: ++mediaSequence, main: previewId === mainPreview });
    state.previews.delete(previewId);
  }

  const mainId = Number(one(form, "main_media_id"));
  const promoted = item.pictures.find((candidate) => candidate.main) ?? item.pictures.find((candidate) => candidate.id === mainId);
  if (promoted) item.pictures.forEach((candidate) => (candidate.isMain = candidate === promoted));
  item.pictures.forEach((candidate) => delete candidate.main);
  // At creation the storefront takes the first picture of the collection.
  if (item.pictures.length > 0 && !item.pictures.some((candidate) => candidate.isMain)) item.pictures[0].isMain = true;

  item.updatedAt = new Date().toISOString();
}

function blockers(item) {
  const missing = [];
  if (item.pictures.length === 0) missing.push("Aucune image produit");
  if (item.categoryIds.length === 0) missing.push("Aucune catégorie assignée");
  if (!(item.price > 0)) missing.push("Prix non défini ou à 0");
  if (!item.description && !item.shortDescription) missing.push("Aucune description");
  if ((item.name ?? "").trim().length < 3) missing.push("Nom trop court");
  return missing;
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

  // What the form sent, for the tests that check the request itself.
  if (method === "GET" && path === "/__catalog/received") return send(res, 200, { received: state.received }), true;

  // A picture of a description, once stored.
  const descriptionPicture = path.match(/^\/__catalog\/description\/([^/]+)$/);
  if (method === "GET" && descriptionPicture) {
    const stored = state.descriptionPictures.get(descriptionPicture[1]);
    if (!stored) return send(res, 404, { success: false, message: "Image introuvable." }), true;
    res.writeHead(200, { "Content-Type": stored.type });
    res.end(Buffer.from(stored.data, "base64"));
    return true;
  }

  // ── Detouring (sellers/image-processing, sellers/image-background-removal) ──
  if (method === "GET" && path === "/sellers/image-processing/capabilities") {
    return (
      send(res, 200, {
        success: true,
        data: { enabled: true, provider: "mock", accepted_mimes: ["image/jpeg", "image/png", "image/webp"], max_file_size_kb: 5120, max_width: 4096, max_height: 4096, temporarily_unavailable: false },
      }),
      true
    );
  }
  if (method === "POST" && path === "/sellers/image-background-removal/previews") {
    const form = await readForm(req);
    const file = form.files[0];
    if (file && /echec/i.test(file.filename)) {
      return send(res, 422, { success: false, message: "Cette image n'a pas pu être détourée. Essayez avec une photo sur fond uni." }), true;
    }
    // The preview is the same picture without its background.
    const stored = state.products.flatMap((item) => item.pictures).find((candidate) => String(candidate.id) === one(form, "media_id"));
    if (!file && !stored) return send(res, 404, { success: false, message: "Photo introuvable." }), true;
    const id = `preview-${state.previews.size + 1}-${Date.now().toString(36)}`;
    state.previews.set(id, { palette: file ? paletteOf(file.filename) : (stored.palette ?? 0), source: file ? file.filename : `media-${stored.id}` });
    return send(res, 200, { success: true, data: { preview_id: id, provider: "mock", preview_url: `/previews/${id}`, expires_at: new Date(Date.now() + 3_600_000).toISOString() } }), true;
  }
  const previewImage = path.match(/^\/sellers\/image-background-removal\/previews\/([^/]+)\/image$/);
  if (method === "GET" && previewImage) {
    const preview = state.previews.get(previewImage[1]);
    if (!preview) return send(res, 404, { success: false, message: "Aperçu expiré." }), true;
    res.writeHead(200, { "Content-Type": "image/svg+xml" });
    res.end(drawing(preview.palette, true));
    return true;
  }
  const previewDelete = path.match(/^\/sellers\/image-background-removal\/previews\/([^/]+)$/);
  if (method === "DELETE" && previewDelete) {
    state.previews.delete(previewDelete[1]);
    return send(res, 200, { success: true }), true;
  }

  // ── Inventory ──
  if (method === "GET" && path === "/sellers/inventory/products") {
    const rows = inventoried(state.products, url.searchParams);
    const { page, limit, slice, pages } = paged(rows);
    return send(res, 200, { success: true, data: { items: slice.map(inventoryRow), pagination: { page, limit, total: rows.length, pages } } }), true;
  }
  if (method === "POST" && path === "/sellers/inventory/export") {
    const body = await readJson(req);
    if (body.format !== "csv") return send(res, 200, { success: true, data: { format: "csv", rows: 0, columns: [], data: [] } }), true;
    const lines = mine(state.products).flatMap((item) =>
      item.variants.map((variant) => [item.name, variant.title, variant.sku, categoryName(item.categoryIds[0]), variant.stock, variant.isActive ? "Oui" : "Non", item.updatedAt.slice(0, 16).replace("T", " ")].join(";")),
    );
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
    const variant = body.variant_id ? item.variants.find((candidate) => candidate.id === body.variant_id) : (item.variants.find((candidate) => candidate.isDefault) ?? item.variants[0]);
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
  if (method === "GET" && path === "/sellers/products/stats") return send(res, 200, { success: true, data: stats(state.products) }), true;
  if (method === "GET" && path === "/sellers/products/categories") {
    // Ordered by name, as `sellers/products/categories` answers them.
    const byName = [...CATEGORIES].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return send(res, 200, { success: true, data: byName.map((category) => ({ ...category, slug: category.id })) }), true;
  }
  if (method === "GET" && ["/sellers/products/brands", "/sellers/products/variant-options"].includes(path)) return send(res, 200, { success: true, data: [] }), true;

  // Creation: always a draft, whatever the request asks.
  if (method === "POST" && path === "/sellers/products") {
    const form = await readForm(req);
    state.received.push({ path, fields: Object.fromEntries(form.fields), files: form.files.map((file) => `${file.name}:${file.filename}`) });
    if ((one(form, "name") ?? "").includes("Panne serveur")) return send(res, 500, { success: false, message: "SQLSTATE[HY000]: General error" }), true;
    const errors = validation(form, state.products, null);
    if (Object.keys(errors).length > 0) return send(res, 422, { success: false, message: Object.values(errors)[0][0], errors }), true;

    state.created += 1;
    const item = product(200 + state.created, { id: `product-new-${state.created}`, status: one(form, "status") === "published" ? "active" : "draft", pictures: [], createdAt: new Date().toISOString() });
    item.sku = `NEW-${String(state.created).padStart(4, "0")}`;
    item.variants = [];
    applyForm(item, form, state, true);
    state.products.push(item);
    return send(res, 201, { success: true, message: "Produit créé avec succès", data: resource(item, true) }), true;
  }

  const submission = path.match(/^\/sellers\/products\/([^/]+)\/submit$/);
  if (method === "POST" && submission) {
    const item = own(submission[1]);
    if (!item) return notFound(), true;
    if (!SUBMITTABLE.includes(item.status)) {
      const message = item.status === "submitted" ? "Ce produit est déjà en cours de validation." : "Ce produit ne peut pas être soumis à validation.";
      return send(res, 422, { success: false, message, error_code: "SUGU-PRODUCT-NOT-SUBMITTABLE", blockers: [] }), true;
    }
    const missing = blockers(item);
    if (missing.length > 0) {
      return send(res, 422, { success: false, message: `Complétez le produit avant de le soumettre : ${missing.join(", ")}.`, error_code: "SUGU-PRODUCT-NOT-READY", blockers: missing }), true;
    }
    item.status = "submitted";
    item.moderation = { rejectionReason: null, notePublic: null, reviewedAt: null, submittedAt: new Date().toISOString() };
    return send(res, 200, { success: true, message: "Produit soumis à validation.", data: resource(item, true) }), true;
  }

  const match = path.match(/^\/sellers\/products\/([^/]+)$/);
  if (!match) return false;
  const item = own(match[1]);
  if (!item) return notFound(), true;

  if (method === "GET") return send(res, 200, { success: true, data: resource(item, true) }), true;
  if (method === "DELETE") {
    state.products = state.products.filter((candidate) => candidate !== item);
    return send(res, 200, { success: true, message: "Produit supprimé avec succès" }), true;
  }
  // Update: POST with `_method=PUT`. The status is not touched.
  if (method === "POST" || method === "PUT") {
    const form = await readForm(req);
    state.received.push({ path, fields: Object.fromEntries(form.fields), files: form.files.map((file) => `${file.name}:${file.filename}`) });
    const errors = validation(form, state.products, item);
    if (Object.keys(errors).length > 0) return send(res, 422, { success: false, message: Object.values(errors)[0][0], errors }), true;
    applyForm(item, form, state, false);
    return send(res, 200, { success: true, message: "Produit mis à jour", data: resource(item, true) }), true;
  }
  return false;
}
