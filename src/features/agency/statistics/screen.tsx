"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheckBig, CircleX, Clock, Hourglass, Truck } from "lucide-react";
import { Avatar, Card, EmptyState, ErrorState, PageHeader, Skeleton } from "@/design-system";
import { useAgencyStats } from "@/features/agency/hooks";
import { AgencyPage } from "@/features/agency/components/page";
import { Figure } from "@/features/vendor/clients/components/bits";
import { Panel, PeriodControl, RankedBar, Trend } from "@/features/insights/bits";
import { DayChart, ShareRing, periodLabel } from "@/features/insights/charts";
import type { PeriodKey } from "@/features/insights/contract";
import { ApiError } from "@/lib/http/api-error";

const UNITS = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const units = (value: number) => UNITS.format(value);
const deliveries = (count: number) => `${units(count)} livraison${count > 1 ? "s" : ""}`;

/** The state of a delivery, in the words and colours of its status: colour never says it alone. */
const STATE: Record<string, { label: string; stroke: string; dot: string }> = {
  delivered: { label: "Effectuées", stroke: "stroke-success-icon", dot: "bg-success-icon" },
  in_progress: { label: "En cours", stroke: "stroke-info-icon", dot: "bg-info-icon" },
  pending: { label: "En attente", stroke: "stroke-warning-icon", dot: "bg-warning-icon" },
  failed: { label: "Échouées", stroke: "stroke-danger-icon", dot: "bg-danger-icon" },
};

