import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions, sessionMaxAge, toSessionUser } from "@/lib/auth/session-user";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mysugu.com/api/v1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const laravelRes = await fetch(`${API_BASE}/web-auth/courier/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await laravelRes.json();

    if (!laravelRes.ok) {
      return NextResponse.json(
        {
          message: json.message ?? "Erreur d'inscription.",
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

    // This endpoint only ever creates couriers: the type is the contract's,
    // not a guess, when the payload omits it.
    const user = toSessionUser({ ...backendUser, user_type: backendUser.user_type ?? "courier" });

    if (!user) {
      return NextResponse.json({ message: "Réponse serveur invalide." }, { status: 502 });
    }

    const responseData = {
      data: { 
        user, 
        token,
        courier_id: json.data?.courier_id,
        email_verification_required: json.data?.email_verification_required,
      },
      message: json.message ?? "Inscription réussie",
    };

    const res = NextResponse.json(responseData);

    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(sessionMaxAge(json.data?.expires_at)));

    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur réseau";
    return NextResponse.json({ message }, { status: 502 });
  }
}
