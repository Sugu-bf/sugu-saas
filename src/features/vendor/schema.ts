import { z } from "zod";

// ============================================================
// Vendor — Zod Schemas (Premium Design)
// ============================================================

/** Order status enum */
export const orderStatusSchema = z.enum([
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

// ────────────────────────────────────────────────────────────
// Dashboard Schemas
// ────────────────────────────────────────────────────────────

/** Gradient stat card (Row 1 — KPI cards) */
export const kpiCardSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  subValue: z.string().optional(),
  badge: z.string().optional(),
  badgeColor: z.string().optional(),
  icon: z.string(),
  gradient: z.string(),
  iconBg: z.string(),
});

export type KpiCard = z.infer<typeof kpiCardSchema>;

/** Revenue chart data point */
export const revenuePointSchema = z.object({
  day: z.string(),
  value: z.number(),
});

export type RevenuePoint = z.infer<typeof revenuePointSchema>;

/** Recent order (compact — dashboard) */
export const recentOrderSchema = z.object({
  id: z.string(),
  reference: z.string(),
  client: z.string(),
  total: z.number(),
  status: orderStatusSchema,
  statusLabel: z.string(),
});

export type RecentOrder = z.infer<typeof recentOrderSchema>;

/** Top product */
export const topProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  salesCount: z.number(),
  revenue: z.number(),
});

export type TopProduct = z.infer<typeof topProductSchema>;

/** Stock alert */
export const stockAlertSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  remaining: z.number(),
  level: z.enum(["low", "critical"]),
});

export type StockAlert = z.infer<typeof stockAlertSchema>;

/** Full dashboard response */
export const vendorDashboardSchema = z.object({
  vendorName: z.string(),
  date: z.string(),
  kpis: z.array(kpiCardSchema),
  revenueChart: z.array(revenuePointSchema),
  recentOrders: z.array(recentOrderSchema),
  topProducts: z.array(topProductSchema),
  stockAlerts: z.array(stockAlertSchema),
});

export type VendorDashboardData = z.infer<typeof vendorDashboardSchema>;

// ────────────────────────────────────────────────────────────
// Orders Page Schemas
// ────────────────────────────────────────────────────────────

/** Order product item */
export const orderProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  variant: z.string().optional(),
  quantity: z.number(),
  price: z.number(),
  emoji: z.string(),
});

export type OrderProduct = z.infer<typeof orderProductSchema>;

/** Order timeline event */
export const orderTimelineEventSchema = z.object({
  id: z.string(),
  label: z.string(),
  date: z.string(),
  completed: z.boolean(),
});

export type OrderTimelineEvent = z.infer<typeof orderTimelineEventSchema>;

/** Full order (orders list page) */
export const vendorOrderSchema = z.object({
  id: z.string(),
  reference: z.string(),
  client: z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string(),
    initials: z.string(),
    avatarColor: z.string(),
  }),
  products: z.array(orderProductSchema),
  productSummary: z.string(),
  total: z.number(),
  status: orderStatusSchema,
  statusLabel: z.string(),
  agency: z.string(),
  date: z.string(),
  deliveryAddress: z.object({
    street: z.string(),
    city: z.string(),
    country: z.string(),
  }),
  timeline: z.array(orderTimelineEventSchema),
});

export type VendorOrder = z.infer<typeof vendorOrderSchema>;

/** Status tab counts */
export const orderStatusCountsSchema = z.object({
  all: z.number(),
  pending: z.number(),
  processing: z.number(),
  shipped: z.number(),
  delivered: z.number(),
  cancelled: z.number(),
});

export type OrderStatusCounts = z.infer<typeof orderStatusCountsSchema>;

/** Paginated orders response */
export const vendorOrdersResponseSchema = z.object({
  orders: z.array(vendorOrderSchema),
  statusCounts: orderStatusCountsSchema,
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
  }),
});

export type VendorOrdersResponse = z.infer<typeof vendorOrdersResponseSchema>;

/** Order detail product (with preparation status) */
export const orderDetailProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
  ready: z.boolean(),
});

export type OrderDetailProduct = z.infer<typeof orderDetailProductSchema>;

/** Order detail timeline event */
export const orderDetailTimelineSchema = z.object({
  id: z.string(),
  label: z.string(),
  date: z.string(),
  description: z.string().optional(),
  status: z.enum(["completed", "current", "pending"]),
});

export type OrderDetailTimeline = z.infer<typeof orderDetailTimelineSchema>;

/** Full order detail (single order page) */
export const orderDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: orderStatusSchema,
  statusLabel: z.string(),
  client: z.object({
    name: z.string(),
    initials: z.string(),
    avatarColor: z.string(),
    phone: z.string(),
    email: z.string(),
    orderCount: z.number(),
    isLoyal: z.boolean(),
  }),
  products: z.array(orderDetailProductSchema),
  readyCount: z.number(),
  totalCount: z.number(),
  financial: z.object({
    subtotal: z.number(),
    deliveryCost: z.number(),
    deliveryLabel: z.string(),
    discountPercent: z.number(),
    discountAmount: z.number(),
    total: z.number(),
    paymentMethod: z.string(),
    paymentStatus: z.string(),
  }),
  delivery: z.object({
    provider: z.string(),
    type: z.string(),
    estimatedTime: z.string(),
    driverStatus: z.string(),
    address: z.object({
      line1: z.string(),
      line2: z.string(),
      city: z.string(),
      country: z.string(),
    }),
    clientNote: z.string().optional(),
  }),
  timeline: z.array(orderDetailTimelineSchema),
});

