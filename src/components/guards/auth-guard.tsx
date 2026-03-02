"use client";

import { useSession } from "@/features/auth";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Blocks rendering of children until user is authenticated.
 * Redirects to /login if no session.
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { data: user, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return fallback ?? <AuthGuardSkeleton />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

function AuthGuardSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sugu-500 border-t-transparent" />
    </div>
  );
}
