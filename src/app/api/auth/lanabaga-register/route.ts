import { NextResponse, type NextRequest } from "next/server";
import { apiBase } from "@/lib/bff/upstream";
import { checkSameOrigin, forbiddenOrigin } from "@/lib/bff/same-origin";
import { toSessionUser } from "@/lib/auth/session-user";
import { setSessionCookie } from "@/lib/bff/session";

// ============================================================
// POST /api/auth/lanabaga-register
// BFF → Laravel POST /v1/web-auth/lanabaga/register
//
// A new Lanabaga candidate: an ordinary SUGU account (no new user type) and
// a draft application. The token goes into the httpOnly session cookie and
// never to the browser, like every other sign-in route of the portal.
// ============================================================

const API_BASE = apiBase();

export async function POST(request: NextRequest) {
  if (!checkSameOrigin(request.method, request.headers).ok) return forbiddenOrigin();

  try {
    const body = await request.json();

    const laravelRes = await fetch(`${API_BASE}/web-auth/lanabaga/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });

    const json = await laravelRes.json();

    if (!laravelRes.ok) {
      return NextResponse.json(
        { message: json.message ?? "Erreur d'inscription.", errors: json.errors, code: json.error_code },
        { status: laravelRes.status },
      );
    }

    const backendUser = json.data?.user;
    const token = json.data?.token;
    const user = backendUser ? toSessionUser(backendUser) : null;

    // The profile must carry the draft application: anything else is not this contract.
    if (!token || !user || (user.role !== "lanabaga" && !user.spaces?.includes("lanabaga"))) {
      return NextResponse.json({ message: "Réponse serveur invalide." }, { status: 502 });
    }

    const res = NextResponse.json({
      data: { user, email_verification_required: json.data?.email_verification_required === true },
      message: json.message ?? "Compte créé.",
    });
    setSessionCookie(res, token, json.data?.expires_at);
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur réseau";
    return NextResponse.json({ message }, { status: 502 });
  }
}