export type OrderDetail = z.infer<typeof orderDetailSchema>;

// ────────────────────────────────────────────────────────────
// Products Page Schemas
// ────────────────────────────────────────────────────────────

/** Product status */
export const productStatusSchema = z.enum([
  "active",
  "out_of_stock",
  "low_stock",
  "draft",
  "archived",
]);

export type ProductStatus = z.infer<typeof productStatusSchema>;

/** Vendor product */
export const vendorProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  emoji: z.string(),
  image: z.string().optional(),
  category: z.string(),
  subcategory: z.string(),
  price: z.number(),
  originalPrice: z.number().optional(),
  discountPercent: z.number().optional(),
  stock: z.number(),
  sold: z.number(),
  rating: z.number(),
  reviewCount: z.number(),
  status: productStatusSchema,
  statusLabel: z.string(),
  isPromo: z.boolean().optional(),
});

export type VendorProduct = z.infer<typeof vendorProductSchema>;

/** Product status tab counts */
export const productStatusCountsSchema = z.object({
  all: z.number(),
  active: z.number(),
  out_of_stock: z.number(),
  draft: z.number(),
  archived: z.number(),
});

export type ProductStatusCounts = z.infer<typeof productStatusCountsSchema>;

/** Paginated products response */
export const vendorProductsResponseSchema = z.object({
  products: z.array(vendorProductSchema),
  statusCounts: productStatusCountsSchema,
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
  }),
});

export type VendorProductsResponse = z.infer<typeof vendorProductsResponseSchema>;

// ────────────────────────────────────────────────────────────
// Product Detail Page Schemas
// ────────────────────────────────────────────────────────────

/** Product photo */
export const productPhotoSchema = z.object({
  id: z.string(),
  url: z.string(),
  alt: z.string(),
  isPrimary: z.boolean(),
});

export type ProductPhoto = z.infer<typeof productPhotoSchema>;

/** Product KPI stat */
export const productKpiStatSchema = z.object({
  value: z.number(),
  unit: z.string().optional(),
  percent: z.number().optional(),
  period: z.string().optional(),
  change: z.string().optional(),
  changeType: z.enum(["positive", "negative", "neutral"]).optional(),
  alertThreshold: z.number().optional(),
  currency: z.string().optional(),
});

export type ProductKpiStat = z.infer<typeof productKpiStatSchema>;

/** Product KPIs (4 stat cards) */
export const productKpisSchema = z.object({
  stock: productKpiStatSchema,
  sold: productKpiStatSchema,
  views: productKpiStatSchema,
  revenue: productKpiStatSchema,
});

export type ProductKpis = z.infer<typeof productKpisSchema>;

/** Variant summary item */
export const variantSummaryItemSchema = z.object({
  label: z.string(),
  price: z.number(),
  isActive: z.boolean(),
});

/** Review summary item */
export const reviewSummaryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  rating: z.number(),
  timeAgo: z.string(),
  avatarColor: z.string(),
});

/** Volume discount tier */
export const volumeDiscountSchema = z.object({
  minQty: z.number(),
  label: z.string(),
  price: z.number(),
  discount: z.number(),
});

export type VolumeDiscount = z.infer<typeof volumeDiscountSchema>;

/** Recent sale order */
export const recentSaleOrderSchema = z.object({
  id: z.string(),
  reference: z.string(),
  customer: z.string(),
  qty: z.number(),
  price: z.number(),
  currency: z.string(),
  time: z.string(),
  statusLabel: z.string(),
  statusColor: z.string(),
});

/** Chart data point */
export const chartPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/** Variant detail option */
export const variantOptionSchema = z.object({
  label: z.string(),
  isActive: z.boolean(),
});

/** Variant pricing tier */
export const variantPricingTierSchema = z.object({
  minQty: z.string(),
  price: z.number(),
  currency: z.string(),
  discount: z.number(),
});

/** Review detail item */
export const reviewDetailItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  rating: z.number(),
  timeAgo: z.string(),
  avatarUrl: z.string(),
});

/** Rating distribution entry */
export const ratingDistributionSchema = z.object({
  stars: z.number(),
  count: z.number(),
});

/** History entry */
export const productHistoryEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  action: z.string(),
  author: z.string(),
});

export type ProductHistoryEntry = z.infer<typeof productHistoryEntrySchema>;

