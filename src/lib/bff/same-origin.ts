// ============================================================
// BFF — CSRF defence for cookie-authenticated routes.
//
// The session cookie is now the only credential, so a state-changing
// request must be proven to come from our own pages. Two layers:
//   1. the cookie is SameSite=Lax (never sent on cross-site POST);
//   2. this check: Fetch Metadata when the browser sends it, else Origin.
// ============================================================

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function allowedOrigins(headers: Headers): Set<string> {
  const origins = new Set<string>();
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (host) {
    origins.add(`https://${host}`);
    origins.add(`http://${host}`);
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin);
    } catch {
      // ignore a malformed APP_URL
    }
  }
  return origins;
}

export type OriginCheck = { ok: true } | { ok: false; reason: string };

/**
 * Is this request allowed to carry the session?
 *
 * - Safe methods: only refused when the browser itself says "cross-site"
 *   and the request is not a navigation (a script on another site).
 * - Mutations: must be same-origin. `Sec-Fetch-Site` decides when present;
 *   otherwise `Origin` must be ours. A mutation with neither is refused.
 */
export function checkSameOrigin(method: string, headers: Headers): OriginCheck {
  const site = headers.get("sec-fetch-site");
  const origin = headers.get("origin");
  const safe = SAFE_METHODS.has(method.toUpperCase());

  if (safe) {
    if (site === "cross-site" && headers.get("sec-fetch-mode") !== "navigate") {
      return { ok: false, reason: "cross-site read" };
    }
    return { ok: true };
  }

  if (site) {
    return site === "same-origin" ? { ok: true } : { ok: false, reason: `sec-fetch-site=${site}` };
  }

  if (!origin) return { ok: false, reason: "no origin" };
  return allowedOrigins(headers).has(origin) ? { ok: true } : { ok: false, reason: "foreign origin" };
}

/** JSON 403 for a refused request. The reason is for logs, not for the client. */
export function forbiddenOrigin(): Response {
  return Response.json(
    { message: "Requête refusée.", code: "CSRF_REJECTED" },
    { status: 403, headers: { "cache-control": "no-store" } },
  );
}
