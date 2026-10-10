import { loginResponseSchema, meResponseSchema, type LoginPayload, type LoginResultData, type VerifyOtpPayload } from "./schema";
import type { User } from "@/types";

// ============================================================
// Auth API module — calls Next.js BFF Route Handlers
// ============================================================

/**
 * Login via BFF route handler (/api/auth/login).
 * The route handler sets the auth cookie and returns user + token.
 */
export async function login(payload: LoginPayload): Promise<LoginResultData> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok) {
    // Throw an error object the login form can handle
    const err = new Error(json.message ?? "Erreur de connexion") as Error & {
      status: number;
      errors?: Record<string, string[]>;
    };
    err.status = res.status;
    err.errors = json.errors;
    throw err;
  }

  const validated = loginResponseSchema.parse(json);
  return validated.data;
}

/**
 * Verify OTP via BFF route handler (/api/auth/verify-otp).
 * The route handler sets the auth cookie and returns user + token.
 */
export async function verifyOtp(payload: VerifyOtpPayload): Promise<LoginResultData> {
  const res = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = new Error(json.message ?? "Erreur de vérification") as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  const validated = loginResponseSchema.parse(json);
  return validated.data;
}

/**
 * Logout via BFF route handler (/api/auth/logout).
 * The route handler clears the auth cookie.
 */
export async function logout(): Promise<void> {
  // Disconnect WebSocket FIRST (before cookie is cleared by the BFF)
  // so messages stop arriving immediately on shared computers
  if (typeof window !== "undefined") {
    try {
      const { disconnectEcho } = await import("@/lib/echo");
      disconnectEcho();
    } catch {
      // Echo may not be initialized — ignore
    }
  }

  await fetch("/api/auth/logout", { method: "POST" });
}

/** Raised when the session cannot be established for a reason other than "not signed in". */
export class SessionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: "UNSUPPORTED_PROFILE" | "UNAVAILABLE",
  ) {
    super(message);
    this.name = "SessionError";
  }
}

/**
 * Get current user via BFF route handler (/api/auth/me).
 *
 * - 401 → `null`: nobody is signed in.
 * - 403 UNSUPPORTED_PROFILE → SessionError: signed in, but not a pro profile.
 * - anything else (5xx, network) → SessionError: an outage must not look
 *   like a logout.
 */
export async function getMe(): Promise<User | null> {
  let res: Response;
  try {
    res = await fetch("/api/auth/me", { headers: { "Content-Type": "application/json" } });
  } catch {
    throw new SessionError("Impossible de joindre le serveur.", 0, "UNAVAILABLE");
  }

  if (res.status === 401) return null;

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const unsupported = res.status === 403 && json?.code === "UNSUPPORTED_PROFILE";
    throw new SessionError(
      json?.message ?? "Impossible de vérifier votre session.",
      res.status,
      unsupported ? "UNSUPPORTED_PROFILE" : "UNAVAILABLE",
    );
  }

  return meResponseSchema.parse(json).data;
}

/**
 * Validate Courier Code
 */
export async function validateCourierCode(code: string): Promise<{ agency_name: string; partner_id: number; logo_url?: string }> {
  const res = await fetch("/api/auth/courier-validate-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  
  const json = await res.json();
  
  if (!res.ok) {
    throw new Error(json.message ?? "Code invalide");
  }
  return json.data;
}

/**
 * Register Courier via BFF route handler
 */
export async function registerCourier(payload: Record<string, unknown>): Promise<LoginResultData> {
  const res = await fetch("/api/auth/courier-register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = new Error(json.message ?? "Erreur d'inscription") as Error & {
      status: number;
      errors?: Record<string, string[]>;
    };
    err.status = res.status;
    err.errors = json.errors;
    throw err;
  }

  const validated = loginResponseSchema.parse(json);
  return validated.data;
}

/**
 * Update Vehicle Courier via BFF route handler
 */
export async function updateVehicleCourier(payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetch("/api/auth/courier-update-vehicle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = new Error(json.message ?? "Erreur lors de la mise à jour") as Error & {
      status: number;
      errors?: Record<string, string[]>;
    };
    err.status = res.status;
    err.errors = json.errors;
    throw err;
  }

  return json.data;
}

/**
 * Verify Email OTP via BFF
 */
export async function verifyEmailOtp(payload: { identifier: string; code: string; type: number }): Promise<unknown> {
  const res = await fetch("/api/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = new Error(json.message ?? "Erreur de vérification") as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  return json.data;
}
