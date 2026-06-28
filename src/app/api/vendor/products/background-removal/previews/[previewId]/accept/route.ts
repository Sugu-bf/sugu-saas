import { NextResponse, type NextRequest } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mysugu.com/api/v1";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ previewId: string }> },
) {
  const token = request.cookies.get("sugu_token")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Non authentifie" },
      { status: 401 },
    );
  }

  const { previewId } = await params;

  try {
    const body = await request.text();
    const baseUrl = API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`;
    const laravelRes = await fetch(
      `${baseUrl}sellers/image-background-removal/previews/${encodeURIComponent(previewId)}/accept`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
      },
    );

    const json = await laravelRes.json().catch(() => ({}));
    return NextResponse.json(json, { status: laravelRes.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur reseau.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
