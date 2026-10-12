import { z } from "zod";
import { asCents, centsToFrancs, type MoneyFrancs } from "@/design-system";
import { rawDeliveryRowSchema, deliveryRowOf, type DeliveryRow } from "../deliveries/contract";

// ============================================================
// Agency couriers — contract with `agencies/{id}/couriers/*`
// (Laravel: CourierManagementController, CourierService,
// AgencyCourierOverviewService).
//
// Amounts (`revenue_today`, the performance and earnings blocks)
// are answered in CENTIMES and converted to francs here, once.
//
// `activity` is what a courier is doing, read by the server from
// his account, his verification and the shipments he carries:
// no screen derives it.
// ============================================================

export const COURIER_ACTIVITIES = ["on_delivery", "available", "paused", "to_verify", "suspended"] as const;
export type CourierActivity = (typeof COURIER_ACTIVITIES)[number];

const text = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || null);
const id = z.union([z.string().min(1), z.number()]).transform(String);
const count = z.number().int().nonnegative();
const francs = (centimes: number | null | undefined): MoneyFrancs => centsToFrancs(asCents(centimes ?? 0));

// ── A courier ───────────────────────────────────────────────

const rawDocumentSchema = z.object({
  id,
  document_type: z.string(),
  document_number: text.optional(),
  expires_on: text.optional(),
  status: z.union([z.string(), z.number()]).nullish(),
  reviewed_at: text.optional(),
  file_url: text.optional(),
});

