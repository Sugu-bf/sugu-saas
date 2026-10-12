"use client";

import Link from "next/link";
import { CircleAlert, CircleCheck, ClipboardCheck, ClipboardList, PackageCheck, PackageSearch, Truck } from "lucide-react";
import { Avatar, Badge, Card, EmptyState, ErrorState, Skeleton, cn } from "@/design-system";
import { useSession } from "@/features/auth";
import { DriverPage, KpiCard, KpiGrid } from "@/features/driver/components/frame";
import { MissionCard, OpenMission } from "@/features/driver/components/mission-bits";
import { describeDriverFailure } from "@/features/driver/errors";
import { useOverview } from "@/features/driver/missions/hooks";

// Home of the courier, after its mock-up: who is signed in, what there is to
// do, and the mission to deal with first. Every figure is counted by the
// server; nothing here is estimated.

/** What each line of the activity is about: delivered, failed, collected, given. */
const ACTIVITY: Record<string, { icon: typeof Truck; tone: string }> = {
  delivery_completed: { icon: PackageCheck, tone: "text-success-icon" },
  delivery_failed: { icon: CircleAlert, tone: "text-danger-icon" },
  pickup_done: { icon: Truck, tone: "text-info-icon" },
  assigned: { icon: ClipboardList, tone: "text-foreground-subtle" },
};

export function DriverDashboardContent() {
  const { data: user } = useSession();
  const { data, isLoading, isError, error, refetch, isFetching } = useOverview();

  const firstName = (data?.name ?? user?.name ?? "").trim().split(/\s+/)[0];
  const counts = data?.counts;

  return (
    <DriverPage wide>
      <header className="flex items-center gap-3">
        <Avatar name={data?.name ?? user?.name ?? "Coursier"} src={user?.avatar_url} size="lg" className="size-12" />
        <div className="flex min-w-0 flex-col items-start gap-1">
          <h1 className="max-w-full truncate text-section-title text-foreground md:text-page-title">{firstName ? `Bonjour, ${firstName}` : "Bonjour"}</h1>
          {data &&
            (data.active ? (
              // The state of the account, as the server holds it: nothing the courier switches here.
              <Badge tone="success" icon={CircleCheck} title="Votre compte est actif : votre agence peut vous confier des missions.">
                En ligne
              </Badge>
            ) : (
              <Badge tone="neutral">Hors ligne</Badge>
            ))}
        </div>
      </header>

      {isError && !data ? (
        <Card flush>
          <ErrorState title="Impossible de charger votre accueil" description={describeDriverFailure(error).message} onRetry={() => refetch()} retrying={isFetching} />
        </Card>
      ) : (
        <>
          <KpiGrid label="Vos missions en chiffres">
            <KpiCard icon={ClipboardList} tone="warning" value={counts?.toAccept} label="À accepter" loading={isLoading} href="/driver/deliveries?liste=disponibles" />
            <KpiCard icon={Truck} tone="success" value={counts?.inProgress} label="En cours" loading={isLoading} href="/driver/deliveries" />
            <KpiCard icon={PackageCheck} tone="success" value={counts?.delivered} label="Terminées" loading={isLoading} href="/driver/history?statut=terminees" />
            <KpiCard icon={CircleAlert} tone="danger" value={counts?.failed} label={counts?.failed === 1 ? "Échec" : "Échecs"} loading={isLoading} href="/driver/history?statut=echecs" />
            <KpiCard icon={ClipboardCheck} tone="neutral" value={counts?.weekTotal} label="Total cette semaine" loading={isLoading} />
          </KpiGrid>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
          <section aria-labelledby="prochaine-mission" className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="prochaine-mission" className="text-section-title text-foreground">
                Prochaine mission
              </h2>
              <Link href="/driver/deliveries" className="rounded-compact text-label text-info-fg underline-offset-2 hover:underline">
                Voir tout
              </Link>
            </div>

            {isLoading ? (
              <Skeleton className="h-56 rounded-panel" />
            ) : data?.nextMission ? (
              <MissionCard mission={data.nextMission} headingLevel={3} action={<OpenMission mission={data.nextMission}>Voir les détails</OpenMission>} />
            ) : (
              <Card flush>
                <EmptyState icon={PackageSearch} title="Aucune mission pour le moment" description="Les missions que votre agence vous confie apparaîtront ici." />
              </Card>
            )}
          </section>

          {data && data.activity.length > 0 && (
            <section aria-labelledby="dernieres-activites" className="flex min-w-0 flex-col gap-3">
              <h2 id="dernieres-activites" className="flex min-h-6 items-center text-section-title text-foreground">
                Dernières activités
              </h2>
              <Card flush>
                <ul className="divide-y divide-border">
                  {data.activity.map((entry) => {
                    const { icon: Icon, tone } = ACTIVITY[entry.type] ?? ACTIVITY.assigned;
                    return (
                      <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                        <Icon className={cn("size-4 shrink-0", tone)} aria-hidden="true" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-body text-foreground">{entry.title}</span>
                          {entry.detail && <span className="truncate text-label font-normal text-foreground-muted">{entry.detail}</span>}
                        </span>
                        {entry.when && <span className="shrink-0 text-meta text-foreground-muted">{entry.when}</span>}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          )}
          </div>
        </>
      )}
    </DriverPage>
  );
}
