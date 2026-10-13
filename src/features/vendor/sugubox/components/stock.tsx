"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftRight, BarChart3, Boxes, Download, MoreHorizontal, PackageSearch } from "lucide-react";
import { Button, Card, DataTable, DropdownMenu, DropdownMenuItem, IconButton, PageHeader, StatusBadge, Toolbar, ToolbarFilter, ToolbarSearch, type DataTableColumn } from "@/design-system";
import { exportStock } from "../api";
import type { StockItem } from "../contract";
import { useBoardFilters, useListAddress, useStock } from "../hooks";
import { BOX, BOX_CRUMB, BinChip, BoxPage, PageFailure, ProductCell, describeFailure, formatDayTime, formatUnits } from "./bits";

// "Mon stock", after its mock-up: what the Sugu warehouse holds of each
// article, what open expeditions still have to take, what is left. Search,
// state, warehouse, order and pages are the server's.

const PAGE_SIZES = [25, 50, 100] as const;

/** The states in the address, in French: `?etat=rupture`. */
const STATE_PARAM: Record<string, string> = { "en-stock": "in_stock", "stock-faible": "low_stock", rupture: "out_of_stock", alertes: "alerts" };
const STATE_OPTIONS = [
  { value: "", label: "Tous" },
  { value: "en-stock", label: "En stock" },
  { value: "stock-faible", label: "Stock faible" },
  { value: "rupture", label: "Rupture" },
  { value: "alertes", label: "Toutes les alertes" },
];

const SORT_PARAM: Record<string, string> = { "nom-desc": "-name", disponible: "available", "disponible-desc": "-available", recent: "-last_movement" };
const SORT_OPTIONS = [
  { value: "", label: "Produit A → Z" },
  { value: "nom-desc", label: "Produit Z → A" },
  { value: "disponible", label: "Disponible croissant" },
  { value: "disponible-desc", label: "Disponible décroissant" },
  { value: "recent", label: "Dernier mouvement" },
];

/** The last movement of an article, in the words of its column. */
const LAST_MOVEMENT: Record<string, string> = { inbound: "Entrée de stock", outbound: "Sortie de stock", transfer: "Transfert", adjustment: "Ajustement" };

const movementsOf = (item: StockItem) => `${BOX.movements}?q=${encodeURIComponent(item.sku ?? item.name)}`;

