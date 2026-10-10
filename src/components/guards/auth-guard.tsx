"use client";

import { useSession, useLogout, SessionError } from "@/features/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Blocks rendering of children until user is authenticated.
 *
 * Three distinct outcomes, never conflated:
 *  - no session        → redirect to /login (destination kept)
 *  - session error     → message + retry (an outage is not a logout)
 *  - unsupported profile → message + sign out
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { data: user, isLoading, isError, error, refetch, isFetching } = useSession();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isError && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isError, user, router, pathname]);

  if (isLoading) {
    return fallback ?? <AuthGuardSkeleton />;
  }

  if (isError) {
    const unsupported = error instanceof SessionError && error.code === "UNSUPPORTED_PROFILE";
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 px-6 text-center" role="alert">
        <p className="text-base font-semibold text-gray-900">
          {unsupported ? "Ce compte n'a pas accès à l'espace professionnel" : "Impossible de vérifier votre session"}
        </p>
        <p className="max-w-sm text-sm text-gray-500">
          {unsupported
            ? "Connectez-vous avec un compte vendeur, agence ou coursier."
            : "Le service ne répond pas pour le moment. Vos données ne sont pas perdues."}
        </p>
        <div className="mt-2 flex gap-2">
          {!unsupported && (
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-lg bg-sugu-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Réessayer
            </button>
          )}
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
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