/** Full product detail response */
export const vendorProductDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  status: productStatusSchema,
  statusLabel: z.string(),
  isPromo: z.boolean().optional(),
  publishedAt: z.string(),

  photos: z.array(productPhotoSchema),

  price: z.number(),
  originalPrice: z.number().optional(),
  discountPercent: z.number().optional(),
  marginEstimated: z.number().optional(),
  currency: z.string(),

  rating: z.number(),
  reviewCount: z.number(),
  reviewLabel: z.string().optional(),

  category: z.string(),
  weight: z.string(),
  packaging: z.string(),
  origin: z.string(),
  description: z.string(),

  tags: z.array(z.string()),

  kpis: productKpisSchema,

  variantsSummary: z.object({
    weight: z.array(variantSummaryItemSchema),
    packaging: z.array(variantSummaryItemSchema),
  }),

  reviewsSummary: z.object({
    totalRevenue: z.number(),
    revenueLabel: z.string(),
    monthlyRevenue: z.string(),
    recentReviews: z.array(reviewSummaryItemSchema),
  }),

  volumeDiscounts: z.array(volumeDiscountSchema),

  recentSales: z.object({
    chartData: z.array(chartPointSchema),
    orders: z.array(recentSaleOrderSchema),
  }),

  variantsDetail: z.object({
    weights: z.array(variantOptionSchema),
    packagings: z.array(variantOptionSchema),
    pricingTiers: z.array(variantPricingTierSchema),
  }),

  reviewsDetail: z.object({
    globalRating: z.number(),
    ratingDistribution: z.array(ratingDistributionSchema),
    reviews: z.array(reviewDetailItemSchema),
  }),

  history: z.array(productHistoryEntrySchema),
});

export type VendorProductDetail = z.infer<typeof vendorProductDetailSchema>;

// ────────────────────────────────────────────────────────────
// Clients Page Schemas
// ────────────────────────────────────────────────────────────

export const clientStatusSchema = z.enum(["active", "loyal", "vip", "new", "inactive"]);
export type ClientStatus = z.infer<typeof clientStatusSchema>;

export const vendorClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  initials: z.string(),
  avatarColor: z.string(),
  city: z.string(),
  orderCount: z.number(),
  totalSpent: z.number(),
  avgBasket: z.number(),
  lastOrder: z.string(),
  memberSince: z.string(),
  status: clientStatusSchema,
  statusLabel: z.string(),
  recentOrders: z.array(z.object({
    id: z.string(),
    reference: z.string(),
    date: z.string(),
    total: z.number(),
    statusLabel: z.string(),
    statusColor: z.string(),
  })),
  favoriteProducts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    emoji: z.string(),
  })),
});

export type VendorClient = z.infer<typeof vendorClientSchema>;

export const clientStatusCountsSchema = z.object({
  all: z.number(),
  active: z.number(),
  loyal: z.number(),
  inactive: z.number(),
  new: z.number(),
});

export type ClientStatusCounts = z.infer<typeof clientStatusCountsSchema>;

export const clientKpiSchema = z.object({
  totalClients: z.number(),
  newThisMonth: z.number(),
  activeClients: z.number(),
  activePercent: z.number(),
  avgBasket: z.number(),
  loyaltyRate: z.number(),
});

export type ClientKpi = z.infer<typeof clientKpiSchema>;

export const vendorClientsResponseSchema = z.object({
  kpis: clientKpiSchema,
  statusCounts: clientStatusCountsSchema,
  clients: z.array(vendorClientSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
  }),
});

export type VendorClientsResponse = z.infer<typeof vendorClientsResponseSchema>;

// ────────────────────────────────────────────────────────────
// Inventory Page Schemas
// ────────────────────────────────────────────────────────────

/** Inventory stock status */
export const inventoryStockStatusSchema = z.enum(["ok", "low", "out"]);
export type InventoryStockStatus = z.infer<typeof inventoryStockStatusSchema>;

/** Inventory product row */
export const inventoryProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  sku: z.string(),
  category: z.string(),
  stockCurrent: z.number(),
  stockMax: z.number(),
  stockPercent: z.number(),
  alertThreshold: z.number(),
  status: inventoryStockStatusSchema,
  statusLabel: z.string(),
  stockValue: z.number(),
  lastEntry: z.string(),
});

export type InventoryProduct = z.infer<typeof inventoryProductSchema>;

/** Inventory KPI metrics */
export const inventoryKpiSchema = z.object({
  stockValue: z.number(),
  stockValueChange: z.string(),
  productsInStock: z.number(),
  totalProducts: z.number(),
  outOfStock: z.number(),
  lowStock: z.number(),
  lowStockThreshold: z.number(),
  entriesThisMonth: z.number(),
  entriesChangeLabel: z.string(),
});

export type InventoryKpi = z.infer<typeof inventoryKpiSchema>;

/** Stock alert item */
export const inventoryAlertSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  level: z.enum(["low", "critical"]),
  remaining: z.number(),
  description: z.string(),
  salesImpact: z.string(),
});

export type InventoryAlert = z.infer<typeof inventoryAlertSchema>;

