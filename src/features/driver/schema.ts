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

// ============================================================
// Driver — Settings Schemas (Courier Settings Page)
// ============================================================

/** Driver profile data */
export const driverProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  phone: z.string(),
  phoneSecondary: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  city: z.string(),
  quarter: z.string(),
  fullAddress: z.string(),
  actionRadius: z.number(),           // km
  language: z.string(),
  timezone: z.string(),
  rating: z.number(),                 // 4.8
  totalDeliveries: z.number(),        // 127
  successRate: z.number(),            // 98
  avgDeliveryMinutes: z.number(),     // 32
});
export type DriverProfile = z.infer<typeof driverProfileSchema>;

/** Vehicle type enum */
export const vehicleTypeSchema = z.enum(["moto", "motorcycle", "velo", "bicycle", "voiture", "tricycle", "car", "truck", "van"]);
export type VehicleType = z.infer<typeof vehicleTypeSchema>;

/** Driver vehicle data */
export const driverVehicleSchema = z.object({
  id: z.string(),
  type: vehicleTypeSchema,
  brand: z.string(),                  // "Yamaha FZ"
  licensePlate: z.string(),           // "BKO-1234-ML"
  color: z.string(),
  maxCapacityKg: z.number(),
  year: z.number(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  photos: z.array(z.object({
    id: z.string(),
    url: z.string(),
    label: z.string(),                // "Vue avant", "Vue côté", "Vue arrière"
  })),
});
export type DriverVehicle = z.infer<typeof driverVehicleSchema>;

/** KYC document status */
export const kycDocStatusSchema = z.enum(["verified", "pending", "rejected", "not_uploaded"]);
export type KycDocStatus = z.infer<typeof kycDocStatusSchema>;

/** Single KYC document */
export const kycDocumentSchema = z.object({
  id: z.string(),
  type: z.enum(["cni", "permis", "carte_grise", "assurance"]),
  label: z.string(),                  // "Pièce d'identité (CNI / Passeport)"
  status: kycDocStatusSchema,
  fileName: z.string().nullable(),    // "cni_amadou_diallo.pdf"
  uploadedAt: z.string().nullable(),  // ISO date
  rejectionReason: z.string().nullable(),
});
export type KycDocument = z.infer<typeof kycDocumentSchema>;

/** KYC verification activity entry */
export const kycActivitySchema = z.object({
  id: z.string(),
  label: z.string(),                  // "CNI vérifiée et approuvée"
  time: z.string(),                   // "il y a 3 jours"
  dotColor: z.string(),               // "bg-green-500"
});
export type KycActivity = z.infer<typeof kycActivitySchema>;

/** KYC overview */
export const driverKycSchema = z.object({
  documents: z.array(kycDocumentSchema),
  submittedCount: z.number(),         // 3
  requiredCount: z.number(),          // 4
  progressPercent: z.number(),        // 75
  canDeliver: z.boolean(),            // true (can deliver while verifying)
  recentActivity: z.array(kycActivitySchema),
});
export type DriverKyc = z.infer<typeof driverKycSchema>;

/** Notification channel */
export const notifChannelSchema = z.object({
  id: z.string(),
  label: z.string(),                  // "SMS", "Email", "Push (Application)", "WhatsApp"
  detail: z.string(),                 // "+223 76 12 34 56" or "amadou.diallo@email.com"
  enabled: z.boolean(),
  pro: z.boolean(),
});
export type NotifChannel = z.infer<typeof notifChannelSchema>;

/** Notification event preference */
export const notifEventSchema = z.object({
  id: z.string(),
  label: z.string(),                  // "Nouvelle livraison assignée"
  icon: z.string(),                   // lucide icon name: "package", "x-circle", "banknote", etc.
  sms: z.boolean(),
  email: z.boolean(),
  push: z.boolean(),
  whatsapp: z.boolean(),
});
export type NotifEvent = z.infer<typeof notifEventSchema>;

/** Quiet hours */
export const quietHoursSchema = z.object({
  enabled: z.boolean(),
  from: z.string(),                   // "22:00"
  to: z.string(),                     // "07:00"
});
export type QuietHours = z.infer<typeof quietHoursSchema>;

/** Driver notifications settings */
export const driverNotificationsSchema = z.object({
  channels: z.array(notifChannelSchema),
  events: z.array(notifEventSchema),
  quietHours: quietHoursSchema,
});
export type DriverNotifications = z.infer<typeof driverNotificationsSchema>;

/** Active session */
export const driverSessionSchema = z.object({
  id: z.string(),
  device: z.string(),                 // "Samsung Galaxy A54"
  os: z.string(),                     // "Android 14"
  location: z.string(),              // "Bamako, Mali"
  lastActivity: z.string(),          // "il y a 2 min"
  current: z.boolean(),
});
export type DriverSession = z.infer<typeof driverSessionSchema>;

/** Driver security settings */
export const driverSecuritySchema = z.object({
  twoFactorEnabled: z.boolean(),
  sessions: z.array(driverSessionSchema),
});
export type DriverSecurity = z.infer<typeof driverSecuritySchema>;

/** Full driver settings response */
export const driverSettingsSchema = z.object({
  profile: driverProfileSchema,
  vehicle: driverVehicleSchema,
  kyc: driverKycSchema,
  notifications: driverNotificationsSchema,
  security: driverSecuritySchema,
  lastSavedAt: z.string(),            // ISO date
});
export type DriverSettings = z.infer<typeof driverSettingsSchema>;

// ============================================================
// Driver — Earnings / Wallet Schemas
// ============================================================

/** KPI card for the earnings page */
export const driverEarningsKpiSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),                    // "45,750" (formatted)
  subValue: z.string().optional(),      // "FCFA", "3 livraisons", "ce mois"
  badge: z.string().optional(),         // "+12%", "+8.5%"
  badgeColor: z.string().optional(),    // "text-green-600 bg-green-100"
  icon: z.string(),                     // lucide icon name: "wallet", "clock", "arrow-down-to-line", "trending-up"
  gradient: z.string(),                 // tailwind gradient: "from-green-50/50 to-white"
  iconBg: z.string(),                   // icon square bg: "bg-green-50 text-green-600"
});
export type DriverEarningsKpi = z.infer<typeof driverEarningsKpiSchema>;

