/**
 * Products Service
 * Handles: products CRUD, categories, brands, variants, image preview, product creation
 */
import {
  vendorProductsResponseSchema,
  vendorProductDetailSchema,
  productCategorySchema,
  productBrandSchema,
  variantOptionItemSchema,
  createProductResponseSchema,
  imagePreviewResponseSchema,
  type VendorProductsResponse,
  type VendorProductDetail,
  type ProductCategory,
  type ProductBrand,
  type CreateProductRequest,
  type CreateProductResponse,
  type VariantOptionItem,
  type ImagePreviewResponse,
} from "../schema";
import { api } from "@/lib/http/client";
import { deriveEmoji } from "./_shared";

// ── Raw API Types ──────────────────────────────────────────

interface RawProductItem {
  id: string;
  name: string;
  sku?: string;
  brand?: string;
  brand_id?: string;
  image?: string;
  main_image?: string | null;
  gallery?: Array<{ id: string | number; url: string; type?: string }>;
  all_images?: Array<{ id: string | number; url: string }>;
  price?: number;
  currency?: string;
  stock?: number;
  sales?: number;
  status?: string;
  moderationStatus?: string;
  stockStatus?: string;
  condition?: string;
  channel?: string;
  category?: string;
  primary_category_id?: string;
  weight?: number | null;
  dimensions?: { length?: number | null; width?: number | null; height?: number | null };
  bulkPrices?: Array<{ id: string; minQty: number; price: number; currency: string; isActive: boolean }>;
  variants?: Array<{ id: string; title?: string; sku?: string; price_amount?: number; stock?: number; meta?: Record<string, unknown>; options?: Record<string, string> }>;
  description?: string;
  shortDescription?: string;
  createdAt?: string;
  moderation?: {
    status: number | null;
    statusLabel: string;
    statusColor: string;
    rejectionReason?: string | null;
    notePublic?: string | null;
    reviewedAt?: string | null;
    submittedAt?: string | null;
    reviewer?: { id: string; name: string } | null;
    submitter?: { id: string; name: string } | null;
    logs: Array<{
      id: string;
      action: string;
      fromStatus: number | null;
      toStatus: number | null;
      actor: string;
      context?: Record<string, unknown> | null;
      date?: string | null;
    }>;
  };
  auditLogs?: Array<{
    id: string;
    event: string;
    description?: string | null;
    actor: string;
    changes?: Record<string, unknown> | null;
    old?: Record<string, unknown> | null;
    date?: string | null;
  }>;
}

interface RawProductStats {
  success: boolean;
  data: {
    total?: number;
    published?: number;
    drafts?: number;
    alerts?: number;
    outOfStock?: number;
  };
}

const PRODUCT_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  out_of_stock: "En rupture",
  low_stock: "Stock faible",
  draft: "Brouillon",
  archived: "Archivé",
};

const WEIGHT_UNIT_MAP: Record<string, string> = {
  Gramme: "g",
  Kilogramme: "kg",
  Litre: "kg",
  Millilitre: "g",
  Unité: "g",
};

// ── Helpers ────────────────────────────────────────────────

function _mapProductStatus(status?: string, stockStatus?: string): string {
  if (status === "published" || status === "active") {
    if (stockStatus === "out_of_stock") return "out_of_stock";
    if (stockStatus === "low_stock") return "low_stock";
    return "active";
  }
  if (status === "draft") return "draft";
  if (status === "archived") return "archived";
  return "draft";
}

// ── Public API ─────────────────────────────────────────────

/**
 * Fetch vendor products (paginated, filterable).
 * Calls GET /v1/sellers/products + GET /v1/sellers/products/stats in parallel.
 */