/** "2 h 35", "45 min". */
function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} h ${String(minutes % 60).padStart(2, "0")}` : `${minutes} min`;
}

function describeFailure(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "La connexion a été interrompue. Vérifiez votre réseau, puis réessayez.";
    if (error.status === 403) return "Votre compte n'a pas accès aux statistiques de cette agence.";
    if (error.status === 429) return "Trop de demandes en peu de temps. Patientez une minute, puis réessayez.";
  }
  return "Les statistiques n'ont pas pu être chargées. Réessayez dans un instant.";
}

/**
 * `/agency/statistics`: what the agency delivered over 7, 30 or 90 days.
 * Choosing a period asks the server again (`useAgencyStats(period)`); the
 * figures of the previous one stay on screen, dimmed, meanwhile.
 */
export function AgencyStatisticsScreen() {
  const [period, setPeriod] = useState<PeriodKey>("30j");
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useAgencyStats(period);

  const control = <PeriodControl value={period} onPreset={setPeriod} busy={isFetching} />;
  const header = (
    <>
      <PageHeader title="Statistiques" description="Performance de votre activité de livraison" meta={control} />
      <div className="md:hidden">{control}</div>
    </>
  );

  if (isPending) {
    return (
      <AgencyPage aria-busy>
        {header}
        <Figures>
          {["Livraisons créées", "Livraisons effectuées", "En cours", "Échouées"].map((label) => (
            <Figure key={label} icon={Truck} label={label} value={undefined} loading />
          ))}
        </Figures>
        <Skeleton className="h-72 w-full rounded-panel" />
        <span className="sr-only" role="status">
          Chargement des statistiques…
        </span>
      </AgencyPage>
    );
  }

  if (isError || !data) {
    return (
      <AgencyPage>
        {header}
        <Card>
          <ErrorState title="Statistiques indisponibles" description={describeFailure(error)} onRetry={() => refetch()} retrying={isFetching} />
        </Card>
      </AgencyPage>
    );
  }

  const { kpis, series, statuses, couriers, failureReasons } = data;
  const span = periodLabel(data.period.from, data.period.to);
  const before = periodLabel(data.period.previousFrom, data.period.previousTo);
  const created = kpis.created.value;
  const topCourier = Math.max(1, ...couriers.map((courier) => courier.deliveries));

  return (
    <AgencyPage aria-busy={isFetching}>
      {header}

      <p className="text-label text-foreground-muted" data-period={data.period.key}>
        <span className="font-medium text-foreground">{span}</span> ({data.period.days} jours), comparé à la période précédente ({before}).
      </p>

      <div className={isPlaceholderData ? "flex flex-col gap-4 opacity-60 transition-opacity" : "flex flex-col gap-4"}>
        <Figures>
          <Figure icon={Truck} label="Livraisons créées" value={units(created)} trend={<Trend figure={kpis.created} before={units(kpis.created.previous)} />} />
          <Figure icon={CircleCheckBig} label="Livraisons effectuées" value={units(kpis.delivered.value)} trend={<Trend figure={kpis.delivered} before={units(kpis.delivered.previous)} />} />
          <Figure icon={Clock} label="En cours" value={units(kpis.inProgress)} trend={kpis.pending > 0 ? `et ${units(kpis.pending)} en attente` : "aucune en attente"} />
          <Figure icon={CircleX} label="Échouées" value={units(kpis.failed.value)} trend={<Trend figure={kpis.failed} before={units(kpis.failed.previous)} lowerIsBetter />} />
        </Figures>

        <p className="text-meta text-foreground-muted">
          Livraisons confiées à votre agence et créées sur la période, selon leur état actuel.{" "}
          {kpis.successRate !== null ? <>Taux de réussite : {units(kpis.successRate)} % des livraisons terminées. </> : <>Aucune livraison terminée sur la période : pas de taux de réussite. </>}
          {kpis.averageMinutes !== null && (
            <>
              Délai moyen entre la collecte et la remise : {duration(kpis.averageMinutes)}, mesuré sur {deliveries(kpis.timedDeliveries)}.
            </>
          )}
        </p>

        {created === 0 ? (
          <Card>
            <EmptyState icon={Truck} title="Aucune livraison sur cette période" description="Les livraisons confiées à votre agence apparaissent ici. Essayez une période plus longue." />
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,4fr)]">
            <Panel title="Livraisons par jour" hint={`Livraisons créées chaque jour · ${span}`}>
              <DayChart
                form="bars"
                formatTick={units}
                label={`Livraisons par jour, ${span}`}
                summary={`Livraisons du ${span} : ${deliveries(created)} créées, ${units(kpis.delivered.value)} effectuées, ${units(kpis.failed.value)} échouées.`}
                points={series.map((day) => ({
                  date: day.date,
                  value: day.created,
                  readout: [
                    { label: "Créées", value: units(day.created) },
                    { label: "Effectuées", value: units(day.delivered) },
                    { label: "Échouées", value: units(day.failed) },
                  ],
                }))}
              />
            </Panel>

            <Panel title="Répartition par statut" hint="État actuel des livraisons de la période">
              <ShareRing
                caption={`Livraisons par statut : ${statuses.map((status) => `${STATE[status.key]?.label ?? status.key} ${units(status.percent)} %`).join(", ")}.`}
                center={{ value: units(created), label: created > 1 ? "livraisons" : "livraison" }}
                shares={statuses.map((status) => ({
                  key: status.key,
                  label: STATE[status.key]?.label ?? status.key,
                  value: status.count,
                  percent: status.percent,
                  detail: units(status.count),
                  stroke: STATE[status.key]?.stroke ?? "stroke-neutral-icon",
                  dot: STATE[status.key]?.dot ?? "bg-neutral-icon",
                }))}
              />
            </Panel>

            <Panel
              title="Performance des coursiers"
              hint="Livraisons effectuées sur la période"
              action={
                <Link href="/agency/drivers" className="inline-flex min-h-6 items-center text-label font-medium whitespace-nowrap text-primary underline-offset-4 hover:underline">
                  Voir tout
                </Link>
              }
            >
              {couriers.length === 0 ? (
                <p className="text-body text-foreground-muted">Aucun coursier n&apos;a terminé de livraison sur cette période.</p>
              ) : (
                <ol className="flex flex-col divide-y divide-border">
                  {couriers.map((courier) => (
                    <li key={courier.id} data-share={Math.round((courier.deliveries / topCourier) * 100)}>
                      <Link href={`/agency/drivers/${courier.id}`} className="group flex items-center gap-3 py-2.5 outline-offset-2">
                        <Avatar name={courier.name} size="md" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground group-hover:underline">{courier.name}</span>
                          <span className="block truncate text-meta text-foreground-muted tabular-nums">
                            {courier.successRate !== null ? `${units(courier.successRate)} % de réussite` : "Aucune livraison terminée"}
                            {courier.failed > 0 && ` · ${units(courier.failed)} échec${courier.failed > 1 ? "s" : ""}`}
                          </span>
                        </span>
                        <span className="text-label whitespace-nowrap text-foreground-muted tabular-nums">
                          <span className="font-semibold text-foreground">{units(courier.deliveries)}</span> livraison{courier.deliveries > 1 ? "s" : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        )}

        {kpis.failed.value > 0 && (
          <Panel title="Motifs d'échec" hint="Motifs notés par les coursiers sur les livraisons échouées de la période">
            {failureReasons.length === 0 ? (
              <p className="flex items-center gap-2 text-body text-foreground-muted">
                <Hourglass className="size-4 shrink-0" aria-hidden="true" />
                Aucun motif n&apos;a été noté pour {kpis.failed.value > 1 ? `ces ${units(kpis.failed.value)} échecs` : "cet échec"}.
              </p>
            ) : (
              <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                {failureReasons.map((reason) => (
                  <RankedBar key={reason.code} label={reason.label} value={`${deliveries(reason.count)} · ${units(reason.percent)} %`} share={reason.percent} />
                ))}
              </ul>
            )}
          </Panel>
        )}

      </div>
    </AgencyPage>
  );
}

/** Four figures: two a row on a phone, never a row to scroll sideways. */
function Figures({ children }: { children: React.ReactNode }) {
  return (
    <section aria-label="Chiffres de la période" className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
      {children}
    </section>
  );
}

/** What the page shows before its screen has loaded. */
export function AgencyStatisticsLoading() {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4" aria-busy="true">
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="h-24 w-full rounded-panel" />
      <Skeleton className="h-72 w-full rounded-panel" />
    </div>
  );
}
