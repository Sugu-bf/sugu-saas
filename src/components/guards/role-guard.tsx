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
    if (!isLoading && user && !allowedRoles.includes(user.role)) {
      // Redirect to the user's own dashboard
      const dest = user.role === "vendor"
        ? "/vendor/dashboard"
        : user.role === "agency"
          ? "/agency/dashboard"
          : user.role === "courier"
            ? "/driver/dashboard"
            : "/vendor/dashboard"; // fallback
      router.replace(dest);
    }
  }, [isLoading, user, allowedRoles, router]);

  if (isLoading) {
    return fallback ?? null;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
