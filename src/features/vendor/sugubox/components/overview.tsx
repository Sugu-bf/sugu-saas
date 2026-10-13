"use client";

import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Box, Clock, ClipboardList, PackageOpen, Truck, TriangleAlert } from "lucide-react";
import { Button, DataTable, PageHeader, StatusBadge, cn, iconTileClass, suguBoxMovementType, type DataTableColumn } from "@/design-system";
import type { Expedition, Movement, Reception, StockItem } from "../contract";
import { useSummary } from "../hooks";
import { BOX, BOX_CRUMB, BoxPage, FigureCard, KpiGrid, PageFailure, ProductCell, Reference, describeFailure, formatDayShortTime, formatSigned, formatUnits, plural } from "./bits";

// Overview of Sugu Box, after its mock-up: five figures, each with the list
// behind it, then the last receptions, the last expeditions, the articles
// running low, and the last movements of the journal.

const seeAll = (href: string, label: string) => (
  <Button asChild variant="secondary" size="compact">
    <Link href={href} aria-label={label}>
      Voir toutes
    </Link>
  </Button>
);

const receptionColumns: DataTableColumn<Reception>[] = [
  { id: "reference", header: "N° réception", mobile: "title", cell: (row) => <Link href={BOX.reception(row.id)} className="underline-offset-4 hover:underline"><Reference>{row.reference}</Reference></Link> },
  { id: "warehouse", header: "Entrepôt", mobile: "subtitle", cell: (row) => row.warehouse?.name ?? "—", className: "hidden @xl:table-cell" },
  { id: "units", header: "Articles", numeric: true, cell: (row) => formatUnits(row.unitsExpected) },
  { id: "date", header: "Date", cell: (row) => <span className="whitespace-nowrap">{formatDayShortTime(row.createdAt)}</span> },
  { id: "status", header: "Statut", mobile: "badge", cell: (row) => <StatusBadge domain="suguBoxInbound" code={row.status} /> },
];

const expeditionColumns: DataTableColumn<Expedition>[] = [
  { id: "reference", header: "N° expédition", mobile: "title", cell: (row) => <Link href={BOX.expedition(row.id)} className="underline-offset-4 hover:underline"><Reference>{row.reference}</Reference></Link> },
  { id: "customer", header: "Client", mobile: "subtitle", cell: (row) => row.order?.customer ?? "—", className: "hidden @xl:table-cell" },
  { id: "units", header: "Articles", numeric: true, cell: (row) => formatUnits(row.unitsRequested) },
  { id: "date", header: "Date", cell: (row) => <span className="whitespace-nowrap">{formatDayShortTime(row.createdAt)}</span> },
  { id: "status", header: "Statut", mobile: "badge", cell: (row) => <StatusBadge domain="suguBoxOutbound" code={row.status} /> },
];

const alertColumns: DataTableColumn<StockItem>[] = [
  { id: "product", header: "Produit", mobile: "title", cell: (row) => <ProductCell name={row.name} variant={row.variant} imageUrl={row.imageUrl} /> },
  { id: "sku", header: "SKU", mobile: "subtitle", cell: (row) => <span className="whitespace-nowrap tabular-nums">{row.sku ?? "—"}</span>, className: "hidden @xl:table-cell" },
  { id: "available", header: "Stock actuel", numeric: true, cell: (row) => <span className="font-semibold text-danger-fg">{formatUnits(row.available)}</span> },
  { id: "threshold", header: "Seuil", numeric: true, cell: (row) => (row.threshold === null ? "—" : formatUnits(row.threshold)) },
  { id: "state", header: "Statut", mobile: "badge", cell: (row) => <StatusBadge domain="stock" code={row.state} /> },
];

const ACTIVITY_ICON = { inbound: ArrowDownToLine, outbound: ArrowUpFromLine, transfer: Truck, adjustment: ClipboardList } as const;

/** What a movement says in one line: "Entrée de 12 unités", "Ajustement de −5 unités". */
function activityTitle(movement: Movement): string {
  const type = suguBoxMovementType.resolve(movement.type);
  const label = type.known ? type.label : movement.typeLabel;
  const signed = movement.type === "adjustment" || movement.type === "transfer";
  const count = signed ? `${formatSigned(movement.quantity)} ${Math.abs(movement.quantity) > 1 ? "unités" : "unité"}` : plural(Math.abs(movement.quantity), "unité", "unités");
  return `${label} de ${count}`;
}

