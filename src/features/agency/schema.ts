import { z } from "zod";

// ============================================================
// Agency — Zod Schemas (Premium Delivery Dashboard)
// ============================================================

/** Delivery status */
export const deliveryStatusSchema = z.enum([
  "pending",
  "pickup",
  "en_route",
  "delivered",
  "delayed",
  "returned",
]);

export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;

/** Priority level */
export const deliveryPrioritySchema = z.enum(["urgent", "normal", "low"]);
export type DeliveryPriority = z.infer<typeof deliveryPrioritySchema>;

/** Agency KPI card */
export const agencyKpiSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  subValue: z.string().optional(),
  badge: z.string().optional(),
  badgeColor: z.string().optional(),
  icon: z.string(),
  gradient: z.string(),
  iconBg: z.string(),
  /** For the success rate ring */
  ringPercent: z.number().optional(),
});

export type AgencyKpi = z.infer<typeof agencyKpiSchema>;

/** Active delivery row */
export const activeDeliverySchema = z.object({
  id: z.string(),
  orderId: z.string(),
  driver: z.object({
    name: z.string(),
    initials: z.string(),
    avatarColor: z.string(),
  }),
  routeAddresses: z.string(),
  status: deliveryStatusSchema,
  statusLabel: z.string(),
  eta: z.string(),
});

export type ActiveDelivery = z.infer<typeof activeDeliverySchema>;

/** Driver performance */
export const driverPerformanceSchema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  avatarColor: z.string(),
  score: z.number(),
});

export type DriverPerformance = z.infer<typeof driverPerformanceSchema>;

/** Complaint / réclamation */
export const complaintSchema = z.object({
  id: z.string(),
  title: z.string(),
  refId: z.string(),
  date: z.string(),
  severity: z.enum(["urgent", "normal"]),
});

export type Complaint = z.infer<typeof complaintSchema>;

/** Map pin */
export const mapPinSchema = z.object({
  id: z.string(),
  lat: z.number(),
  lng: z.number(),
  status: deliveryStatusSchema,
});

export type MapPin = z.infer<typeof mapPinSchema>;

/** Earnings point for chart */
export const agencyEarningsPointSchema = z.object({
  day: z.string(),
  value: z.number(),
});

export type AgencyEarningsPoint = z.infer<typeof agencyEarningsPointSchema>;

/** KPI card for agency earnings page */
export const agencyEarningsKpiSchema = z.object({
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
export type AgencyEarningsKpi = z.infer<typeof agencyEarningsKpiSchema>;

/** Agency transaction entry */
export const agencyTransactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string(),
  type: z.enum(["credit", "debit"]),
  referenceType: z.string().nullable(),
  amount: z.number(),
  status: z.enum(["confirmed", "completed", "pending"]),
});
export type AgencyTransaction = z.infer<typeof agencyTransactionSchema>;

/** Agency next payout */
export const agencyNextPayoutSchema = z.object({
  amount: z.number(),
  scheduledDate: z.string(),
  method: z.object({
    provider: z.string(),
    providerLabel: z.string(),
    accountMasked: z.string(),
  }).nullable(),
  minThreshold: z.number(),
});
export type AgencyNextPayout = z.infer<typeof agencyNextPayoutSchema>;

/** Full agency earnings page data */
export const agencyEarningsDataSchema = z.object({
  kpis: z.array(agencyEarningsKpiSchema),
  revenueChart: z.array(agencyEarningsPointSchema),
  nextPayout: agencyNextPayoutSchema,
  transactions: z.array(agencyTransactionSchema),
});
export type AgencyEarningsData = z.infer<typeof agencyEarningsDataSchema>;

/** Full agency dashboard */
export const agencyDashboardSchema = z.object({
  agencyName: z.string(),
  managerName: z.string(),
  kpis: z.array(agencyKpiSchema),
  activeDeliveries: z.array(activeDeliverySchema),
  driverPerformance: z.array(driverPerformanceSchema),
  complaints: z.array(complaintSchema),
  mapPins: z.array(mapPinSchema),
  earningsChart: z.array(agencyEarningsPointSchema).optional().default([]),
  earningsTotal: z.number().optional().default(0),
  earningsPrevious: z.number().optional().default(0),
});

export type AgencyDashboardData = z.infer<typeof agencyDashboardSchema>;

