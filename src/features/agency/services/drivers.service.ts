import { z } from "zod";
import { api } from "@/lib/http/client";
import { agencyDriversResponseSchema, driverProfileSchema, type AgencyDriversResponse, type DriverProfile } from "../schema";
import { getInitials, getAvatarColor, parseRating, mapCourierStatus, formatRelativeDate, computeSeniority, formatFrenchDate, mapVehicleType } from "./utils";

// Drivers — Backend schemas, transformers, API calls
// ============================================================

// ── Backend courier response schemas ───────────────────────

const backendCourierCardSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  employee_id: z.string().nullable().optional(),
  vehicle_type: z.string().nullable().optional(),
  vehicle_plate: z.string().nullable().optional(),
  phone_e164: z.string().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
  status: z.union([z.string(), z.number()]), // string ("active") in list, number (1) in show
  is_active: z.boolean(),
  kyc_verified: z.boolean(),
  total_deliveries: z.number().nullable().optional(),
  completed_deliveries: z.number().nullable().optional(),
  failed_deliveries: z.number().nullable().optional(),
  rating_avg: z.union([z.number(), z.string()]).nullable().optional(),
  rating_count: z.number().nullable().optional(),
  hired_at: z.string().nullable().optional(),
  last_delivery_at: z.string().nullable().optional(),
  suspended_until: z.string().nullable().optional(),
  metadata: z.unknown().nullable().optional(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable().optional(),
    phone_e164: z.string().nullable().optional(),
  }),
  branch: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable().optional(),
  kyc_documents: z.array(z.object({
    id: z.string(),
    document_type: z.string().nullable().optional(),
    status: z.union([z.string(), z.number()]).nullable().optional(),
    file_path: z.string().nullable().optional(),
    verified_at: z.string().nullable().optional(),
    reviewed_at: z.string().nullable().optional(),
  })).optional().default([]),
});

type BackendCourierCard = z.infer<typeof backendCourierCardSchema>;

const backendDriversListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    couriers: z.array(backendCourierCardSchema),
    pagination: z.object({
      current_page: z.number(),
      last_page: z.number(),
      per_page: z.number(),
      total: z.number(),
    }),
  }),
});

// Stats sub-schema (used in both response shapes)
const backendCourierStatsSchema = z.object({
  total_deliveries: z.number(),
  completed_deliveries: z.number(),
  failed_deliveries: z.number(),
  success_rate: z.number(),
  rating_avg: z.union([z.number(), z.string()]).nullable().optional(),
  rating_count: z.number(),
  kyc_verified: z.boolean(),
  kyc_documents_count: z.number().optional().default(0),
  approved_documents_count: z.number().optional().default(0),
});

// The show endpoint returns { data: { courier: {...}, stats: {...} } }
const backendCourierDetailResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    courier: backendCourierCardSchema,
    stats: backendCourierStatsSchema,
  }),
});

// ── Driver transformer helpers ─────────────────────────────

/** Map backend courier status → frontend DriverStatusVal.
 * List endpoint returns strings ("active", "inactive", "suspended").
 * Show endpoint returns numbers (1 = active, 0 = inactive, 2 = suspended).
 */
/** Transform a backend courier → frontend DriverCard */
function _transformCourierToCard(
  raw: BackendCourierCard,
  rankIndex: number,
): z.infer<typeof import("../schema").driverCardSchema> {
  const name = raw.user.name;
  const totalDel = raw.total_deliveries ?? 0;
  const completedDel = raw.completed_deliveries ?? 0;
  const successRate = totalDel > 0 ? Math.round((completedDel / totalDel) * 100) : 0;
  const rating = parseRating(raw.rating_avg);
  const frontendStatus = mapCourierStatus(raw.status, raw.is_active);

  return {
    id: String(raw.id),
    name,
    phone: raw.user.phone_e164 ?? raw.phone_e164 ?? "",
    email: raw.user.email ?? "",
    initials: getInitials(name),
    avatarColor: getAvatarColor(String(raw.id)),
    avatarUrl: null,
    rank: rankIndex === 0 ? 1 : null,
    status: frontendStatus,
    vehicle: mapVehicleType(raw.vehicle_type),
    totalDeliveries: totalDel,
    rating,
    ratingLabel: "note",
    todayDeliveries: 0, // Not available from index endpoint
    successRate,
    currentActivityLabel: null, // Not available from index endpoint
    warningLabel: successRate > 0 && successRate < 95 ? "Warning" : null,
    lastSeen: raw.last_delivery_at && frontendStatus === "offline"
      ? formatRelativeDate(raw.last_delivery_at)
      : null,
  };
}

