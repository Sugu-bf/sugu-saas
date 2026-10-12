"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ChartColumn, CircleAlert, CircleCheck, Download, HandCoins, MapPin, Package, Plus, Radio, Truck, UserPlus } from "lucide-react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Money,
  PageHeader,
  Skeleton,
  Stat,
  StatusBadge,
  cn,
  type DataTableColumn,
} from "@/design-system";
import { DeliveryActionDialogs, type DeliveryIntent } from "@/features/agency/components/delivery-actions";
import { CourierIdentity, DeliveryLink, DeliveryStatus, Destination, Recipient } from "@/features/agency/components/delivery-bits";
import { DeliveryRowActions } from "@/features/agency/components/delivery-row-actions";
import { HourChart } from "@/features/agency/components/hour-chart";
import { AgencyPage, KpiMoney, KpiRow, TodayLabel } from "@/features/agency/components/page";
import { Panel } from "@/features/agency/components/panel";
import type { LiveCourier } from "@/features/agency/dashboard/contract";
import { useAgencyOverview } from "@/features/agency/dashboard/hooks";
import { exportDeliveriesCsv } from "@/features/agency/deliveries/api";
import type { DeliveryRow } from "@/features/agency/deliveries/contract";
import { describeAgencyFailure } from "@/features/agency/errors";
import { formatCount, relativeTime } from "@/features/agency/format";
import { useAgencyId, useAgencyName } from "@/features/agency/session";

const LIST = "/agency/deliveries";
/** The list of what the dashboard counts as pressing: late, to accept, to assign or failed. */
const PRESSING = `${LIST}?scope=needs_action`;

const COLUMNS: DataTableColumn<DeliveryRow>[] = [
  { id: "reference", header: "N°", mobile: "title", className: "whitespace-nowrap", cell: (delivery) => <DeliveryLink delivery={delivery} /> },
  { id: "status", header: "Statut", mobile: "badge", cell: (delivery) => <DeliveryStatus delivery={delivery} />, mobileCell: (delivery) => <DeliveryStatus delivery={delivery} stacked /> },
  {
    id: "recipient",
    header: "Destinataire",
    mobile: "subtitle",
    className: "@2xl:max-w-40",
    cell: (delivery) => <Recipient delivery={delivery} />,
    mobileCell: (delivery) => delivery.recipient.name ?? "Destinataire non renseigné",
  },
  {
    id: "place",
    header: "Zone / Adresse",
    className: "@2xl:max-w-48",
    cell: (delivery) => <Destination delivery={delivery} icon={false} />,
    mobileCell: (delivery) => <Destination delivery={delivery} icon={false} wrap />,
  },
  { id: "courier", header: "Livreur", className: "@2xl:max-w-44", cell: (delivery) => <CourierIdentity courier={delivery.courier} /> },
  { id: "amount", header: "Montant", numeric: true, cell: (delivery) => <Money francs={delivery.feeFrancs} className="font-medium" /> },
];

/** A dot that says whether a courier is on the road, free, or neither. */
const DOT: Record<string, string> = { on_delivery: "bg-success-icon", available: "bg-neutral-icon" };

