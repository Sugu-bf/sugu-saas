"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Download, Equal, ScrollText, SearchX } from "lucide-react";
import { Alert, Button, Card, DataTable, PageHeader, StatusBadge, Toolbar, ToolbarFilter, ToolbarSearch, suguBoxMovementType, type DataTableColumn } from "@/design-system";
import { DayFilter } from "@/features/finance/components/history";
import { exportMovements } from "../api";
import type { Movement, MovementType } from "../contract";
import { useBoardFilters, useListAddress, useMovements } from "../hooks";
import { BOX, BOX_CRUMB, BinChip, BoxPage, FilterFigure, KpiGrid, PageFailure, ProductCell, SignedQuantity, describeFailure, formatDay, formatSigned, formatTime, formatUnits, plural } from "./bits";

// "Mouvements", after its mock-up: the journal of the warehouse for the
// articles of the store. The quantity before and after is the one of the bin
// the movement touched, as the server computed it over the whole journal.

const PAGE_SIZES = [25, 50, 100] as const;

/** The types in the address, in French: `?type=entrees`. */
const TYPE_PARAM: Record<string, MovementType> = { entrees: "inbound", sorties: "outbound", ajustements: "adjustment", transferts: "transfer" };
const paramOf = (type: string) => Object.keys(TYPE_PARAM).find((key) => TYPE_PARAM[key] === type) ?? "";

const FIGURES = [
  { type: "inbound", label: "Entrées", icon: ArrowDownToLine },
  { type: "outbound", label: "Sorties", icon: ArrowUpFromLine },
  { type: "adjustment", label: "Ajustements", icon: Equal },
  { type: "transfer", label: "Transferts", icon: ArrowLeftRight },
] as const;

const columns: DataTableColumn<Movement>[] = [
  {
    id: "date",
    header: "Date",
    cell: (row) => (
      <time dateTime={row.at} className="block whitespace-nowrap">
        <span className="block text-foreground">{formatDay(row.at)}</span>
        <span className="block text-meta text-foreground-muted">{formatTime(row.at)}</span>
      </time>
    ),
    mobileCell: (row) => `${formatDay(row.at)} à ${formatTime(row.at)}`,
  },
  { id: "product", header: "Produit", mobile: "title", cell: (row) => <ProductCell name={row.name} variant={row.variant} imageUrl={row.imageUrl} /> },
  { id: "sku", header: "SKU", mobile: "subtitle", className: "hidden @5xl:table-cell", cell: (row) => <span className="whitespace-nowrap tabular-nums">{row.sku ?? "—"}</span> },
  { id: "type", header: "Type", mobile: "badge", cell: (row) => <StatusBadge domain="suguBoxMovement" code={row.type} /> },
  { id: "quantity", header: "Quantité", numeric: true, cell: (row) => <SignedQuantity value={row.quantity} /> },
  { id: "before", header: "Avant", numeric: true, mobile: "detail", className: "hidden @3xl:table-cell", cell: (row) => (row.before === null ? "—" : formatUnits(row.before)) },
  { id: "after", header: "Après", numeric: true, cell: (row) => (row.after === null ? "—" : formatUnits(row.after)) },
  { id: "bin", header: "Emplacement", cell: (row) => (row.bin ? <BinChip code={row.bin} /> : <span className="text-foreground-muted">—</span>), mobileCell: (row) => row.bin },
  { id: "by", header: "Utilisateur", mobile: "detail", className: "hidden @4xl:table-cell", cell: (row) => <span className="whitespace-nowrap">{row.by ?? "—"}</span>, mobileCell: (row) => row.by },
  {
    id: "reason",
    header: "Motif",
    mobile: "detail",
    className: "hidden @4xl:table-cell",
    cell: (row) => (
      <span className="block min-w-0">
        <span className="block text-foreground">{row.reason ?? "—"}</span>
        {row.document && (
          <Link href={row.document.kind === "inbound" ? BOX.reception(row.document.id) : BOX.expedition(row.document.id)} className="text-meta whitespace-nowrap text-primary tabular-nums underline-offset-4 hover:underline">
            {row.document.reference}
          </Link>
        )}
      </span>
    ),
    mobileCell: (row) => [row.reason, row.document?.reference].filter(Boolean).join(" · ") || null,
  },
];

