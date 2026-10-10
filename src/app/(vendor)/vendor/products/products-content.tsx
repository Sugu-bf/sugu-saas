"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Boxes, Eye, MoreHorizontal, PackagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  Button,
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
import { PRODUCTS_PAGE_SIZE, type ProductListFilters, type ProductSortKey } from "@/features/vendor/catalog/api";
import { ProductThumb, StockCell } from "@/features/vendor/catalog/components/product-bits";
import { PRODUCT_STATUS_CODES, type ProductListItem, type StockLevel } from "@/features/vendor/catalog/contract";
import { describeFailure } from "@/features/vendor/catalog/errors";
import { useDeleteProduct, useProductCounts, useProducts } from "@/features/vendor/catalog/hooks";
import { readListState, writeListState, type ListState } from "./list-state";

/** Tabs always shown; the other statuses get a tab only when they hold products. */
const MAIN_TABS = ["active", "draft", "submitted"] as const;

const STOCK_OPTIONS: { value: StockLevel | ""; label: string }[] = [
  { value: "", label: "Tous les niveaux" },
  { value: "in_stock", label: "En stock" },
  { value: "low_stock", label: "Stock faible" },
  { value: "out_of_stock", label: "Rupture" },
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
    className: "@2xl:min-w-64",
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
          {product.sku && <span className="block text-meta text-foreground-muted">{product.sku}</span>}
        </span>
      </span>
    ),
  },
  {
    id: "category",
    header: "Catégorie",
    mobile: "subtitle",
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
    mobile: "hidden",
    className: "whitespace-nowrap",
    cell: (product) => <span className="tabular-nums">{formatDay(product.createdAt)}</span>,
  },
];

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
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, query, router]);

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

  return (
    <div className="sugu-ui mx-auto flex w-full max-w-7xl flex-col gap-4">
      <PageHeader
        title="Produits"
        description="Le catalogue de votre boutique : statut de publication, prix et stock."
        primaryAction={{ label: "Nouveau produit", icon: Plus, href: "/vendor/products/new" }}
        secondaryActions={[{ label: "Inventaire", icon: Boxes, href: "/vendor/inventory" }]}
      />

      <Tabs value={state.status || "all"} onValueChange={(value) => setState({ status: value === "all" ? "" : value })}>
        <TabsList label="Filtrer les produits par statut">
          <TabsTrigger value="all" count={counts.data?.total}>
            Tous
          </TabsTrigger>
          {tabs.map((code) => (
            <TabsTrigger key={code} value={code} count={counts.data?.byStatus[code]}>
              {productStatus.resolve(code).label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={state.status || "all"} className="flex flex-col gap-3">
          <Toolbar
            search={
              <ToolbarSearch
                label="Nom ou référence (SKU)"
                value={searchInput}
                onValueChange={setSearchInput}
                onSubmit={(value) => setState({ search: value.trim() })}
              />
            }
            filters={
              <ToolbarFilter
                label="Stock"
                value={state.stock}
                onValueChange={(value) => setState({ stock: value as StockLevel | "" })}
                options={STOCK_OPTIONS.map((option) => {
                  const count = option.value ? counts.data?.byStock[option.value] : undefined;
                  return count === undefined ? option : { ...option, label: `${option.label} (${count})` };
                })}
              />
            }
            activeFilterCount={state.stock ? 1 : 0}
            onResetFilters={() => setState({ stock: "" })}
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
            caption="Produits"
            columns={COLUMNS}
            rows={page?.rows ?? []}
            getRowId={(product) => product.id}
            state={loadState}
            refreshing={products.isFetching && loadState === "ready"}
            error={{
              title: "Les produits n'ont pas pu être chargés",
              description: describeFailure(products.error).message,
              onRetry: () => products.refetch(),
              retrying: products.isFetching,
            }}
            empty={
              narrowed
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
                  }
            }
            sort={sort}
            onSortChange={(next) => setState({ sort: SORT_KEY[next.columnId] ?? "created", direction: next.direction })}
            rowActions={(product) => (
              <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions pour ${product.name}`} />}>
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
            )}
            pagination={{
              page: state.page,
              pageSize: page?.pageSize ?? PRODUCTS_PAGE_SIZE,
              total: page?.total ?? 0,
              onPageChange: (next) => setState({ page: next }),
              itemLabel: "produits",
            }}
          />
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
