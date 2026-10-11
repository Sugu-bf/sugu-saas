"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Boxes, Eye, LayoutGrid, List, MoreHorizontal, PackagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  Button,
  ButtonGroup,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  IconButton,
  Money,
  PageHeader,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toolbar,
  ToolbarCount,
  ToolbarFilter,
  ToolbarSearch,
  productStatus,
  type DataTableColumn,
  type SortState,
} from "@/design-system";
import { loadStateOf } from "@/lib/query/load-state";
import { replaceUrlQuery } from "@/lib/utils/replace-url-query";
import { PRODUCTS_PAGE_SIZE, type ProductListFilters, type ProductSortKey } from "@/features/vendor/catalog/api";
import { ProductThumb, StockCell, formatUnits } from "@/features/vendor/catalog/components/product-bits";
import { ProductGrid } from "@/features/vendor/catalog/components/product-grid";
import { PRODUCT_STATUS_CODES, type ProductListItem, type StockLevel } from "@/features/vendor/catalog/contract";
import { describeFailure } from "@/features/vendor/catalog/errors";
import { useDeleteProduct, useProductCounts, useProducts } from "@/features/vendor/catalog/hooks";
import { useProductsView } from "@/features/vendor/catalog/view-preference";
import { DEFAULT_LIST_STATE, readListState, writeListState, type ListState } from "./list-state";

/** Tabs always shown; the other statuses get a tab only when they hold products. */
const MAIN_TABS = ["active", "draft", "submitted"] as const;

const STOCK_OPTIONS: { value: StockLevel | ""; label: string }[] = [
  { value: "", label: "Tous les niveaux" },
  { value: "in_stock", label: "En stock" },
  { value: "low_stock", label: "Stock faible" },
  { value: "out_of_stock", label: "Rupture" },
];

/**
 * The orders a seller asks for, by name. The table headers set the same two
 * values; this list is the way to sort the grid, and either view on a phone.
 */
const SORT_OPTIONS: { value: string; label: string; sort: ProductSortKey; direction: "asc" | "desc" }[] = [
  { value: "created-desc", label: "Plus récents", sort: "created", direction: "desc" },
  { value: "created-asc", label: "Plus anciens", sort: "created", direction: "asc" },
  { value: "name-asc", label: "Nom, de A à Z", sort: "name", direction: "asc" },
  { value: "name-desc", label: "Nom, de Z à A", sort: "name", direction: "desc" },
  { value: "price-asc", label: "Prix croissant", sort: "price", direction: "asc" },
  { value: "price-desc", label: "Prix décroissant", sort: "price", direction: "desc" },
  { value: "stock-asc", label: "Stock croissant", sort: "stock", direction: "asc" },
  { value: "stock-desc", label: "Stock décroissant", sort: "stock", direction: "desc" },
];

/** Table column ↔ sort key of the API. */
const SORT_COLUMN: Record<ProductSortKey, string> = { created: "created", name: "product", price: "price", stock: "stock" };
const SORT_KEY: Record<string, ProductSortKey> = { created: "created", product: "name", price: "price", stock: "stock" };

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

function formatDay(iso: string | null): string {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime()) ? DAY.format(date) : "—";
}

const COLUMNS: DataTableColumn<ProductListItem>[] = [
  {
    id: "product",
    header: "Produit",
    mobile: "title",
    sortable: true,
    cell: (product) => (
      <span className="flex min-w-0 items-center gap-3">
        <ProductThumb src={product.image} />
        <span className="min-w-0">
          <Link
            href={`/vendor/products/${product.id}`}
            className="line-clamp-2 rounded-compact font-medium break-words text-foreground underline-offset-2 hover:underline"
          >
            {product.name}
          </Link>
          <span className="block truncate text-meta text-foreground-muted">
            {product.sku}
            {/* Narrow tables have no category column: it is said here. */}
            {product.category && (
              <span className="hidden @2xl:inline @4xl:hidden">
                {product.sku && " · "}
                {product.category}
              </span>
            )}
          </span>
        </span>
      </span>
    ),
  },
  // Tablet composition (container 672 to 896px): product, status, stock,
  // price and actions. Category and creation date join as room allows.
  {
    id: "category",
    header: "Catégorie",
    mobile: "detail",
    className: "hidden @4xl:table-cell",
    cell: (product) => product.category ?? <span className="text-foreground-muted">Sans catégorie</span>,
  },
  {
    id: "status",
    header: "Statut",
    mobile: "badge",
    cell: (product) => <StatusBadge domain="product" code={product.status} />,
  },
  {
    id: "stock",
    header: "Stock",
    numeric: true,
    sortable: true,
    cell: (product) => <StockCell stock={product.stock} level={product.stockLevel} />,
  },
  {
    id: "price",
    header: "Prix",
    numeric: true,
    sortable: true,
    cell: (product) => (
      <span className="inline-flex flex-col items-end">
        <Money francs={product.priceFrancs} className="font-medium" />
        {product.hasVariants && <span className="text-meta text-foreground-muted">Avec variantes</span>}
      </span>
    ),
  },
  {
    id: "created",
    header: "Créé le",
    sortable: true,
    mobile: "detail",
    className: "hidden whitespace-nowrap @5xl:table-cell",
    cell: (product) => <span className="tabular-nums">{formatDay(product.createdAt)}</span>,
  },
];