/** Revenue chart data point */
export const earningsChartPointSchema = z.object({
  day: z.string(),                      // "Lun", "Mar", "Mer", etc.
  value: z.number(),                    // FCFA amount
});
export type EarningsChartPoint = z.infer<typeof earningsChartPointSchema>;

/** Single transaction entry */
export const driverTransactionSchema = z.object({
  id: z.string(),
  date: z.string(),                     // "Aujourd'hui", "Hier", "10 mars"
  description: z.string(),             // "Livraison #ORD-2847", "Retrait Orange Money"
  type: z.enum(["credit", "debit"]),
  referenceType: z.enum(["delivery", "payout", "commission", "bonus"]),
  amount: z.number(),                   // FCFA (always positive, sign derived from type)
  status: z.enum(["confirmed", "completed", "pending"]),
});
export type DriverTransaction = z.infer<typeof driverTransactionSchema>;

/** Next payout info */
export const driverNextPayoutSchema = z.object({
  amount: z.number(),                   // 45750
  scheduledDate: z.string(),            // "15 mars 2026"
  method: z.object({
    provider: z.string(),               // "orange_money"
    providerLabel: z.string(),          // "Orange Money"
    accountMasked: z.string(),          // "*** *** ** 56"
  }).nullable(),
  minThreshold: z.number(),             // 5000 FCFA
});
export type DriverNextPayout = z.infer<typeof driverNextPayoutSchema>;

/** Payout setting (payment method for withdrawals) */
export const driverPayoutSettingSchema = z.object({
  id: z.string(),
  type: z.enum(["mobile_money", "bank_transfer"]),
  provider: z.string(),                 // "orange_money", "moov_money"
  providerLabel: z.string(),            // "Orange Money", "Moov Money"
  accountMasked: z.string(),            // "+223 76 ** ** 56"
  accountName: z.string().nullable(),   // "Amadou Diallo"
  isDefault: z.boolean(),
  isVerified: z.boolean(),
});
export type DriverPayoutSetting = z.infer<typeof driverPayoutSettingSchema>;

/** Withdrawal response after submission */
export const driverWithdrawalResponseSchema = z.object({
  id: z.string(),
  payoutNumber: z.string(),             // "WD-20260315-001"
  amount: z.number(),
  feeAmount: z.number(),
  netAmount: z.number(),
  status: z.string(),                   // "processing"
  estimatedDate: z.string().optional(), // "Instantané"
});
export type DriverWithdrawalResponse = z.infer<typeof driverWithdrawalResponseSchema>;

/** Full earnings page composite response */
export const driverEarningsDataSchema = z.object({
  kpis: z.array(driverEarningsKpiSchema),
  revenueChart: z.array(earningsChartPointSchema),
  nextPayout: driverNextPayoutSchema,
  transactions: z.array(driverTransactionSchema),
});
export type DriverEarningsData = z.infer<typeof driverEarningsDataSchema>;
