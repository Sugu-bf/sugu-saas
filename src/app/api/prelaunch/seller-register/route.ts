import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.mysugu.com/api/v1";
    
    // Construct the endpoint URL on the Laravel backend.
    // If apiBase is e.g. "https://api.mysugu.com/api/v1", we call `${apiBase}/public/prelaunch/seller-register`
    const url = `${apiBase}/public/prelaunch/seller-register`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Forwarded-For": request.headers.get("x-forwarded-for") || "",
      },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get("content-type");
    const data = contentType?.includes("application/json") ? await res.json() : { message: "Erreur serveur inattendue." };
    
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
