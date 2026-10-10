/**
 * CSP source for the Reverb WebSocket, derived from the SAME variables
 * lib/echo.ts connects with.
 *
 * `connect-src https://*.mysugu.com` does not cover `wss://` — in CSP an
 * `https:` host-source only matches https URLs — so the socket origin has to be
 * listed explicitly. Exactly one origin is returned, never a `wss:` wildcard.
 *
 * Kept free of imports so next.config.ts can load it.
 */
export function reverbConnectSource(env: {
  NEXT_PUBLIC_REVERB_HOST?: string;
  NEXT_PUBLIC_REVERB_PORT?: string | number;
  NEXT_PUBLIC_REVERB_SCHEME?: string;
}): string | null {
  const host = (env.NEXT_PUBLIC_REVERB_HOST ?? "").trim();
  // A hostname only: anything else would let a bad env value widen the policy.
  if (!/^[a-z0-9.-]+$/i.test(host)) return null;

  const secure = (env.NEXT_PUBLIC_REVERB_SCHEME ?? "https") === "https";
  const scheme = secure ? "wss" : "ws";
  const port = Number(env.NEXT_PUBLIC_REVERB_PORT);
  const defaultPort = secure ? 443 : 80;
  const withPort = Number.isInteger(port) && port > 0 && port !== defaultPort ? `:${port}` : "";

  return `${scheme}://${host}${withPort}`;
}
