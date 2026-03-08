import { z } from "zod";

// ============================================================
// Driver — Zod Schemas (Courier Dashboard)
// ============================================================

/** Driver KPI card (same shape as agency/vendor) */
export const driverKpiSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  subValue: z.string().optional(),
  badge: z.string().optional(),
  badgeColor: z.string().optional(),
  icon: z.string(),
  gradient: z.string(),
  iconBg: z.string(),
  ringPercent: z.number().optional(), // For success rate ring
});

export type DriverKpi = z.infer<typeof driverKpiSchema>;

/** Current active delivery */
export const currentDeliverySchema = z.object({
  id: z.string(),
  orderId: z.string(),
  status: z.enum(["pickup", "en_route", "pending"]),
  statusLabel: z.string(),
  priority: z.enum(["urgent", "normal", "low"]),
  pickup: z.object({
    name: z.string(),
    address: z.string(),
  }),
  delivery: z.object({
    name: z.string(),
    address: z.string(),
    phone: z.string(),
  }),
  progressPercent: z.number(), // 0-100
  etaMinutes: z.number(),
  itemCount: z.number(),
});

export type CurrentDelivery = z.infer<typeof currentDeliverySchema>;

/** Queued delivery (next in line) */
export const queuedDeliverySchema = z.object({
  id: z.string(),
  orderId: z.string(),
  priority: z.enum(["urgent", "normal", "low"]),
  route: z.string(),           // "Boutique X → Quartier Y"
  itemCount: z.number(),
  timeSlot: z.string(),        // "14h30 - 15h00"
});

export type QueuedDelivery = z.infer<typeof queuedDeliverySchema>;

/** Earnings chart point */
export const earningsPointSchema = z.object({
  day: z.string(),
  value: z.number(),
});

export type EarningsPoint = z.infer<typeof earningsPointSchema>;

/** Activity timeline event */
export const activityEventSchema = z.object({
  id: z.string(),
  type: z.enum(["delivery_completed", "pickup_done", "assigned", "delivery_failed"]),
  title: z.string(),
  subtitle: z.string(),
  time: z.string(),
  dotColor: z.string(),  // "bg-green-500", "bg-sugu-500", etc.
});

export type ActivityEvent = z.infer<typeof activityEventSchema>;

/** Full driver dashboard response */
export const driverDashboardSchema = z.object({
  driverName: z.string(),
  date: z.string(),
  city: z.string(),
  isOnline: z.boolean(),
  kpis: z.array(driverKpiSchema),
  currentDelivery: currentDeliverySchema.nullable(),
  queuedDeliveries: z.array(queuedDeliverySchema),
  earningsChart: z.array(earningsPointSchema),
  earningsTotal: z.number(),
  earningsPrevious: z.number(),
  recentActivity: z.array(activityEventSchema),
});

export type DriverDashboardData = z.infer<typeof driverDashboardSchema>;

// ============================================================
// Driver — Delivery Schemas (Courier Deliveries Page)
// ============================================================

/** All possible statuses from the driver's perspective */
export const driverDeliveryStatusSchema = z.enum([
  "to_accept",
  "pickup",
  "en_route",
  "delivered",
  "failed",
]);

export type DriverDeliveryStatus = z.infer<typeof driverDeliveryStatusSchema>;

/** Timeline step within a delivery */
export const driverTimelineStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  time: z.string().nullable(),
  done: z.boolean(),
  current: z.boolean(),
});

export type DriverTimelineStep = z.infer<typeof driverTimelineStepSchema>;

/** Single delivery row for the driver deliveries list */
export const driverDeliveryRowSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  status: driverDeliveryStatusSchema,
  statusLabel: z.string(),

  // Itinerary
  itinerary: z.object({
    pickupName: z.string(),
    pickupAddress: z.string(),
    deliveryName: z.string(),
    deliveryAddress: z.string(),
    distanceKm: z.number(),
    durationMin: z.number(),
    fromTime: z.string().optional(),
  }),

  // Client
  client: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    initials: z.string(),
    avatarColor: z.string(),
    note: z.string().nullable(),
  }),

  // Order
  orderItems: z.number(),
  orderTotal: z.number(),
  orderPayment: z.enum(["paid", "cod"]),

  // Amount the driver earns for this delivery
  amount: z.number(),

  // Parcel info
  parcelCount: z.number(),

  // Progress (for en_route)
  progressPercent: z.number().optional(),
  etaMinutes: z.number().optional(),

  // Fail reason (for failed)
  failReason: z.string().optional(),

  // Created / time label
  timeLabel: z.string(),

  // Timeline steps
  timeline: z.array(driverTimelineStepSchema),
});

export type DriverDeliveryRow = z.infer<typeof driverDeliveryRowSchema>;

/** Summary KPIs for the driver deliveries page */
export const driverDeliverySummarySchema = z.object({
  total: z.number(),
  delivered: z.number(),
  inProgress: z.number(),
  failed: z.number(),
});

export type DriverDeliverySummary = z.infer<typeof driverDeliverySummarySchema>;

/** Status counts for tabs */
export const driverDeliveryStatusCountsSchema = z.object({
  all: z.number(),
  to_accept: z.number(),
  en_route: z.number(),
  delivered: z.number(),
  failed: z.number(),
});