/** Recent stock movement */
export const stockMovementSchema = z.object({
  id: z.string(),
  type: z.enum(["entry", "exit", "adjustment"]),
  label: z.string(),
  date: z.string(),
  detail: z.string(),
});

export type StockMovement = z.infer<typeof stockMovementSchema>;

/** Stock trend summary */
export const stockTrendSchema = z.object({
  value: z.number(),
  label: z.string(),
  badge: z.string(),
});

export type StockTrend = z.infer<typeof stockTrendSchema>;

/** Inventory status counts */
export const inventoryStatusCountsSchema = z.object({
  all: z.number(),
  inStock: z.number(),
  lowStock: z.number(),
  outOfStock: z.number(),
});

export type InventoryStatusCounts = z.infer<typeof inventoryStatusCountsSchema>;

/** Full inventory response */
export const vendorInventoryResponseSchema = z.object({
  kpis: inventoryKpiSchema,
  stockAlerts: z.array(inventoryAlertSchema),
  recentMovements: z.array(stockMovementSchema),
  stockTrend: stockTrendSchema,
  products: z.array(inventoryProductSchema),
  statusCounts: inventoryStatusCountsSchema,
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
  }),
});

export type VendorInventoryResponse = z.infer<typeof vendorInventoryResponseSchema>;

// ────────────────────────────────────────────────────────────
// Statistics Page Schemas
// ────────────────────────────────────────────────────────────

export const statsKpiSchema = z.object({
  label: z.string(),
  value: z.string(),
  subValue: z.string().optional(),
  change: z.number(),
  changeLabel: z.string(),
  icon: z.string(),
  gradient: z.string(),
});

export const statsRevenuePointSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  orders: z.number(),
});

export const statsTopProductSchema = z.object({
  rank: z.number(),
  name: z.string(),
  image: z.string(),
  sold: z.number(),
  revenue: z.number(),
  rating: z.number(),
});

export const categorySaleSchema = z.object({
  name: z.string(),
  percent: z.number(),
  revenue: z.number(),
  color: z.string(),
});

export const funnelStepSchema = z.object({
  label: z.string(),
  value: z.number(),
  percent: z.number(),
});

export const weeklySaleSchema = z.object({
  day: z.string(),
  value: z.number(),
});

export const citySaleSchema = z.object({
  name: z.string(),
  percent: z.number(),
  revenue: z.number(),
});

export const reviewSchema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  avatarColor: z.string(),
  rating: z.number(),
  text: z.string(),
  date: z.string(),
});

export const vendorStatsSchema = z.object({
  kpis: z.array(statsKpiSchema),
  revenueChart: z.array(statsRevenuePointSchema),
  currentMonthRevenue: z.number(),
  previousMonthRevenue: z.number(),
  revenueChangePercent: z.number(),
  topProducts: z.array(statsTopProductSchema),
  categorySales: z.array(categorySaleSchema),
  totalProducts: z.number(),
  totalCategories: z.number(),
  funnel: z.array(funnelStepSchema),
  globalConversionRate: z.number(),
  marketAverage: z.number(),
  weeklySales: z.array(weeklySaleSchema),
  bestDay: z.string(),
  peakHours: z.string(),
  citySales: z.array(citySaleSchema),
  totalCities: z.number(),
  globalRating: z.number(),
  totalReviews: z.number(),
  ratingDistribution: z.array(z.object({ stars: z.number(), percent: z.number() })),
  recentReviews: z.array(reviewSchema),
});

export type VendorStats = z.infer<typeof vendorStatsSchema>;

// ────────────────────────────────────────────────────────────
// Settings Page Schemas
// ────────────────────────────────────────────────────────────

/** Vendor profile info */
export const vendorProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  phone: z.string(),
  phoneSecondary: z.string().optional(),
  language: z.string(),
  timezone: z.string(),
  avatarUrl: z.string().optional(),
});

export type VendorProfile = z.infer<typeof vendorProfileSchema>;

/** Shop / Boutique info */
export const vendorShopInfoSchema = z.object({
  name: z.string(),
  slug: z.string(),
  baseUrl: z.string(),
  shortDescription: z.string(),
  city: z.string(),
  quarter: z.string(),
  fullAddress: z.string(),
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  mainCategory: z.string(),
  subCategory: z.string().optional(),
});

export type VendorShopInfo = z.infer<typeof vendorShopInfoSchema>;

/** Social media link */
export const socialLinkSchema = z.object({
  id: z.string(),
  platform: z.enum(["whatsapp", "facebook", "instagram", "website"]),
  label: z.string(),
  value: z.string(),
  enabled: z.boolean(),
});

export type SocialLink = z.infer<typeof socialLinkSchema>;

/** Business hours for a single day */
export const businessHourSchema = z.object({
  day: z.string(),
  shortDay: z.string(),
  enabled: z.boolean(),
  openTime: z.string(),
  closeTime: z.string(),
});

export type BusinessHour = z.infer<typeof businessHourSchema>;

