"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Boxes, Download, PackagePlus, Plus, SlidersHorizontal, X } from "lucide-react";
import {
  Button,
  DataTable,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toolbar,
  ToolbarCount,
  ToolbarSearch,
  stockStatus,
  type DataTableColumn,
  type SortState,
} from "@/design-system";
import { loadStateOf } from "@/lib/query/load-state";
import { formatOrderDateShort } from "@/features/vendor/orders/components/order-bits";
import { INVENTORY_PAGE_SIZE, exportInventoryCsv, type InventoryFilters, type InventorySortKey } from "@/features/vendor/catalog/api";
import { ProductThumb, StockCell, formatUnits } from "@/features/vendor/catalog/components/product-bits";
import { StockAdjustDialog } from "@/features/vendor/catalog/components/stock-adjust-dialog";
import { STOCK_LEVELS, type InventoryRow, type StockLevel } from "@/features/vendor/catalog/contract";
import { describeFailure } from "@/features/vendor/catalog/errors";
import { useInventory, useProductCounts } from "@/features/vendor/catalog/hooks";
import { variantLabel } from "@/features/vendor/catalog/stock";
import { readListState, writeListState, type ListState } from "./list-state";

const SORT_COLUMN: Record<InventorySortKey, string> = { updated: "updated", name: "product", stock: "stock" };
const SORT_KEY: Record<string, InventorySortKey> = { updated: "updated", product: "name", stock: "stock" };

/** Stock of each variant when a product has several; nothing for a simple product. */
function VariantStocks({ row }: { row: InventoryRow }) {
  const variants = row.variants ?? [];
  if (variants.length < 2) return <span className="text-foreground-muted">—</span>;
  return (
    <ul className="flex flex-col gap-0.5 text-meta text-foreground-muted">
      {variants.map((variant) => (
        <li key={variant.id} className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 break-words">
            {variantLabel(variant)}
            {!variant.isActive && " (désactivée)"}
          </span>
          <span className="shrink-0 text-foreground tabular-nums">{formatUnits(variant.stock)}</span>
        </li>
      ))}
    </ul>
  );
}

const COLUMNS: DataTableColumn<InventoryRow>[] = [
  {
    id: "product",
    header: "Produit",
    mobile: "title",
    sortable: true,
    className: "@2xl:min-w-64",
    cell: (row) => (
      <span className="flex min-w-0 items-center gap-3">
        <ProductThumb src={row.image} />
        <span className="min-w-0">
          <Link
            href={`/vendor/products/${row.id}`}
            className="line-clamp-2 rounded-compact font-medium break-words text-foreground underline-offset-2 hover:underline"
          >
            {row.name}
          </Link>
          {row.sku && <span className="block text-meta text-foreground-muted">{row.sku}</span>}
        </span>
      </span>
    ),
  },
  {
    id: "category",
    header: "Catégorie",
    mobile: "subtitle",
    cell: (row) => row.category ?? <span className="text-foreground-muted">Sans catégorie</span>,
  },
  {
    id: "stock",
    header: "Stock",
    numeric: true,
    sortable: true,
    cell: (row) => <StockCell stock={row.stock} level={row.stockLevel} />,
  },
  {
    id: "variants",
    header: "Par variante",
    className: "@2xl:min-w-48",
    cell: (row) => <VariantStocks row={row} />,
  },
  {
    id: "updated",
    header: "Mis à jour",
    sortable: true,
    mobile: "hidden",
    className: "whitespace-nowrap",
    cell: (row) => <span className="tabular-nums">{formatOrderDateShort(row.updatedAt)}</span>,
  },
];

