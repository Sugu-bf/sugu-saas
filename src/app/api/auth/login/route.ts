import { NextResponse, type NextRequest } from "next/server";
import { apiBase, clientAddressHeaders } from "@/lib/bff/upstream";
import { checkSameOrigin, forbiddenOrigin } from "@/lib/bff/same-origin";
import { toSessionUser } from "@/lib/auth/session-user";
import { setSessionCookie } from "@/lib/bff/session";

// ============================================================
// POST /api/auth/login
// BFF proxy → Laravel POST /v1/web-auth/login
// Sets the returned token as a cookie for the SPA.
// ============================================================

const API_BASE = apiBase();

export async function POST(request: NextRequest) {
  if (!checkSameOrigin(request.method, request.headers).ok) return forbiddenOrigin();

  try {
    const body = await request.json();
    const { email, password } = body as { email: string; password: string };

    // Laravel expects `login_field` instead of `email`
    const laravelRes = await fetch(`${API_BASE}/web-auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // Who is signing in, for the limits Laravel keeps by address.
        ...clientAddressHeaders(request.headers),
      },
      body: JSON.stringify({
        login_field: email,
        password,
      }),
    });

    const json = await laravelRes.json();

    if (!laravelRes.ok) {
      return NextResponse.json(
        {
          message: json.message ?? "Email ou mot de passe incorrect.",
          errors: json.errors,
        },
        { status: laravelRes.status },
      );
    }

    // Backend returns: { success, message, data: { user: {...}, token } }
    // The frontend expects: { data: { user: {...}, token }, message }
    const backendUser = json.data?.user;
    const token = json.data?.token;

    if (json.data?.verification_required) {
      return NextResponse.json({
        data: {
          verification_required: true,
          identifier: json.data.identifier,
          expires_in: json.data.expires_in,
          reason: json.data.reason,
        },
        message: json.message ?? "Code de vérification envoyé.",
      });
    }

    if (!token || !backendUser) {
      return NextResponse.json(
        { message: "Réponse serveur invalide." },
        { status: 502 },
      );
    }

    const user = toSessionUser(backendUser);

    // Strict rule: a profile with no place on the pro portal is refused with
    // the same generic error as a bad password.
    if (!user) {
      return NextResponse.json(
        {
          message: "Email ou mot de passe incorrect.",
          errors: { email: ["Les identifiants fournis sont incorrects."] },
        },
        { status: 422 },
      );
    }

    const res = NextResponse.json({
      data: { user },
      message: json.message ?? "Connexion réussie",
    });

    setSessionCookie(res, token, json.data?.expires_at);

    return res;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur réseau lors de la connexion.";
    return NextResponse.json({ message }, { status: 502 });
  }
}
