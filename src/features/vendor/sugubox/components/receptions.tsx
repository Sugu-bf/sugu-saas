"use client";

import Link from "next/link";
import { CheckCircle2, Clock, Eye, PackageOpen, PackageSearch, ScanLine } from "lucide-react";
import { Alert, Button, DataTable, PageHeader, StatusBadge, Toolbar, ToolbarFilter, ToolbarSearch, suguBoxInboundStatus, type DataTableColumn, type SortState } from "@/design-system";
import { DayFilter } from "@/features/finance/components/history";
import type { Reception } from "../contract";
import { useBoardFilters, useListAddress, useReceptions } from "../hooks";
import { BOX, BOX_CRUMB, BoxPage, FilterFigure, KpiGrid, PageFailure, Reference, formatDay, formatUnits, plural } from "./bits";

// "Réceptions", after its mock-up: what the store sent to the warehouse and
// where the check of each deposit stands. The warehouse records a reception;
// the seller follows it. Counters, search, filters, order and pages are the
// server's.

const PAGE_SIZES = [10, 25, 50] as const;

/** The statuses in the address, in French: `?statut=en-attente`. */
const STATUS_PARAM: Record<string, string> = { "en-attente": "pending", "en-controle": "in_progress", terminees: "completed", annulees: "cancelled" };
const paramOf = (status: string) => Object.keys(STATUS_PARAM).find((key) => STATUS_PARAM[key] === status) ?? "";

/** The order in the address (`?tri=prevue`), and what it asks of the server. */
const SORTS: Record<string, { server: string; state: SortState }> = {
  "creee-asc": { server: "created_at", state: { columnId: "created", direction: "asc" } },
  prevue: { server: "expected_at", state: { columnId: "expected", direction: "asc" } },
  "prevue-desc": { server: "-expected_at", state: { columnId: "expected", direction: "desc" } },
};
const NEWEST: SortState = { columnId: "created", direction: "desc" };

const columns: DataTableColumn<Reception>[] = [
  { id: "reference", header: "Référence", mobile: "title", cell: (row) => <Link href={BOX.reception(row.id)} className="underline-offset-4 hover:underline"><Reference>{row.reference}</Reference></Link> },
  { id: "warehouse", header: "Entrepôt", mobile: "subtitle", cell: (row) => row.warehouse?.name ?? "—", className: "hidden @4xl:table-cell" },
  { id: "lines", header: "Articles", cell: (row) => <span className="whitespace-nowrap">{plural(row.lines, "article", "articles")}</span> },
  { id: "units", header: "Quantité", numeric: true, cell: (row) => formatUnits(row.unitsExpected) },
  { id: "status", header: "Statut", mobile: "badge", cell: (row) => <StatusBadge domain="suguBoxInbound" code={row.status} /> },
  { id: "expected", header: "Date prévue", sortable: true, cell: (row) => <span className="whitespace-nowrap">{formatDay(row.expectedAt)}</span> },
  { id: "created", header: "Créée le", sortable: true, mobile: "detail", cell: (row) => <span className="whitespace-nowrap">{formatDay(row.createdAt)}</span>, className: "hidden @3xl:table-cell" },
];