export function InventoryContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Same rule as the product list: local state first, mirrored in the URL.
  const [state, setListState] = useState<ListState>(() => readListState(searchParams));
  const setState = useCallback((patch: Partial<ListState>) => {
    setListState((current) => ({ ...current, page: 1, ...patch }));
  }, []);

  const query = writeListState(state).toString();
  const urlQuery = writeListState(readListState(searchParams)).toString();
  const writtenQuery = useRef(urlQuery);

  useEffect(() => {
    if (query === writtenQuery.current) return;
    writtenQuery.current = query;
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, query, router]);

  useEffect(() => {
    if (urlQuery === writtenQuery.current) return;
    writtenQuery.current = urlQuery;
    setListState(readListState(new URLSearchParams(urlQuery)));
  }, [urlQuery]);

  const [searchInput, setSearchInput] = useState(state.search);
  const [appliedSearch, setAppliedSearch] = useState(state.search);
  if (appliedSearch !== state.search) {
    setAppliedSearch(state.search);
    setSearchInput(state.search);
  }

  const filters: InventoryFilters = useMemo(
    () => ({ level: state.level || undefined, search: state.search || undefined, sort: state.sort, direction: state.direction }),
    [state],
  );

  const inventory = useInventory({ ...filters, page: state.page });
  // Same counters as the product list: one definition of each stock level.
  const counts = useProductCounts();
  const [adjusting, setAdjusting] = useState<InventoryRow | null>(null);
  const [exporting, setExporting] = useState(false);

  const page = inventory.data;
  const loadState = loadStateOf(inventory);
  const narrowed = Boolean(state.level || state.search);
  const showAll = () => setState({ level: "", search: "" });

  async function runExport() {
    setExporting(true);
    try {
      await exportInventoryCsv();
      toast.success("Export de l'inventaire téléchargé.");
    } catch (error) {
      toast.error(`Export impossible. ${describeFailure(error).message}`);
    } finally {
      setExporting(false);
    }
  }

  const sort: SortState = { columnId: SORT_COLUMN[state.sort], direction: state.direction };

  return (
    <div className="sugu-ui mx-auto flex w-full max-w-7xl flex-col gap-4">
      <PageHeader
        title="Inventaire"
        description="Le stock de chaque produit et de ses variantes. Les ventes le diminuent automatiquement."
        primaryAction={{ label: "Nouveau produit", icon: Plus, href: "/vendor/products/new" }}
        secondaryActions={[
          { label: "Exporter en CSV", icon: Download, onSelect: runExport, loading: exporting, disabled: exporting },
          { label: "Produits", icon: Boxes, href: "/vendor/products" },
        ]}
      />

      <Tabs value={state.level || "all"} onValueChange={(value) => setState({ level: value === "all" ? "" : (value as StockLevel) })}>
        <TabsList label="Filtrer l'inventaire par niveau de stock">
          <TabsTrigger value="all" count={counts.data?.total}>
            Tous
          </TabsTrigger>
          {STOCK_LEVELS.map((level) => (
            <TabsTrigger key={level} value={level} count={counts.data?.byStock[level]}>
              {stockStatus.resolve(level).label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={state.level || "all"} className="flex flex-col gap-3">
          <Toolbar
            search={
              <ToolbarSearch
                label="Nom ou référence (SKU)"
                value={searchInput}
                onValueChange={setSearchInput}
                onSubmit={(value) => setState({ search: value.trim() })}
              />
            }
            count={<ToolbarCount total={page?.total} noun={{ one: "produit", other: "produits" }} />}
            actions={
              narrowed ? (
                <Button variant="quiet" icon={X} onClick={showAll}>
                  Tout afficher
                </Button>
              ) : undefined
            }
          />

          <DataTable
            caption="Inventaire"
            columns={COLUMNS}
            rows={page?.rows ?? []}
            getRowId={(row) => row.id}
            state={loadState}
            refreshing={inventory.isFetching && loadState === "ready"}
            error={{
              title: "L'inventaire n'a pas pu être chargé",
              description: describeFailure(inventory.error).message,
              onRetry: () => inventory.refetch(),
              retrying: inventory.isFetching,
            }}
            empty={
              narrowed
                ? {
                    title: "Aucun produit ne correspond",
                    description: "Modifiez la recherche ou le niveau de stock pour élargir les résultats.",
                    action: (
                      <Button icon={X} onClick={showAll}>
                        Tout afficher
                      </Button>
                    ),
                  }
                : {
                    icon: PackagePlus,
                    title: "Aucun produit en inventaire",
                    description: "Le stock de vos produits apparaîtra ici dès que vous en aurez créé un.",
                    action: (
                      <Button asChild variant="primary" icon={Plus}>
                        <Link href="/vendor/products/new">Nouveau produit</Link>
                      </Button>
                    ),
                  }
            }
            sort={sort}
            onSortChange={(next) => setState({ sort: SORT_KEY[next.columnId] ?? "updated", direction: next.direction })}
            rowActions={(row) => (
              <Button icon={SlidersHorizontal} aria-label={`Ajuster le stock de ${row.name}`} onClick={() => setAdjusting(row)}>
                Ajuster
              </Button>
            )}
            pagination={{
              page: state.page,
              pageSize: page?.pageSize ?? INVENTORY_PAGE_SIZE,
              total: page?.total ?? 0,
              onPageChange: (next) => setState({ page: next }),
              itemLabel: "produits",
            }}
          />
        </TabsContent>
      </Tabs>

      <StockAdjustDialog row={adjusting} onClose={() => setAdjusting(null)} />
    </div>
  );
}
