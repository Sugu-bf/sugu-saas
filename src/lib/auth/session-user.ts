import type { LanayaFacts, User, UserRole } from "@/types";

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

  // An ordinary SUGU account whose only pro space is Lanaya (a candidate or
  // an admitted Lanabaga). The status lives in the profile, never in the
  // user type (ADR-02).
  if (extractLanaya(backendUser)) return "lanabaga";

  return null;
}

/** The `lanaya` block of the profile, when the account has a Lanabaga profile. */
export function extractLanaya(backendUser: BackendUser): LanayaFacts | null {
  const lanaya = asRecord(backendUser.lanaya);
  if (!lanaya || typeof lanaya.profile_id !== "string") return null;
  return {
    profile_id: lanaya.profile_id,
    public_code: String(lanaya.public_code ?? ""),
    application_status: String(lanaya.application_status ?? "draft"),
    account_status: String(lanaya.account_status ?? "none"),
    can_work: lanaya.can_work === true,
  };
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

/** `courier.operational` (DeliveryCourier::isOperational), or null when the backend does not say it. */
function extractCourierOperational(backendUser: BackendUser): boolean | null {
  const value = asRecord(backendUser.courier)?.operational;
  return typeof value === "boolean" ? value : null;
}

/**
 * Build the session user, or `null` when the profile has no place on the pro
 * portal. Callers must treat `null` as "unsupported profile", not as a vendor.
 */
export function toSessionUser(backendUser: BackendUser): User | null {
  const role = mapRole(backendUser);
  if (!role) return null;

  const lanaya = extractLanaya(backendUser);
  const spaces: UserRole[] = lanaya && role !== "lanabaga" ? [role, "lanabaga"] : [role];

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
    courier_operational: role === "courier" ? extractCourierOperational(backendUser) : null,
    spaces,
    lanaya,
    lanaya_seller: asRecord(backendUser.lanaya_seller)?.linked === true,
  };
}

/**
 * Does this seller see the Lanaya programme (menu entry, ticket categories)?
 * Only once one of their stores is linked to it (DEC-38). The server refuses
 * a programme ticket from any other seller.
 */
export function sellerSeesLanaya(user: Pick<User, "lanaya_seller">): boolean {
  return user.lanaya_seller === true;
}

/** May this session open that space? Navigation comfort: the API decides. */
export function canEnterSpace(user: Pick<User, "role" | "spaces">, space: UserRole): boolean {
  return (user.spaces ?? [user.role]).includes(space);
}

/**
 * Whether a Lanabaga can act, as the session knows it: admitted, active
 * account, valid agreement (`lanaya.can_work`). The server refuses every
 * protected route by itself; this only picks the screens to offer.
 */
export function lanabagaCanWork(user: Pick<User, "lanaya">): boolean {
  return user.lanaya?.can_work === true;
}

/** Where a candidate (or a Lanabaga who cannot act yet) follows their file. */
export const LANABAGA_FILE_PATH = "/lanabaga/application";

/** What stays open to a Lanabaga who cannot act: their application, their documents, their account. */
const LANABAGA_OPEN_PATHS = [LANABAGA_FILE_PATH, "/lanabaga/documents", "/lanabaga/compliance", "/lanabaga/settings", "/lanabaga/support"];

export function isOpenToEveryLanabaga(pathname: string): boolean {
  return LANABAGA_OPEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** CourierStatus::PENDING_KYC on the backend. */
export const COURIER_STATUS_PENDING_KYC = 4;

type CourierFacts = Pick<User, "role" | "courier_status"> & Partial<Pick<User, "courier_operational" | "spaces" | "lanaya">>;

/**
 * Whether a courier can take missions, as the session knows it: what
 * `courier.operational` enforces on the server (approved documents, active,
 * not suspended). Navigation comfort only — the server refuses the mission
 * routes by itself. A backend that does not say it yet is read as before:
 * everybody but a courier whose documents are pending.
 */
export function courierCanWork(user: CourierFacts): boolean {
  if (user.role !== "courier") return false;
  return user.courier_operational ?? user.courier_status !== COURIER_STATUS_PENDING_KYC;
}

/** Where a courier who cannot work yet completes and follows their file. */
export const COURIER_FILE_PATH = "/driver/documents";

/**
 * What stays open to a courier who cannot work: their file, their profile,
 * and what they did and earned before. Everything else of the space is about
 * missions, which the server refuses them.
 */
const COURIER_OPEN_PATHS = [COURIER_FILE_PATH, "/driver/profile", "/driver/settings", "/driver/history", "/driver/earnings", "/driver/messages"];

export function isOpenToEveryCourier(pathname: string): boolean {
  return COURIER_OPEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** Where a signed-in user of this role lands. */
export function homePathFor(user: CourierFacts): string {
  if (user.role === "vendor") return "/vendor/dashboard";
  if (user.role === "agency") return "/agency/dashboard";
  if (user.role === "lanabaga") return spaceHomePath(user, "lanabaga");
  // A courier who cannot work yet lands on their file, where it is completed:
  // the waiting screen of the sign-up left them nothing to do.
  return courierCanWork(user) ? "/driver/dashboard" : COURIER_FILE_PATH;
}

/** Home of one space of the session (the space switcher of the user menu). */
export function spaceHomePath(user: CourierFacts, space: UserRole): string {
  if (space === "lanabaga") return lanabagaCanWork({ lanaya: user.lanaya ?? null }) ? "/lanabaga/dashboard" : LANABAGA_FILE_PATH;
  return homePathFor({ ...user, role: space });
}

const ROLE_PREFIX: Record<UserRole, string> = {
  vendor: "/vendor/",
  agency: "/agency/",
  courier: "/driver/",
  lanabaga: "/lanabaga/",
};

/** The space a pathname belongs to, if any. */
export function spaceOfPath(pathname: string): UserRole | null {
  const entry = (Object.entries(ROLE_PREFIX) as [UserRole, string][]).find(([, prefix]) => pathname.startsWith(prefix));
  return entry ? entry[0] : null;
}

/**
 * Destination after login: the `redirect` asked for by the proxy when it is a
 * same-origin path inside the user's own space, otherwise their home.
 * Anything else (absolute URL, protocol-relative, another role's space) is
 * ignored — no open redirect, no bounce through a RoleGuard.
 */
export function postLoginPath(user: CourierFacts, redirect?: string | null): string {
  const home = homePathFor(user);
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//") || redirect.includes("\\")) return home;
  const space = spaceOfPath(redirect);
  const path = redirect.split(/[?#]/)[0];
  // Any account may open its application, with or without a profile yet.
  if (space === "lanabaga" && isOpenToEveryLanabaga(path)) return redirect;
  if (!space || !canEnterSpace({ role: user.role, spaces: user.spaces }, space)) return home;
  // A mission page would bounce a courier who cannot work straight back.
  if (space === "courier" && !courierCanWork(user) && !isOpenToEveryCourier(path)) return home;
  // Same for a Lanabaga page to a candidate: their application instead.
  if (space === "lanabaga" && !lanabagaCanWork({ lanaya: user.lanaya ?? null }) && !isOpenToEveryLanabaga(path)) return LANABAGA_FILE_PATH;
  return redirect;
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