// ────────────────────────────────────────────────────────────
// Deliveries Page Schemas (full list view + detail panel)
// ────────────────────────────────────────────────────────────

/** Delivery summary (top KPI bar) */
export const deliverySummarySchema = z.object({
  totalToday: z.number(),
  pending: z.number(),
  inProgress: z.number(),
  delivered: z.number(),
  failed: z.number(),
});

export type DeliverySummary = z.infer<typeof deliverySummarySchema>;

/** Driver info on a delivery row */
export const deliveryDriverSchema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  avatarColor: z.string(),
  vehicle: z.string(),
  rating: z.number(),
  online: z.boolean(),
});

export type DeliveryDriver = z.infer<typeof deliveryDriverSchema>;

/** Client info on a delivery row */
export const deliveryClientSchema = z.object({
  name: z.string(),
  phone: z.string(),
  initials: z.string(),
  avatarColor: z.string(),
  address: z.string(),
  note: z.string(),
});

export type DeliveryClient = z.infer<typeof deliveryClientSchema>;

/** Itinerary */
export const deliveryItinerarySchema = z.object({
  from: z.string(),
  to: z.string(),
  distanceKm: z.number(),
  fromTime: z.string(),
});

export type DeliveryItinerary = z.infer<typeof deliveryItinerarySchema>;

/** Timeline step */
export const deliveryTimelineStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  done: z.boolean(),
  current: z.boolean(),
});

export type DeliveryTimelineStep = z.infer<typeof deliveryTimelineStepSchema>;

/** Full delivery row (list + detail panel) */
export const deliveryRowSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  client: deliveryClientSchema,
  driver: deliveryDriverSchema.nullable(),
  itinerary: deliveryItinerarySchema,
  priority: deliveryPrioritySchema,
  status: deliveryStatusSchema,
  statusLabel: z.string(),
  eta: z.string(),
  vendor: z.string(),
  vendorUrl: z.string(),
  orderItems: z.number(),
  orderTotal: z.number(),
  orderPayment: z.enum(["paid", "pending"]),
  timeline: z.array(deliveryTimelineStepSchema),
});

export type DeliveryRow = z.infer<typeof deliveryRowSchema>;

// ────────────────────────────────────────────────────────────
// Delivery Detail Page — Extended Schemas
// ────────────────────────────────────────────────────────────

/** Order item for detail view */
export const orderItemSchema = z.object({
  name: z.string(),
  qty: z.number(),
  unit_price: z.number(), // centimes
  image: z.string().nullable().optional(),
  collected: z.boolean().optional(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

/** Internal note (stored as delivery_attempt) */
export const shipmentNoteSchema = z.object({
  id: z.string(),
  memo: z.string(),
  noted_at: z.string(),
  author: z.string(),
});
export type ShipmentNote = z.infer<typeof shipmentNoteSchema>;

/** Tracking event from backend */
export const trackingEventSchema = z.object({
  seq: z.number(),
  event_type: z.string(),
  status: z.string().nullable(),
  memo: z.string().nullable(),
  created_at: z.string(),
});
export type TrackingEvent = z.infer<typeof trackingEventSchema>;

/** Extended delivery row for detail page (backwards-compatible with DeliveryRow) */
export const deliveryDetailRowSchema = deliveryRowSchema.extend({
  shippingAmount: z.number(),            // shipping fee in FCFA (divided by 100)
  paymentMethod: z.string().nullable(),
  orderDate: z.string(),                 // formatted date
  driverPhone: z.string().nullable(),
  statusUpdatedAt: z.string().nullable(),
  orderItemsList: z.array(orderItemSchema),
  trackingEvents: z.array(trackingEventSchema),
  notes: z.array(shipmentNoteSchema),

  // COD Mixte split-payment data (optional — only for COD orders)
  codMixte: z.object({
    isCodMixte: z.boolean(),
    currentStep: z.string(),
    deliveryFeePaid: z.boolean(),
    productFeePaid: z.boolean(),
    deliveryFeeAmount: z.number(),
    productFeeAmount: z.number(),
    deliveryFeePaidAt: z.string().nullable(),
    productFeePaidAt: z.string().nullable(),
  }).optional(),
});
export type DeliveryDetailRow = z.infer<typeof deliveryDetailRowSchema>;

/** Status tab counts */
export const deliveryStatusCountsSchema = z.object({
  all: z.number(),
  pending: z.number(),
  pickup: z.number(),
  en_route: z.number(),
  delivered: z.number(),
  failed: z.number(),
});

export type DeliveryStatusCounts = z.infer<typeof deliveryStatusCountsSchema>;

/** Full deliveries page response */
export const agencyDeliveriesResponseSchema = z.object({
  summary: deliverySummarySchema,
  rows: z.array(deliveryRowSchema),
  statusCounts: deliveryStatusCountsSchema,
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
  }),
});

export type AgencyDeliveriesResponse = z.infer<typeof agencyDeliveriesResponseSchema>;

// ────────────────────────────────────────────────────────────
// Drivers Page Schemas (grid view + detail panel)
// ────────────────────────────────────────────────────────────

/** Driver online status */
export const driverStatusSchema = z.enum(["online", "offline", "suspended"]);
export type DriverStatusVal = z.infer<typeof driverStatusSchema>;

/** Vehicle type */
export const vehicleTypeSchema = z.enum(["moto", "voiture", "vélo", "tricycle"]);
export type VehicleType = z.infer<typeof vehicleTypeSchema>;

/** Driver card (grid view) */
export const driverCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  initials: z.string(),
  avatarColor: z.string(),
  avatarUrl: z.string().nullable(),
  rank: z.number().nullable(),
  status: driverStatusSchema,
  vehicle: vehicleTypeSchema,
  totalDeliveries: z.number(),
  rating: z.number(),
  ratingLabel: z.string(),
  todayDeliveries: z.number(),
  successRate: z.number(),
  /** e.g. "En cours: 3 livraisons" */
  currentActivityLabel: z.string().nullable(),
  /** e.g. "Warning" badge */
  warningLabel: z.string().nullable(),
  /** Last seen text for offline drivers */
  lastSeen: z.string().nullable(),
});