export function SuguBoxStock() {
  const router = useRouter();
  const address = useListAddress(PAGE_SIZES);
  const state = address.get("etat") in STATE_PARAM ? address.get("etat") : "";
  const sort = address.get("tri") in SORT_PARAM ? address.get("tri") : "";
  const warehouse = address.get("entrepot");
  const [exporting, setExporting] = useState(false);

  const filters = { search: address.search, state: STATE_PARAM[state], warehouseId: warehouse || undefined, sort: SORT_PARAM[sort] };
  const { data, isError, error, refetch, isFetching, isPending } = useStock({ ...filters, page: address.page, pageSize: address.pageSize });
  const options = useBoardFilters().data;
  const narrowed = Boolean(address.search || state || warehouse);

  const download = async () => {
    setExporting(true);
    try {
      await exportStock(filters);
      toast.success("Le fichier du stock a été téléchargé.");
    } catch (failure) {
      toast.error(describeFailure(failure));
    } finally {
      setExporting(false);
    }
  };

  const columns: DataTableColumn<StockItem>[] = [
    { id: "product", header: "Produit", mobile: "title", cell: (row) => <ProductCell name={row.name} variant={row.variant} imageUrl={row.imageUrl} /> },
    { id: "sku", header: "SKU", mobile: "subtitle", cell: (row) => (row.sku ? <BinChip code={row.sku} /> : "—"), mobileCell: (row) => row.sku, className: "hidden @4xl:table-cell" },
    {
      id: "bins",
      header: "Casier",
      cell: (row) =>
        row.bins.length === 0 ? (
          <span className="text-foreground-muted">—</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {row.bins.map((bin) => (
              <span key={`${bin.warehouse}-${bin.code}`} title={`${bin.warehouse} : ${formatUnits(bin.qty)} en casier ${bin.code}`}>
                <BinChip code={bin.code} />
              </span>
            ))}
          </span>
        ),
    },
    { id: "available", header: "Disponible", numeric: true, cell: (row) => <span className="font-semibold text-foreground">{formatUnits(row.available)}</span> },
    { id: "reserved", header: "Réservé", numeric: true, cell: (row) => formatUnits(row.reserved) },
    { id: "total", header: "Total", numeric: true, cell: (row) => formatUnits(row.total) },
    { id: "state", header: "Statut", mobile: "badge", cell: (row) => <StatusBadge domain="stock" code={row.state} /> },
    {
      id: "last",
      header: "Dernier mouvement",
      mobile: "detail",
      className: "hidden @5xl:table-cell",
      cell: (row) =>
        row.lastMovement ? (
          <span className="block min-w-0">
            <span className="block text-foreground">{LAST_MOVEMENT[row.lastMovement.type ?? ""] ?? row.lastMovement.label ?? "Mouvement"}</span>
            <span className="block text-meta whitespace-nowrap text-foreground-muted">{formatDayTime(row.lastMovement.at)}</span>
          </span>
        ) : (
          <span className="text-foreground-muted">Jamais reçu</span>
        ),
    },
  ];

  return (
    <BoxPage aria-busy={isFetching || undefined}>
      <PageHeader
        title="Mon stock"
        description="Consultez le stock de vos produits dans les entrepôts Sugu Box."
        breadcrumbs={[BOX_CRUMB, { label: "Mon stock" }]}
        secondaryActions={[{ label: "Exporter CSV", icon: Download, onSelect: download, loading: exporting, disabled: !data || data.total === 0 }]}
      />

      {isError && !data ? (
        <PageFailure error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <>
          <Card>
            <Toolbar
              collapseFilters="narrow"
              search={<ToolbarSearch value={address.typed} onValueChange={address.setTyped} onSubmit={address.submitSearch} label="Rechercher un produit, un SKU…" />}
              activeFilterCount={[state, warehouse, sort].filter(Boolean).length}
              onResetFilters={() => address.reset(["etat", "entrepot", "tri"])}
              filters={
                <>
                  <ToolbarFilter label="Statut du stock" value={state} onValueChange={(value) => address.update({ etat: value || null })} options={STATE_OPTIONS} />
                  <ToolbarFilter
                    label="Entrepôt"
                    hideLabelInline
                    value={warehouse}
                    onValueChange={(value) => address.update({ entrepot: value || null })}
                    options={[{ value: "", label: "Tous les entrepôts" }, ...(options?.warehouses ?? []).map((entry) => ({ value: entry.id, label: entry.name }))]}
                  />
                  <ToolbarFilter label="Trier par" value={sort} onValueChange={(value) => address.update({ tri: value || null })} options={SORT_OPTIONS} />
                </>
              }
            />
          </Card>

          <DataTable
            caption="Stock en entrepôt Sugu Box"
            columns={columns}
            rows={data?.rows ?? []}
            getRowId={(row) => row.id}
            state={isPending ? "loading" : "ready"}
            refreshing={isFetching}
            rowActionsLabel="Actions"
            rowActions={(row) => (
              <>
                <IconButton icon={BarChart3} label={`Voir les mouvements de ${row.name}`} onClick={() => router.push(movementsOf(row))} />
                <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Autres actions pour ${row.name}`} />}>
                  <DropdownMenuItem icon={ArrowLeftRight} onSelect={() => router.push(movementsOf(row))}>
                    Voir les mouvements
                  </DropdownMenuItem>
                  <DropdownMenuItem icon={PackageSearch} onSelect={() => router.push(`/vendor/products/${row.productId}`)}>
                    Ouvrir la fiche produit
                  </DropdownMenuItem>
                </DropdownMenu>
              </>
            )}
            empty={
              narrowed
                ? { icon: PackageSearch, title: "Aucun article ne correspond", description: "Modifiez la recherche ou les filtres.", action: <Button onClick={() => address.reset(["etat", "entrepot", "tri"])}>Tout afficher</Button> }
                : { icon: Boxes, title: "Aucun stock en entrepôt", description: "Dès que l'entrepôt Sugu reçoit vos produits, ils apparaissent ici avec leur casier." }
            }
            pagination={
              data && data.total > 0
                ? { page: data.page, pageSize: data.pageSize, total: data.total, onPageChange: address.setPage, variant: "numbered", pageSizeOptions: [...PAGE_SIZES], onPageSizeChange: address.setPageSize, itemLabel: "articles" }
                : undefined
            }
          />
        </>
      )}
    </BoxPage>
  );
}
