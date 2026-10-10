"use client";

import { useSession } from "@/features/auth";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { UserRole } from "@/types";
import { COURIER_STATUS_PENDING_KYC, homePathFor } from "@/lib/auth/session-user";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

/**
 * Checks the user's role against allowedRoles.
 * Redirects to the user's own space if the role doesn't match.
 *
 * This is navigation comfort, not security: the API enforces every rule
 * (including the courier KYC barrier — see `courier.operational`).
 */
export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { data: user, isLoading } = useSession();
  const router = useRouter();

  const allowed = !!user && allowedRoles.includes(user.role);
  const pendingKyc = user?.role === "courier" && user.courier_status === COURIER_STATUS_PENDING_KYC;

  useEffect(() => {
    if (!isLoading && user && (!allowed || pendingKyc)) {
      router.replace(homePathFor(user));
    }
  }, [isLoading, user, allowed, pendingKyc, router]);

  if (isLoading) {
    return fallback ?? null;
  }

  if (!allowed || pendingKyc) {
    return null; // Don't render protected content
  }

  return <>{children}</>;
}
