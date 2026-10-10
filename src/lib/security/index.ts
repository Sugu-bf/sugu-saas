/**
 * Security policy of the pro portal — what the code enforces.
 *
 * Session
 * - The Sanctum token lives in an httpOnly, SameSite=Lax, host-only cookie
 *   (`sugu_session`), Secure in production. It is set and cleared only by the
 *   Next route handlers under /api/auth/*.
 * - No script can read it: nothing in the browser holds the token — not
 *   localStorage, not a JS-readable cookie, not a JSON answer, not a URL.
 *
 * Transport
 * - The browser talks to this origin only. /api/proxy/* relays to the Laravel
 *   API and adds the token server-side (see lib/bff/upstream.ts for the path,
 *   method and header rules that keep it from being an open proxy).
 * - Private WebSocket channels are authorized through /api/broadcasting/auth.
 *
 * CSRF
 * - The cookie is the only credential, so every state-changing route checks
 *   that the request is same-origin (lib/bff/same-origin.ts), on top of
 *   SameSite=Lax.
 *
 * Authorization
 * - None of this grants anything. Laravel policies decide every request.
 */
export { SESSION_COOKIE } from "@/lib/auth/session-user";