export type DriverCard = z.infer<typeof driverCardSchema>;

/** Recent delivery for driver detail */
export const driverRecentDeliverySchema = z.object({
  id: z.string(),
  orderId: z.string(),
  route: z.string(),
  status: z.string(),
  statusColor: z.string(),
  time: z.string(),
});

export type DriverRecentDelivery = z.infer<typeof driverRecentDeliverySchema>;

/** Driver detail panel */
export const driverDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  initials: z.string(),
  avatarColor: z.string(),
  avatarUrl: z.string().nullable(),
  rank: z.number().nullable(),
  status: driverStatusSchema,
  /** Info section */
  age: z.string(),
  quartier: z.string(),
  vehicle: vehicleTypeSchema,
  vehicleId: z.string(),
  permis: z.string(),
  joinedDate: z.string(),
  verified: z.boolean(),
  /** Performance */
  totalDeliveries: z.number(),
  successRate: z.number(),
  rating: z.number(),
  avgTime: z.string(),
  monthlyProgress: z.number(),
  /** Activity today */
  todayDeliveries: z.number(),
  todayCompleted: z.number(),
  todayFailed: z.number(),
  todayRevenue: z.string(),
  todayHours: z.string(),
  recentDeliveries: z.array(driverRecentDeliverySchema),
});

export type DriverDetail = z.infer<typeof driverDetailSchema>;

/** Drivers summary (top KPI bar) */
export const driversSummarySchema = z.object({
  totalDrivers: z.number(),
  activeDrivers: z.number(),
  inProgressDeliveries: z.number(),
  averageRating: z.number(),
  totalReviews: z.number(),
  successRate: z.number(),
  successTarget: z.number(),
});

export type DriversSummary = z.infer<typeof driversSummarySchema>;

/** Status tab counts for drivers */
export const driversStatusCountsSchema = z.object({
  all: z.number(),
  online: z.number(),
  offline: z.number(),
  suspended: z.number(),
});

export type DriversStatusCounts = z.infer<typeof driversStatusCountsSchema>;

/** Full drivers page response */
export const agencyDriversResponseSchema = z.object({
  summary: driversSummarySchema,
  drivers: z.array(driverCardSchema),
  statusCounts: driversStatusCountsSchema,
  /** Full detail for the "selected" driver (first by default) */
  driverDetail: driverDetailSchema,
  lastUpdated: z.string(),
});

export type AgencyDriversResponse = z.infer<typeof agencyDriversResponseSchema>;

// ────────────────────────────────────────────────────────────
// Driver Profile Detail Page (full page view)
// ────────────────────────────────────────────────────────────

