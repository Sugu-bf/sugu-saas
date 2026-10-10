import { NextResponse, type NextRequest } from "next/server";
import { apiBase } from "@/lib/bff/upstream";
import { SESSION_COOKIE, toSessionUser } from "@/lib/auth/session-user";
import { clearSessionCookies } from "@/lib/bff/session";

// ============================================================
// GET /api/auth/me
// BFF proxy → Laravel GET /v1/web-auth/me
// Forwards the sugu_token cookie as Bearer token.
// ============================================================

const API_BASE = apiBase();

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Non authentifié" },
      { status: 401 },
    );
  }

  try {
    const laravelRes = await fetch(`${API_BASE}/web-auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      // Don't cache — always fresh
      cache: "no-store",
    });

    if (!laravelRes.ok) {
      const json = await laravelRes.json().catch(() => ({}));
      const res = NextResponse.json(
        { message: (json as Record<string, string>).message ?? "Token invalide" },
        { status: laravelRes.status },
      );
      // Expired or revoked: do not keep a dead token on the browser.
      if (laravelRes.status === 401) clearSessionCookies(res);
      return res;
    }

    const json = await laravelRes.json();

    // Backend returns: { success, message, data: { user: {...} } }
    // Frontend expects: { data: User }
    const backendUser = json.data?.user ?? json.data;

    if (!backendUser) {
      return NextResponse.json(
        { message: "Réponse serveur invalide." },
        { status: 502 },
      );
    }

    const user = toSessionUser(backendUser);

    // Authenticated, but not a vendor / agency / courier: say so explicitly.
    // (This used to fall back to "vendor".)
    if (!user) {
      return NextResponse.json(
        { message: "Ce compte n'a pas accès à l'espace professionnel.", code: "UNSUPPORTED_PROFILE" },
        { status: 403 },
      );
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur réseau.";
    return NextResponse.json({ message }, { status: 502 });
  }
}