const rawCourierSchema = z.object({
  id,
  user_id: id,
  employee_id: text,
  vehicle_type: text,
  vehicle_plate: text,
  phone_e164: text,
  emergency_contact_name: text.optional(),
  emergency_contact_phone: text.optional(),
  status: z.string(),
  is_active: z.boolean(),
  kyc_verified: z.boolean(),
  suspended_until: text.optional(),
  kyc_verified_at: text.optional(),
  total_deliveries: z.number(),
  completed_deliveries: z.number(),
  failed_deliveries: z.number().nullish(),
  rating_avg: z.number().nullish(),
  rating_count: z.number().nullish(),
  hired_at: text.optional(),
  last_delivery_at: text.optional(),
  created_at: text.optional(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  user: z.object({ id, name: z.string(), email: text, phone_e164: text }).nullish(),
  // His first name and his name as they were typed (CourierService::namesOf); on his page only.
  first_name: text.optional(),
  last_name: text.optional(),
  branch: z.object({ id, name: z.string() }).nullish(),
  kyc_documents: z.array(rawDocumentSchema).nullish(),
  // Figures of the day (AgencyCourierOverviewService::figuresFor).
  activity: z.string().nullish(),
  active_shipments: z.number().nullish(),
  deliveries_today: z.number().nullish(),
  revenue_today: z.number().nullish(),
  success_rate: z.number().nullish(),
  last_activity_at: text.optional(),
});

export interface CourierDocument {
  id: string;
  type: string;
  number: string | null;
  expiresOn: string | null;
  /** `CourierKycDocument.status`: 0 pending, 1 approved, 2 rejected. */
  status: string | null;
  fileUrl: string | null;
}

export interface Courier {
  /** His profile in the agency: the id of his page. */
  id: string;
  /** His user account: what assigning a delivery expects. */
  userId: string;
  name: string;
  /** His first name and his name, apart; null when the backend answers his whole name only. */
  names: { first: string; last: string } | null;
  email: string | null;
  phone: string | null;
  employeeId: string | null;
  /** The account, as the backend names it: active, suspended, inactive, pending_kyc. */
  status: string;
  /** What he is doing; null on a backend that does not say. */
  activity: string | null;
  isActive: boolean;
  kycVerified: boolean;
  kycVerifiedAt: string | null;
  suspendedUntil: string | null;
  vehicleType: string | null;
  vehiclePlate: string | null;
  vehicleMake: string | null;
  vehicleColor: string | null;
  vehicleYear: string | null;
  quartier: string | null;
  address: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  branch: string | null;
  hiredAt: string | null;
  createdAt: string | null;
  lastDeliveryAt: string | null;
  totalDeliveries: number;
  completedDeliveries: number;
  failedDeliveries: number;
  /** Percentage; null before his first delivery. */
  successRate: number | null;
  rating: number | null;
  ratingCount: number;
  activeShipments: number;
  deliveriesToday: number;
  revenueTodayFrancs: MoneyFrancs;
  lastActivityAt: string | null;
  /** Null when the backend did not answer them to this user (a courier listing his colleagues). */
  documents: CourierDocument[] | null;
}

type RawCourier = z.infer<typeof rawCourierSchema>;

/**
 * A courier registered without an e-mail is given a made-up address on this
 * domain, because the account needs one: it is not his, and is never shown.
 */
const PLACEHOLDER_EMAIL = /@courier\.sugu\.pro$/i;

const meta = (courier: RawCourier, key: string): string | null => {
  const value = courier.metadata?.[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : typeof value === "number" ? String(value) : null;
};

function courierOf(courier: RawCourier): Courier {
  return {
    id: courier.id,
    userId: courier.user_id,
    name: courier.user?.name ?? "Livreur",
    names: courier.first_name ? { first: courier.first_name, last: courier.last_name ?? "" } : null,
    email: courier.user?.email && !PLACEHOLDER_EMAIL.test(courier.user.email) ? courier.user.email : null,
    phone: courier.user?.phone_e164 ?? courier.phone_e164,
    employeeId: courier.employee_id,
    status: courier.status,
    activity: courier.activity ?? null,
    isActive: courier.is_active,
    kycVerified: courier.kyc_verified,
    kycVerifiedAt: courier.kyc_verified_at ?? null,
    suspendedUntil: courier.suspended_until ?? null,
    vehicleType: courier.vehicle_type,
    vehiclePlate: courier.vehicle_plate,
    vehicleMake: meta(courier, "vehicle_make"),
    vehicleColor: meta(courier, "vehicle_color"),
    vehicleYear: meta(courier, "vehicle_year"),
    quartier: meta(courier, "quartier"),
    address: meta(courier, "address"),
    dateOfBirth: meta(courier, "date_of_birth"),
    gender: meta(courier, "gender"),
    emergencyContactName: courier.emergency_contact_name ?? null,
    emergencyContactPhone: courier.emergency_contact_phone ?? null,
    branch: courier.branch?.name ?? null,
    hiredAt: courier.hired_at ?? null,
    createdAt: courier.created_at ?? null,
    lastDeliveryAt: courier.last_delivery_at ?? null,
    totalDeliveries: courier.total_deliveries,
    completedDeliveries: courier.completed_deliveries,
    failedDeliveries: courier.failed_deliveries ?? 0,
    successRate: courier.success_rate ?? null,
    rating: courier.rating_avg ?? null,
    ratingCount: courier.rating_count ?? 0,
    activeShipments: courier.active_shipments ?? 0,
    deliveriesToday: courier.deliveries_today ?? 0,
    revenueTodayFrancs: francs(courier.revenue_today),
    lastActivityAt: courier.last_activity_at ?? null,
    documents: courier.kyc_documents
      ? courier.kyc_documents.map((document) => ({
          id: document.id,
          type: document.document_type,
          number: document.document_number ?? null,
          expiresOn: document.expires_on ?? null,
          status: document.status === null || document.status === undefined ? null : String(document.status),
          fileUrl: document.file_url ?? null,
        }))
      : null,
  };
}

export const parseCourier = (raw: unknown): Courier => courierOf(rawCourierSchema.parse(raw));

// ── List ────────────────────────────────────────────────────

const rawOverviewSchema = z.object({
  total: count,
  active: count,
  onDelivery: count,
  available: count,
  paused: count,
  toVerify: count,
  suspended: count,
});

export type CourierOverview = z.infer<typeof rawOverviewSchema>;
export const parseCourierOverview = (raw: unknown): CourierOverview => rawOverviewSchema.parse(raw);

const who = { courier_id: id, name: z.string(), employee_id: text };

const rawAlertsSchema = z.object({
  documents: z.object({
    total: count,
    items: z.array(z.object({ ...who, document_type: z.string(), expires_on: z.string(), days_left: z.number().int() })),
  }),
  lowPerformance: z.object({
    total: count,
    items: z.array(z.object({ ...who, success_rate: z.number(), total_deliveries: z.number() })),
  }),
  inactive: z.object({
    total: count,
    items: z.array(z.object({ ...who, last_delivery_at: text, days: z.number().int() })),
  }),
});

export interface CourierAlertPerson {
  courierId: string;
  name: string;
  employeeId: string | null;
}

export interface CourierAlerts {
  documents: { total: number; items: (CourierAlertPerson & { documentType: string; expiresOn: string; daysLeft: number })[] };
  lowPerformance: { total: number; items: (CourierAlertPerson & { successRate: number; totalDeliveries: number })[] };
  inactive: { total: number; items: (CourierAlertPerson & { lastDeliveryAt: string | null; days: number })[] };
}

const person = (entry: { courier_id: string; name: string; employee_id: string | null }): CourierAlertPerson => ({
  courierId: entry.courier_id,
  name: entry.name,
  employeeId: entry.employee_id,
});

function alertsOf(alerts: z.infer<typeof rawAlertsSchema>): CourierAlerts {
  return {
    documents: {
      total: alerts.documents.total,
      items: alerts.documents.items.map((entry) => ({
        ...person(entry),
        documentType: entry.document_type,
        expiresOn: entry.expires_on,
        daysLeft: entry.days_left,
      })),
    },
    lowPerformance: {
      total: alerts.lowPerformance.total,
      items: alerts.lowPerformance.items.map((entry) => ({
        ...person(entry),
        successRate: entry.success_rate,
        totalDeliveries: entry.total_deliveries,
      })),
    },
    inactive: {
      total: alerts.inactive.total,
      items: alerts.inactive.items.map((entry) => ({ ...person(entry), lastDeliveryAt: entry.last_delivery_at, days: entry.days })),
    },
  };
}

const rawListSchema = z.object({
  couriers: z.array(z.unknown()),
  overview: rawOverviewSchema.nullish(),
  quartiers: z.array(z.object({ name: z.string(), count })).nullish(),
  alerts: rawAlertsSchema.nullish(),
  pagination: z.object({ total: count }),
});

export interface CourierListPage {
  rows: Courier[];
  total: number;
  page: number;
  pageSize: number;
  overview: CourierOverview | null;
  /** Quartiers the couriers registered in; null when the backend does not list them. */
  quartiers: { name: string; count: number }[] | null;
  /** Null for who does not run the agency. */
  alerts: CourierAlerts | null;
}

export function parseCourierListPage(raw: unknown, requested: { page: number; pageSize: number }): CourierListPage {
  const list = rawListSchema.parse(raw);
  return {
    rows: list.couriers.map(parseCourier),
    total: list.pagination.total,
    page: requested.page,
    pageSize: requested.pageSize,
    overview: list.overview ?? null,
    quartiers: list.quartiers ?? null,
    alerts: list.alerts ? alertsOf(list.alerts) : null,
  };
}

// ── Page of a courier ───────────────────────────────────────

const rawShareSchema = z.object({ revenue: z.number(), courier_share: z.number(), agency_share: z.number() });

const rawActivitySchema = z.object({
  last_position: z.object({ lat: z.number(), lng: z.number(), recorded_at: text, shipment_id: id.nullish() }).nullish(),
  current_mission: rawDeliveryRowSchema.nullish(),
  recent_deliveries: z.array(rawDeliveryRowSchema),
  performance: z.object({
    average_delivery_minutes: z.number().nullish(),
    revenue_total: z.number(),
    revenue_this_month: z.number(),
    revenue_last_month: z.number(),
    deliveries_this_month: z.number(),
    deliveries_last_month: z.number(),
  }),
  earnings: z
    .object({ commission_rate: z.number(), rate_is_own: z.boolean(), this_month: rawShareSchema, last_month: rawShareSchema })
    .nullish(),
  rhythm: z
    .object({
      window_days: z.number(),
      deliveries_by_weekday: z.array(z.number()),
      first_hour: z.number().nullish(),
      last_hour: z.number().nullish(),
    })
    .nullish(),
  today_events: z.array(
    z.object({ at: z.string(), event_type: z.string(), status: text, memo: text, shipment_id: id, order_number: text }),
  ),
});

const rawDetailSchema = z.object({ courier: z.unknown(), activity: rawActivitySchema.nullish() });

export interface EarningsShare {
  revenueFrancs: MoneyFrancs;
  courierShareFrancs: MoneyFrancs;
  agencyShareFrancs: MoneyFrancs;
}

export interface CourierDayEvent {
  at: string;
  /** `TrackingEventType`. */
  type: string;
  /** Status the shipment entered with this event, when it changed. */
  status: string | null;
  memo: string | null;
  deliveryId: string;
  reference: string | null;
}

export interface CourierDetail {
  courier: Courier;
  /** Null on a backend older than the pro portal contract: the page then shows the record only. */
  activity: {
    lastPosition: { lat: number; lng: number; recordedAt: string | null } | null;
    mission: DeliveryRow | null;
    recentDeliveries: DeliveryRow[];
    /** Mean time between pickup and delivery over ninety days; null without a dated delivery. */
    averageDeliveryMinutes: number | null;
    revenueTotalFrancs: MoneyFrancs;
    deliveriesThisMonth: number;
    deliveriesLastMonth: number;
    revenueThisMonthFrancs: MoneyFrancs;
    revenueLastMonthFrancs: MoneyFrancs;
    earnings: {
      /** Share of each delivery fee credited to the courier, in percent. */
      commissionRate: number;
      /** His own rate, or the default one of the agency. */
      rateIsOwn: boolean;
      thisMonth: EarningsShare;
      lastMonth: EarningsShare;
    } | null;
    /** When he delivers, observed over `windowDays`. */
    rhythm: { windowDays: number; byWeekday: number[]; firstHour: number | null; lastHour: number | null } | null;
    todayEvents: CourierDayEvent[];
  } | null;
}

const shareOf = (share: z.infer<typeof rawShareSchema>): EarningsShare => ({
  revenueFrancs: francs(share.revenue),
  courierShareFrancs: francs(share.courier_share),
  agencyShareFrancs: francs(share.agency_share),
});

export function parseCourierDetail(raw: unknown): CourierDetail {
  const detail = rawDetailSchema.parse(raw);
  const activity = detail.activity;
  return {
    courier: parseCourier(detail.courier),
    activity: activity
      ? {
          lastPosition: activity.last_position
            ? { lat: activity.last_position.lat, lng: activity.last_position.lng, recordedAt: activity.last_position.recorded_at }
            : null,
          mission: activity.current_mission ? deliveryRowOf(activity.current_mission) : null,
          recentDeliveries: activity.recent_deliveries.map(deliveryRowOf),
          averageDeliveryMinutes: activity.performance.average_delivery_minutes ?? null,
          revenueTotalFrancs: francs(activity.performance.revenue_total),
          deliveriesThisMonth: activity.performance.deliveries_this_month,
          deliveriesLastMonth: activity.performance.deliveries_last_month,
          revenueThisMonthFrancs: francs(activity.performance.revenue_this_month),
          revenueLastMonthFrancs: francs(activity.performance.revenue_last_month),
          earnings: activity.earnings
            ? {
                commissionRate: activity.earnings.commission_rate,
                rateIsOwn: activity.earnings.rate_is_own,
                thisMonth: shareOf(activity.earnings.this_month),
                lastMonth: shareOf(activity.earnings.last_month),
              }
            : null,
          rhythm: activity.rhythm
            ? {
                windowDays: activity.rhythm.window_days,
                byWeekday: activity.rhythm.deliveries_by_weekday,
                firstHour: activity.rhythm.first_hour ?? null,
                lastHour: activity.rhythm.last_hour ?? null,
              }
            : null,
          todayEvents: activity.today_events.map((event) => ({
            at: event.at,
            type: event.event_type,
            status: event.status,
            memo: event.memo,
            deliveryId: event.shipment_id,
            reference: event.order_number,
          })),
        }
      : null,
  };
}

// ── Wording shared by the courier screens ───────────────────

/** `vehicle_type` is stored in French by the registration and in English by an edit. */
const VEHICLE_LABEL: Record<string, string> = {
  moto: "Moto",
  motorcycle: "Moto",
  velo: "Vélo",
  bike: "Vélo",
  voiture: "Voiture",
  car: "Voiture",
  tricycle: "Tricycle",
  foot: "À pied",
};

export function vehicleLabel(type: string | null): string | null {
  if (!type) return null;
  return VEHICLE_LABEL[type.toLowerCase()] ?? type;
}

/** The value the registration and edit forms post for a stored vehicle type. */
export function vehicleFormValue(type: string | null): "moto" | "velo" | "voiture" | "tricycle" | "" {
  const key = type?.toLowerCase() ?? "";
  if (key === "moto" || key === "motorcycle") return "moto";
  if (key === "velo" || key === "bike") return "velo";
  if (key === "voiture" || key === "car") return "voiture";
  if (key === "tricycle") return "tricycle";
  return "";
}

/** `AddCourierKycDocumentRequest.document_type`. */
export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  id_card: "Pièce d'identité",
  driver_license: "Permis de conduire",
  vehicle_registration: "Carte grise",
  insurance: "Assurance",
  other: "Autre document",
};

export function documentLabel(type: string): string {
  return DOCUMENT_TYPE_LABEL[type] ?? "Document";
}