/** Full settings response */
export const vendorSettingsSchema = z.object({
  profile: vendorProfileSchema,
  shop: vendorShopInfoSchema,
  socialLinks: z.array(socialLinkSchema),
  showSocialOnShop: z.boolean(),
  businessHours: z.array(businessHourSchema),
  showHoursOnShop: z.boolean(),
  sameHoursEveryday: z.boolean(),
  lastSavedAt: z.string(),
  // Security data (from API)
  security: z.object({
    isTwoFactorEnabled: z.boolean(),
    lastPasswordChange: z.string().nullable().optional(),
    activeSessions: z.array(z.object({
      id: z.string(),
      device: z.string(),
      location: z.string(),
      time: z.string(),
      current: z.boolean(),
    })),
  }).optional(),
  // Notifications preferences (from API)
  notifications: z.object({
    emailAlerts: z.object({
      newOrder: z.boolean(),
      lowStock: z.boolean(),
      marketing: z.boolean(),
    }),
    pushNotifications: z.boolean(),
  }).optional(),
  // Legal data (from API)
  legal: z.object({
    businessName: z.string().nullable().optional(),
    legalStatus: z.string().nullable().optional(),
    taxId: z.string().nullable().optional(),
    rccm: z.string().nullable().optional(),
    ninea: z.string().nullable().optional(),
    termsAccepted: z.boolean(),
  }).optional(),
  // Operations data (from API)
  operations: z.object({
    delivery: z.object({
      pickup: z.boolean(),
      localDelivery: z.boolean(),
      shipping: z.boolean(),
      international: z.boolean(),
    }),
    payment: z.object({
      cash: z.boolean(),
      orangeMoney: z.boolean(),
      wave: z.boolean(),
      card: z.boolean(),
    }),
    preferences: z.object({
      currency: z.string(),
      language: z.string(),
      timezone: z.string(),
    }),
    orderPrefix: z.string(),
  }).optional(),
});

export type VendorSettings = z.infer<typeof vendorSettingsSchema>;

// ── Backend API shape (GET /v1/sellers/settings) ───────────
// This schema reflects what the Laravel backend actually returns.
// The service transformer maps it → VendorSettings for the UI.

export const vendorSettingsApiSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    storeId: z.string().optional(),

    // Profile: from User + UserProfile
    profile: z.object({
      firstName: z.string().optional().default(""),
      lastName: z.string().optional().default(""),
      email: z.string().optional().default(""),
      emailVerified: z.boolean().optional().default(false),
      phone: z.string().optional().default(""),
      phoneSecondary: z.string().nullable().optional().default(""),
      language: z.string().optional().default("fr"),
      timezone: z.string().optional().default("Africa/Dakar"),
      avatarUrl: z.string().nullable().optional(),
    }).optional().default({}),

    identity: z.object({
      storeName: z.string(),
      storeType: z.string(),
      slug: z.string(),
      description: z.string(),
      logoUrl: z.string().nullable().optional(),
      coverUrl: z.string().nullable().optional(),
    }),
    contact: z.object({
      email: z.string(),
      phone: z.string(),
      whatsapp: z.string().nullable().optional(),
      website: z.string().nullable().optional(),
      address: z.object({
        street: z.string().optional().default(""),
        city: z.string().optional().default(""),
        postalCode: z.string().nullable().optional(),
        country: z.string().optional().default("BF"),
      }).optional().default({}),
      // PHP may return empty arrays as [] instead of {} — handle both
      socials: z.preprocess(
        (val) => (Array.isArray(val) ? {} : val),
        z.record(z.string()).optional().default({})
      ),
    }),
    legal: z.object({
      businessName: z.string().nullable().optional(),
      legalStatus: z.string().nullable().optional(),
      taxId: z.string().nullable().optional(),
      rccm: z.string().nullable().optional(),
      ninea: z.string().nullable().optional(),
      termsAccepted: z.boolean().optional().default(false),
    }).optional().default({}),
    operations: z.object({
      delivery: z.object({
        pickup: z.boolean().optional().default(false),
        localDelivery: z.boolean().optional().default(false),
        shipping: z.boolean().optional().default(false),
        international: z.boolean().optional().default(false),
      }).optional().default({}),
      payment: z.object({
        cash: z.boolean().optional().default(false),
        orangeMoney: z.boolean().optional().default(false),
        wave: z.boolean().optional().default(false),
        card: z.boolean().optional().default(false),
      }).optional().default({}),
      preferences: z.object({
        currency: z.string().optional().default("XOF"),
        language: z.string().optional().default("fr"),
        timezone: z.string().optional().default("Africa/Dakar"),
      }).optional().default({}),
      orderPrefix: z.string().optional().default("CMD-"),
    }).optional().default({}),
    account: z.object({
      plan: z.string().optional().default("free"),
      status: z.string().optional().default("active"),
      createdAt: z.string().optional(),
    }).optional().default({}),
    security: z.object({
      isTwoFactorEnabled: z.boolean().optional().default(false),
      lastPasswordChange: z.string().nullable().optional(),
      activeSessions: z.array(z.object({
        id: z.string(),
        device: z.string().optional().default(""),
        location: z.string().optional().default(""),
        time: z.string().optional().default(""),
        current: z.boolean().optional().default(false),
      })).optional().default([]),
    }).optional().default({}),
    notifications: z.object({
      emailAlerts: z.object({
        newOrder: z.boolean().optional().default(true),
        lowStock: z.boolean().optional().default(true),
        marketing: z.boolean().optional().default(false),
      }).optional().default({}),
      pushNotifications: z.boolean().optional().default(false),
    }).optional().default({}),

    // Business hours (from store.settings JSON)
    businessHours: z.array(z.object({
      day: z.string(),
      enabled: z.boolean(),
      openTime: z.string(),
      closeTime: z.string(),
    })).nullable().optional(),
    showHoursOnShop: z.boolean().optional().default(true),
    sameHoursEveryday: z.boolean().optional().default(false),
    showSocialOnShop: z.boolean().optional().default(false),
  }),
});

