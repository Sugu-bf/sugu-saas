/**
 * Security utilities and policies.
 *
 * Token storage policy:
 * - We use httpOnly cookies set via Next.js Route Handlers.
 * - NO token is ever stored in localStorage to prevent XSS exfiltration.
 * - If the backend doesn't support httpOnly cookies natively (e.g. Sanctum SPA),
 *   the Next.js Route Handler acts as a BFF proxy.
 *
 * Headers:
 * - All API requests include X-Request-Id for traceability.
 * - CSP is configured in next.config.ts.
 *
 * CSRF:
 * - If the backend uses Sanctum SPA mode, we call /sanctum/csrf-cookie first.
 * - For token‑based auth, CSRF is not needed (Bearer token = proof of possession).
 */

/** Cookie names */
export const TOKEN_COOKIE = "sugu_token";
export const REFRESH_COOKIE = "sugu_refresh";

/** Set auth cookie (client-side, used only as fallback) */
export function setTokenCookie(token: string, maxAge = 60 * 60 * 24 * 7) {
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
}

/** Remove auth cookie */
export function removeTokenCookie() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}

/** Sanitise user input (basic XSS prevention) */
export function sanitize(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return input.replace(/[&<>"']/g, (char) => map[char] ?? char);
}
