import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-user";
import { apiBase } from "@/lib/bff/upstream";

const API_BASE = apiBase();

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Non authentifie" },
      { status: 401 },
    );
  }

  try {
    const baseUrl = API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`;
    const laravelRes = await fetch(`${baseUrl}sellers/image-processing/capabilities`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const json = await laravelRes.json().catch(() => ({}));
    return NextResponse.json(json, { status: laravelRes.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur reseau.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
