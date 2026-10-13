"use client";

import Link from "next/link";
import { Ban, Eye, Package, PackageCheck, PackageSearch, Truck } from "lucide-react";
import { Alert, Button, DataTable, PageHeader, StatusBadge, Toolbar, ToolbarFilter, ToolbarSearch, type DataTableColumn } from "@/design-system";
import { ProductThumb } from "@/features/vendor/catalog/components/product-bits";
import { DayFilter } from "@/features/finance/components/history";
import type { Expedition } from "../contract";
import { useBoardFilters, useExpeditions, useListAddress } from "../hooks";
import { BOX, BOX_CRUMB, BoxPage, FilterFigure, KpiGrid, PageFailure, Reference, formatDay, plural } from "./bits";

// "Expéditions", after its mock-up: the orders the warehouse prepares and
// ships for the store. The warehouse does the work; the seller follows it
// and opens the order it serves. Counters, search, filters and pages are
// the server's.

const PAGE_SIZES = [10, 25, 50] as const;

/** The statuses in the address, in French. `a-preparer` is waiting and being prepared together. */
const STATUS_PARAM: Record<string, string> = { "a-preparer": "to_prepare", pretes: "packed", expediees: "shipped", annulees: "cancelled" };
const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "a-preparer", label: "À préparer" },
  { value: "pretes", label: "Prêtes à expédier" },
  { value: "expediees", label: "Expédiées" },
  { value: "annulees", label: "Annulées" },
];

const columns: DataTableColumn<Expedition>[] = [
  { id: "reference", header: "Référence", mobile: "title", cell: (row) => <Link href={BOX.expedition(row.id)} className="underline-offset-4 hover:underline"><Reference>{row.reference}</Reference></Link> },
  {
    id: "order",
    header: "Commande",
    mobile: "subtitle",
    cell: (row) =>
      row.order ? (
        <span className="block min-w-0">
          <Link href={`/vendor/orders/${row.order.id}`} className="font-medium whitespace-nowrap text-foreground tabular-nums underline-offset-4 hover:underline">
            {row.order.number}
          </Link>
          <span className="block text-meta whitespace-nowrap text-foreground-muted">{formatDay(row.order.placedAt)}</span>
        </span>
      ) : (
        <span className="text-foreground-muted">Sortie hors commande</span>
      ),
    mobileCell: (row) => row.order?.number ?? "Sortie hors commande",
  },
  {
    id: "destination",
    header: "Destination",
    className: "hidden @4xl:table-cell",
    cell: (row) =>
      row.destination ? (
        <span className="block min-w-0">
          <span className="block truncate text-foreground">{row.destination.city}</span>
          {row.destination.zone && <span className="block truncate text-meta text-foreground-muted">{row.destination.zone}</span>}
        </span>
      ) : (
        <span className="text-foreground-muted">—</span>
      ),
    mobileCell: (row) => (row.destination ? [row.destination.city, row.destination.zone].filter(Boolean).join(", ") : null),
  },
  {
    id: "items",
    header: "Articles",
    cell: (row) => (
      <span className="block">
        <span className="block whitespace-nowrap">{plural(row.unitsRequested, "article", "articles")}</span>
        {row.thumbnails.length > 0 && (
          <span className="mt-1 hidden gap-1 @3xl:flex" aria-hidden="true">
            {row.thumbnails.map((src) => (
              <ProductThumb key={src} src={src} className="size-6" />
            ))}
          </span>
        )}
      </span>
    ),
    mobileCell: (row) => plural(row.unitsRequested, "article", "articles"),
  },
  { id: "status", header: "Statut", mobile: "badge", cell: (row) => <StatusBadge domain="suguBoxOutbound" code={row.status} /> },
  { id: "shipped", header: "Date d'expédition", cell: (row) => <span className="whitespace-nowrap">{formatDay(row.shippedAt)}</span>, mobileCell: (row) => (row.shippedAt ? formatDay(row.shippedAt) : null) },
];

