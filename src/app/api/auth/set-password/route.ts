import { NextResponse, type NextRequest } from "next/server";

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

    // Map user to frontend shape
    const user = {
      id: backendUser.id,
      name: backendUser.name,
      email: backendUser.email,
      role: backendUser.can_sell || backendUser.store ? "vendor" as const : "vendor" as const,
      avatar_url: backendUser.avatar_url ?? null,
      email_verified_at: backendUser.email_verified ? new Date().toISOString() : null,
      created_at: backendUser.created_at ?? new Date().toISOString(),
      delivery_partner_id: null,
      business_name: backendUser.store?.name ?? null,
      store_id: backendUser.store?.id ?? null,
    };

    const res = NextResponse.json({
      success: true,
      data: { user, token },
      message: json.message ?? "Mot de passe défini avec succès.",
    });

    // Set auth cookie for auto-login
    res.cookies.set("sugu_token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur réseau.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