export type VendorSettingsApiResponse = z.infer<typeof vendorSettingsApiSchema>;
export type VendorSettingsApiData = VendorSettingsApiResponse["data"];

// ── Settings Mutation Request Schemas ──────────────────────

export const updateIdentityRequestSchema = z.object({
  storeName: z.string().min(1),
  storeType: z.string(),
  slug: z.string(),
  description: z.string(),
});
export type UpdateIdentityRequest = z.infer<typeof updateIdentityRequestSchema>;

export const updateContactRequestSchema = z.object({
  email: z.string().email(),
  phone: z.string(),
  whatsapp: z.string().optional(),
  website: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().nullable().optional(),
    country: z.string().optional(),
  }).optional(),
  socials: z.record(z.string()).optional(),
});
export type UpdateContactRequest = z.infer<typeof updateContactRequestSchema>;

export const updateLegalRequestSchema = z.object({
  businessName: z.string().optional(),
  legalStatus: z.string().optional(),
  taxId: z.string().nullable().optional(),
  rccm: z.string().nullable().optional(),
  ninea: z.string().nullable().optional(),
  termsAccepted: z.boolean(),
});
export type UpdateLegalRequest = z.infer<typeof updateLegalRequestSchema>;

export const updateOperationsRequestSchema = z.object({
  delivery: z.object({
    pickup: z.boolean(),
    localDelivery: z.boolean(),
    shipping: z.boolean(),
    international: z.boolean(),
  }).optional(),
  payment: z.object({
    cash: z.boolean(),
    orangeMoney: z.boolean(),
    wave: z.boolean(),
    card: z.boolean(),
  }).optional(),
  preferences: z.object({
    currency: z.string(),
    language: z.string(),
    timezone: z.string(),
  }).optional(),
  orderPrefix: z.string().optional(),
});
export type UpdateOperationsRequest = z.infer<typeof updateOperationsRequestSchema>;

export const updateNotificationsRequestSchema = z.object({
  emailAlerts: z.object({
    newOrder: z.boolean(),
    lowStock: z.boolean(),
    marketing: z.boolean(),
  }).optional(),
  pushNotifications: z.boolean().optional(),
});
export type UpdateNotificationsRequest = z.infer<typeof updateNotificationsRequestSchema>;

export const updatePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
  newPasswordConfirmation: z.string().min(6),
});
export type UpdatePasswordRequest = z.infer<typeof updatePasswordRequestSchema>;

export const deactivateAccountRequestSchema = z.object({
  password: z.string().min(1),
  reason: z.string().optional(),
});
export type DeactivateAccountRequest = z.infer<typeof deactivateAccountRequestSchema>;

export const deleteAccountRequestSchema = z.object({
  password: z.string().min(1),
  confirmText: z.string(),
});
export type DeleteAccountRequest = z.infer<typeof deleteAccountRequestSchema>;

// ────────────────────────────────────────────────────────────
// Marketing Page Schemas
// ────────────────────────────────────────────────────────────

/** Promo code status */
export const promoCodeStatusSchema = z.enum(["active", "expired", "disabled"]);
export type PromoCodeStatus = z.infer<typeof promoCodeStatusSchema>;

/** Individual promo code */
export const promoCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  discount: z.string(),
  conditions: z.string(),
  usages: z.number(),
  usagesMax: z.number(),
  expiresAt: z.string(),
  expiresLabel: z.string(),
  status: promoCodeStatusSchema,
  statusLabel: z.string(),
});

export type PromoCode = z.infer<typeof promoCodeSchema>;

/** Promoted product */
export const promotedProductSchema = z.object({
  id: z.string(),
  promotionId: z.string().optional(),
  name: z.string(),
  image: z.string(),
  originalPrice: z.number(),
  promoPrice: z.number(),
  discountPercent: z.number(),
  expiresLabel: z.string(),
  active: z.boolean(),
});

export type PromotedProduct = z.infer<typeof promotedProductSchema>;

/** Marketing KPI summary */
export const marketingKpiSchema = z.object({
  activePromotions: z.number(),
  totalPromotions: z.number(),
  clientSavings: z.number(),
  codesUsed: z.number(),
  codesTotal: z.number(),
});

