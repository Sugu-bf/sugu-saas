"use client";

import { useSession, useLogout, SessionError } from "@/features/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LogOut, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/design-system";

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
      <div className="sugu-ui flex min-h-dvh w-full flex-col items-center justify-center bg-background px-6 text-center" role="alert">
        <TriangleAlert className="size-6 text-danger-icon" aria-hidden="true" />
        <p className="mt-3 text-section-title text-foreground">
          {unsupported ? "Ce compte n'a pas accès à l'espace professionnel" : "Impossible de vérifier votre session"}
        </p>
        <p className="mt-1 max-w-sm text-body text-foreground-muted">
          {unsupported
            ? "Connectez-vous avec un compte vendeur, agence ou coursier."
            : "Le service ne répond pas pour le moment. Vos données ne sont pas perdues."}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {!unsupported && (
            <Button variant="primary" icon={RefreshCw} onClick={() => refetch()} loading={isFetching}>
              Réessayer
            </Button>
          )}
          <Button icon={LogOut} onClick={() => logout.mutate()} loading={logout.isPending}>
            Se déconnecter
          </Button>
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
    <div className="flex h-screen w-full items-center justify-center" role="status" aria-label="Chargement">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sugu-500 border-t-transparent" />
    </div>
  );
}