export async function getVendorProducts(
  status?: string,
  page?: number,
  search?: string,
): Promise<VendorProductsResponse> {
  const params: Record<string, string | number | undefined> = {
    page: page ?? 1,
    limit: 12,
  };
  if (search) params.search = search;
  if (status && status !== "all") {
    const statusMap: Record<string, string> = {
      active: "published",
      draft: "draft",
      archived: "archived",
      out_of_stock: "published",
    };
    params.status = statusMap[status] ?? status;
  }

  const [productsRes, statsRes] = await Promise.all([
    api.get<{ success: boolean; data: { data: RawProductItem[]; total: number; page: number; totalPages: number } }>(
      "sellers/products",
      { params },
    ),
    api.get<RawProductStats>("sellers/products/stats"),
  ]);

  const rawProducts = productsRes.data?.data ?? [];
  const rawTotal = productsRes.data?.total ?? 0;
  const rawPage = productsRes.data?.page ?? 1;
  const rawTotalPages = productsRes.data?.totalPages ?? 1;

  const products = rawProducts.map((raw) => _transformProductListItem(raw));

  const statsData = statsRes.data ?? {};
  const totalCount = statsData.total ?? 0;
  const publishedCount = statsData.published ?? 0;
  const draftsCount = statsData.drafts ?? 0;
  const outOfStockCount = statsData.outOfStock ?? 0;
  const archivedCount = Math.max(0, totalCount - publishedCount - draftsCount);

  return vendorProductsResponseSchema.parse({
    products,
    statusCounts: {
      all: totalCount,
      active: publishedCount,
      out_of_stock: outOfStockCount,
      draft: draftsCount,
      archived: archivedCount,
    },
    pagination: {
      currentPage: rawPage,
      totalPages: rawTotalPages,
      perPage: 12,
      totalItems: rawTotal,
    },
  });
}

/** Fetch a single product detail. */
export async function getVendorProductDetail(id: string): Promise<VendorProductDetail> {
  const res = await api.get<{ success: boolean; data: RawProductItem }>(`sellers/products/${id}`);
  return vendorProductDetailSchema.parse(_transformProductDetailResponse(res.data));
}

/** Delete a product */
export async function deleteVendorProduct(id: string): Promise<{ success: boolean; message: string }> {
  return api.delete<{ success: boolean; message: string }>(`sellers/products/${id}`);
}

/** Fetch product categories */
export async function getProductCategories(): Promise<ProductCategory[]> {
  const res = await api.get<{ success: boolean; data: Array<{ id: string; name: string; slug: string }> }>(
    "sellers/products/categories",
  );
  return (res.data ?? []).map((cat) => productCategorySchema.parse(cat));
}

/** Fetch product brands */
export async function getProductBrands(): Promise<ProductBrand[]> {
  const res = await api.get<{ success: boolean; data: Array<{ id: string; name: string; slug: string }> }>(
    "sellers/products/brands",
  );
  return (res.data ?? []).map((brand) => productBrandSchema.parse(brand));
}

/** Fetch variant option types */
export async function getVariantOptions(): Promise<VariantOptionItem[]> {
  const res = await api.get<{ success: boolean; data: Array<{ label: string; value: string }> }>(
    "sellers/products/variant-options",
  );
  return (res.data ?? []).map((item) => variantOptionItemSchema.parse(item));
}

