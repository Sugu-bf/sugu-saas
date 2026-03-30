import { NextResponse, type NextRequest } from "next/server";
import { _mapRole, _extractBusinessName } from "../login/route";

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

    const mappedRole = _mapRole(backendUser) || "courier";
    
    // Map backend user shape → frontend User shape
    const user = {
      id: backendUser.id,
      name: backendUser.name,
      email: backendUser.email,
      role: mappedRole,
      avatar_url: backendUser.avatar_url ?? null,
      email_verified_at: backendUser.email_verified ? new Date().toISOString() : null,
      created_at: backendUser.created_at ?? new Date().toISOString(),
      delivery_partner_id: backendUser.delivery_partner?.id ?? backendUser.agency?.id ?? null,
      business_name: _extractBusinessName(backendUser),
    };

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

    // Set token as cookie
    res.cookies.set("sugu_token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur réseau";
    return NextResponse.json({ message }, { status: 502 });
  }
}