/** Transform a backend courier → frontend DriverDetail (side panel) */
function _transformCourierToDetail(
  raw: BackendCourierCard,
  rankIndex: number,
): z.infer<typeof import("../schema").driverDetailSchema> {
  const name = raw.user.name;
  const totalDel = raw.total_deliveries ?? 0;
  const completedDel = raw.completed_deliveries ?? 0;
  const successRate = totalDel > 0 ? Math.round((completedDel / totalDel) * 100) : 0;
  const rating = parseRating(raw.rating_avg);
  const frontendStatus = mapCourierStatus(raw.status, raw.is_active);

  return {
    id: String(raw.id),
    name,
    phone: raw.user.phone_e164 ?? raw.phone_e164 ?? "",
    email: raw.user.email ?? "",
    initials: getInitials(name),
    avatarColor: getAvatarColor(String(raw.id)),
    avatarUrl: null,
    rank: rankIndex === 0 ? 1 : null,
    status: frontendStatus,
    age: "—",
    quartier: "—",
    vehicle: mapVehicleType(raw.vehicle_type),
    vehicleId: raw.vehicle_plate ?? "—",
    permis: raw.kyc_verified ? "Vérifié" : "—",
    joinedDate: formatFrenchDate(raw.hired_at),
    verified: raw.kyc_verified,
    totalDeliveries: totalDel,
    successRate,
    rating,
    avgTime: "—",
    monthlyProgress: Math.min(totalDel > 0 ? Math.round((completedDel / Math.max(totalDel, 1)) * 100) : 0, 100),
    todayDeliveries: 0,
    todayCompleted: 0,
    todayFailed: 0,
    todayRevenue: "—",
    todayHours: "—",
    recentDeliveries: [],
  };
}

/** Full transformers: backend couriers list → frontend AgencyDriversResponse */
function _transformCouriersListResponse(
  validated: z.infer<typeof backendDriversListResponseSchema>,
): AgencyDriversResponse {
  const couriers = validated.data.couriers;

  // Sort by total_deliveries desc to determine rank
  const sorted = [...couriers].sort(
    (a, b) => (b.total_deliveries ?? 0) - (a.total_deliveries ?? 0),
  );

  // Build driver cards
  const drivers = sorted.map((c, i) => _transformCourierToCard(c, i));

  // Compute summary aggregates
  const totalDrivers = validated.data.pagination.total;
  const activeCount = couriers.filter(c => c.status === "active" && c.is_active).length;
  const offlineCount = couriers.filter(c => c.status === "inactive" || (!c.is_active && c.status !== "suspended")).length;
  const suspendedCount = couriers.filter(c => c.status === "suspended").length;

  const ratings = couriers.map(c => parseRating(c.rating_avg)).filter(r => r > 0);
  const averageRating = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0;
  const totalReviews = couriers.reduce((sum, c) => sum + (c.rating_count ?? 0), 0);

  const totalDel = couriers.reduce((sum, c) => sum + (c.total_deliveries ?? 0), 0);
  const completedDel = couriers.reduce((sum, c) => sum + (c.completed_deliveries ?? 0), 0);
  const aggregateSuccessRate = totalDel > 0 ? Math.round((completedDel / totalDel) * 1000) / 10 : 0;

  // Build detail for the first driver (or a minimal empty placeholder)
  const firstCourier = sorted[0];
  const driverDetail = firstCourier
    ? _transformCourierToDetail(firstCourier, 0)
    : {
        id: "", name: "Aucun livreur", phone: "", email: "",
        initials: "—", avatarColor: "bg-gray-100 text-gray-400",
        avatarUrl: null, rank: null, status: "offline" as const,
        age: "—", quartier: "—", vehicle: "moto" as const,
        vehicleId: "—", permis: "—", joinedDate: "—", verified: false,
        totalDeliveries: 0, successRate: 0, rating: 0, avgTime: "—",
        monthlyProgress: 0, todayDeliveries: 0, todayCompleted: 0,
        todayFailed: 0, todayRevenue: "—", todayHours: "—",
        recentDeliveries: [],
      };

  return {
    summary: {
      totalDrivers,
      activeDrivers: activeCount,
      inProgressDeliveries: 0, // Not available from index endpoint
      averageRating,
      totalReviews,
      successRate: aggregateSuccessRate,
      successTarget: 95,
    },
    drivers,
    statusCounts: {
      all: totalDrivers,
      online: activeCount,
      offline: offlineCount,
      suspended: suspendedCount,
    },
    driverDetail,
    lastUpdated: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  };
}