export type DriverDeliveryStatusCounts = z.infer<typeof driverDeliveryStatusCountsSchema>;

/** Full response for the driver deliveries page */
export const driverDeliveriesResponseSchema = z.object({
  summary: driverDeliverySummarySchema,
  statusCounts: driverDeliveryStatusCountsSchema,
  rows: z.array(driverDeliveryRowSchema),
});

export type DriverDeliveriesResponse = z.infer<typeof driverDeliveriesResponseSchema>;

// ============================================================
// Driver — Delivery DETAIL Schemas (full page view)
// ============================================================

/** A single product item within a pickup stop */
export const pickupProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  variant: z.string().nullable(),    // "Noir · Standard"
  quantity: z.number(),
  price: z.number(),                 // FCFA
  imageUrl: z.string().nullable(),   // Product image URL
  collected: z.boolean(),            // Has the driver confirmed collection?
});

export type PickupProduct = z.infer<typeof pickupProductSchema>;

/** A single pickup stop (vendeur / point de retrait) */
export const pickupStopSchema = z.object({
  id: z.string(),
  letter: z.string(),                // "A", "B", "C"...
  type: z.enum(["pickup", "delivery"]),
  name: z.string(),                  // "Moussa Telecom"
  address: z.string(),               // "Rue de Kaolack, Ouagadougou"
  products: z.array(pickupProductSchema), // Only for type="pickup"
  isCompleted: z.boolean(),
});

export type PickupStop = z.infer<typeof pickupStopSchema>;

/** Enriched timeline step for the detail view */
export const detailTimelineStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  subtitle: z.string().nullable(),   // "En cours chez TechStore Pro"
  time: z.string().nullable(),       // "13:45" or null
  done: z.boolean(),
  current: z.boolean(),
});

export type DetailTimelineStep = z.infer<typeof detailTimelineStepSchema>;

/** Full delivery detail response */
export const driverDeliveryDetailSchema = z.object({
  // Identity
  id: z.string(),
  orderId: z.string(),
  status: driverDeliveryStatusSchema,
  statusLabel: z.string(),
  priority: z.enum(["urgent", "normal", "low"]),

  // Security code
  securityCode: z.string(),          // "SU-000123"

  // Earnings
  amount: z.number(),                // Driver's gain (FCFA)
  orderTotal: z.number(),            // Full order amount
  orderPayment: z.enum(["paid", "cod"]),

  // Route info
  distanceKm: z.number(),
  estimatedMinutes: z.number(),
  parcelCount: z.number(),

  // Multi-stop itinerary
  stops: z.array(pickupStopSchema),

  // Client (destination)
  client: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    initials: z.string(),
    avatarColor: z.string(),
    note: z.string().nullable(),
    isRegular: z.boolean(),
  }),

  // Timeline (6 steps)
  timeline: z.array(detailTimelineStepSchema),

  // Timestamps
  acceptedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export type DriverDeliveryDetail = z.infer<typeof driverDeliveryDetailSchema>;

// ============================================================
// Driver — History Page Schemas
// ============================================================

/** History entry status (subset: only completed states) */
export const driverHistoryStatusSchema = z.enum([
  "delivered",
  "failed",
]);
export type DriverHistoryStatus = z.infer<typeof driverHistoryStatusSchema>;

/** Single history row in the table */
export const driverHistoryRowSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  status: driverHistoryStatusSchema,
  statusLabel: z.string(),
  // Date
  date: z.string(),           // "Aujourd'hui", "Hier", "12 Oct"
  time: z.string(),           // "14:30"
  // Itinerary (compact for table)
  pickupName: z.string(),     // "Moussa Telecom"
  deliveryName: z.string(),   // "Plateau, Rue 12"
  // Client
  clientName: z.string(),
  parcelCount: z.number(),
  clientNote: z.string().nullable(), // "Colis fragile"
  // Financials
  amount: z.number(),         // Driver's gain (FCFA)
  // Performance
  durationMinutes: z.number(),
  distanceKm: z.number(),
  // Fail info
  failReason: z.string().nullable(), // "Client absent", "Adresse introuvable"
});
export type DriverHistoryRow = z.infer<typeof driverHistoryRowSchema>;

/** KPI summary for the history page */
export const driverHistoryKpisSchema = z.object({
  totalDeliveries: z.number(),
  delivered: z.number(),
  deliveredPercent: z.number(),     // 95.3
  failed: z.number(),
  failedPercent: z.number(),        // 4.1
  totalEarnings: z.number(),        // 156500 FCFA
  avgEarningsPerDelivery: z.number(), // 634 FCFA
});
export type DriverHistoryKpis = z.infer<typeof driverHistoryKpisSchema>;

/** Status tab counts */
export const driverHistoryCountsSchema = z.object({
  all: z.number(),
  delivered: z.number(),
  failed: z.number(),
});
export type DriverHistoryCounts = z.infer<typeof driverHistoryCountsSchema>;

/** Full history response (paginated) */
export const driverHistoryResponseSchema = z.object({
  kpis: driverHistoryKpisSchema,
  statusCounts: driverHistoryCountsSchema,
  rows: z.array(driverHistoryRowSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
  }),
});
export type DriverHistoryResponse = z.infer<typeof driverHistoryResponseSchema>;
