"use client";

import { useCallback, useRef } from "react";

/**
 * A single idempotency key per mounted component, generated lazily.
 *
 * Money-out endpoints (withdrawals) accept an `idempotency_key` so a retry
 * after a timeout replays the original request instead of creating a second
 * real payout. The vendor, driver and agency services each used to call
 * `crypto.randomUUID()` *inside* the request function, so every retry carried a
 * fresh key — the protection existed on paper and did nothing.
 *
 * The key must be stable for the whole submission attempt, and must change when
 * the user starts a genuinely new one (i.e. remounts the wizard).
 *
 * Generation is deferred to first call rather than done during render, because
 * `crypto.randomUUID` / `Date.now` / `Math.random` are impure and must not run
 * in a render pass (react-hooks/purity).
 *
 * @returns a getter that yields the same key for the lifetime of the component
 */
export function useIdempotencyKey(): () => string {
  const keyRef = useRef<string | null>(null);

  return useCallback(() => {
    if (keyRef.current === null) {
      keyRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    return keyRef.current;
  }, []);
}