/** Document verification status */
export const docStatusSchema = z.enum(["verified", "pending", "expires_soon", "expired"]);
export type DocStatus = z.infer<typeof docStatusSchema>;

/** A single document row */
export const driverDocumentSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  status: docStatusSchema,
  fileUrl: z.string().nullable().optional(),
});
export type DriverDocument = z.infer<typeof driverDocumentSchema>;

/** A single bar in the monthly performance chart */
export const perfBarSchema = z.object({
  hour: z.string(),
  value: z.number(),
});

/** Recent delivery row for the table */
export const profileDeliveryRowSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  dotColor: z.string(),
  route: z.string(),
  amount: z.string(),
  time: z.string(),
  duration: z.string(),
});
export type ProfileDeliveryRow = z.infer<typeof profileDeliveryRowSchema>;

/** A client review */
export const driverReviewSchema = z.object({
  id: z.string(),
  rating: z.number(),
  name: z.string(),
  timeAgo: z.string(),
});
export type DriverReview = z.infer<typeof driverReviewSchema>;

/** An incident entry */
export const driverIncidentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  orderId: z.string(),
  time: z.string(),
});
export type DriverIncident = z.infer<typeof driverIncidentSchema>;

/** Full Driver Profile Page response */
export const driverProfileSchema = z.object({
  /** Identity */
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  avatarColor: z.string(),
  avatarUrl: z.string().nullable(),
  rank: z.number().nullable(),
  status: driverStatusSchema,
  statusSince: z.string(),
  vehicle: vehicleTypeSchema,

  /** Hero KPIs */
  totalDeliveries: z.number(),
  monthDeliveries: z.number(),
  successRate: z.number(),
  rating: z.number(),
  totalReviews: z.number(),
  avgDeliveryTime: z.string(),
  avgTimeTarget: z.string(),
  monthRevenue: z.string(),
  seniority: z.string(),
  seniorityDetail: z.string(),

  /** Personal info */
  fullName: z.string(),
  phone: z.string(),
  email: z.string(),
  dateOfBirth: z.string(),
  address: z.string(),
  emergencyContact: z.string(),
  joinedDate: z.string(),
  addedBy: z.string(),

  /** Vehicle & documents */
  vehicleType: z.string(),
  vehicleMake: z.string(),
  licensePlate: z.string(),
  documents: z.array(driverDocumentSchema),
  documentsStatus: z.string(),

  /** Monthly performance chart */
  perfBars: z.array(perfBarSchema),
  perfDeliveries: z.number(),
  perfVsLastMonth: z.string(),
  perfVsTeamAvg: z.string(),
  perfRank: z.string(),

  /** Revenue breakdown */
  revTotal: z.string(),
  revFees: z.string(),
  revBonus: z.string(),
  revTips: z.string(),
  revPaid: z.string(),
  revPending: z.string(),
  revNextPayment: z.string(),

  /** Client reviews */
  reviewAvg: z.number(),
  reviewDistribution: z.array(z.object({ stars: z.number(), count: z.number() })),
  recentReviews: z.array(driverReviewSchema),

  /** Recent deliveries table */
  recentDeliveriesTable: z.array(profileDeliveryRowSchema),
  tableTodayTotal: z.string(),
  tableTodayCount: z.number(),
  tableAvgPerTeam: z.number(),
  tableRank: z.number(),

  /** Incidents */
  incidentCount: z.number(),
  incidentRate: z.number(),
  incidents: z.array(driverIncidentSchema),

  /** Footer */
  membershipSince: z.string(),
});

export type DriverProfile = z.infer<typeof driverProfileSchema>;

// ────────────────────────────────────────────────────────────
// Agency Statistics Page
// ────────────────────────────────────────────────────────────

/** Daily data point for the area chart */
export const statsDailyPointSchema = z.object({
  day: z.number(),
  label: z.string(),
  value: z.number(),
});

/** Top driver row */
export const statsTopDriverSchema = z.object({
  id: z.string(),
  rank: z.number(),
  name: z.string(),
  initials: z.string(),
  avatarColor: z.string(),
  deliveries: z.number(),
  successRate: z.number(),
});
export type StatsTopDriver = z.infer<typeof statsTopDriverSchema>;

/** Failure reason */
export const statsFailureReasonSchema = z.object({
  id: z.string(),
  label: z.string(),
  percentage: z.number(),
  color: z.string(),
});

