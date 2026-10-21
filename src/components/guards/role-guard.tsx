"use client";

import { useSession } from "@/features/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { UserRole } from "@/types";
import {
  LANABAGA_FILE_PATH,
  canEnterSpace,
  courierCanWork,
  homePathFor,
  isOpenToEveryCourier,
  isOpenToEveryLanabaga,
  lanabagaCanWork,
} from "@/lib/auth/session-user";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

/**
 * Checks that the session may open the space of this route group.
 * Redirects to the user's own space otherwise.
 *
 * A session can hold several spaces (a seller who is also a Lanabaga, ADR-03):
 * the space is allowed when the session lists it. The active space is the one
 * of the URL; nothing acts in another space than the one on screen.
 *
 * A courier who cannot work yet (documents not approved, account suspended)
 * keeps their file, their profile and what they did before; the mission
 * pages send them to their file. Same for a Lanabaga candidate: their
 * application, documents and account only. Those pages are also where an
 * existing account without a profile starts its application.
 *
 * This is navigation comfort, not security: the API enforces every rule
 * (including the courier KYC barrier and every Lanaya rule).
 */
export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { data: user, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const inLanabagaSpace = allowedRoles.includes("lanabaga");
  // Any signed-in account may apply: a seller or an agency without a profile
  // opens its application (and the honest empty pages of its file) from here.
  const candidateEntry = !!user && inLanabagaSpace && isOpenToEveryLanabaga(pathname);
  const allowed = !!user && (allowedRoles.some((role) => canEnterSpace(user, role)) || candidateEntry);
  const courierClosed = user?.role === "courier" && allowedRoles.includes("courier") && !courierCanWork(user) && !isOpenToEveryCourier(pathname);
  const lanabagaClosed = !!user && inLanabagaSpace && !lanabagaCanWork(user) && !isOpenToEveryLanabaga(pathname);

  useEffect(() => {
    if (isLoading || !user) return;
    if (!allowed || courierClosed) router.replace(homePathFor(user));
    else if (lanabagaClosed) router.replace(LANABAGA_FILE_PATH);
  }, [isLoading, user, allowed, courierClosed, lanabagaClosed, router]);

  if (isLoading) {
    return fallback ?? null;
  }

  if (!allowed || courierClosed || lanabagaClosed) {
    return null; // Don't render protected content
  }

  return <>{children}</>;
}
