import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-user";
import { apiBase } from "@/lib/bff/upstream";
import { checkSameOrigin, forbiddenOrigin } from "@/lib/bff/same-origin";

const API_BASE = apiBase();

export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function POST(request: NextRequest) {
  if (!checkSameOrigin(request.method, request.headers).ok) return forbiddenOrigin();

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Non authentifie" },
      { status: 401 },
    );
  }

  try {
    const formData = await request.formData();
    const baseUrl = API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`;

    const laravelRes = await fetch(`${baseUrl}sellers/image-background-removal/previews`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const json = await laravelRes.json().catch(() => ({}));

    if (laravelRes.ok && typeof json === "object" && json !== null) {
      const payload = json as {
        data?: { preview_id?: string; preview_url?: string };
      };

      if (payload.data?.preview_id) {
        payload.data.preview_url = `/api/vendor/products/background-removal/previews/${encodeURIComponent(
          payload.data.preview_id,
        )}/image`;
      }
    }

    return NextResponse.json(json, { status: laravelRes.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur reseau.";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