/** Transform backend courier detail → frontend DriverProfile */
function _transformCourierToProfile(
  courier: BackendCourierCard,
  stats: z.infer<typeof backendCourierDetailResponseSchema>["data"]["stats"],
): DriverProfile {
  const name = courier.user.name;
  const frontendStatus = mapCourierStatus(courier.status, courier.is_active);
  const rating = parseRating(stats.rating_avg);
  const { seniority, seniorityDetail } = computeSeniority(courier.hired_at);
  const emergencyParts = [courier.emergency_contact_name, courier.emergency_contact_phone].filter(Boolean);

  // Map KYC documents
  const documents = courier.kyc_documents.map((doc, i) => {
    const st = doc.status;
    const isApproved = st === "approved" || st === 1;
    const isPending = st === "pending" || st === 0;
    const isRejected = st === "rejected" || st === 2;

    return {
      id: doc.id ?? `doc-${i}`,
      label: doc.document_type ?? `Document ${i + 1}`,
      value: isApproved ? "Vérifié" : isPending ? "En attente" : isRejected ? "Rejeté" : (String(st ?? "—")),
      status: isApproved || doc.verified_at || doc.reviewed_at
        ? "verified" as const
        : isRejected
          ? "expired" as const
          : "pending" as const,
      fileUrl: (doc as Record<string, unknown>).file_url as string | undefined ?? null,
    };
  });

  const docsApproved = stats.approved_documents_count;
  const docsTotal = stats.kyc_documents_count;
  const documentsStatus = stats.kyc_verified
    ? "Tous les documents sont vérifiés"
    : `${docsApproved}/${docsTotal} documents approuvés`;

  return {
    id: String(courier.id),
    name,
    initials: getInitials(name),
    avatarColor: getAvatarColor(String(courier.id)),
    avatarUrl: null,
    rank: null,
    status: frontendStatus,
    statusSince: frontendStatus === "online" ? "En service" : frontendStatus === "suspended" ? "Suspendu" : "Hors ligne",
    vehicle: mapVehicleType(courier.vehicle_type),

    // Hero KPIs
    totalDeliveries: stats.total_deliveries,
    monthDeliveries: 0, // Not available from stats endpoint
    successRate: stats.success_rate,
    rating,
    totalReviews: stats.rating_count,
    avgDeliveryTime: "—", // Not available
    avgTimeTarget: "< 3h",
    monthRevenue: "—", // No wallet endpoint
    seniority,
    seniorityDetail,

    // Personal info
    fullName: name,
    phone: courier.user.phone_e164 ?? courier.phone_e164 ?? "",
    email: courier.user.email ?? "",
    dateOfBirth: "—", // Not in model
    address: "—", // Not in model
    emergencyContact: emergencyParts.join(" — ") || "",
    joinedDate: formatFrenchDate(courier.hired_at),
    addedBy: "—", // Not in API

    // Vehicle & documents
    vehicleType: (courier.vehicle_type ?? "Moto").charAt(0).toUpperCase() + (courier.vehicle_type ?? "moto").slice(1),
    vehicleMake: "—", // Not in model
    licensePlate: courier.vehicle_plate ?? "",
    documents,
    documentsStatus,

    // Performance chart — not available, provide placeholder
    perfBars: [
      { hour: "08", value: 0 }, { hour: "10", value: 0 }, { hour: "12", value: 0 },
      { hour: "14", value: 0 }, { hour: "16", value: 0 }, { hour: "18", value: 0 },
      { hour: "20", value: 0 },
    ],
    perfDeliveries: stats.total_deliveries,
    perfVsLastMonth: "—",
    perfVsTeamAvg: "—",
    perfRank: "—",

    // Revenue — not available
    revTotal: "—",
    revFees: "—",
    revBonus: "—",
    revTips: "—",
    revPaid: "—",
    revPending: "—",
    revNextPayment: "—",

    // Reviews — partial data
    reviewAvg: rating,
    reviewDistribution: [
      { stars: 5, count: Math.round(stats.rating_count * 0.7) },
      { stars: 4, count: Math.round(stats.rating_count * 0.15) },
      { stars: 3, count: Math.round(stats.rating_count * 0.08) },
      { stars: 2, count: Math.round(stats.rating_count * 0.05) },
      { stars: 1, count: Math.round(stats.rating_count * 0.02) },
    ],
    recentReviews: [],

    // Recent deliveries table — not available
    recentDeliveriesTable: [],
    tableTodayTotal: "—",
    tableTodayCount: 0,
    tableAvgPerTeam: 0,
    tableRank: 0,

    // Incidents — not available
    incidentCount: stats.failed_deliveries,
    incidentRate: stats.total_deliveries > 0
      ? Math.round((stats.failed_deliveries / stats.total_deliveries) * 100)
      : 0,
    incidents: [],

    // Footer
    membershipSince: `Membre ${seniorityDetail}`,
  };
}

