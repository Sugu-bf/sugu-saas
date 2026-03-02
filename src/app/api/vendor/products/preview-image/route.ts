import { NextResponse, type NextRequest } from "next/server";

// ============================================================
// POST /api/vendor/products/preview-image
// BFF proxy → Laravel POST /v1/sellers/products/preview-image
// Server-to-server: no CORS issues, forwards auth cookie.
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mysugu.com/api/v1";

// Next.js App Router route segment config
export const dynamic = "force-dynamic";
export const maxDuration = 30; // seconds

export async function POST(request: NextRequest) {
  const token = request.cookies.get("sugu_token")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Non authentifié" },
      { status: 401 },
    );
  }

  try {
    // Read the multipart form data from the incoming request
    const formData = await request.formData();

    const baseUrl = API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`;

    // Forward the request to Laravel backend
    const laravelRes = await fetch(`${baseUrl}sellers/products/preview-image`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        // Do NOT set Content-Type — let fetch set it with the boundary for FormData
      },
      body: formData,
    });

    if (!laravelRes.ok) {
      const errorJson = await laravelRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          message: (errorJson as Record<string, string>).message ?? `Erreur ${laravelRes.status}`,
          errors: (errorJson as Record<string, unknown>).errors,
        },
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