export function SuguBoxReceptions() {
  const address = useListAddress(PAGE_SIZES);
  const statusParam = address.get("statut") in STATUS_PARAM ? address.get("statut") : "";
  const warehouse = address.get("entrepot");
  const sortParam = address.get("tri") in SORTS ? address.get("tri") : "";

  const { data, isError, error, refetch, isFetching, isPending } = useReceptions({
    search: address.search,
    status: STATUS_PARAM[statusParam],
    warehouseId: warehouse || undefined,
    from: address.rangeError ? undefined : address.from,
    to: address.rangeError ? undefined : address.to,
    sort: SORTS[sortParam]?.server,
    page: address.page,
    pageSize: address.pageSize,
  });
  const options = useBoardFilters().data;
  const narrowed = Boolean(address.search || statusParam || warehouse || address.from || address.to);
  const reset = () => address.reset(["statut", "entrepot"]);
  const toggle = (param: string) => address.update({ statut: statusParam === param ? null : param });

  const onSort = (next: SortState) => {
    const key = Object.keys(SORTS).find((entry) => SORTS[entry].state.columnId === next.columnId && SORTS[entry].state.direction === next.direction);
    address.update({ tri: key ?? null });
  };

  return (
    <BoxPage aria-busy={isFetching || undefined}>
      <PageHeader
        title="Réceptions"
        description="Suivez les marchandises que l'entrepôt Sugu Box reçoit de votre boutique."
        breadcrumbs={[BOX_CRUMB, { label: "Réceptions" }]}
      />

      {isError && !data ? (
        <PageFailure error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <>
          <KpiGrid label="Réceptions par situation" columns={3}>
            <FilterFigure icon={Clock} label="En attente" value={data?.counts.pending} loading={isPending} onSelect={() => toggle("en-attente")} pressed={statusParam === "en-attente"} />
            <FilterFigure icon={ScanLine} label="En cours de contrôle" value={data?.counts.inProgress} loading={isPending} onSelect={() => toggle("en-controle")} pressed={statusParam === "en-controle"} />
            <FilterFigure icon={CheckCircle2} label="Terminées (30 derniers jours)" value={data?.counts.completedLast30Days} loading={isPending} />
          </KpiGrid>

          <Toolbar
            collapseFilters="narrow"
            search={<ToolbarSearch value={address.typed} onValueChange={address.setTyped} onSubmit={address.submitSearch} label="Rechercher une réception, un produit…" />}
            activeFilterCount={[statusParam, warehouse, address.from, address.to].filter(Boolean).length}
            onResetFilters={reset}
            filters={
              <>
                <ToolbarFilter
                  label="Statut"
                  hideLabelInline
                  value={statusParam}
                  onValueChange={(value) => address.update({ statut: value || null })}
                  options={[{ value: "", label: "Tous les statuts" }, ...suguBoxInboundStatus.options().map((option) => ({ value: paramOf(String(option.value)), label: option.label }))]}
                />
                <ToolbarFilter
                  label="Entrepôt"
                  hideLabelInline
                  value={warehouse}
                  onValueChange={(value) => address.update({ entrepot: value || null })}
                  options={[{ value: "", label: "Tous les entrepôts" }, ...(options?.warehouses ?? []).map((entry) => ({ value: entry.id, label: entry.name }))]}
                />
                <DayFilter label="Du" value={address.from} max={address.to || undefined} onValueChange={(value) => address.update({ du: value || null })} />
                <DayFilter label="Au" value={address.to} min={address.from || undefined} onValueChange={(value) => address.update({ au: value || null })} />
              </>
            }
          />

          {address.rangeError && <Alert tone="warning" title={address.rangeError} />}

          <DataTable
            caption="Réceptions"
            columns={columns}
            rows={data?.rows ?? []}
            getRowId={(row) => row.id}
            state={isPending ? "loading" : "ready"}
            refreshing={isFetching}
            sort={SORTS[sortParam]?.state ?? NEWEST}
            onSortChange={onSort}
            rowActionsLabel="Actions"
            mobileRowActions="footer"
            rowActions={(row) => (
              <Button asChild variant="outline" icon={Eye}>
                <Link href={BOX.reception(row.id)} aria-label={`Voir la réception ${row.reference}`}>
                  Voir
                </Link>
              </Button>
            )}
            empty={
              narrowed
                ? { icon: PackageSearch, title: "Aucune réception ne correspond", description: "Modifiez la recherche, le statut ou les dates.", action: <Button onClick={reset}>Tout afficher</Button> }
                : { icon: PackageOpen, title: "Aucune réception", description: "Quand vous déposez des produits à l'entrepôt Sugu, la réception apparaît ici avec son contrôle." }
            }
            pagination={
              data && data.total > 0
                ? { page: data.page, pageSize: data.pageSize, total: data.total, onPageChange: address.setPage, variant: "numbered", pageSizeOptions: [...PAGE_SIZES], onPageSizeChange: address.setPageSize, itemLabel: "réceptions" }
                : undefined
            }
          />
        </>
      )}
    </BoxPage>
  );
}