/** Send a single image to backend for background removal */
export async function previewProductImage(file: File): Promise<ImagePreviewResponse> {
  const fd = new FormData();
  fd.append("image", file);

  const response = await fetch("/api/vendor/products/preview-image", {
    method: "POST",
    body: fd,
    credentials: "include",
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
    const { ApiError } = await import("@/lib/http/api-error");
    throw new ApiError({
      message: errorJson.message ?? `HTTP ${response.status}`,
      status: response.status,
      code: errorJson.code ?? `HTTP_${response.status}`,
    });
  }

  const res = await response.json();
  return imagePreviewResponseSchema.parse(res.data);
}

/** Create a new product via the vendor dashboard */
export async function createVendorProduct(
  formData: {
    name: string;
    description: string;
    price: string;
    originalPrice: string;
    stock: string;
    weightValue: string;
    weightUnit: string;
    publishMode: "publish" | "draft";
    hasBulkPricing: boolean;
    bulkTiers: Array<{ minQty: string; price: string }>;
    hasVariants?: boolean;
    generatedVariants?: Array<{
      id: string;
      combination: Record<string, string>;
      price: string;
      stock: string;
      sku: string;
    }>;
  },
  categoryId?: string,
  images?: File[],
  previewIds?: string[],
): Promise<CreateProductResponse> {
  const requestBody = _transformCreateProductRequest(formData, categoryId);

  const hasImages = images && images.length > 0;
  const hasPreviewIds = previewIds && previewIds.length > 0;

  if (hasImages || hasPreviewIds) {
    const fd = new FormData();
    fd.append("name", requestBody.name);
    if (requestBody.description) fd.append("description", requestBody.description);
    fd.append("price", String(requestBody.price));
    if (requestBody.stock !== undefined) fd.append("stock", String(requestBody.stock));
    if (requestBody.primary_category_id) fd.append("primary_category_id", requestBody.primary_category_id);
    if (requestBody.brand_id) fd.append("brand_id", requestBody.brand_id);
    fd.append("status", requestBody.status);
    if (requestBody.weight !== undefined) fd.append("weight", String(requestBody.weight));
    if (requestBody.weightUnit) fd.append("weightUnit", requestBody.weightUnit);
    fd.append("currency", requestBody.currency);

    if (requestBody.bulkPrices) {
      requestBody.bulkPrices.forEach((bp, idx) => {
        fd.append(`bulkPrices[${idx}][minQty]`, String(bp.minQty));
        fd.append(`bulkPrices[${idx}][price]`, String(bp.price));
      });
    }

    if (hasImages) {
      images!.forEach((file) => { fd.append("images[]", file); });
    }
    if (hasPreviewIds) {
      previewIds!.forEach((uuid) => { fd.append("preview_ids[]", uuid); });
    }

    // Append variant data
    if (requestBody.hasVariants && requestBody.variants) {
      fd.append("hasVariants", "1");
      requestBody.variants.forEach((v, idx) => {
        Object.entries(v.options).forEach(([key, val]) => {
          fd.append(`variants[${idx}][options][${key}]`, val);
        });
        fd.append(`variants[${idx}][price]`, String(v.price));
        fd.append(`variants[${idx}][stock]`, String(v.stock));
        if (v.sku) fd.append(`variants[${idx}][sku]`, v.sku);
      });
    }

    const { env } = await import("@/lib/env");
    const baseUrl = env.NEXT_PUBLIC_API_BASE_URL.endsWith("/")
      ? env.NEXT_PUBLIC_API_BASE_URL
      : `${env.NEXT_PUBLIC_API_BASE_URL}/`;
    const url = new URL("sellers/products", baseUrl).toString();

    const tokenMatch = document.cookie.match(/(?:^|; )sugu_token=([^;]*)/);
    const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;

    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(url, { method: "POST", headers, body: fd });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      const { ApiError } = await import("@/lib/http/api-error");
      throw new ApiError({
        message: errorJson.message ?? `HTTP ${response.status}`,
        status: response.status,
        code: errorJson.code ?? `HTTP_${response.status}`,
        errors: errorJson.errors,
      });
    }

    const res = await response.json() as {
      success: boolean;
      message: string;
      data: { id: string; name: string };
    };

    return createProductResponseSchema.parse({
      id: res.data.id,
      name: res.data.name ?? formData.name,
      success: res.success ?? true,
      message: res.message,
    });
  }

  // No images — standard JSON API call
  const res = await api.post<{
    success: boolean;
    message: string;
    data: { id: string; name: string };
  }>("sellers/products", requestBody);

  return createProductResponseSchema.parse({
    id: res.data.id,
    name: res.data.name ?? formData.name,
    success: res.success ?? true,
    message: res.message,
  });
}

