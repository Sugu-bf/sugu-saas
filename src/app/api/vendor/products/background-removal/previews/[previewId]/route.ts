import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-user";
import { apiBase } from "@/lib/bff/upstream";
import { checkSameOrigin, forbiddenOrigin } from "@/lib/bff/same-origin";

const API_BASE = apiBase();

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ previewId: string }> },
) {
  if (!checkSameOrigin(request.method, request.headers).ok) return forbiddenOrigin();

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Non authentifie" },
      { status: 401 },
    );
  }

  const { previewId } = await params;

  try {
    const baseUrl = API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`;
    const laravelRes = await fetch(
      `${baseUrl}sellers/image-background-removal/previews/${encodeURIComponent(previewId)}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const json = await laravelRes.json().catch(() => ({}));
    return NextResponse.json(json, { status: laravelRes.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur reseau.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
