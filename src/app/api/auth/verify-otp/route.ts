import { NextResponse, type NextRequest } from "next/server";
import { apiBase } from "@/lib/bff/upstream";
import { checkSameOrigin, forbiddenOrigin } from "@/lib/bff/same-origin";
import { toSessionUser } from "@/lib/auth/session-user";
import { setSessionCookie } from "@/lib/bff/session";

const API_BASE = apiBase();

export async function POST(request: NextRequest) {
  if (!checkSameOrigin(request.method, request.headers).ok) return forbiddenOrigin();

  try {
    const body = await request.json();
    const { identifier, code, type } = body as { identifier: string; code: string; type: number };

    const laravelRes = await fetch(`${API_BASE}/web-auth/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ identifier, code, type }),
    });

    const json = await laravelRes.json();

    if (!laravelRes.ok) {
      return NextResponse.json(
        {
          message: json.message ?? "Code invalide.",
          errors: json.errors,
        },
        { status: laravelRes.status },
      );
    }

    const backendUser = json.data?.user;
    const token = json.data?.token;

    if (!token || !backendUser) {
      return NextResponse.json(
        { message: "Réponse serveur invalide." },
        { status: 502 },
      );
    }

    const user = toSessionUser(backendUser);

    if (!user) {
      return NextResponse.json(
        {
          message: "Code invalide.",
          errors: { code: ["Le code de vérification est invalide."] },
        },
        { status: 422 },
      );
    }

    const res = NextResponse.json({
      data: { user },
      message: json.message ?? "Connexion réussie",
    });

    setSessionCookie(res, token, json.data?.expires_at);

    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur réseau.";
    return NextResponse.json({ message }, { status: 502 });
  }
}
