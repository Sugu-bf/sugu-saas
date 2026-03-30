"use client";

import { useSession } from "@/features/auth";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { UserRole } from "@/types";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

/**
 * Checks the user's role against allowedRoles.
 * Redirects to the appropriate dashboard if role doesn't match.
 */
export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { data: user, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (!allowedRoles.includes(user.role)) {
        // Redirect to the user's own dashboard
        const dest = user.role === "vendor"
          ? "/vendor/dashboard"
          : user.role === "agency"
            ? "/agency/dashboard"
            : user.role === "courier"
              ? (user.courier_status === 4 ? "/signup/driver?step=pending" : "/driver/dashboard")
              : "/vendor/dashboard"; // fallback
        router.replace(dest);
      } else if (user.role === "courier" && user.courier_status === 4) {
        // Even if courier is allowed, block them if pending KYC
        router.replace("/signup/driver?step=pending");
      }
    }
  }, [isLoading, user, allowedRoles, router]);

  if (isLoading) {
    return fallback ?? null;
  }

  if (!user || !allowedRoles.includes(user.role) || (user.role === "courier" && user.courier_status === 4)) {
    return null; // Don't render protected content
  }

  return <>{children}</>;
}