/** How many products the catalogue holds, next to the page title. */
function CatalogueSize({ total }: { total: number | undefined }) {
  if (total === undefined) return null;
  return (
    <span className="text-section-title font-normal text-foreground-muted tabular-nums">
      ({formatUnits(total)} produit{total > 1 ? "s" : ""})
    </span>
  );
}

export function ProductsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The list state lives here and is mirrored in the URL: a reload, a shared
  // link or "back" from a product lands on the same tab, search, filter, sort
  // and page. Local state first, so two quick changes never lose one.
  const [state, setListState] = useState<ListState>(() => readListState(searchParams));
  const setState = useCallback((patch: Partial<ListState>) => {
    // Any change but the page itself goes back to the first page.
    setListState((current) => ({ ...current, page: 1, ...patch }));
  }, []);

  const query = writeListState(state).toString();
  const urlQuery = writeListState(readListState(searchParams)).toString();
  const writtenQuery = useRef(urlQuery);

  useEffect(() => {
    if (query === writtenQuery.current) return;
    writtenQuery.current = query;
    replaceUrlQuery(pathname, query);
  }, [pathname, query]);

  useEffect(() => {
    // The URL changed from outside (back, forward, a link): follow it.
    if (urlQuery === writtenQuery.current) return;
    writtenQuery.current = urlQuery;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL is the external system being followed
    setListState(readListState(new URLSearchParams(urlQuery)));
  }, [urlQuery]);

  // The search box follows the applied search (cleared filters, back button)
  // without losing what is being typed.
  const [searchInput, setSearchInput] = useState(state.search);
  const [appliedSearch, setAppliedSearch] = useState(state.search);
  if (appliedSearch !== state.search) {
    setAppliedSearch(state.search);
    setSearchInput(state.search);
  }

  const filters: ProductListFilters = useMemo(
    () => ({
      status: state.status || undefined,
      stock: state.stock || undefined,
      search: state.search || undefined,
      sort: state.sort,
      direction: state.direction,
    }),
    [state],
  );

  const products = useProducts({ ...filters, page: state.page });
  const counts = useProductCounts();
  const remove = useDeleteProduct();
  const [toDelete, setToDelete] = useState<ProductListItem | null>(null);
  const [view, setView] = useProductsView();

  const page = products.data;
  const loadState = loadStateOf(products);
  const narrowed = Boolean(state.status || state.search || state.stock);
  const showAll = () => setState({ status: "", search: "", stock: "" });

  const tabs = useMemo(() => {
    const byStatus = counts.data?.byStatus ?? {};
    const extra = PRODUCT_STATUS_CODES.filter(
      (code) => !MAIN_TABS.includes(code as (typeof MAIN_TABS)[number]) && ((byStatus[code] ?? 0) > 0 || state.status === code),
    );
    return [...MAIN_TABS, ...extra];
  }, [counts.data, state.status]);

  async function deleteProduct(product: ProductListItem) {
    try {
      await remove.mutateAsync(product.id);
      toast.success(`« ${product.name} » a été supprimé.`);
    } catch (error) {
      toast.error(describeFailure(error).message);
      // Keeps the dialog open; the list is refetched by the mutation.
      throw error;
    }
  }

  const sort: SortState = { columnId: SORT_COLUMN[state.sort], direction: state.direction };

  // One menu for both views; on a picture it needs a surface of its own.
  const productMenu = (product: ProductListItem, onPicture = false) => (
    <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions pour ${product.name}`} variant={onPicture ? "secondary" : "quiet"} />}>
      <DropdownMenuItem icon={Eye} onSelect={() => router.push(`/vendor/products/${product.id}`)}>
        Ouvrir la fiche
      </DropdownMenuItem>
      <DropdownMenuItem icon={Pencil} onSelect={() => router.push(`/vendor/products/${product.id}/edit`)}>
        Modifier
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem icon={Trash2} tone="danger" onSelect={() => setToDelete(product)}>
        Supprimer
      </DropdownMenuItem>
    </DropdownMenu>
  );

  const loadError = {
    title: "Les produits n'ont pas pu être chargés",
    description: describeFailure(products.error).message,
    onRetry: () => products.refetch(),
    retrying: products.isFetching,
  };

  const emptyList = narrowed
    ? {
        title: "Aucun produit ne correspond",
        description: "Modifiez la recherche ou les filtres pour élargir les résultats.",
        action: (
          <Button icon={X} onClick={showAll}>
            Tout afficher
          </Button>
        ),
      }
    : {
        icon: PackagePlus,
        title: "Votre catalogue est vide",
        description: "Ajoutez votre premier produit pour le proposer aux acheteurs.",
        action: (
          <Button asChild variant="primary" icon={Plus}>
            <Link href="/vendor/products/new">Nouveau produit</Link>
          </Button>
        ),
      };

  const pagination = {
    page: state.page,
    pageSize: page?.pageSize ?? PRODUCTS_PAGE_SIZE,
    total: page?.total ?? 0,
    onPageChange: (next: number) => setState({ page: next }),
    itemLabel: "produits",
  };

  return (
    <div className="sugu-ui mx-auto flex w-full max-w-7xl flex-col gap-4">
      <PageHeader
        title="Produits"
        titleAddon={<CatalogueSize total={counts.data?.total} />}
        primaryAction={{ label: "Nouveau produit", icon: Plus, href: "/vendor/products/new" }}
        secondaryActions={[{ label: "Inventaire", icon: Boxes, href: "/vendor/inventory" }]}
      />

      <Tabs value={state.status || "all"} onValueChange={(value) => setState({ status: value === "all" ? "" : value })}>
        <TabsList label="Filtrer les produits par statut" variant="pills">
          <TabsTrigger value="all" count={counts.data?.total}>
            Tous
          </TabsTrigger>
          {tabs.map((code) => {
            const status = productStatus.resolve(code);
            return (
              <TabsTrigger key={code} value={code} count={counts.data?.byStatus[code]} tone={status.tone}>
                {status.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={state.status || "all"} className="flex flex-col gap-3">
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
              <>
                <ToolbarFilter
                  label="Stock"
                  value={state.stock}
                  onValueChange={(value) => setState({ stock: value as StockLevel | "" })}
                  options={STOCK_OPTIONS.map((option) => {
                    const count = option.value ? counts.data?.byStock[option.value] : undefined;
                    return count === undefined ? option : { ...option, label: `${option.label} (${count})` };
                  })}
                />
                <ToolbarFilter
                  label="Trier par"
                  value={`${state.sort}-${state.direction}`}
                  onValueChange={(value) => {
                    const option = SORT_OPTIONS.find((candidate) => candidate.value === value);
                    if (option) setState({ sort: option.sort, direction: option.direction });
                  }}
                  options={SORT_OPTIONS}
                />
              </>
            }
            activeFilterCount={state.stock ? 1 : 0}
            onResetFilters={() => setState({ stock: "", sort: DEFAULT_LIST_STATE.sort, direction: DEFAULT_LIST_STATE.direction })}
            // The size of the catalogue is next to the title: this row counts what a filter leaves.
            count={<ToolbarCount total={narrowed ? page?.total : undefined} noun={{ one: "produit", other: "produits" }} />}
            countAction={
              narrowed ? (
                <Button variant="quiet" size="compact" icon={X} onClick={showAll}>
                  Tout afficher
                </Button>
              ) : undefined
            }
            view={
              <ButtonGroup label="Affichage des produits">
                <IconButton icon={LayoutGrid} label="Vue en grille" variant="secondary" aria-pressed={view === "grid"} onClick={() => setView("grid")} />
                <IconButton icon={List} label="Vue en liste" variant="secondary" aria-pressed={view === "list"} onClick={() => setView("list")} />
              </ButtonGroup>
            }
          />

          {view === "grid" ? (
            <ProductGrid
              products={page?.rows ?? []}
              state={loadState}
              refreshing={products.isFetching && loadState === "ready"}
              error={loadError}
              empty={emptyList}
              actions={(product) => productMenu(product, true)}
              pagination={pagination}
            />
          ) : (
            <DataTable
              caption="Produits"
              columns={COLUMNS}
              rows={page?.rows ?? []}
              getRowId={(product) => product.id}
              state={loadState}
              refreshing={products.isFetching && loadState === "ready"}
              error={loadError}
              empty={emptyList}
              sort={sort}
              onSortChange={(next) => setState({ sort: SORT_KEY[next.columnId] ?? "created", direction: next.direction })}
              rowActions={(product) => productMenu(product)}
              pagination={pagination}
            />
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Supprimer « ${toDelete?.name ?? ""} » ?`}
        description="Le produit est retiré de votre catalogue et n'est plus proposé aux acheteurs. Les commandes déjà passées ne changent pas."
        confirmLabel="Supprimer le produit"
        confirmIcon={Trash2}
        cancelLabel="Garder le produit"
        tone="danger"
        onConfirm={() => (toDelete ? deleteProduct(toDelete) : undefined)}
      />
    </div>
  );
}
