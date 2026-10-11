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
  ToolbarFilter,
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
import { DEFAULT_LIST_STATE, readListState, writeListState, type ListState } from "./list-state";

/** The orders offered by name: the only way to sort the cards of a phone. */
const SORT_OPTIONS: { value: string; label: string; sort: InventorySortKey; direction: "asc" | "desc" }[] = [
  { value: "updated-desc", label: "Mis à jour récemment", sort: "updated", direction: "desc" },
  { value: "updated-asc", label: "Mis à jour il y a longtemps", sort: "updated", direction: "asc" },
  { value: "stock-asc", label: "Stock croissant", sort: "stock", direction: "asc" },
  { value: "stock-desc", label: "Stock décroissant", sort: "stock", direction: "desc" },
  { value: "name-asc", label: "Nom, de A à Z", sort: "name", direction: "asc" },
  { value: "name-desc", label: "Nom, de Z à A", sort: "name", direction: "desc" },
];

const SORT_COLUMN: Record<InventorySortKey, string> = { updated: "updated", name: "product", stock: "stock" };
const SORT_KEY: Record<string, InventorySortKey> = { updated: "updated", product: "name", stock: "stock" };

/** A product whose stock is spread over several variants. */
const hasSeveralVariants = (row: InventoryRow) => (row.variants ?? []).length > 1;

/** Stock of each variant. */
function VariantStocks({ row }: { row: InventoryRow }) {
  const variants = row.variants ?? [];
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
          {row.sku && <span className="block truncate text-meta text-foreground-muted">{row.sku}</span>}
        </span>
      </span>
    ),
  },
  // Tablet composition: product, stock, stock per variant and the action.
  {
    id: "category",
    header: "Catégorie",
    // On a phone the card is about the stock; the category is on the product page.
    mobile: "hidden",
    className: "hidden @5xl:table-cell",
    cell: (row) => row.category ?? <span className="text-foreground-muted">Sans catégorie</span>,
  },
  {
    id: "stock",
    header: "Stock",
    numeric: true,
    sortable: true,
    // The figure the page is about: top right of the phone card.
    mobile: "badge",
    cell: (row) => <StockCell stock={row.stock} level={row.stockLevel} />,
  },
  {
    id: "variants",
    header: "Par variante",
    className: "@2xl:min-w-44",
    cell: (row) => (hasSeveralVariants(row) ? <VariantStocks row={row} /> : <span className="text-foreground-subtle">—</span>),
    // A simple product has no line here: its stock is the figure above.
    mobileCell: (row) => (hasSeveralVariants(row) ? <VariantStocks row={row} /> : null),
  },
  {
    id: "updated",
    header: "Mis à jour",
    sortable: true,
    mobile: "hidden",
    className: "hidden whitespace-nowrap @4xl:table-cell",
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
        titleAddon={
          counts.data ? (
            <span className="text-section-title font-normal text-foreground-muted tabular-nums">
              ({formatUnits(counts.data.total)} produit{counts.data.total > 1 ? "s" : ""})
            </span>
          ) : undefined
        }
        description="Le stock de chaque produit et de ses variantes. Les ventes le diminuent automatiquement."
        primaryAction={{ label: "Nouveau produit", icon: Plus, href: "/vendor/products/new" }}
        secondaryActions={[
          { label: "Exporter en CSV", icon: Download, onSelect: runExport, loading: exporting, disabled: exporting },
          { label: "Produits", icon: Boxes, href: "/vendor/products" },
        ]}
      />

      <Tabs value={state.level || "all"} onValueChange={(value) => setState({ level: value === "all" ? "" : (value as StockLevel) })}>
        <TabsList label="Filtrer l'inventaire par niveau de stock" variant="pills">
          <TabsTrigger value="all" count={counts.data?.total}>
            Tous
          </TabsTrigger>
          {STOCK_LEVELS.map((level) => {
            const status = stockStatus.resolve(level);
            return (
              <TabsTrigger key={level} value={level} count={counts.data?.byStock[level]} tone={status.tone}>
                {status.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={state.level || "all"} className="flex flex-col gap-3">
          <Toolbar
            search={
              <ToolbarSearch
                label="Nom ou référence"
                value={searchInput}
                onValueChange={setSearchInput}
                onSubmit={(value) => setState({ search: value.trim() })}
              />
            }
            filters={
              <ToolbarFilter
                label="Trier par"
                value={`${state.sort}-${state.direction}`}
                onValueChange={(value) => {
                  const option = SORT_OPTIONS.find((candidate) => candidate.value === value);
                  if (option) setState({ sort: option.sort, direction: option.direction });
                }}
                options={SORT_OPTIONS}
              />
            }
            onResetFilters={() => setState({ sort: DEFAULT_LIST_STATE.sort, direction: DEFAULT_LIST_STATE.direction })}
            // The size of the catalogue is next to the title: this row counts what a filter leaves.
            count={narrowed ? <ToolbarCount total={page?.total} noun={{ one: "produit", other: "produits" }} /> : undefined}
            countAction={
              narrowed ? (
                <Button variant="quiet" size="compact" icon={X} onClick={showAll}>
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
            mobileRowActions="footer"
            rowActions={(row) => (
              <Button icon={SlidersHorizontal} aria-label={`Ajuster le stock de ${row.name}`} onClick={() => setAdjusting(row)}>
                <span className="@2xl:hidden">Ajuster le stock</span>
                <span className="hidden @2xl:inline">Ajuster</span>
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