function LiveCourierRow({ courier }: { courier: LiveCourier }) {
  const moved = relativeTime(courier.lastActivityAt);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className={cn("size-2 shrink-0 rounded-pill", DOT[courier.activity] ?? "bg-neutral-border")} aria-hidden="true" />
      <Avatar name={courier.name} size="md" />
      <div className="min-w-0 flex-1">
        <Link href={`/agency/drivers/${courier.courierId}`} className="block truncate rounded-compact text-body font-medium text-foreground underline-offset-2 hover:underline">
          {courier.name}
        </Link>
        {courier.delivery?.place ? (
          <p className="flex items-center gap-1 text-meta text-foreground-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <Link href={`${LIST}/${courier.delivery.id}`} className="truncate rounded-compact underline-offset-2 hover:underline">
              {courier.delivery.place}
            </Link>
          </p>
        ) : (
          <p className="text-meta text-foreground-muted">En attente d&apos;une course</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <StatusBadge domain="courierActivity" code={courier.activity} />
        {moved && <span className="text-meta text-foreground-muted tabular-nums">{moved}</span>}
      </div>
    </li>
  );
}

export function DashboardContent() {
  const router = useRouter();
  const agencyId = useAgencyId();
  const agencyName = useAgencyName();
  const overview = useAgencyOverview();
  const [intent, setIntent] = useState<DeliveryIntent | null>(null);
  const [exporting, setExporting] = useState(false);
  // Put away until the page is opened again: a late delivery is still late.
  const [hidden, setHidden] = useState<{ late: boolean; decisions: boolean }>({ late: false, decisions: false });

  const header = (
    <PageHeader
      title={agencyName ? `Bonjour, ${agencyName} !` : "Bonjour !"}
      description="Voici un aperçu de vos opérations de livraison aujourd'hui."
      hideDescriptionOnPhone
      meta={<TodayLabel />}
      primaryAction={{ label: "Nouvelle course", icon: Plus, href: `${LIST}/new` }}
    />
  );

  if (overview.isError) {
    return (
      <AgencyPage>
        {header}
        <div className="rounded-panel border border-border bg-surface">
          <ErrorState
            title="Le tableau de bord n'a pas pu être chargé"
            description={describeAgencyFailure(overview.error).message}
            onRetry={() => overview.refetch()}
            retrying={overview.isFetching}
          />
        </div>
      </AgencyPage>
    );
  }

  /** Every pressing delivery, not only the few listed here: the file is built by the server. */
  async function exportPressing() {
    if (!agencyId) return;
    setExporting(true);
    try {
      await exportDeliveriesCsv(agencyId, { scope: "needs_action" });
      toast.success("Export des livraisons prioritaires téléchargé.");
    } catch (error) {
      toast.error(`Export impossible. ${describeAgencyFailure(error).message}`);
    } finally {
      setExporting(false);
    }
  }

  const data = overview.data;
  const loading = !overview.isSuccess;
  const today = data?.today;
  const groups = data?.overview;
  const count = (value: number | undefined) => (value === undefined ? "—" : formatCount(value));
  const open = (scope: string) => () => router.push(`${LIST}?scope=${scope}`);

  return (
    <AgencyPage aria-busy={loading || undefined}>
      {header}

      <KpiRow label="Chiffres du jour">
        <Stat layout="figure" label="À assigner" icon={Package} value={count(groups?.toAssign)} hint="En attente d'un livreur" loading={loading} onSelect={open("to_assign")} />
        <Stat layout="figure" label="En cours" icon={Truck} value={count(groups?.onTheWay)} hint="Chez un livreur ou en route" loading={loading} onSelect={open("on_the_way")} />
        <Stat
          layout="figure"
          label="Livrées aujourd'hui"
          icon={CircleCheck}
          value={count(today?.delivered)}
          hint={today ? `Sur ${formatCount(today.created)} créée${today.created > 1 ? "s" : ""} aujourd'hui` : undefined}
          loading={loading}
          onSelect={open("delivered_today")}
        />
        <Stat
          layout="figure"
          label="Échecs"
          icon={CircleAlert}
          value={count(today?.failed)}
          hint="Tentatives échouées aujourd'hui"
          loading={loading}
        />
        <Stat
          layout="figure"
          label="Revenus du jour"
          icon={HandCoins}
          value={today ? <KpiMoney francs={today.revenueFrancs} /> : "—"}
          hint={today ? `Sur ${formatCount(today.delivered)} livraison${today.delivered > 1 ? "s" : ""}` : undefined}
          loading={loading}
        />
      </KpiRow>

      {groups && groups.late > 0 && !hidden.late && (
        <Alert
          tone="warning"
          actionsPlacement="end"
          title={`${formatCount(groups.late)} livraison${groups.late > 1 ? "s" : ""} en retard`}
          onDismiss={() => setHidden((current) => ({ ...current, late: true }))}
          actions={
            <Button asChild size="compact" trailingIcon={ArrowRight}>
              <Link href={`${LIST}?scope=late`}>Voir les livraisons</Link>
            </Button>
          }
        >
          L&apos;heure annoncée au client est dépassée. Vérifiez-les et réassignez-les si nécessaire.
        </Alert>
      )}

      {groups && groups.awaitingDecision > 0 && !hidden.decisions && (
        <Alert
          tone="info"
          actionsPlacement="end"
          title={`${formatCount(groups.awaitingDecision)} demande${groups.awaitingDecision > 1 ? "s attendent" : " attend"} votre décision`}
          onDismiss={() => setHidden((current) => ({ ...current, decisions: true }))}
          actions={
            <Button asChild size="compact" trailingIcon={ArrowRight}>
              <Link href={`${LIST}?scope=awaiting_decision`}>Voir les demandes</Link>
            </Button>
          }
        >
          Acceptez-les pour leur assigner un livreur, ou refusez-les.
        </Alert>
      )}

      <DataTable
        caption="Livraisons prioritaires"
        header={{
          title: (
            <span className="inline-flex items-center gap-2">
              Livraisons prioritaires
              {data && <Badge tone={data.priority.total > 0 ? "warning" : "neutral"}>{formatCount(data.priority.total)}</Badge>}
            </span>
          ),
          description:
            data && data.priority.total > data.priority.rows.length
              ? `Les ${data.priority.rows.length} plus pressantes, sur ${formatCount(data.priority.total)} : en retard, à accepter, à assigner ou en échec.`
              : "En retard, à accepter, à assigner ou en échec : celles qui demandent une action.",
          actions: (
            <>
              <Button icon={Download} loading={exporting} disabled={!data || data.priority.total === 0} onClick={exportPressing}>
                Exporter
              </Button>
              <Button asChild variant="outline" trailingIcon={ArrowRight}>
                <Link href={PRESSING}>Voir toutes</Link>
              </Button>
            </>
          ),
        }}
        columns={COLUMNS}
        rows={data?.priority.rows ?? []}
        getRowId={(delivery) => delivery.id}
        state={loading ? "loading" : "ready"}
        loadingRowCount={5}
        empty={{
          icon: CircleCheck,
          title: "Aucune livraison ne demande d'action",
          description: "Rien n'est en retard, à accepter, à assigner ni en échec.",
        }}
        rowActionsLabel="Action"
        density="compact"
        mobileRowActions="footer"
        rowActions={(delivery) => <DeliveryRowActions delivery={delivery} onIntent={setIntent} followLabel="Voir le suivi" className="min-w-28" />}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Activité du jour" icon={ChartColumn} description="Livraisons terminées et tentatives échouées, heure par heure.">
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : data && data.activityByHour.some((entry) => entry.delivered + entry.failed > 0) ? (
            <HourChart hours={data.activityByHour} />
          ) : (
            <EmptyState title="Rien de terminé pour le moment" description="Les livraisons remises et les tentatives échouées d'aujourd'hui apparaîtront ici." className="py-8" />
          )}
        </Panel>

        <Panel
          title="Suivi en direct"
          icon={Radio}
          description="Vos livreurs en course, puis ceux qui sont disponibles."
          actions={
            <Button asChild size="compact" trailingIcon={ArrowRight}>
              <Link href="/agency/drivers">Voir les livreurs</Link>
            </Button>
          }
        >
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : data && data.couriers.live.length > 0 ? (
            <ul className="-my-2.5 divide-y divide-border">
              {data.couriers.live.map((courier) => (
                <LiveCourierRow key={courier.courierId} courier={courier} />
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Aucun livreur en activité"
              description={
                data && data.couriers.overview.total === 0
                  ? "Ajoutez vos livreurs pour leur confier des courses."
                  : "Aucun de vos livreurs n'est en course ni disponible en ce moment."
              }
              action={
                <Button asChild icon={UserPlus}>
                  <Link href="/agency/drivers/new">Nouveau livreur</Link>
                </Button>
              }
              className="py-8"
            />
          )}
        </Panel>
      </div>

      <DeliveryActionDialogs intent={intent} onClose={() => setIntent(null)} />
    </AgencyPage>
  );
}
