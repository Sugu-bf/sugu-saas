// ============================================================
// SUGU SaaS — Core Type Definitions
// ============================================================

/** The three roles supported by the SaaS platform */
export type UserRole = "vendor" | "agency" | "courier";

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
