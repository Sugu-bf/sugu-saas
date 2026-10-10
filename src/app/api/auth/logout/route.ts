import { NextResponse, type NextRequest } from "next/server";
import { apiBase } from "@/lib/bff/upstream";
import { checkSameOrigin, forbiddenOrigin } from "@/lib/bff/same-origin";
import { SESSION_COOKIE } from "@/lib/auth/session-user";
import { clearSessionCookies } from "@/lib/bff/session";

// ============================================================
// POST /api/auth/logout
// BFF proxy → Laravel POST /v1/web-auth/logout
// Revokes the Sanctum token on the backend, then clears the cookie.
// ============================================================

const API_BASE = apiBase();

export async function POST(request: NextRequest) {
  if (!checkSameOrigin(request.method, request.headers).ok) return forbiddenOrigin();

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Always clear the cookie, even if the backend call fails
  const res = NextResponse.json({ message: "Déconnecté" });

  clearSessionCookies(res);

  // Best-effort: revoke the token on the backend
  if (token) {
    try {
      await fetch(`${API_BASE}/web-auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Silently ignore — the cookie is cleared regardless
    }
  }

  return res;
}
