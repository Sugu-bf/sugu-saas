import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy — route protection.
 *
 * Strategy:
 *  - Public routes: /, /login, /api/*
 *  - Protected routes: /vendor/*, /agency/*
 *  - Check for sugu_token cookie presence
 *  - The actual token validation happens server-side in the API
 */
const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password", "/reset-password"];
const PUBLIC_PREFIXES = ["/api/", "/_next/", "/favicon", "/signup/"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths, public prefixes, and API routes
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("sugu_token")?.value;

  // No token → redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token exists → allow (real validation happens API-side)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