// ── Drivers API functions ──────────────────────────────────

export interface DriverFilters {
  status?: string;
  search?: string;
  sort_by?: string;
}

/**
 * Fetch the agency drivers list + detail.
 *
 * GET /agencies/{agencyId}/couriers
 */
export async function getAgencyDrivers(
  agencyId: string,
  filters?: DriverFilters,
): Promise<AgencyDriversResponse> {
  const params: Record<string, string | number | boolean | undefined> = {
    per_page: 50,
  };
  if (filters?.status) params.status = filters.status;
  if (filters?.search) params.search = filters.search;
  if (filters?.sort_by) params.sort_by = filters.sort_by;

  const raw = await api.get<unknown>(
    `agencies/${agencyId}/couriers`,
    { params },
  );

  // Step 1: validate backend response
  const backendResult = backendDriversListResponseSchema.safeParse(raw);
  if (!backendResult.success) {
    console.error("[getAgencyDrivers] Backend schema validation failed:", JSON.stringify(backendResult.error.issues, null, 2));
    console.error("[getAgencyDrivers] Raw response keys:", Object.keys(raw as Record<string, unknown>));
    const dataObj = (raw as Record<string, unknown>).data;
    if (dataObj && typeof dataObj === "object") {
      const couriers = (dataObj as Record<string, unknown>).couriers;
      if (Array.isArray(couriers) && couriers.length > 0) {
        console.error("[getAgencyDrivers] First courier sample:", JSON.stringify(couriers[0], null, 2));
      }
    }
    throw new Error(`Backend schema validation failed: ${backendResult.error.message}`);
  }

  const transformed = _transformCouriersListResponse(backendResult.data);

  // Step 2: validate frontend response
  const frontendResult = agencyDriversResponseSchema.safeParse(transformed);
  if (!frontendResult.success) {
    console.error("[getAgencyDrivers] Frontend schema validation failed:", JSON.stringify(frontendResult.error.issues, null, 2));
    throw new Error(`Frontend schema validation failed: ${frontendResult.error.message}`);
  }

  return frontendResult.data;
}