/** Weekly summary day */
export const statsWeekDaySchema = z.object({
  day: z.string(),
  deliveries: z.number(),
  successRate: z.number(),
  isHighlighted: z.boolean(),
});

/** Driver of the month */
export const statsDriverOfMonthSchema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  avatarColor: z.string(),
  avatarUrl: z.string().nullable(),
  vehicle: vehicleTypeSchema,
  deliveries: z.number(),
  successRate: z.number(),
  rating: z.number(),
  quote: z.string(),
  month: z.string(),
  runner2nd: z.string(),
  runner3rd: z.string(),
});

/** Full stats response */
export const agencyStatsResponseSchema = z.object({
  /** KPIs */
  totalDeliveries: z.number(),
  deliveriesGrowth: z.string(),
  successRate: z.number(),
  avgDeliveryTime: z.string(),
  avgTimeTarget: z.string(),
  totalRevenue: z.string(),
  revenueGrowth: z.string(),

  /** Chart */
  chartMonth: z.string(),
  chartData: z.array(statsDailyPointSchema),
  chartThisMonth: z.number(),
  chartPrevMonth: z.number(),
  chartGrowth: z.string(),

  /** Driver of the month */
  driverOfMonth: statsDriverOfMonthSchema,

  /** Top drivers */
  topDrivers: z.array(statsTopDriverSchema),

  /** Failure reasons */
  failureCount: z.number(),
  failureRate: z.string(),
  failureVsPrev: z.string(),
  failureReasons: z.array(statsFailureReasonSchema),
  failureTip: z.string(),

  /** Weekly summary */
  weekDays: z.array(statsWeekDaySchema),
});

export type AgencyStatsResponse = z.infer<typeof agencyStatsResponseSchema>;

// ────────────────────────────────────────────────────────────
// Agency Settings Page
// ────────────────────────────────────────────────────────────

/** A single day's schedule */
export const agencyScheduleDaySchema = z.object({
  day: z.string(),
  enabled: z.boolean(),
  openTime: z.string(),
  closeTime: z.string(),
});

/** Social link */
export const agencySocialLinkSchema = z.object({
  id: z.string(),
  platform: z.string(),
  value: z.string(),
  icon: z.string(),
  enabled: z.boolean(),
  visibleOnSugu: z.boolean(),
});

/** Coverage zone */
export const agencyZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  tarif: z.string(),
  delay: z.string(),
  enabled: z.boolean(),
});
export type AgencyZone = z.infer<typeof agencyZoneSchema>;

/** Zone delivery rules */
export const agencyZoneRulesSchema = z.object({
  maxRadius: z.string().default("50"),
  acceptOutside: z.boolean().default(false),
  outsideSurcharge: z.string().default("2,000 FCFA"),
  freeAbove: z.boolean().default(false),
  freeAboveAmount: z.string().nullable().default(null),
});
export type AgencyZoneRules = z.infer<typeof agencyZoneRulesSchema>;

/** Fleet vehicle entry */
export const agencyFleetVehicleSchema = z.object({
  type: z.string(),
  count: z.number(),
  base: z.string(),
  perKm: z.string(),
  maxWeight: z.string(),
});
export type AgencyFleetVehicle = z.infer<typeof agencyFleetVehicleSchema>;

/** Fleet summary */
export const agencyFleetSchema = z.object({
  vehicles: z.array(agencyFleetVehicleSchema),
  totalVehicles: z.number(),
});
export type AgencyFleet = z.infer<typeof agencyFleetSchema>;

/** Payment settings */
export const agencyPaymentSettingsSchema = z.object({
  method: z.enum(["orange", "wave", "bank"]).default("orange"),
  phoneNumber: z.string().default(""),
  frequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  autoTransfer: z.boolean().default(true),
  minAmount: z.string().default("5,000 FCFA"),
  bankDetails: z.object({
    bank: z.string().default(""),
    accountNumber: z.string().default(""),
    iban: z.string().default(""),
  }).optional().default({}),
});
export type AgencyPaymentSettings = z.infer<typeof agencyPaymentSettingsSchema>;

/** Notification channel */
export const agencyNotifChannelSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  on: z.boolean(),
});

/** Notification event row */
export const agencyNotifEventSchema = z.object({
  label: z.string(),
  sms: z.boolean(),
  email: z.boolean(),
  whatsapp: z.boolean(),
});

