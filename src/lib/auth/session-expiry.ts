import { ApiError } from "@/lib/http/api-error";

// ============================================================
// Expired session handling
//
// A 401 from the API means the token is gone (expired or revoked).
// Pages used to sit in an error state with a dead cookie. Now: clear
// the session and go back to /login, keeping the destination.
//
// A 403 is a business refusal (wrong agency, KYC pending, …) and is
// deliberately NOT handled here.
// ============================================================

/** Pages that must never trigger (or loop on) the expiry redirect. */
const AUTH_PATHS = ["/login", "/forgot-password", "/reset-password", "/signup"];

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isSessionExpiredError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/** Login URL that brings the user back where they were. */
export function expiredLoginUrl(pathname: string, search = ""): string {
  const params = new URLSearchParams({ reason: "expired" });
  if (pathname && pathname !== "/" && !isAuthPath(pathname)) {
    params.set("redirect", `${pathname}${search}`);
  }
  return `/login?${params.toString()}`;
}

let redirecting = false;

/** Test hook. */
export function resetSessionExpiryForTests() {
  redirecting = false;
}

interface Deps {
  location: Pick<Location, "pathname" | "search" | "assign">;
  clearSession: () => Promise<unknown>;
  onBeforeRedirect?: () => void;
}

/**
 * Handle one API error. Returns true when it was an expired session and a
 * redirect to /login has been started (once — concurrent 401s are ignored).
 */
export function handleSessionExpired(error: unknown, deps?: Partial<Deps>): boolean {
  if (!isSessionExpiredError(error)) return false;
  if (typeof window === "undefined" && !deps?.location) return false;

  const location = deps?.location ?? window.location;
  if (redirecting || isAuthPath(location.pathname)) return false;
  redirecting = true;

  const clearSession =
    deps?.clearSession ?? (() => fetch("/api/auth/logout", { method: "POST", keepalive: true }));
  const target = expiredLoginUrl(location.pathname, location.search);

  deps?.onBeforeRedirect?.();
  // Clear the cookie first so the proxy does not let the next navigation
  // through with a dead token; redirect even if that call fails.
  Promise.resolve()
    .then(clearSession)
    .catch(() => undefined)
    .then(() => location.assign(target));

  return true;
}
