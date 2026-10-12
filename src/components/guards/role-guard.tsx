"use client";

import { useSession } from "@/features/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { UserRole } from "@/types";
import { courierCanWork, homePathFor, isOpenToEveryCourier } from "@/lib/auth/session-user";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

/**
 * Checks the user's role against allowedRoles.
 * Redirects to the user's own space if the role doesn't match.
 *
 * A courier who cannot work yet (documents not approved, account suspended)
 * keeps their file, their profile and what they did before; the mission
 * pages send them to their file, where it is completed.
 *
 * This is navigation comfort, not security: the API enforces every rule
 * (including the courier KYC barrier — see `courier.operational`).
 */
export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { data: user, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = !!user && allowedRoles.includes(user.role);
  const closed = user?.role === "courier" && !courierCanWork(user) && !isOpenToEveryCourier(pathname);

  useEffect(() => {
    if (!isLoading && user && (!allowed || closed)) {
      router.replace(homePathFor(user));
    }
  }, [isLoading, user, allowed, closed, router]);

  if (isLoading) {
    return fallback ?? null;
  }

  if (!allowed || closed) {
    return null; // Don't render protected content
  }

  return <>{children}</>;
}
