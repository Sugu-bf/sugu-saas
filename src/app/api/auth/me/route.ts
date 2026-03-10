import { NextResponse, type NextRequest } from "next/server";

// ============================================================
// GET /api/auth/me
// BFF proxy → Laravel GET /v1/web-auth/me
// Forwards the sugu_token cookie as Bearer token.
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mysugu.com/api/v1";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("sugu_token")?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Non authentifié" },
      { status: 401 },
    );
  }

  try {
    const laravelRes = await fetch(`${API_BASE}/web-auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      // Don't cache — always fresh
      cache: "no-store",
    });

    if (!laravelRes.ok) {
      const json = await laravelRes.json().catch(() => ({}));
      return NextResponse.json(
        { message: (json as Record<string, string>).message ?? "Token invalide" },
        { status: laravelRes.status },
      );
    }

    const json = await laravelRes.json();

    // Backend returns: { success, message, data: { user: {...} } }
    // Frontend expects: { data: User }
    const backendUser = json.data?.user ?? json.data;

    if (!backendUser) {
      return NextResponse.json(
        { message: "Réponse serveur invalide." },
        { status: 502 },
      );
    }

    // Map backend user shape → frontend User shape
    const user = {
      id: backendUser.id,
      name: backendUser.name,
      email: backendUser.email,
      role: _mapRole(backendUser),
      avatar_url: backendUser.avatar_url ?? backendUser.store?.logo_url ?? null,
      email_verified_at: backendUser.email_verified ? new Date().toISOString() : null,
      created_at: backendUser.created_at ?? new Date().toISOString(),
      delivery_partner_id: backendUser.delivery_partner?.id ?? backendUser.agency?.id ?? null,
      business_name: _extractBusinessName(backendUser),
    };

    return NextResponse.json({ data: user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur réseau.";
    return NextResponse.json({ message }, { status: 502 });
  }
}

/**
 * Map backend user profile to frontend UserRole.
 */
/**
 * Extract the business name (store or agency) from the backend user.
 */
function _extractBusinessName(backendUser: Record<string, unknown>): string | null {
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

function _mapRole(backendUser: Record<string, unknown>): "vendor" | "agency" | "courier" {
  // Check roles array first (most explicit)
  const roles = backendUser.roles as string[] | undefined;
  if (roles?.includes("courier")) return "courier";
  if (roles?.includes("delivery_partner")) return "agency";
  // Then check entity presence
  if (backendUser.agency || backendUser.delivery_partner) return "agency";
  if (backendUser.can_sell || backendUser.store) return "vendor";
  return "vendor";
}
