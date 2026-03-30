import { NextResponse, type NextRequest } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mysugu.com/api/v1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const laravelRes = await fetch(`${API_BASE}/web-auth/courier/validate-code`, {
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
            { message: json.message ?? "Code invalide.", errors: json.errors },
            { status: laravelRes.status }
        );
    }
    
    return NextResponse.json(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur réseau";
    return NextResponse.json({ message }, { status: 502 });
  }
}
