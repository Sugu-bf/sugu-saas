import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-user";

/**
 * Proxy — route protection.
 *
 * Strategy:
 *  - Public routes: /, /login, /api/*
 *  - Protected routes: /vendor/*, /agency/*
 *  - Check for sugu_token cookie presence
 *  - The actual token validation happens server-side in the API
 */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/offline",
  "/vendeurs",
  "/agences-de-livraison",
  "/coursiers",
  "/fonctionnalites",
  "/tarifs",
  "/faq",
];
const PUBLIC_PREFIXES = ["/api/", "/_next/", "/favicon", "/signup/"];
const PUBLIC_FILE = /\.[^/]+$/;
// First-access link sent by email: /reset-password/{token}. Exactly one
// segment after the prefix — the token is validated by the API, not here.
const PUBLIC_PATTERNS = [/^\/reset-password\/[^/]+\/?$/];

export function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_PATTERNS.some((re) => re.test(pathname)) ||
    PUBLIC_FILE.test(pathname)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths, public prefixes, and API routes
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

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
    // /api/* is excluded: those routes authenticate themselves, and a matched
    // request has its body buffered (and capped) — uploads must stream.
    "/((?!api/|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
