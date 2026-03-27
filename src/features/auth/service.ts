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

/**
 * Get current user via BFF route handler (/api/auth/me).
 * The route handler reads the cookie and returns the user.
 */
export async function getMe(): Promise<User> {
  const res = await fetch("/api/auth/me", {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error("Not authenticated");
  }

  const json = await res.json();
  const validated = meResponseSchema.parse(json);
  return validated.data;
}