/** Update an existing product via the vendor dashboard */
export async function updateVendorProduct(
  id: string,
  formData: {
    name: string;
    description: string;
    price: string;
    originalPrice: string;
    stock: string;
    weightValue: string;
    weightUnit: string;
    publishMode: "publish" | "draft";
    hasBulkPricing: boolean;
    bulkTiers: Array<{ minQty: string; price: string }>;
    hasVariants?: boolean;
    generatedVariants?: Array<{
      id: string;
      combination: Record<string, string>;
      price: string;
      stock: string;
      sku: string;
    }>;
  },
  categoryId?: string,
  newImages?: File[],
  removeMediaIds?: (string | number)[],
): Promise<CreateProductResponse> {
  const price = parseFloat(formData.price) || 0;
  const stock = parseInt(formData.stock) || 0;
  const weightValue = parseFloat(formData.weightValue) || 0;
  const weightUnit = WEIGHT_UNIT_MAP[formData.weightUnit] ?? "g";
  const status = formData.publishMode === "publish" ? "published" : "draft";

  const bulkPrices = formData.hasBulkPricing
    ? formData.bulkTiers
        .filter((t) => parseInt(t.minQty) > 0 && parseFloat(t.price) > 0)
        .map((t) => ({ minQty: parseInt(t.minQty), price: parseFloat(t.price) }))
    : [];

  const fd = new FormData();
  fd.append("_method", "PUT"); // Laravel method spoofing for multipart
  fd.append("name", formData.name);
  if (formData.description) fd.append("description", formData.description);
  fd.append("price", String(Math.round(price))); // match create
  fd.append("stock", String(stock));
  fd.append("status", status);
  fd.append("currency", "XOF");
  if (weightValue > 0) fd.append("weight", String(weightValue));
  if (weightUnit) fd.append("weightUnit", weightUnit);
  if (categoryId) fd.append("primary_category_id", categoryId);

  bulkPrices.forEach((bp, idx) => {
    fd.append(`bulkPrices[${idx}][minQty]`, String(bp.minQty));
    fd.append(`bulkPrices[${idx}][price]`, String(bp.price));
  });

  if (newImages && newImages.length > 0) {
    newImages.forEach((file) => { fd.append("gallery[]", file); });
  }
  if (removeMediaIds && removeMediaIds.length > 0) {
    removeMediaIds.forEach((mid) => { fd.append("remove_media_ids[]", String(mid)); });
  }

  // Append variant data
  if (formData.hasVariants && formData.generatedVariants && formData.generatedVariants.length > 0) {
    fd.append("hasVariants", "1");
    const variants = formData.generatedVariants.map((v) => ({
      options: v.combination,
      price: parseFloat(v.price) || parseFloat(formData.price) || 0,
      stock: parseInt(v.stock) || 0,
      sku: v.sku || undefined,
    }));
    variants.forEach((v, idx) => {
      Object.entries(v.options).forEach(([key, val]) => {
        fd.append(`variants[${idx}][options][${key}]`, val);
      });
      fd.append(`variants[${idx}][price]`, String(v.price));
      fd.append(`variants[${idx}][stock]`, String(v.stock));
      if (v.sku) fd.append(`variants[${idx}][sku]`, v.sku);
    });
  }

  const { env } = await import("@/lib/env");
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL.endsWith("/")
    ? env.NEXT_PUBLIC_API_BASE_URL
    : `${env.NEXT_PUBLIC_API_BASE_URL}/`;
  const url = new URL(`sellers/products/${id}`, baseUrl).toString();

  const tokenMatch = document.cookie.match(/(?:^|; )sugu_token=([^;]*)/);
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(url, { method: "POST", headers, body: fd });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
    const { ApiError } = await import("@/lib/http/api-error");
    throw new ApiError({
      message: errorJson.message ?? `HTTP ${response.status}`,
      status: response.status,
      code: errorJson.code ?? `HTTP_${response.status}`,
      errors: errorJson.errors,
    });
  }

  const res = await response.json() as {
    success: boolean;
    message: string;
    data: { id: string; name: string };
  };

  return createProductResponseSchema.parse({
    id: res.data.id ?? id,
    name: res.data.name ?? formData.name,
    success: res.success ?? true,
    message: res.message,
  });
}

// ── Transformers ───────────────────────────────────────────

function _transformProductListItem(raw: RawProductItem): Record<string, unknown> {
  const mappedStatus = _mapProductStatus(raw.status, raw.stockStatus);
  return {
    id: raw.id,
    name: raw.name ?? "Produit",
    sku: raw.sku ?? "",
    emoji: deriveEmoji(raw.name ?? "", raw.category ?? ""),
    image: raw.image || raw.main_image || undefined,
    category: raw.category ?? "",
    subcategory: "",
    price: raw.price ?? 0,
    originalPrice: undefined,
    discountPercent: undefined,
    stock: raw.stock ?? 0,
    sold: raw.sales ?? 0,
    rating: 0,
    reviewCount: 0,
    status: mappedStatus,
    statusLabel: PRODUCT_STATUS_LABELS[mappedStatus] ?? "Brouillon",
    isPromo: false,
  };
}

