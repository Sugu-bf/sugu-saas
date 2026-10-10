"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { env } from "@/lib/env";

// Pusher must be on window for Echo to find it
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).Pusher = Pusher;
}

let echoInstance: Echo<"reverb"> | null = null;

/**
 * Private channels are authorized by our own server route, which adds the
 * session token from the httpOnly cookie. The browser holds no credential:
 * the socket itself opens with the public app key only.
 */
const CHANNEL_AUTH_ENDPOINT = "/api/broadcasting/auth";

/**
 * Get or create the singleton Echo instance.
 * Only call this client-side.
 */
export function getEcho(): Echo<"reverb"> {
  if (echoInstance) return echoInstance;

  echoInstance = new Echo({
    broadcaster: "reverb",
    key: env.NEXT_PUBLIC_REVERB_APP_KEY,
    wsHost: env.NEXT_PUBLIC_REVERB_HOST,
    wsPort: env.NEXT_PUBLIC_REVERB_PORT,
    wssPort: env.NEXT_PUBLIC_REVERB_PORT,
    forceTLS: env.NEXT_PUBLIC_REVERB_SCHEME === "https",
    enabledTransports: ["ws", "wss"],
    // Use authorizer callback so the token is read fresh on every
    // channel subscription (not frozen at singleton creation time).
    authorizer: (channel: { name: string }) => ({
      authorize: (
        socketId: string,
        callback: (error: Error | null, authData: { auth: string; channel_data?: string } | null) => void,
      ) => {
        fetch(CHANNEL_AUTH_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
          }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("Channel authorization failed");
            return res.json();
          })
          .then((data) => callback(null, data))
          .catch((err) => callback(err instanceof Error ? err : new Error(String(err)), null));
      },
    }),
  });

  return echoInstance;
}

/**
 * Disconnect and destroy the Echo instance.
 * Call this on logout to ensure a fresh instance with the new token.
 */
export function disconnectEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}
