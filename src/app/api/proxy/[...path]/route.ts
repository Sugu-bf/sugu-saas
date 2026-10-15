import { type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-user";
import { checkSameOrigin, forbiddenOrigin } from "@/lib/bff/same-origin";
import { apiBase, checkProxyPath, downstreamHeaders, upstreamHeaders } from "@/lib/bff/upstream";

// ============================================================
// /api/proxy/* — authenticated relay to the Laravel API.
//
// The browser no longer holds the Sanctum token: it calls this route,
// which adds the token from the httpOnly session cookie.
//
// This is NOT a general proxy:
//  - the upstream origin is fixed by server configuration;
//  - the path is validated (no traversal, no token-issuing endpoints);
//  - only a short list of headers crosses, in either direction;
//  - mutations must be same-origin (CSRF).
// Laravel still authorizes every request: this route adds no permission.
// ============================================================

export const dynamic = "force-dynamic";

/** Upstream budget. Uploads and PDF generation need more than a JSON read. */
const UPSTREAM_TIMEOUT_MS = 60_000;

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "cache-control": "private, no-store" } });
}

async function relay(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const origin = checkSameOrigin(request.method, request.headers);
  if (!origin.ok) return forbiddenOrigin();

  const { path } = await context.params;
  const checked = checkProxyPath(path);
  if (!checked.ok) return json(404, { message: "Ressource introuvable.", code: "PROXY_PATH_REJECTED" });

  const token = request.cookies.get(SESSION_COOKIE)?.value ?? null;
  const url = `${apiBase()}/${checked.path}${request.nextUrl.search}`;
  // A DELETE may carry a body: turning off the login verification and
  // deleting an account send the password in it. Dropped, Laravel saw none.
  const hasBody = request.method !== "GET" && request.method !== "HEAD" && request.body !== null;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: request.method,
      headers: upstreamHeaders(request.headers, token),
      // Streamed through: an upload is never buffered in this process.
      body: hasBody ? request.body : undefined,
      ...(hasBody ? { duplex: "half" } : {}),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    } as RequestInit);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return json(timedOut ? 504 : 502, {
      message: timedOut ? "Le serveur met trop de temps à répondre." : "Service momentanément indisponible.",
      code: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
    });
  }

  // A redirect from the API is never followed on the user's behalf.
  if (upstream.status >= 300 && upstream.status < 400) {
    return json(502, { message: "Réponse inattendue du serveur.", code: "UPSTREAM_REDIRECT" });
  }

  // Status and body are relayed untouched: 401, 403, 404, 419, 422, 429, 5xx
  // reach the client exactly as Laravel sent them.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: downstreamHeaders(upstream.headers),
  });
}

export const GET = relay;
export const POST = relay;
export const PUT = relay;
export const PATCH = relay;
export const DELETE = relay;