function _transformProductDetailResponse(raw: RawProductItem): Record<string, unknown> {
  const mappedStatus = _mapProductStatus(raw.status, raw.stockStatus);
  const statusLabel = PRODUCT_STATUS_LABELS[mappedStatus] ?? "Brouillon";
  const totalStock = raw.stock ?? 0;
  const totalSold = raw.sales ?? 0;

  // Build photos — deduplicate by URL
  const seenUrls = new Set<string>();
  const photos: Array<{ id: string; url: string; alt: string; isPrimary: boolean }> = [];

  const addPhoto = (id: string, url: string, alt: string, isPrimary: boolean) => {
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    photos.push({ id, url, alt, isPrimary });
  };

  if (raw.main_image) addPhoto("main", raw.main_image, `${raw.name} - Image principale`, true);
  if (raw.gallery && Array.isArray(raw.gallery)) {
    raw.gallery.forEach((img, idx) => {
      addPhoto(String(img.id ?? `gallery-${idx}`), img.url, `${raw.name} - Photo ${idx + 1}`, photos.length === 0);
    });
  }
  if (photos.length === 0 && raw.all_images && Array.isArray(raw.all_images)) {
    raw.all_images.forEach((img, idx) => {
      addPhoto(String(img.id ?? `img-${idx}`), img.url, `${raw.name} - Photo ${idx + 1}`, idx === 0);
    });
  }
  if (photos.length === 0 && raw.image) addPhoto("fallback", raw.image, raw.name ?? "Produit", true);
  if (photos.length === 0) {
    photos.push({ id: "fallback", url: "https://cdn.sugu.pro/s/theme/fallback-product.png", alt: raw.name ?? "Produit", isPrimary: true });
  }

  const weightG = raw.weight;
  const weightStr = weightG ? (weightG >= 1000 ? `${(weightG / 1000).toFixed(1)} kg` : `${weightG} g`) : "—";

  const tags: string[] = [];
  if (raw.brand) tags.push(raw.brand);
  if (raw.category) tags.push(raw.category);
  if (raw.condition && raw.condition !== "new") tags.push(raw.condition);

  const volumeDiscounts = (raw.bulkPrices ?? []).map((bp) => ({
    minQty: bp.minQty,
    label: `${bp.minQty} =`,
    price: bp.price,
    discount: 0,
  }));

  const variantItems = raw.variants ?? [];
  const weightVariants = variantItems.map((v) => ({
    label: v.title ?? v.sku ?? "Standard",
    price: v.price_amount ? v.price_amount / 100 : (raw.price ?? 0),
    isActive: true,
  }));

  const variantWeights = variantItems.map((v, i) => ({
    label: v.title ?? v.sku ?? "Standard",
    isActive: i === 0,
  }));

  const pricingTiers = (raw.bulkPrices ?? []).map((bp) => ({
    minQty: `${bp.minQty}`,
    price: bp.price,
    currency: bp.currency ?? "FCFA",
    discount: 0,
  }));

  const publishedAt = raw.createdAt
    ? new Date(raw.createdAt).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  return {
    id: raw.id,
    name: raw.name ?? "Produit",
    sku: raw.sku ?? "",
    status: mappedStatus,
    statusLabel,
    isPromo: false,
    publishedAt,
    photos,
    price: raw.price ?? 0,
    originalPrice: undefined,
    discountPercent: undefined,
    marginEstimated: undefined,
    currency: raw.currency ?? "FCFA",
    rating: 0,
    reviewCount: 0,
    reviewLabel: "0 avis",
    category: raw.category ?? "",
    weight: weightStr,
    packaging: "—",
    origin: raw.brand ?? "—",
    description: raw.description ?? raw.shortDescription ?? "",
    tags,
    kpis: {
      stock: {
        value: totalStock,
        unit: "unités",
        percent: totalStock > 0 ? Math.min(100, Math.round((totalStock / Math.max(totalStock, 100)) * 100)) : 0,
        alertThreshold: 10,
      },
      sold: { value: totalSold, period: "—" },
      views: { value: 0, period: "—" },
      revenue: {
        value: totalSold * (raw.price ?? 0),
        currency: raw.currency ?? "FCFA",
        period: "—",
      },
    },
    variantsSummary: {
      weight: weightVariants.length > 0 ? weightVariants : [{ label: "Standard", price: raw.price ?? 0, isActive: true }],
      packaging: [],
    },
    reviewsSummary: {
      totalRevenue: totalSold * (raw.price ?? 0),
      revenueLabel: `${(totalSold * (raw.price ?? 0)).toLocaleString("fr-FR")} ${raw.currency ?? "FCFA"}`,
      monthlyRevenue: "—",
      recentReviews: [],
    },
    volumeDiscounts,
    recentSales: {
      chartData: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      orders: [],
    },
    variantsDetail: {
      weights: variantWeights.length > 0 ? variantWeights : [{ label: "Standard", isActive: true }],
      packagings: [],
      pricingTiers: pricingTiers.length > 0 ? pricingTiers : [],
    },
    reviewsDetail: {
      globalRating: 0,
      ratingDistribution: [
        { stars: 5, count: 0 },
        { stars: 4, count: 0 },
        { stars: 3, count: 0 },
        { stars: 2, count: 0 },
        { stars: 1, count: 0 },
      ],
      reviews: [],
    },
    history: _buildHistoryFromAuditLogs(raw.auditLogs),
    moderation: raw.moderation ? {
      status: raw.moderation.status ?? null,
      statusLabel: raw.moderation.statusLabel ?? 'Non soumis',
      statusColor: raw.moderation.statusColor ?? 'gray',
      rejectionReason: raw.moderation.rejectionReason ?? null,
      notePublic: raw.moderation.notePublic ?? null,
      reviewedAt: raw.moderation.reviewedAt ?? null,
      submittedAt: raw.moderation.submittedAt ?? null,
      reviewer: raw.moderation.reviewer ?? null,
      submitter: raw.moderation.submitter ?? null,
      logs: (raw.moderation.logs ?? []).map((log) => ({
        id: log.id,
        action: log.action,
        fromStatus: log.fromStatus ?? null,
        toStatus: log.toStatus ?? null,
        actor: log.actor,
        context: log.context ?? null,
        date: log.date ?? null,
      })),
    } : undefined,
    auditLogs: raw.auditLogs?.map((a) => ({
      id: a.id,
      event: a.event,
      description: a.description ?? null,
      actor: a.actor,
      changes: a.changes ?? null,
      old: a.old ?? null,
      date: a.date ?? null,
    })),
  };
}

