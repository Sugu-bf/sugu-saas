import { NextResponse, type NextRequest } from "next/server";

// ============================================================
// POST /api/auth/logout
// BFF proxy → Laravel POST /v1/web-auth/logout
// Revokes the Sanctum token on the backend, then clears the cookie.
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mysugu.com/api/v1";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("sugu_token")?.value;

  // Always clear the cookie, even if the backend call fails
  const res = NextResponse.json({ message: "Déconnecté" });

  res.cookies.set("sugu_token", "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

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
