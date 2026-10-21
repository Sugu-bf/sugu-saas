"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, MessageSquareQuote } from "lucide-react";
import { Alert, Button, Skeleton } from "@/design-system";
import { useSession } from "@/features/auth";
import { AuthCard } from "@/features/auth/components/auth-frame";
import { formatDate } from "@/features/lanaya/components/frame";
import { LanabagaCard } from "@/features/lanaya/components/seller-screen";
import { describeLanayaFailure } from "@/features/lanaya/errors";
import { isInvitationToken, useInvitationPreview } from "@/features/lanaya/hooks";
import { canEnterSpace } from "@/lib/auth/session-user";
import { ApiError } from "@/lib/http/api-error";

/**
 * Where the link of an invitation lands. A signed-in seller answers from
 * their own space; anyone else sees who invites them and is asked to sign
 * in first. Nothing is recorded on this page.
 */
export function InvitationLanding({ token: raw }: { token: string }) {
  const router = useRouter();
  const token = isInvitationToken(raw) ? raw : null;
  const { data: user, isLoading } = useSession();
  const answerPath = token ? `/vendor/lanaya?invitation=${encodeURIComponent(token)}` : "/vendor/lanaya";
  const isSeller = !!user && canEnterSpace(user, "vendor");
  const preview = useInvitationPreview(isLoading || isSeller ? null : token);

  useEffect(() => {
    if (isSeller && token) router.replace(answerPath);
  }, [isSeller, token, answerPath, router]);

  if (!token || preview.isError) {
    const gone = !token || (preview.error instanceof ApiError && preview.error.status === 404);
    return (
      <AuthCard title={gone ? "Invitation introuvable" : "Invitation indisponible"}>
        <Alert tone="info" title={gone ? "Ce lien n'est plus valable" : "L'invitation n'a pas pu être ouverte"}>
          {gone ? "Il a expiré, a été retiré, ou l'invitation a déjà reçu une réponse. Demandez au Lanabaga de vous en envoyer une nouvelle." : describeLanayaFailure(preview.error).message}
        </Alert>
      </AuthCard>
    );
  }

  if (isLoading || isSeller || !preview.data) {
    return (
      <AuthCard title="Invitation au programme Lanaya">
        <p role="status" className="sr-only">
          Ouverture de l&apos;invitation…
        </p>
        <Skeleton className="h-40 rounded-control" />
      </AuthCard>
    );
  }

  const data = preview.data;
  const name = data.lanabaga.name ?? "Un Lanabaga";
  const loginHref = `/login?redirect=${encodeURIComponent(answerPath)}`;

  return (
    <AuthCard wide title="Invitation au programme Lanaya" description={`${name} vous invite à rejoindre SUGU pour ${data.company_name}.`}>
      <div className="flex flex-col gap-4">
        <LanabagaCard card={data.lanabaga} />
        {data.message && (
          <blockquote className="flex gap-2 rounded-control border border-border bg-surface-subtle p-3 text-label font-normal text-foreground">
            <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
            <span className="min-w-0 break-words">{data.message}</span>
          </blockquote>
        )}
        <p className="text-body text-foreground-muted">
          Un Lanabaga est un partenaire indépendant admis par SUGU. Accepter cette invitation enregistre qu&apos;il vous a présenté SUGU ; ce n&apos;est ni une garantie de ventes, ni une assurance. Invitation valable jusqu&apos;au {formatDate(data.expires_at)}.
        </p>
        {user ? (
          <Alert tone="info" title="Cette invitation s'adresse à un compte vendeur">
            Le compte connecté n&apos;a pas d&apos;espace vendeur. Connectez-vous avec le compte de votre boutique pour répondre.
          </Alert>
        ) : (
          <Button asChild variant="primary" icon={LogIn} className="h-touch w-full">
            <Link href={loginHref}>Me connecter pour répondre</Link>
          </Button>
        )}
        <p className="text-label font-normal text-foreground-muted">
          Pas encore de compte vendeur ? Le Lanabaga qui vous invite ou l&apos;équipe SUGU vous aide à ouvrir votre boutique ; rouvrez ensuite ce lien.
        </p>
      </div>
    </AuthCard>
  );
}
