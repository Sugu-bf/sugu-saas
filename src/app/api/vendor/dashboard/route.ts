import { NextResponse, type NextRequest } from "next/server";

// ============================================================
// GET /api/vendor/dashboard
// BFF proxy → Laravel GET /v1/sellers/dashboard
// Server-to-server: no CORS issues.
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mysugu.com/api/v1";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("sugu_token")?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Non authentifié" },
      { status: 401 },
    );
  }

  try {
    const baseUrl = API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`;

    const laravelRes = await fetch(`${baseUrl}sellers/dashboard`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!laravelRes.ok) {
      const errorJson = await laravelRes.json().catch(() => ({}));
      return NextResponse.json(
        { message: (errorJson as Record<string, string>).message ?? `Erreur ${laravelRes.status}` },
        { status: laravelRes.status },
      );
    }

    const json = await laravelRes.json();
    return NextResponse.json(json);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur réseau.";
    return NextResponse.json(
      { success: false, message },
      { status: 502 },
    );
  }
}
