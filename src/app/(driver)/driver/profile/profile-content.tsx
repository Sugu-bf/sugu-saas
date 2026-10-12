"use client";

import Link from "next/link";
import { Bike, ChevronRight, CircleCheck, FileText, HandCoins, LogOut, MessagesSquare, Settings, UserRound, type LucideIcon } from "lucide-react";
import { Avatar, Button, Card, ErrorState, Skeleton, cn, iconTileClass } from "@/design-system";
import { useLogout, useSession } from "@/features/auth";
import { DriverPage, ScreenHeader } from "@/features/driver/components/frame";
import { DocumentStatusBadge, VerificationBadge } from "@/features/driver/components/kyc-bits";
import { describeDriverFailure } from "@/features/driver/errors";
import { DOCUMENT_LABEL, verificationMessage, type CourierFile } from "@/features/driver/kyc/contract";
import { useCourierFile } from "@/features/driver/kyc/hooks";

// « Mon profil », after its mock-up: who the courier is, where the
// verification of the account stands with its documents, then the ways to
// the rest of the account. Open to a courier who cannot work yet.

const VEHICLE: Record<string, string> = { moto: "Moto", motorcycle: "Moto", velo: "Vélo", bicycle: "Vélo", voiture: "Voiture", car: "Voiture", tricycle: "Tricycle" };

export function ProfileContent() {
  const { data: user } = useSession();
  const logout = useLogout();
  const { data, isLoading, isError, error, refetch, isFetching } = useCourierFile();

  return (
    <DriverPage>
      <ScreenHeader title="Mon profil" back={{ label: "Retour à l'accueil", href: "/driver/dashboard" }} />

      {isLoading ? (
        <>
          <Skeleton className="mx-auto size-20 rounded-pill" />
          <Skeleton className="h-44 rounded-panel" />
          <Skeleton className="h-52 rounded-panel" />
        </>
      ) : isError || !data ? (
        <Card flush>
          <ErrorState title="Impossible de charger votre profil" description={describeDriverFailure(error).message} onRetry={() => refetch()} retrying={isFetching} />
        </Card>
      ) : (
        <>
          <section aria-label="Identité" className="flex flex-col items-center gap-1 text-center">
            <Avatar name={data.profile.name || user?.name || "Coursier"} src={data.profile.avatarUrl ?? user?.avatar_url} size="xl" />
            <h2 className="mt-2 text-section-title text-foreground">{data.profile.name || user?.name}</h2>
            {data.profile.phone && <p className="text-body text-foreground-muted tabular-nums">{data.profile.phone}</p>}
            {data.profile.email && <p className="max-w-full text-body text-foreground-muted [overflow-wrap:anywhere]">{data.profile.email}</p>}
          </section>

          <Verification file={data} />

          <Card flush aria-label="Mon compte" className="divide-y divide-border">
            <Row icon={UserRound} href="/driver/settings?tab=profile" label="Informations personnelles" />
            <Row
              icon={Bike}
              href="/driver/settings?tab=vehicle"
              label="Véhicule"
              detail={[data.vehicle.type ? (VEHICLE[data.vehicle.type] ?? data.vehicle.type) : null, data.vehicle.plate].filter(Boolean).join(" · ") || "Non renseigné"}
            />
            <Row icon={FileText} href="/driver/documents" label="Documents" detail={documentsSummary(data)} />
            <Row icon={HandCoins} href="/driver/earnings" label="Gains" />
            <Row icon={MessagesSquare} href="/driver/messages" label="Messages" />
            <Row icon={Settings} href="/driver/settings?tab=security" label="Paramètres" detail="Notifications, sécurité" />
          </Card>

          <Button variant="destructive" icon={LogOut} loading={logout.isPending} onClick={() => logout.mutate()} className="h-touch w-full border border-danger-border bg-danger-bg text-danger-fg hover:bg-danger-bg md:w-auto md:self-start">
            Se déconnecter
          </Button>
        </>
      )}
    </DriverPage>
  );
}

function documentsSummary(file: CourierFile): string {
  const sent = file.documents.filter((document) => document.status !== "not_uploaded");
  const verified = sent.filter((document) => document.status === "verified").length;
  if (sent.length === 0) return "Aucune pièce transmise";
  return `${verified} sur ${sent.length} validée${verified > 1 ? "s" : ""}`;
}

function Verification({ file }: { file: CourierFile }) {
  const { title, body } = verificationMessage(file.verification);
  const sent = file.documents.filter((document) => document.status !== "not_uploaded" || document.required);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-section-title text-foreground">Vérification de compte</h2>
        <VerificationBadge verification={file.verification} />
      </div>
      <p className="text-body text-foreground-muted">
        <span className="block text-foreground">{title}.</span>
        {body}
      </p>
      <ul className="flex flex-col gap-2">
        {sent.map((document) => (
          <li key={document.type} className="flex items-center gap-3 rounded-control bg-surface-subtle p-2.5">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-control", iconTileClass.neutral)}>
              <FileText className="size-[1.125rem]" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-medium text-foreground">{DOCUMENT_LABEL[document.type].title}</span>
              <span className="truncate text-label font-normal text-foreground-muted">{DOCUMENT_LABEL[document.type].hint}</span>
            </span>
            {document.status === "verified" ? (
              <span className="flex shrink-0 items-center text-success-icon">
                <CircleCheck className="size-5" aria-hidden="true" />
                <span className="sr-only">Approuvé</span>
              </span>
            ) : (
              <DocumentStatusBadge status={document.status} className="shrink-0" />
            )}
          </li>
        ))}
      </ul>
      {!file.verification.canDeliver && (
        <Button asChild variant="primary" icon={FileText} className="h-touch w-full">
          <Link href="/driver/documents">Voir ou compléter mon dossier</Link>
        </Button>
      )}
    </Card>
  );
}

function Row({ icon: Icon, href, label, detail }: { icon: LucideIcon; href: string; label: string; detail?: string }) {
  return (
    <Link href={href} className="flex min-h-touch items-center gap-3 px-4 py-3 hover:bg-surface-subtle">
      <Icon className="size-5 shrink-0 text-foreground-subtle" aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body font-medium text-foreground">{label}</span>
        {detail && <span className="truncate text-label font-normal text-foreground-muted">{detail}</span>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
    </Link>
  );
}
