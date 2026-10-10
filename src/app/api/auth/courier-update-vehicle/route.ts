import { NextResponse, type NextRequest } from "next/server";
import { apiBase } from "@/lib/bff/upstream";
import { checkSameOrigin, forbiddenOrigin } from "@/lib/bff/same-origin";
import { SESSION_COOKIE } from "@/lib/auth/session-user";

const API_BASE = apiBase();

export async function POST(request: NextRequest) {
  if (!checkSameOrigin(request.method, request.headers).ok) return forbiddenOrigin();

  try {
    const body = await request.json();
    
    // The token comes from the httpOnly session cookie only — never from a
    // header the browser could set.
    const rawToken = request.cookies.get(SESSION_COOKIE)?.value;
    if (!rawToken) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }
    const token = `Bearer ${rawToken}`;

    const laravelRes = await fetch(`${API_BASE}/web-auth/courier/update-vehicle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    });

    const json = await laravelRes.json();

    if (!laravelRes.ok) {
      return NextResponse.json(
        {
          message: json.message ?? "Erreur lors de la mise à jour.",
          errors: json.errors,
        },
        { status: laravelRes.status },
      );
    }

    return NextResponse.json(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur réseau";
    return NextResponse.json({ message }, { status: 500 });
  }
}
