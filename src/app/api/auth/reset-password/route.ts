import { NextResponse, type NextRequest } from "next/server";

// ============================================================
// POST /api/auth/reset-password
// BFF proxy → Laravel POST /v1/web-auth/reset-password
// Resets password using the 6-digit OTP code sent via email
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mysugu.com/api/v1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const laravelRes = await fetch(`${API_BASE}/web-auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        code: body.code,
        password: body.password,
        password_confirmation: body.password_confirmation,
      }),
    });

    const json = await laravelRes.json();

    if (!laravelRes.ok) {
      return NextResponse.json(
        {
          success: false,
          message: json.message ?? "Erreur lors de la réinitialisation.",
          errors: json.errors,
        },
        { status: laravelRes.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: json.message ?? "Mot de passe réinitialisé avec succès.",
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur réseau.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