/**
 * Fetch a single driver's full profile.
 *
 * GET /agencies/{agencyId}/couriers/{courierId}
 */
export async function getDriverProfile(
  agencyId: string,
  courierId: string,
): Promise<DriverProfile> {
  const raw = await api.get<unknown>(
    `agencies/${agencyId}/couriers/${courierId}`,
  );

  // Step 1: validate backend response
  const backendResult = backendCourierDetailResponseSchema.safeParse(raw);
  if (!backendResult.success) {
    console.error("[getDriverProfile] Backend schema validation failed:", JSON.stringify(backendResult.error.issues, null, 2));
    console.error("[getDriverProfile] Raw response keys:", Object.keys(raw as Record<string, unknown>));
    const dataObj = (raw as Record<string, unknown>).data;
    if (dataObj && typeof dataObj === "object") {
      console.error("[getDriverProfile] Data keys:", Object.keys(dataObj as Record<string, unknown>));
    }
    throw new Error(`Backend schema validation failed: ${backendResult.error.message}`);
  }

  const { courier, stats } = backendResult.data.data;
  const transformed = _transformCourierToProfile(courier, stats);

  // Step 2: validate frontend response
  const frontendResult = driverProfileSchema.safeParse(transformed);
  if (!frontendResult.success) {
    console.error("[getDriverProfile] Frontend schema validation failed:", JSON.stringify(frontendResult.error.issues, null, 2));
    throw new Error(`Frontend schema validation failed: ${frontendResult.error.message}`);
  }

  return frontendResult.data;
}

/**
 * Fetch detail for a single courier (side panel in drivers list).
 *
 * GET /agencies/{agencyId}/couriers/{courierId}
 * Returns DriverDetail (not the full DriverProfile).
 */
export async function getDriverDetail(
  agencyId: string,
  courierId: string,
): Promise<z.infer<typeof import("../schema").driverDetailSchema>> {
  const raw = await api.get<unknown>(
    `agencies/${agencyId}/couriers/${courierId}`,
  );

  const backendResult = backendCourierDetailResponseSchema.safeParse(raw);
  if (!backendResult.success) {
    console.error("[getDriverDetail] Backend schema validation failed:", JSON.stringify(backendResult.error.issues, null, 2));
    console.error("[getDriverDetail] Raw response keys:", Object.keys(raw as Record<string, unknown>));
    const dataObj = (raw as Record<string, unknown>).data;
    if (dataObj && typeof dataObj === "object") {
      console.error("[getDriverDetail] Data keys:", Object.keys(dataObj as Record<string, unknown>));
    }
    throw new Error(`Backend schema validation failed: ${backendResult.error.message}`);
  }

  const courier = backendResult.data.data.courier;

  // Determine rank — not available from single detail, use null
  return _transformCourierToDetail(courier, -1);
}

// ── Driver mutations ───────────────────────────────────────

/**
 * Suspend a courier.
 *
 * POST /agencies/{agencyId}/couriers/{courierId}/suspend
 */
export async function suspendCourier(
  agencyId: string,
  courierId: string,
  reason?: string,
  suspendedUntil?: string,
): Promise<void> {
  await api.post(
    `agencies/${agencyId}/couriers/${courierId}/suspend`,
    { reason, suspended_until: suspendedUntil },
  );
}

/**
 * Reactivate a suspended courier.
 *
 * POST /agencies/{agencyId}/couriers/{courierId}/activate
 */