export function SuguBoxExpeditions() {
  const address = useListAddress(PAGE_SIZES);
  const statusParam = address.get("statut") in STATUS_PARAM ? address.get("statut") : "";
  const city = address.get("ville");

  const { data, isError, error, refetch, isFetching, isPending } = useExpeditions({
    search: address.search,
    status: STATUS_PARAM[statusParam],
    city: city || undefined,
    from: address.rangeError ? undefined : address.from,
    to: address.rangeError ? undefined : address.to,
    page: address.page,
    pageSize: address.pageSize,
  });
  const options = useBoardFilters().data;
  const narrowed = Boolean(address.search || statusParam || city || address.from || address.to);
  const reset = () => address.reset(["statut", "ville"]);
  const figure = (param: string) => ({ onSelect: () => address.update({ statut: statusParam === param ? null : param }), pressed: statusParam === param, loading: isPending });

  return (
    <BoxPage aria-busy={isFetching || undefined}>
      <PageHeader
        title="Expéditions"
        description="Suivez les commandes que l'entrepôt Sugu Box prépare et expédie pour vous."
        breadcrumbs={[BOX_CRUMB, { label: "Expéditions" }]}
      />

      {isError && !data ? (
        <PageFailure error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <>
          <Toolbar
            collapseFilters="narrow"
            search={<ToolbarSearch value={address.typed} onValueChange={address.setTyped} onSubmit={address.submitSearch} label="Rechercher une référence, une commande…" />}
            activeFilterCount={[statusParam, city, address.from, address.to].filter(Boolean).length}
            onResetFilters={reset}
            filters={
              <>
                <ToolbarFilter label="Statut" hideLabelInline value={statusParam} onValueChange={(value) => address.update({ statut: value || null })} options={STATUS_OPTIONS} />
                <ToolbarFilter
                  label="Destination"
                  hideLabelInline
                  value={city}
                  onValueChange={(value) => address.update({ ville: value || null })}
                  options={[{ value: "", label: "Toutes les destinations" }, ...(options?.cities ?? []).map((entry) => ({ value: entry, label: entry }))]}
                />
                <DayFilter label="Du" value={address.from} max={address.to || undefined} onValueChange={(value) => address.update({ du: value || null })} />
                <DayFilter label="Au" value={address.to} min={address.from || undefined} onValueChange={(value) => address.update({ au: value || null })} />
              </>
            }
          />

          <KpiGrid label="Expéditions par situation" columns={4}>
            <FilterFigure icon={Package} label="À préparer" value={data?.counts.toPrepare} {...figure("a-preparer")} />
            <FilterFigure icon={PackageCheck} label="Prêtes" value={data?.counts.packed} {...figure("pretes")} />
            <FilterFigure icon={Truck} label="Expédiées" value={data?.counts.shipped} {...figure("expediees")} />
            <FilterFigure icon={Ban} label="Annulées" value={data?.counts.cancelled} {...figure("annulees")} />
          </KpiGrid>

          {address.rangeError && <Alert tone="warning" title={address.rangeError} />}

          <DataTable
            caption="Expéditions"
            columns={columns}
            rows={data?.rows ?? []}
            getRowId={(row) => row.id}
            state={isPending ? "loading" : "ready"}
            refreshing={isFetching}
            rowActionsLabel="Actions"
            mobileRowActions="footer"
            rowActions={(row) => (
              <Button asChild variant="outline" icon={Eye}>
                <Link href={BOX.expedition(row.id)} aria-label={`Voir l'expédition ${row.reference}`}>
                  Voir
                </Link>
              </Button>
            )}
            empty={
              narrowed
                ? { icon: PackageSearch, title: "Aucune expédition ne correspond", description: "Modifiez la recherche, le statut, la destination ou les dates.", action: <Button onClick={reset}>Tout afficher</Button> }
                : { icon: Truck, title: "Aucune expédition", description: "Dès qu'une commande contient un produit stocké chez Sugu, l'entrepôt la prépare et elle apparaît ici." }
            }
            pagination={
              data && data.total > 0
                ? { page: data.page, pageSize: data.pageSize, total: data.total, onPageChange: address.setPage, variant: "numbered", pageSizeOptions: [...PAGE_SIZES], onPageSizeChange: address.setPageSize, itemLabel: "expéditions" }
                : undefined
            }
          />
        </>
      )}
    </BoxPage>
  );
}