export type MarketingKpi = z.infer<typeof marketingKpiSchema>;

/** Full vendor marketing response */
export const vendorMarketingSchema = z.object({
  kpis: marketingKpiSchema,
  promoCodes: z.array(promoCodeSchema),
  promotedProducts: z.array(promotedProductSchema),
});

export type VendorMarketing = z.infer<typeof vendorMarketingSchema>;

// ────────────────────────────────────────────────────────────
// Vendor Tickets / Support
// ────────────────────────────────────────────────────────────

export const ticketStatusSchema = z.enum(["open", "pending", "resolved"]);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const ticketPrioritySchema = z.enum(["urgent", "normal", "low"]);
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;

export const ticketCategorySchema = z.enum([
  "order", "payment", "delivery", "refund", "account", "vendor", "product", "other",
]);
export type TicketCategory = z.infer<typeof ticketCategorySchema>;

export const ticketMessageSchema = z.object({
  id: z.string(),
  senderName: z.string(),
  senderRole: z.enum(["vendor", "support"]),
  senderInitials: z.string(),
  senderAvatarColor: z.string(),
  time: z.string(),
  text: z.string(),
  attachment: z.string().nullable(),
});
export type TicketMessage = z.infer<typeof ticketMessageSchema>;

export const vendorTicketSchema = z.object({
  id: z.string(),
  reference: z.string(),
  subject: z.string(),
  preview: z.string(),
  status: ticketStatusSchema,
  statusLabel: z.string(),
  priority: ticketPrioritySchema,
  priorityLabel: z.string(),
  messageCount: z.number(),
  timeAgo: z.string(),
  assignee: z.string(),
  messages: z.array(ticketMessageSchema).optional().default([]),
});
export type VendorTicket = z.infer<typeof vendorTicketSchema>;

export const vendorTicketsResponseSchema = z.object({
  tickets: z.array(vendorTicketSchema),
  counts: z.object({
    all: z.number(),
    open: z.number(),
    resolved: z.number(),
  }),
});
export type VendorTicketsResponse = z.infer<typeof vendorTicketsResponseSchema>;

// ── Ticket API Request Schemas ─────────────────────────────

export const createTicketRequestSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1),
  category: ticketCategorySchema,
  store_id: z.string().optional(),
  order_id: z.string().optional(),
});
export type CreateTicketRequest = z.infer<typeof createTicketRequestSchema>;

export const sendTicketMessageRequestSchema = z.object({
  body: z.string().min(1),
});
export type SendTicketMessageRequest = z.infer<typeof sendTicketMessageRequestSchema>;

// ────────────────────────────────────────────────────────────
// Create Order Page Schemas
// ────────────────────────────────────────────────────────────

/** Product search result (from sales/products/search) */
export const productSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  emoji: z.string(),
  price: z.number(),
  stock: z.number(),
  imageUrl: z.string().optional(),
});

export type ProductSearchResult = z.infer<typeof productSearchResultSchema>;

/** Customer search result (from sellers/customers) */
export const customerSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  phone: z.string(),
  email: z.string(),
  orderCount: z.number(),
  status: z.string(),
});

export type CustomerSearchResult = z.infer<typeof customerSearchResultSchema>;

/** Create order request body (sent to POST /v1/sellers/sales/) */
export const createOrderRequestSchema = z.object({
  customerId: z.string().nullable().optional(),
  client: z.object({
    phone: z.string().min(8),
    fullName: z.string().min(1),
    countryCode: z.string().default("BF"),
    email: z.string().email().optional(),
  }).optional(),
  products: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0),
  })).min(1),
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
  total: z.number().min(0),
  currency: z.string().default("XOF"),
  delivery: z.object({
    method: z.enum(["pickup", "shipping"]),
    provider: z.string().optional(),
    pickupLocation: z.string().optional(),
  }).optional(),
  note: z.string().optional(),
});

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

/** Create order response (from POST /v1/sellers/sales/) */
export const createOrderResponseSchema = z.object({
  id: z.string(),
  success: z.boolean(),
});

export type CreateOrderResponse = z.infer<typeof createOrderResponseSchema>;

/** Create customer request body (sent to POST /v1/sellers/customers) */
export const createCustomerRequestSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
});

export type CreateCustomerRequest = z.infer<typeof createCustomerRequestSchema>;

/** Create customer response item */
export const createCustomerResponseSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export type CreateCustomerResponse = z.infer<typeof createCustomerResponseSchema>;

// ────────────────────────────────────────────────────────────
// Create Product Page Schemas
// ────────────────────────────────────────────────────────────

/** Product category from GET /v1/sellers/products/categories */
export const productCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export type ProductCategory = z.infer<typeof productCategorySchema>;

/** Product brand from GET /v1/sellers/products/brands */
export const productBrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export type ProductBrand = z.infer<typeof productBrandSchema>;

/** Bulk price tier in create product request */
export const createProductBulkPriceSchema = z.object({
  minQty: z.number().int().min(1),
  price: z.number().min(0),
});

