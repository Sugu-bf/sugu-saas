import type { User, UserRole } from "@/types";

// ============================================================
// Session user — the ONE place that turns a backend profile
// (AuthService::getUserProfile) into the front-end session user.
//
// Used by every BFF auth route (login, verify-otp, set-password, me)
// so they cannot drift apart again.
// ============================================================

type BackendUser = Record<string, unknown>;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const USER_TYPE_TO_ROLE: Record<string, UserRole> = {
  seller: "vendor",
  // "both" = buyer + seller: on the pro portal they are a vendor.
  both: "vendor",
  delivery_partner: "agency",
  courier: "courier",
};

/**
 * Map a backend profile to a pro-portal role.
 *
 * Order of trust: explicit `user_type`, then Spatie `roles`, then the presence
 * of a business entity. A profile that matches nothing (a buyer, an admin, a
 * type added later) returns `null` — it is NEVER turned into a vendor.
 */
export function mapRole(backendUser: BackendUser): UserRole | null {
  const type = typeof backendUser.user_type === "string" ? backendUser.user_type : undefined;
  if (type && USER_TYPE_TO_ROLE[type]) return USER_TYPE_TO_ROLE[type];

  const roles = Array.isArray(backendUser.roles) ? (backendUser.roles as unknown[]).map(String) : [];
  if (roles.includes("courier")) return "courier";
  if (roles.some((r) => r === "delivery_partner" || r === "partner" || r === "agency")) return "agency";
  if (roles.some((r) => r === "seller" || r === "vendor")) return "vendor";

  if (backendUser.agency || backendUser.delivery_partner) return "agency";
  if (backendUser.courier) return "courier";
  if (backendUser.can_sell === true || backendUser.store) return "vendor";

  return null;
}

/** Store name (vendor) or agency name (agency / courier's agency). */
export function extractBusinessName(backendUser: BackendUser): string | null {
  const store = asRecord(backendUser.store);
  if (store?.name) return String(store.name);
  for (const key of ["agency", "delivery_partner"] as const) {
    const entity = asRecord(backendUser[key]);
    if (entity?.company_name) return String(entity.company_name);
    if (entity?.name) return String(entity.name);
  }
  return null;
}

/** Courier status as sent by the API (CourierStatus: 1 active … 4 KYC pending). */
function extractCourierStatus(backendUser: BackendUser): number | null {
  const raw = asRecord(backendUser.courier)?.status;
  const value = asRecord(raw)?.value ?? raw;
  const status = typeof value === "string" ? Number(value) : value;
  return typeof status === "number" && Number.isFinite(status) ? status : null;
}

/**
 * Build the session user, or `null` when the profile has no place on the pro
 * portal. Callers must treat `null` as "unsupported profile", not as a vendor.
 */
export function toSessionUser(backendUser: BackendUser): User | null {
  const role = mapRole(backendUser);
  if (!role) return null;

  const store = asRecord(backendUser.store);
  const agency = asRecord(backendUser.agency) ?? asRecord(backendUser.delivery_partner);
  const courierAgency = asRecord(asRecord(backendUser.courier)?.delivery_partner);
  const partnerId = agency?.id ?? courierAgency?.id ?? null;

  return {
    id: backendUser.id as string | number,
    name: String(backendUser.name ?? ""),
    email: String(backendUser.email ?? ""),
    role,
    avatar_url: (backendUser.avatar_url as string | null) ?? (store?.logo_url as string | null) ?? null,
    email_verified_at: backendUser.email_verified ? new Date().toISOString() : null,
    created_at: backendUser.created_at ? String(backendUser.created_at) : new Date().toISOString(),
    delivery_partner_id: partnerId !== null && partnerId !== undefined ? String(partnerId) : null,
    business_name: extractBusinessName(backendUser),
    store_id: store?.id ? String(store.id) : null,
    courier_status: role === "courier" ? extractCourierStatus(backendUser) : null,
  };
}

/** CourierStatus::PENDING_KYC on the backend. */
export const COURIER_STATUS_PENDING_KYC = 4;

/** Where a signed-in user of this role lands. */
export function homePathFor(user: Pick<User, "role" | "courier_status">): string {
  if (user.role === "vendor") return "/vendor/dashboard";
  if (user.role === "agency") return "/agency/dashboard";
  return user.courier_status === COURIER_STATUS_PENDING_KYC
    ? "/signup/driver?step=pending"
    : "/driver/dashboard";
}

const ROLE_PREFIX: Record<UserRole, string> = {
  vendor: "/vendor/",
  agency: "/agency/",
  courier: "/driver/",
};

/**
 * Destination after login: the `redirect` asked for by the proxy when it is a
 * same-origin path inside the user's own space, otherwise their home.
 * Anything else (absolute URL, protocol-relative, another role's space) is
 * ignored — no open redirect, no bounce through a RoleGuard.
 */
export function postLoginPath(user: Pick<User, "role" | "courier_status">, redirect?: string | null): string {
  const home = homePathFor(user);
  if (user.role === "courier" && user.courier_status === COURIER_STATUS_PENDING_KYC) return home;
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//") || redirect.includes("\\")) return home;
  return redirect.startsWith(ROLE_PREFIX[user.role]) ? redirect : home;
}

const SEVEN_DAYS = 60 * 60 * 24 * 7;

/**
 * Cookie lifetime in seconds: never longer than the token itself
 * (`expires_at` from the API), capped at 7 days.
 */
export function sessionMaxAge(expiresAt: unknown, now: number = Date.now()): number {
  if (typeof expiresAt !== "string") return SEVEN_DAYS;
  const ms = Date.parse(expiresAt);
  if (Number.isNaN(ms)) return SEVEN_DAYS;
  const remaining = Math.floor((ms - now) / 1000);
  return Math.max(0, Math.min(remaining, SEVEN_DAYS));
}

export const SESSION_COOKIE = "sugu_session";

/**
 * Name of the pre-BFF cookie, which scripts could read. It is no longer
 * honoured anywhere and is deleted whenever the server answers.
 */
export const LEGACY_SESSION_COOKIE = "sugu_token";

export function sessionCookieOptions(maxAge: number) {
  return {
    // Never readable by scripts: only the BFF routes (/api/auth/*, /api/proxy/*)
    // read it, server-side. Host-only (no Domain), so it stays on this origin.
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
