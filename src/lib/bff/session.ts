import type { NextResponse } from "next/server";
import {
  LEGACY_SESSION_COOKIE,
  SESSION_COOKIE,
  sessionCookieOptions,
  sessionMaxAge,
} from "@/lib/auth/session-user";

// ============================================================
// BFF — session cookie writes. Server-only.
// The token goes into the httpOnly cookie and nowhere else.
// ============================================================

/** Open the session: store the token, drop any pre-migration readable cookie. */
export function setSessionCookie(res: NextResponse, token: string, expiresAt: unknown): void {
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(sessionMaxAge(expiresAt)));
  dropLegacyCookie(res);
}

/** Close the session on this browser. */
export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  dropLegacyCookie(res);
}

/** The former cookie was readable by scripts; remove it wherever we answer. */
function dropLegacyCookie(res: NextResponse): void {
  res.cookies.set(LEGACY_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}