export type CreateProductBulkPrice = z.infer<typeof createProductBulkPriceSchema>;

/** Create product request body (sent to POST /v1/sellers/products) */
export const createProductRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().min(0),
  stock: z.number().int().min(0).optional(),
  primary_category_id: z.string().optional(),
  brand_id: z.string().optional(),
  status: z.enum(["published", "draft", "archived"]).default("draft"),
  weight: z.number().optional(),
  weightUnit: z.enum(["kg", "g", "lb"]).optional(),
  currency: z.string().default("XOF"),
  bulkPrices: z.array(createProductBulkPriceSchema).optional(),
});

export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;

/** Create product response (from POST /v1/sellers/products) */
export const createProductResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  success: z.boolean(),
  message: z.string().optional(),
});

export type CreateProductResponse = z.infer<typeof createProductResponseSchema>;

/** Variant option item from GET /v1/sellers/products/variant-options */
export const variantOptionItemSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export type VariantOptionItem = z.infer<typeof variantOptionItemSchema>;

// ────────────────────────────────────────────────────────────
// Image Preview (Cloudinary Detourage) Schema
// ────────────────────────────────────────────────────────────

/** Response from POST /v1/sellers/products/preview-image */
export const imagePreviewResponseSchema = z.object({
  uuid: z.string(),
  preview_url: z.string().url(),
  cloudinary_public_id: z.string().optional(),
  expires_at: z.string(),
});

export type ImagePreviewResponse = z.infer<typeof imagePreviewResponseSchema>;

// ────────────────────────────────────────────────────────────
// Wallet Schemas
// ────────────────────────────────────────────────────────────

/** Wallet entry type */
export const walletEntryTypeSchema = z.enum(["credit", "debit"]);
export type WalletEntryType = z.infer<typeof walletEntryTypeSchema>;

/** Single wallet entry (transaction) */
export const walletEntrySchema = z.object({
  id: z.string(),
  type: walletEntryTypeSchema,
  amount: z.number(),
  description: z.string(),
  referenceType: z.string().nullable(),
  referenceId: z.string().nullable(),
  status: z.string(),
  date: z.string(),
  dateRaw: z.string(),
});
export type WalletEntry = z.infer<typeof walletEntrySchema>;

/** Wallet KPI */
export const walletKpiSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  subValue: z.string().optional(),
  badge: z.string().optional(),
  badgeColor: z.string().optional(),
  icon: z.string(),
  gradient: z.string(),
  iconBg: z.string(),
});
export type WalletKpi = z.infer<typeof walletKpiSchema>;

/** Payout method */
export const payoutMethodSchema = z.object({
  id: z.string(),
  provider: z.string(),
  providerLabel: z.string(),
  accountMasked: z.string(),
  isDefault: z.boolean(),
});
export type PayoutMethod = z.infer<typeof payoutMethodSchema>;

/** Revenue chart point (wallet) */
export const walletRevenuePointSchema = z.object({
  day: z.string(),
  value: z.number(),
});
export type WalletRevenuePoint = z.infer<typeof walletRevenuePointSchema>;

/** Next payout info */
export const nextPayoutSchema = z.object({
  amount: z.number(),
  scheduledDate: z.string(),
  method: payoutMethodSchema.nullable(),
  minThreshold: z.number(),
});
export type NextPayout = z.infer<typeof nextPayoutSchema>;

/** Full wallet page response */
export const vendorWalletDataSchema = z.object({
  kpis: z.array(walletKpiSchema),
  revenueChart: z.array(walletRevenuePointSchema),
  nextPayout: nextPayoutSchema,
  transactions: z.array(walletEntrySchema),
  payoutMethods: z.array(payoutMethodSchema),
});
export type VendorWalletData = z.infer<typeof vendorWalletDataSchema>;

// ────────────────────────────────────────────────────────────
// Withdrawal Request Schemas
// ────────────────────────────────────────────────────────────

/** Payout setting (backend model mapped) */
export const payoutSettingSchema = z.object({
  id: z.string(),
  type: z.enum(["mobile_money", "bank_transfer"]),
  provider: z.string().nullable(),
  providerLabel: z.string(),
  accountMasked: z.string(),
  bankName: z.string().nullable(),
  isDefault: z.boolean(),
  status: z.number(),
  addedDate: z.string(),
});
export type PayoutSetting = z.infer<typeof payoutSettingSchema>;

/** Withdrawal request payload */
export const withdrawalRequestSchema = z.object({
  amount: z.number().min(10000),
  payoutSettingId: z.string(),
  note: z.string().optional(),
});
export type WithdrawalRequest = z.infer<typeof withdrawalRequestSchema>;

/** Withdrawal response */
export const withdrawalResponseSchema = z.object({
  id: z.string(),
  amount: z.number(),
  fee: z.number(),
  netAmount: z.number(),
  status: z.string(),
  estimatedDate: z.string(),
});
export type WithdrawalResponse = z.infer<typeof withdrawalResponseSchema>;
