"use client";

import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { handleSessionExpired, isSessionExpiredError } from "@/lib/auth/session-expiry";

/**
 * Singleton QueryClient factory.
 * In a browser we want ONE instance. On the server, create fresh each time.
 */
let browserQueryClient: QueryClient | undefined;

function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: (error) => void handleSessionExpired(error) }),
    mutationCache: new MutationCache({ onError: (error) => void handleSessionExpired(error) }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 min
        gcTime: 5 * 60 * 1000, // 5 min
        // Never retry a dead session.
        retry: (failureCount, error) => !isSessionExpiredError(error) && failureCount < 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
