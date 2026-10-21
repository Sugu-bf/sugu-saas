// ============================================================
// SUGU SaaS — Core Type Definitions
// ============================================================

/**
 * The spaces of the pro portal. A session has one primary space (`role`)
 * and may hold others (`spaces`): a seller can also be a Lanabaga, with one
 * account (SUGU Lanaya, ADR-03).
 */
export type UserRole = "vendor" | "agency" | "courier" | "lanabaga";

/** What the session knows of the Lanabaga profile (`lanaya` block of the profile). */
export interface LanayaFacts {
  profile_id: string;
  public_code: string;
  application_status: string;
  account_status: string;
  /** Admitted, active, valid agreement: the server rule, read at sign-in. */
  can_work: boolean;
}

/** Authenticated user shape (returned by /me) */
export interface User {
  id: string | number;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  email_verified_at: string | null;
  created_at: string;
  /** Agency ID for delivery-partner users (null for vendors) */
  delivery_partner_id: string | null;
  /** Store name (vendor) or agency name (agency) */
  business_name: string | null;
  /** Store ID for vendor users (null for non-vendors) */
  store_id: string | null;
  /** Courier status if role is courier */
  courier_status?: number | null;
  /** Whether the courier can take missions (server rule); null when unknown. */
  courier_operational?: boolean | null;
  /** Every space this account may open, primary first. Absent: only `role`. */
  spaces?: UserRole[];
  /** Lanabaga profile, when the account has one. */
  lanaya?: LanayaFacts | null;
}

/** Auth session carried client‑side */
export interface Session {
  user: User;
  token: string;
}

/** Paginated API response envelope */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

/** Standard API success envelope */
export interface ApiSuccessResponse<T> {
  data: T;
  message?: string;
}

/** Typed API error */
export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
  status: number;
}

/** Navigation item for sidebars */
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string | number;
  children?: NavItem[];
}

/** Dashboard stat card */
export interface StatCard {
  label: string;
  value: string | number;
  change?: number; // percent
  trend?: "up" | "down" | "neutral";
}
