import { NextResponse, type NextRequest } from "next/server";

// ============================================================
// POST /api/auth/login
// BFF proxy → Laravel POST /v1/web-auth/login
// Sets the returned token as a cookie for the SPA.
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mysugu.com/api/v1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email: string; password: string };

    // Laravel expects `login_field` instead of `email`
    const laravelRes = await fetch(`${API_BASE}/web-auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        login_field: email,
        password,
      }),
    });

    const json = await laravelRes.json();

    if (!laravelRes.ok) {
      return NextResponse.json(
        {
          message: json.message ?? "Email ou mot de passe incorrect.",
          errors: json.errors,
        },
        { status: laravelRes.status },
      );
    }

    // Backend returns: { success, message, data: { user: {...}, token } }
    // The frontend expects: { data: { user: {...}, token }, message }
    const backendUser = json.data?.user;
    const token = json.data?.token;

    if (json.data?.verification_required) {
      return NextResponse.json({
        data: {
          verification_required: true,
          identifier: json.data.identifier,
          expires_in: json.data.expires_in,
          reason: json.data.reason,
        },
        message: json.message ?? "Code de vérification envoyé.",
      });
    }

    if (!token || !backendUser) {
      return NextResponse.json(
        { message: "Réponse serveur invalide." },
        { status: 502 },
      );
    }

    const mappedRole = _mapRole(backendUser);
    
    // Strict rule: Deny access silently to any user not having SaaS roles
    // We send a generic validation error identical to bad password
    if (!mappedRole) {
      return NextResponse.json(
        {
          message: "Email ou mot de passe incorrect.",
          errors: { email: ["Les identifiants fournis sont incorrects."] },
        },
        { status: 422 },
      );
    }

    // Map backend user shape → frontend User shape
    const user = {
      id: backendUser.id,
      name: backendUser.name,
      email: backendUser.email,
      role: mappedRole,
      avatar_url: backendUser.avatar_url ?? backendUser.store?.logo_url ?? null,
      email_verified_at: backendUser.email_verified ? new Date().toISOString() : null,
      created_at: backendUser.created_at ?? new Date().toISOString(),
      delivery_partner_id: backendUser.delivery_partner?.id ?? backendUser.agency?.id ?? null,
      business_name: _extractBusinessName(backendUser),
    };

    const responseData = {
      data: { user, token },
      message: json.message ?? "Connexion réussie",
    };

    const res = NextResponse.json(responseData);

    // Set token as cookie (httpOnly: false so the client-side apiRequest can read it)
    res.cookies.set("sugu_token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur réseau lors de la connexion.";
    return NextResponse.json({ message }, { status: 502 });
  }
}

/**
 * Map the backend user profile to the frontend UserRole.
 * Backend: `can_sell`, `store`, `agency`, roles[]
 * Frontend: "vendor" | "agency"
 */
export function _mapRole(backendUser: Record<string, unknown>): "vendor" | "agency" | "courier" | null {
  // Use the explicit user_type if it exists from the backend UserType enum
  const type = backendUser.user_type as string | undefined;
  
  if (type === 'seller') return "vendor";
  if (type === 'delivery_partner' || type === 'partner') return "agency";
  if (type === 'courier') return "courier";

  // Fallback to checking the roles array
  const roles = backendUser.roles as string[] | undefined;
  if (roles?.includes("courier")) return "courier";
  if (roles?.includes("delivery_partner") || roles?.includes("partner") || roles?.includes("agency")) return "agency";
  if (roles?.includes("seller") || roles?.includes("vendor")) return "vendor";

  // Then check entity presence
  if (backendUser.agency || backendUser.delivery_partner) return "agency";
  if (backendUser.can_sell === true || backendUser.store) return "vendor";

  // Unauthorized profile
  return null;
}

/**
 * Extract the business name (store or agency) from the backend user.
 */
export function _extractBusinessName(backendUser: Record<string, unknown>): string | null {
  const store = backendUser.store as Record<string, unknown> | undefined;
  if (store?.name) return String(store.name);
  const agency = backendUser.agency as Record<string, unknown> | undefined;
  if (agency?.company_name) return String(agency.company_name);
  if (agency?.name) return String(agency.name);
  const dp = backendUser.delivery_partner as Record<string, unknown> | undefined;
  if (dp?.company_name) return String(dp.company_name);
  if (dp?.name) return String(dp.name);
  return null;
}
