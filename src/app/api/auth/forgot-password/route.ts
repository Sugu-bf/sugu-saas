import { NextResponse, type NextRequest } from "next/server";

// ============================================================
// POST /api/auth/forgot-password
// BFF proxy → Laravel POST /v1/web-auth/forgot-password
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mysugu.com/api/v1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const laravelRes = await fetch(`${API_BASE}/web-auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email: body.email }),
    });

    const json = await laravelRes.json();

    return NextResponse.json(json, { status: laravelRes.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur réseau.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
