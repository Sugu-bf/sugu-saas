"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import * as authService from "./service";
import type { LoginPayload } from "./schema";
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
      // Cache the user in query client
      qc.setQueryData(queryKeys.auth.me(), result.user);

      // Redirect based on role
      if (result.user.role === "vendor") {
        router.push("/vendor/dashboard");
      } else if (result.user.role === "agency") {
        router.push("/agency/dashboard");
      } else if (result.user.role === "courier") {
        router.push("/driver/dashboard");
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
