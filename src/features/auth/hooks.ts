"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import * as authService from "./service";
import type { LoginPayload, VerifyOtpPayload } from "./schema";
import { useRouter } from "next/navigation";
import type { User } from "@/types";
import { postLoginPath } from "@/lib/auth/session-user";

/** `?redirect=` set by the proxy (or by the expired-session handler). */
function requestedRedirect(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("redirect");
}

/**
 * Hook: current authenticated user (cached).
 */
export function useSession() {
  return useQuery<User | null>({
    queryKey: queryKeys.auth.me(),
    // null = not signed in. A thrown SessionError = outage or unsupported
    // profile; the guards show it instead of bouncing to /login.
    queryFn: () => authService.getMe(),
    staleTime: 5 * 60 * 1000, // 5 min
    retry: false,
  });
}

/**
 * Hook: login mutation.
 * The BFF route handler sets the cookie automatically.
 */
export function useLogin() {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (result) => {
      if ('verification_required' in result && result.verification_required) {
        return; // UI will handle showing the OTP form
      }

      // Cache the user in query client
      const authenticatedResult = result as { user: User };
      qc.setQueryData(queryKeys.auth.me(), authenticatedResult.user);

      router.push(postLoginPath(authenticatedResult.user, requestedRedirect()));
    },
  });
}

/**
 * Hook: verify OTP mutation.
 */
export function useVerifyOtp() {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: VerifyOtpPayload) => authService.verifyOtp(payload),
    onSuccess: (result) => {
      if ('verification_required' in result && result.verification_required) {
        return;
      }
      const authenticatedResult = result as { user: User };
      qc.setQueryData(queryKeys.auth.me(), authenticatedResult.user);

      router.push(postLoginPath(authenticatedResult.user, requestedRedirect()));
    },
  });
}

/**
 * Hook: logout mutation.
 * The BFF route handler clears the cookie.
 */
export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      qc.clear();
      router.push("/login");
    },
  });
}