/** Notification preferences */
export const agencyNotifPreferencesSchema = z.object({
  channels: z.array(agencyNotifChannelSchema),
  events: z.array(agencyNotifEventSchema),
});
export type AgencyNotifPreferences = z.infer<typeof agencyNotifPreferencesSchema>;

/** Full agency settings response */
export const agencySettingsResponseSchema = z.object({
  /** Identity */
  agencyName: z.string(),
  shortName: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  phonePrimary: z.string(),
  phoneSecondary: z.string(),
  rccm: z.string(),
  createdAt: z.string(),
  logoUrl: z.string().nullable(),

  /** Address */
  address: z.string(),
  city: z.string(),
  quartier: z.string(),
  country: z.string(),
  countryFlag: z.string(),
  locationDescription: z.string(),

  /** Service info */
  agencyType: z.string(),
  dailyCapacity: z.string(),
  vehicles: z.array(z.object({
    type: z.string(),
    icon: z.string(),
    selected: z.boolean(),
  })),
  description: z.string(),

  /** Schedule */
  schedule: z.array(agencyScheduleDaySchema),
  sameHoursWeekdays: z.boolean(),
  acceptAfterHours: z.boolean(),
  afterHoursSurcharge: z.string(),

  /** Social / Contact */
  socialLinks: z.array(agencySocialLinkSchema),

  /** Meta */
  lastSaved: z.string(),

  /** Coverage zones */
  zones: z.array(agencyZoneSchema).default([]),
  zoneRules: agencyZoneRulesSchema.optional().nullable(),

  /** Fleet / Vehicles */
  fleet: agencyFleetSchema.optional().nullable(),

  /** Payment settings */
  paymentSettings: agencyPaymentSettingsSchema.optional().nullable(),

  /** Notification preferences */
  notificationPreferences: agencyNotifPreferencesSchema.optional().nullable(),
});

export type AgencySettingsResponse = z.infer<typeof agencySettingsResponseSchema>;

// ============================================================
// Agency — Create Courier Form Schema
// ============================================================

/** Vehicle type enum (for create form — uses "velo" without accent) */
export const vehicleTypeEnum = z.enum(["moto", "velo", "voiture", "tricycle"]);
export type FormVehicleType = z.infer<typeof vehicleTypeEnum>;

/** Gender enum */
export const genderEnum = z.enum(["homme", "femme"]);

/** Single uploaded document */
export const uploadedDocumentSchema = z.object({
  id: z.string(),
  file: z.instanceof(File).optional(), // Client-side File object
  name: z.string(), // "cni_amadou.pdf"
  size: z.string(), // "1.2 MB"
  type: z.enum(["cni", "permis", "carte_grise", "photo"]),
  status: z.enum(["uploaded", "uploading", "error"]),
});
export type UploadedDocument = z.infer<typeof uploadedDocumentSchema>;

/** Full create courier form data */
export const createCourierFormDataSchema = z.object({
  // Personal info
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide").or(z.literal("")),
  phone: z.string().min(8, "Le numéro de téléphone est requis"),
  phonePrefix: z.string().default("+226"),
  dateOfBirth: z.string().optional(),
  gender: genderEnum.optional(),
  quartier: z.string().min(2, "Le quartier est requis"),
  address: z.string().optional(),

  // Vehicle
  vehicleType: vehicleTypeEnum.default("moto"),
  vehicleMake: z.string().min(2, "Le modèle du véhicule est requis"),
  vehiclePlate: z.string().min(2, "Le numéro de plaque est requis"),
  vehicleColor: z.string().optional(),
  vehicleYear: z.string().optional(),

  // Documents — files are uploaded client-side, IDs stored after upload
  documents: z.array(uploadedDocumentSchema).default([]),

  // Access settings
  autoPassword: z.boolean().default(true),
  sendSms: z.boolean().default(true),
  sendEmail: z.boolean().default(false),
});
export type CreateCourierFormData = z.infer<typeof createCourierFormDataSchema>;

/** Default empty form */
export const DEFAULT_CREATE_COURIER: CreateCourierFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  phonePrefix: "+223",
  dateOfBirth: "",
  gender: undefined,
  quartier: "",
  address: "",
  vehicleType: "moto",
  vehicleMake: "",
  vehiclePlate: "",
  vehicleColor: "",
  vehicleYear: "",
  documents: [],
  autoPassword: true,
  sendSms: true,
  sendEmail: false,
};
