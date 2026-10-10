import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions, sessionMaxAge, toSessionUser } from "@/lib/auth/session-user";

// ============================================================
// POST /api/auth/set-password
// BFF proxy → Laravel POST /v1/web-auth/set-password
// Sets the returned token as a cookie for auto-login.
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mysugu.com/api/v1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const laravelRes = await fetch(`${API_BASE}/web-auth/set-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        token: body.token,
        password: body.password,
        password_confirmation: body.password_confirmation,
      }),
    });

    const json = await laravelRes.json();

    if (!laravelRes.ok) {
      return NextResponse.json(
        {
          success: false,
          message: json.message ?? "Erreur lors de la définition du mot de passe.",
          errors: json.errors,
        },
        { status: laravelRes.status },
      );
    }

    const backendUser = json.data?.user;
    const token = json.data?.token;

    if (!token || !backendUser) {
      return NextResponse.json(
        { success: false, message: "Réponse serveur invalide." },
        { status: 502 },
      );
    }

    // Same mapping as login: the first-access flow is not vendor-only by
    // contract, and an unsupported profile must not be signed in as a vendor.
    const user = toSessionUser(backendUser);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Ce compte n'a pas accès à l'espace professionnel." },
        { status: 403 },
      );
    }

    const res = NextResponse.json({
      success: true,
      data: { user, token },
      message: json.message ?? "Mot de passe défini avec succès.",
    });

    // Set auth cookie for auto-login
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(sessionMaxAge(json.data?.expires_at)));

    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur réseau.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
