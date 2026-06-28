import { type NextRequest } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mysugu.com/api/v1";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ previewId: string }> },
) {
  const token = request.cookies.get("sugu_token")?.value;

  if (!token) {
    return Response.json(
      { success: false, message: "Non authentifie" },
      { status: 401 },
    );
  }

  const { previewId } = await params;

  try {
    const baseUrl = API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`;
    const laravelRes = await fetch(
      `${baseUrl}sellers/image-background-removal/previews/${encodeURIComponent(previewId)}/image`,
      {
        method: "GET",
        headers: {
          Accept: "image/avif,image/webp,image/png,image/jpeg,*/*",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    if (!laravelRes.ok) {
      const json = await laravelRes.json().catch(() => ({
        success: false,
        message: `Erreur ${laravelRes.status}`,
      }));
      return Response.json(json, { status: laravelRes.status });
    }

    return new Response(laravelRes.body, {
      status: laravelRes.status,
      headers: {
        "Content-Type": laravelRes.headers.get("content-type") ?? "image/webp",
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur reseau.";
    return Response.json({ success: false, message }, { status: 502 });
  }
}