export async function activateCourier(
  agencyId: string,
  courierId: string,
): Promise<void> {
  await api.post(
    `agencies/${agencyId}/couriers/${courierId}/activate`,
  );
}

/** Payload for adding a new courier */
export interface AddCourierPayload {
  user_id: string;
  vehicle_type?: string;
  branch_id?: string;
}

/**
 * Add a new courier to the agency.
 *
 * POST /agencies/{agencyId}/couriers
 */
export async function addCourier(
  agencyId: string,
  data: AddCourierPayload,
): Promise<void> {
  await api.post(
    `agencies/${agencyId}/couriers`,
    data,
  );
}

/**
 * Remove/delete a courier from the agency.
 *
 * DELETE /agencies/{agencyId}/couriers/{courierId}
 */
export async function removeCourier(
  agencyId: string,
  courierId: string,
): Promise<void> {
  await api.delete(
    `agencies/${agencyId}/couriers/${courierId}`,
  );
}

/** Payload for registering a new courier (full form) */
export interface RegisterCourierPayload {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  quartier?: string;
  address?: string;
  vehicle_type: string;
  vehicle_make?: string;
  vehicle_plate?: string;
  vehicle_color?: string;
  vehicle_year?: string;
  auto_password?: boolean;
  send_sms?: boolean;
  send_email?: boolean;
}

/**
 * Register a new courier for the agency (full creation flow).
 *
 * POST /agencies/{agencyId}/couriers/register
 *
 * Unlike addCourier() which links an existing user_id,
 * this endpoint creates the user + courier in one step.
 */
export async function registerCourier(
  agencyId: string,
  data: RegisterCourierPayload,
): Promise<{ courierId: string; password?: string }> {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: { courier_id: string; password?: string };
  }>(`agencies/${agencyId}/couriers/register`, {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    date_of_birth: data.date_of_birth,
    gender: data.gender,
    quartier: data.quartier,
    address: data.address,
    vehicle_type: data.vehicle_type,
    vehicle_make: data.vehicle_make,
    vehicle_plate: data.vehicle_plate,
    vehicle_color: data.vehicle_color,
    vehicle_year: data.vehicle_year,
    auto_password: data.auto_password ?? true,
    send_sms: data.send_sms ?? true,
    send_email: data.send_email ?? false,
  });

  return {
    courierId: response.data.courier_id,
    password: response.data.password,
  };
}

/**
 * Verify driver KYC (approve or reject)
 *
 * POST /agencies/{agencyId}/couriers/{courierId}/verify-kyc
 */
export async function verifyCourierKyc(
  agencyId: string,
  courierId: string,
  approved: boolean,
  notes?: string
): Promise<void> {
  await api.post(
    `agencies/${agencyId}/couriers/${courierId}/verify-kyc`,
    { approved, notes }
  );
}

// --- MOCK FALLBACK (kept for dev/offline testing) ---
// async function _registerCourierMock(
//   agencyId: string,
//   data: RegisterCourierPayload,
// ): Promise<{ courierId: string; password?: string }> {
//   await new Promise((r) => setTimeout(r, 1200));
//   return {
//     courierId: "cour-" + Date.now(),
//     password: data.auto_password ? "TempPass2026!" : undefined,
//   };
// }


// Invitation / Referral Code
// ============================================================

export interface InvitationCodeResponse {
  code: string;
  link: string;
}

/**
 * Get or regenerate the agency invitation code for drivers.
 *
 * GET /partners/drivers/referral-code[?refresh=true]
 */
export async function getInvitationCode(
  refresh = false,
): Promise<InvitationCodeResponse> {
  const params: Record<string, string | undefined> = {};
  if (refresh) params.refresh = "true";

  const raw = await api.get<InvitationCodeResponse>(
    "partners/drivers/referral-code",
    { params },
  );

  return raw;
}

// ============================================================
// ============================================================

