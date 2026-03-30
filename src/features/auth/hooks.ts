"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import * as authService from "./service";
import type { LoginPayload, VerifyOtpPayload } from "./schema";
import { useRouter } from "next/navigation";
import type { User } from "@/types";

/**
 * Hook: current authenticated user (cached).
 */
export function useSession() {
  return useQuery<User | null>({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      try {
        return await authService.getMe();
      } catch {
        return null;
      }
    },
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

      const user = authenticatedResult.user;

      // Redirect based on role
      if (user.role === "vendor") {
        router.push("/vendor/dashboard");
      } else if (user.role === "agency") {
        router.push("/agency/dashboard");
      } else if (user.role === "courier") {
        // Enforce PENDING KYC barrier
        if (user.courier_status === 4) {
          router.push("/signup/driver?step=pending");
        } else {
          router.push("/driver/dashboard");
        }
      } else {
        router.push("/vendor/dashboard"); // fallback
      }
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

      const user = authenticatedResult.user;

      if (user.role === "vendor") {
        router.push("/vendor/dashboard");
      } else if (user.role === "agency") {
        router.push("/agency/dashboard");
      } else if (user.role === "courier") {
        if (user.courier_status === 4) {
          router.push("/signup/driver?step=pending");
        } else {
          router.push("/driver/dashboard");
        }
      } else {
        router.push("/vendor/dashboard"); // fallback
      }
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