export function SuguBoxOverview() {
  const { data, isError, error, refetch, isFetching, isPending } = useSummary();
  const loading = isPending;
  const state = loading ? "loading" : isError && !data ? "error" : "ready";
  const failure = { description: describeFailure(error), onRetry: () => refetch(), retrying: isFetching };

  return (
    <BoxPage aria-busy={isFetching || undefined}>
      <PageHeader
        title="Vue d'ensemble Sugu Box"
        description="Un aperçu complet de votre logistique Sugu Box : stock, réceptions, expéditions et alertes."
        breadcrumbs={[BOX_CRUMB, { label: "Vue d'ensemble" }]}
      />

      {isError && !data ? (
        <PageFailure error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <>
          <KpiGrid label="Chiffres clés de Sugu Box" columns={5}>
            <FigureCard icon={Box} label="Stock total" value={data?.stockUnits} unit="articles en entrepôt" link={{ label: "Voir le stock", href: BOX.stock }} loading={loading} />
            <FigureCard icon={ArrowDownToLine} label="Réceptions du jour" value={data?.receivedToday} unit="articles réceptionnés" link={{ label: "Voir les réceptions", href: BOX.receptions }} loading={loading} />
            <FigureCard icon={ArrowUpFromLine} label="Expéditions en attente" value={data?.toPrepare} unit="commandes à préparer" link={{ label: "Voir les expéditions", href: `${BOX.expeditions}?statut=a-preparer` }} loading={loading} />
            <FigureCard icon={ClipboardList} label="Commandes Sugu Box" value={data?.ordersThisMonth} unit="ce mois-ci" link={{ label: "Voir les commandes", href: "/vendor/orders" }} loading={loading} />
            <FigureCard icon={TriangleAlert} label="Alertes" value={data?.alerts} unit="produits en alerte" link={{ label: "Voir les alertes", href: `${BOX.stock}?etat=alertes` }} loading={loading} />
          </KpiGrid>

          <div className="grid gap-4 min-[1400px]:grid-cols-2">
            <DataTable
              caption="Réceptions récentes"
              header={{ title: <PanelTitle icon={PackageOpen}>Réceptions récentes</PanelTitle>, actions: seeAll(BOX.receptions, "Voir toutes les réceptions") }}
              columns={receptionColumns}
              rows={data?.receptions ?? []}
              getRowId={(row) => row.id}
              state={state}
              error={failure}
              loadingRowCount={5}
              tableFrom="narrow"
              density="compact"
              empty={{ icon: PackageOpen, title: "Aucune réception", description: "Les dépôts que l'entrepôt Sugu reçoit de votre boutique apparaîtront ici." }}
            />
            <DataTable
              caption="Expéditions récentes"
              header={{ title: <PanelTitle icon={Truck}>Expéditions récentes</PanelTitle>, actions: seeAll(BOX.expeditions, "Voir toutes les expéditions") }}
              columns={expeditionColumns}
              rows={data?.expeditions ?? []}
              getRowId={(row) => row.id}
              state={state}
              error={failure}
              loadingRowCount={5}
              tableFrom="narrow"
              density="compact"
              empty={{ icon: Truck, title: "Aucune expédition", description: "Les commandes que l'entrepôt prépare pour vous apparaîtront ici." }}
            />
          </div>

          <div className="grid gap-4 min-[1400px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <DataTable
              caption="Alertes stock"
              header={{ title: <PanelTitle icon={TriangleAlert} tone="danger">Alertes stock</PanelTitle>, actions: seeAll(`${BOX.stock}?etat=alertes`, "Voir toutes les alertes de stock") }}
              columns={alertColumns}
              rows={data?.stockAlerts ?? []}
              getRowId={(row) => row.id}
              state={state}
              error={failure}
              loadingRowCount={5}
              tableFrom="narrow"
              density="compact"
              empty={{ icon: Box, title: "Aucune alerte", description: "Tous vos articles en entrepôt sont au-dessus de leur seuil." }}
            />

            <section aria-labelledby="sugubox-activity" className="flex min-w-0 flex-col rounded-panel border border-border bg-surface">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h2 id="sugubox-activity" className="text-section-title text-foreground">
                  <PanelTitle icon={Clock}>Activité récente</PanelTitle>
                </h2>
                {seeAll(BOX.movements, "Voir tous les mouvements")}
              </div>
              {loading ? (
                <ul className="flex flex-col gap-3 p-4" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, index) => (
                    <li key={index} className="h-10 animate-pulse rounded-control bg-surface-subtle" />
                  ))}
                </ul>
              ) : (data?.activity.length ?? 0) === 0 ? (
                <p className="px-4 py-10 text-center text-body text-foreground-muted">Aucun mouvement de stock pour le moment.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data!.activity.map((movement) => {
                    const Icon = ACTIVITY_ICON[movement.type as keyof typeof ACTIVITY_ICON] ?? ClipboardList;
                    const tone = suguBoxMovementType.resolve(movement.type).tone;
                    return (
                      <li key={movement.id} className="flex items-start gap-3 px-4 py-3">
                        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-control", iconTileClass[tone])} aria-hidden="true">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-label font-semibold text-foreground">{activityTitle(movement)}</span>
                          <span className="block truncate text-meta text-foreground-muted">
                            {[movement.name, movement.document?.reference ?? movement.reason].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <time dateTime={movement.at} className="shrink-0 text-meta whitespace-nowrap text-foreground-muted">
                          {formatDayShortTime(movement.at)}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </BoxPage>
  );
}

function PanelTitle({ icon: Icon, tone, children }: { icon: typeof Box; tone?: "danger"; children: string }) {
  return (
    <span className="flex items-center gap-2">
      <Icon className={cn("size-5 shrink-0", tone === "danger" ? "text-danger-icon" : "text-foreground")} aria-hidden="true" />
      {children}
    </span>
  );
}
