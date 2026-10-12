// ============================================================
// BFF — the ONE definition of "the backend" for server routes.
//
// Server-only. The upstream origin is fixed by configuration; no
// part of it can come from the browser.
// ============================================================

/** Laravel API base, e.g. https://api.mysugu.com/api/v1 (no trailing slash). */
export function apiBase(): string {
  const base =
    process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mysugu.com/api/v1";
  return base.replace(/\/+$/, "");
}

/** Broadcasting auth lives outside /v1: {origin}/api/broadcasting/auth. */
export function broadcastingAuthUrl(): string {
  return `${new URL(apiBase()).origin}/api/broadcasting/auth`;
}

/**
 * Path prefixes the generic proxy refuses.
 *
 * `web-auth` and `auth` answer with tokens (login, refresh, set-password…):
 * they must only be reached through the dedicated /api/auth/* routes, which
 * keep the token in the httpOnly cookie and never hand it to the browser.
 */
const DENIED_PREFIXES = ["web-auth", "auth", "admin"];

/** One URL path segment: no slash, no backslash, no dot-only, no control char. */
const SEGMENT = /^[A-Za-z0-9._~@:-]+$/;

export type PathCheck = { ok: true; path: string } | { ok: false; reason: string };

/**
 * Validate the catch-all segments of /api/proxy/[...path] and build the
 * upstream path. Rejects traversal, encoded separators, empty segments and
 * denied prefixes. Segments arrive already decoded by Next.
 */
export function checkProxyPath(segments: string[] | undefined): PathCheck {
  if (!segments || segments.length === 0) return { ok: false, reason: "empty path" };
  if (segments.length > 12) return { ok: false, reason: "path too deep" };

  for (const segment of segments) {
    if (!segment || segment === "." || segment === "..") return { ok: false, reason: "traversal" };
    if (!SEGMENT.test(segment)) return { ok: false, reason: "invalid characters" };
    // Encoded separators / traversal that survived decoding once.
    if (/%2f|%5c|%2e%2e|%00/i.test(segment)) return { ok: false, reason: "encoded separator" };
  }

  if (DENIED_PREFIXES.includes(segments[0].toLowerCase())) return { ok: false, reason: "denied prefix" };

  return { ok: true, path: segments.map(encodeURIComponent).join("/") };
}

export const PROXY_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

/** Request headers the browser may pass through. Everything else is dropped. */
const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "idempotency-key",
  "x-request-id",
  "x-confirm-delete",
];

/** Build the upstream request headers. `Authorization` only ever comes from the cookie. */
export function upstreamHeaders(incoming: Headers, token: string | null): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = incoming.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);

  for (const [name, value] of Object.entries(clientAddressHeaders(incoming))) headers.set(name, value);

  return headers;
}

/**
 * The address of the visitor, as the proxy in front of the portal wrote it.
 * Laravel reads it only where it trusts the hop it comes from
 * (TRUSTED_PROXIES): its limits by address then count each visitor, not the
 * portal. What a visitor wrote in the header themselves sits to the left of
 * what the proxy appended, and is not the entry Laravel picks.
 */
export function clientAddressHeaders(incoming: Headers): Record<string, string> {
  const forwardedFor = incoming.get("x-forwarded-for");
  return forwardedFor ? { "x-forwarded-for": forwardedFor } : {};
}

/** Response headers relayed to the browser. Set-Cookie, CORS and auth headers never are. */
const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "content-length",
  "retry-after",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
];

export function downstreamHeaders(upstream: Headers): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.get(name);
    if (value) headers.set(name, value);
  }
  // Private data: never cached by the browser, a CDN or a shared proxy.
  headers.set("cache-control", "private, no-store");
  headers.set("vary", "Cookie");
  return headers;
}