/** Build history entries from Spatie audit logs for the History card */
function _buildHistoryFromAuditLogs(
  auditLogs?: RawProductItem['auditLogs'],
): Array<{ id: string; date: string; action: string; author: string }> {
  if (!auditLogs || auditLogs.length === 0) return [];

  const EVENT_LABELS: Record<string, string> = {
    created: 'Création du produit',
    updated: 'Mise à jour du produit',
    deleted: 'Suppression du produit',
  };

  return auditLogs.map((a) => {
    const changedKeys = a.changes ? Object.keys(a.changes) : [];
    let action = a.description ?? EVENT_LABELS[a.event] ?? a.event;

    // Enrich description with changed field names
    if (a.event === 'updated' && changedKeys.length > 0) {
      const FIELD_LABELS: Record<string, string> = {
        name: 'nom',
        price_amount: 'prix',
        stock: 'stock',
        status: 'statut',
        description: 'description',
        weight_g: 'poids',
        primary_category_id: 'catégorie',
      };
      const labels = changedKeys
        .map((k) => FIELD_LABELS[k] || k)
        .slice(0, 3)
        .join(', ');
      action = `Mise à jour : ${labels}${changedKeys.length > 3 ? '…' : ''}`;
    }

    return {
      id: a.id,
      date: a.date
        ? new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—',
      action,
      author: a.actor,
    };
  });
}

function _transformCreateProductRequest(
  formData: {
    name: string;
    description: string;
    price: string;
    originalPrice: string;
    stock: string;
    weightValue: string;
    weightUnit: string;
    publishMode: "publish" | "draft";
    hasBulkPricing: boolean;
    bulkTiers: Array<{ minQty: string; price: string }>;
    hasVariants?: boolean;
    generatedVariants?: Array<{
      id: string;
      combination: Record<string, string>;
      price: string;
      stock: string;
      sku: string;
    }>;
  },
  categoryId?: string,
): CreateProductRequest {
  const price = parseFloat(formData.price) || 0;
  const stock = parseInt(formData.stock) || 0;
  const weightValue = parseFloat(formData.weightValue) || 0;
  const weightUnit = WEIGHT_UNIT_MAP[formData.weightUnit] ?? "g";

  let weight: number | undefined;
  if (weightValue > 0) weight = weightValue;

  const status = formData.publishMode === "publish" ? "published" as const : "draft" as const;

  const bulkPrices = formData.hasBulkPricing
    ? formData.bulkTiers
        .filter((t) => parseInt(t.minQty) > 0 && parseFloat(t.price) > 0)
        .map((t) => ({ minQty: parseInt(t.minQty), price: parseFloat(t.price) }))
    : undefined;

  // Transform variant data for the API
  const hasVariants = !!(formData.hasVariants && formData.generatedVariants?.length);
  const variants = hasVariants
    ? formData.generatedVariants!.map((v) => ({
        options: v.combination,
        price: parseFloat(v.price) || price,
        stock: parseInt(v.stock) || 0,
        sku: v.sku || undefined,
      }))
    : undefined;

  return {
    name: formData.name,
    description: formData.description || undefined,
    price,
    stock,
    primary_category_id: categoryId || undefined,
    status,
    weight,
    weightUnit: weightUnit as "kg" | "g" | "lb",
    currency: "XOF",
    bulkPrices: bulkPrices && bulkPrices.length > 0 ? bulkPrices : undefined,
    hasVariants: hasVariants,
    variants,
  };
}
