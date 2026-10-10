import { NextResponse, type NextRequest } from "next/server";
import { apiBase } from "@/lib/bff/upstream";
import { checkSameOrigin, forbiddenOrigin } from "@/lib/bff/same-origin";

// ============================================================
// POST /api/auth/verify-reset-token
// BFF proxy → Laravel POST /v1/web-auth/verify-reset-token
// ============================================================

const API_BASE = apiBase();

export async function POST(request: NextRequest) {
  if (!checkSameOrigin(request.method, request.headers).ok) return forbiddenOrigin();

  try {
    const body = await request.json();

    const laravelRes = await fetch(`${API_BASE}/web-auth/verify-reset-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        token: body.token,
      }),
    });

    const json = await laravelRes.json();

    return NextResponse.json(json, { status: laravelRes.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur réseau.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