export function SuguBoxMovements() {
  const address = useListAddress(PAGE_SIZES);
  const typeParam = address.get("type") in TYPE_PARAM ? address.get("type") : "";
  const warehouse = address.get("entrepot");
  const user = address.get("par");
  const [exporting, setExporting] = useState(false);

  const filters = {
    search: address.search,
    type: TYPE_PARAM[typeParam],
    warehouseId: warehouse || undefined,
    userId: user || undefined,
    from: address.rangeError ? undefined : address.from,
    to: address.rangeError ? undefined : address.to,
  };
  const { data, isError, error, refetch, isFetching, isPending } = useMovements({ ...filters, page: address.page, pageSize: address.pageSize });
  const options = useBoardFilters().data;
  const narrowed = Boolean(address.search || typeParam || warehouse || user || address.from || address.to);
  const reset = () => address.reset(["type", "entrepot", "par"]);

  const download = async () => {
    setExporting(true);
    try {
      await exportMovements(filters);
      toast.success("Le fichier des mouvements a été téléchargé.");
    } catch (failure) {
      toast.error(describeFailure(failure));
    } finally {
      setExporting(false);
    }
  };

  return (
    <BoxPage aria-busy={isFetching || undefined}>
      <PageHeader
        title="Mouvements"
        description="Consultez tous les mouvements de stock de vos produits dans Sugu Box."
        breadcrumbs={[BOX_CRUMB, { label: "Mouvements" }]}
        secondaryActions={[{ label: "Exporter", icon: Download, onSelect: download, loading: exporting, disabled: !data || data.total === 0 }]}
      />

      {isError && !data ? (
        <PageFailure error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <>
          <Card>
            <Toolbar
              collapseFilters="narrow"
              search={<ToolbarSearch value={address.typed} onValueChange={address.setTyped} onSubmit={address.submitSearch} label="Produit, SKU, casier…" />}
              activeFilterCount={[typeParam, warehouse, user, address.from, address.to].filter(Boolean).length}
              onResetFilters={reset}
              filters={
                <>
                  <ToolbarFilter
                    label="Type de mouvement"
                    hideLabelInline
                    value={typeParam}
                    onValueChange={(value) => address.update({ type: value || null })}
                    options={[{ value: "", label: "Tous les types" }, ...suguBoxMovementType.options().map((option) => ({ value: paramOf(String(option.value)), label: option.label }))]}
                  />
                  <ToolbarFilter
                    label="Entrepôt"
                    hideLabelInline
                    value={warehouse}
                    onValueChange={(value) => address.update({ entrepot: value || null })}
                    options={[{ value: "", label: "Tous les entrepôts" }, ...(options?.warehouses ?? []).map((entry) => ({ value: entry.id, label: entry.name }))]}
                  />
                  <ToolbarFilter
                    label="Utilisateur"
                    hideLabelInline
                    value={user}
                    onValueChange={(value) => address.update({ par: value || null })}
                    options={[{ value: "", label: "Tous les utilisateurs" }, ...(options?.users ?? []).map((entry) => ({ value: entry.id, label: entry.name ?? "Sans nom" }))]}
                  />
                  <DayFilter label="Du" value={address.from} max={address.to || undefined} onValueChange={(value) => address.update({ du: value || null })} />
                  <DayFilter label="Au" value={address.to} min={address.from || undefined} onValueChange={(value) => address.update({ au: value || null })} />
                </>
              }
            />
          </Card>

          <KpiGrid label="Mouvements par type" columns={4}>
            {FIGURES.map(({ type, label, icon }) => {
              const total = data?.totals[type];
              const param = paramOf(type);
              return (
                <FilterFigure
                  key={type}
                  icon={icon}
                  label={label}
                  value={total?.count}
                  hint={total ? (type === "transfer" ? plural(total.units, "article déplacé", "articles déplacés") : `${formatSigned(total.units)} ${Math.abs(total.units) > 1 ? "articles" : "article"}`) : undefined}
                  loading={isPending}
                  onSelect={() => address.update({ type: typeParam === param ? null : param })}
                  pressed={typeParam === param}
                />
              );
            })}
          </KpiGrid>

          {address.rangeError && <Alert tone="warning" title={address.rangeError} />}

          <DataTable
            caption="Mouvements de stock"
            density="compact"
            columns={columns}
            rows={data?.rows ?? []}
            getRowId={(row) => row.id}
            state={isPending ? "loading" : "ready"}
            refreshing={isFetching}
            empty={
              narrowed
                ? { icon: SearchX, title: "Aucun mouvement ne correspond", description: "Modifiez la recherche, le type, l'utilisateur ou les dates.", action: <Button onClick={reset}>Tout afficher</Button> }
                : { icon: ScrollText, title: "Aucun mouvement", description: "Chaque entrée, sortie, transfert ou ajustement de vos produits en entrepôt est inscrit ici." }
            }
            pagination={
              data && data.total > 0
                ? { page: data.page, pageSize: data.pageSize, total: data.total, onPageChange: address.setPage, variant: "numbered", pageSizeOptions: [...PAGE_SIZES], onPageSizeChange: address.setPageSize, itemLabel: "mouvements" }
                : undefined
            }
          />
        </>
      )}
    </BoxPage>
  );
}
