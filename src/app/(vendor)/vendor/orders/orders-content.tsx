"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Download, Eye, FileDown, MoreHorizontal, Plus, ShoppingBag, X } from "lucide-react";
import {
  Button,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  DropdownMenuItem,
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
  orderStatus,
  type DataTableColumn,
  type SortState,
} from "@/design-system";
import { loadStateOf } from "@/lib/query/load-state";
import {
  downloadDeliverySlip,
  exportOrdersCsv,
  type OrderListFilters,
  type OrderOrigin,
} from "@/features/vendor/orders/api";
import { ORDER_STATUS_CODES, type OrderListItem } from "@/features/vendor/orders/contract";
import {
  DirectSaleBadge,
  OrderPayment,
  formatOrderDateShort,
  orderLabel,
} from "@/features/vendor/orders/components/order-bits";
import { describeFailure } from "@/features/vendor/orders/errors";
import { useOrderAction, useOrderCounts, useOrders } from "@/features/vendor/orders/hooks";
import { periodBounds, readListState, writeListState, type ListState, type PeriodKey } from "./list-state";

/** Tabs always shown; the other statuses get a tab only when they hold orders. */
const MAIN_TABS = ["pending", "confirmed", "processing", "shipped", "delivered", "canceled"] as const;

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "", label: "Toutes les dates" },
  { value: "today", label: "Aujourd'hui" },
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "month", label: "Ce mois-ci" },
];

const ORIGIN_OPTIONS: { value: OrderOrigin | ""; label: string }[] = [
  { value: "", label: "Toutes" },
  { value: "marketplace", label: "Marketplace" },
  { value: "direct", label: "Vente directe" },
];

const SORT_COLUMN = { date: "placedAt", amount: "total" } as const;

const COLUMNS: DataTableColumn<OrderListItem>[] = [
  {
    id: "reference",
    header: "Commande",
    mobile: "title",
    cell: (order) => (
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link
          href={`/vendor/orders/${order.id}`}
          className="rounded-compact font-medium whitespace-nowrap text-foreground tabular-nums underline-offset-2 hover:underline"
        >
          {orderLabel(order.reference)}
        </Link>
        {order.isDirect && <DirectSaleBadge />}
      </span>
    ),
  },
  {
    id: "customer",
    header: "Client",
    mobile: "subtitle",
    cell: (order) => order.customerName ?? <span className="text-foreground-muted">Client non renseigné</span>,
  },
  {
    id: "placedAt",
    header: "Date",
    sortable: true,
    className: "whitespace-nowrap",
    cell: (order) => <span className="tabular-nums">{formatOrderDateShort(order.placedAt)}</span>,
  },
  {
    id: "items",
    header: "Articles",
    className: "@2xl:min-w-44",
    cell: (order) => (
      <span className="line-clamp-2 text-foreground-muted">{order.itemsSummary || `${order.itemCount} article(s)`}</span>
    ),
  },
  {
    id: "status",
    header: "Statut",
    mobile: "badge",
    cell: (order) => <StatusBadge domain="order" code={order.status} />,
  },
  {
    id: "payment",
    header: "Paiement",
    cell: (order) => (
      <OrderPayment paymentStatus={order.paymentStatus} codFlow={order.codFlow} codStep={order.codStep} />
    ),
  },
  {
    id: "total",
    header: "Montant",
    numeric: true,
    sortable: true,
    cell: (order) => <Money francs={order.totalFrancs} className="font-medium" />,
  },
];

export function OrdersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The list state lives here and is mirrored in the URL: a reload, a shared
  // link or "back" from a detail page lands on the same tab, search, filters,
  // sort and page. Local state first, so two quick changes never lose one.
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
    setListState(readListState(new URLSearchParams(urlQuery)));
  }, [urlQuery]);

  const [searchInput, setSearchInput] = useState(state.search);
  useEffect(() => setSearchInput(state.search), [state.search]);

  const filters: OrderListFilters = useMemo(
    () => ({
      status: state.status || undefined,
      search: state.search || undefined,
      origin: state.origin || undefined,
      ...periodBounds(state.period),
      sort: state.sort,
      direction: state.direction,
    }),
    [state],
  );

  const orders = useOrders({ ...filters, page: state.page });
  const counts = useOrderCounts();
  const action = useOrderAction();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState<"all" | "selection" | null>(null);
  const [toConfirm, setToConfirm] = useState<OrderListItem | null>(null);

  const page = orders.data;
  const loadState = loadStateOf(orders);
  const activeFilterCount = (state.origin ? 1 : 0) + (state.period ? 1 : 0);
  const narrowed = Boolean(state.status || state.search || activeFilterCount);

  const tabs = useMemo(() => {
    const byStatus = counts.data?.byStatus ?? {};
    const extra = ORDER_STATUS_CODES.filter(
      (code) => !MAIN_TABS.includes(code as (typeof MAIN_TABS)[number]) && ((byStatus[code] ?? 0) > 0 || state.status === code),
    );
    return [...MAIN_TABS, ...extra];
  }, [counts.data, state.status]);

  async function runExport(scope: "all" | "selection") {
    setExporting(scope);
    try {
      await exportOrdersCsv(filters, scope === "selection" ? selectedIds : undefined);
      toast.success(scope === "selection" ? "Sélection exportée." : "Export des commandes téléchargé.");
    } catch (error) {
      toast.error(`Export impossible. ${describeFailure(error).message}`);
    } finally {
      setExporting(null);
    }
  }

  async function downloadSlip(order: OrderListItem) {
    try {
      await downloadDeliverySlip(order.id, order.reference);
    } catch (error) {
      toast.error(`Bon de livraison indisponible. ${describeFailure(error).message}`);
    }
  }

  async function confirmOrder(order: OrderListItem) {
    try {
      await action.mutateAsync({ id: order.id, action: "confirm" });
      toast.success(`Commande ${orderLabel(order.reference)} confirmée.`);
    } catch (error) {
      toast.error(describeFailure(error).message);
      throw error;
    }
  }

  const sort: SortState = { columnId: SORT_COLUMN[state.sort], direction: state.direction };

  return (
    <div className="sugu-ui mx-auto flex w-full max-w-7xl flex-col gap-4">
      <PageHeader
        title="Commandes"
        description="Commandes de la marketplace et ventes directes de votre boutique."
        primaryAction={{ label: "Nouvelle vente", icon: Plus, href: "/vendor/orders/new" }}
        secondaryActions={[
          {
            label: "Exporter en CSV",
            icon: Download,
            onSelect: () => runExport("all"),
            loading: exporting === "all",
            disabled: exporting !== null,
          },
        ]}
      />

      <Tabs value={state.status || "all"} onValueChange={(value) => setState({ status: value === "all" ? "" : value })}>
        <TabsList label="Filtrer les commandes par statut">
          <TabsTrigger value="all" count={counts.data?.total}>
            Toutes
          </TabsTrigger>
          {tabs.map((code) => (
            <TabsTrigger key={code} value={code} count={counts.data?.byStatus[code]}>
              {orderStatus.resolve(code).label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={state.status || "all"} className="flex flex-col gap-3">
          <Toolbar
            search={
              <ToolbarSearch
                label="Numéro, client ou téléphone"
                value={searchInput}
                onValueChange={setSearchInput}
                onSubmit={(value) => setState({ search: value.trim() })}
              />
            }
            filters={
              <>
                <ToolbarFilter
                  label="Période"
                  value={state.period}
                  onValueChange={(value) => setState({ period: value as PeriodKey })}
                  options={PERIOD_OPTIONS}
                />
                <ToolbarFilter
                  label="Origine"
                  value={state.origin}
                  onValueChange={(value) => setState({ origin: value as OrderOrigin | "" })}
                  options={ORIGIN_OPTIONS}
                />
              </>
            }
            activeFilterCount={activeFilterCount}
            onResetFilters={() => setState({ origin: "", period: "" })}
            count={<ToolbarCount total={page?.total} noun={{ one: "commande", other: "commandes" }} selected={selectedIds.length} />}
            countAction={
              narrowed ? (
                <Button
                  variant="quiet"
                  size="compact"
                  icon={X}
                  onClick={() => setState({ status: "", search: "", origin: "", period: "" })}
                >
                  Tout afficher
                </Button>
              ) : undefined
            }
          />

          <DataTable
            caption="Commandes"
            columns={COLUMNS}
            rows={page?.rows ?? []}
            getRowId={(order) => order.id}
            state={loadState}
            refreshing={orders.isFetching && loadState === "ready"}
            error={{
              title: "Les commandes n'ont pas pu être chargées",
              description: describeFailure(orders.error).message,
              onRetry: () => orders.refetch(),
              retrying: orders.isFetching,
            }}
            empty={
              narrowed
                ? {
                    title: "Aucune commande ne correspond",
                    description: "Modifiez la recherche ou les filtres pour élargir les résultats.",
                    action: (
                      <Button icon={X} onClick={() => setState({ status: "", search: "", origin: "", period: "" })}>
                        Tout afficher
                      </Button>
                    ),
                  }
                : {
                    icon: ShoppingBag,
                    title: "Aucune commande pour le moment",
                    description: "Les commandes de la marketplace et vos ventes directes apparaîtront ici.",
                    action: (
                      <Button asChild variant="primary" icon={Plus}>
                        <Link href="/vendor/orders/new">Nouvelle vente</Link>
                      </Button>
                    ),
                  }
            }
            sort={sort}
            onSortChange={(next) =>
              setState({ sort: next.columnId === "total" ? "amount" : "date", direction: next.direction })
            }
            selection={{
              selectedIds,
              onChange: setSelectedIds,
              getRowLabel: (order) => `la commande ${orderLabel(order.reference)}`,
            }}
            bulkActions={() => (
              <Button
                size="compact"
                icon={Download}
                loading={exporting === "selection"}
                disabled={exporting !== null}
                onClick={() => runExport("selection")}
              >
                Exporter la sélection
              </Button>
            )}
            rowActions={(order) => (
              <DropdownMenu
                trigger={
                  <IconButton icon={MoreHorizontal} label={`Actions pour la commande ${orderLabel(order.reference)}`} />
                }
              >
                <DropdownMenuItem icon={Eye} onSelect={() => router.push(`/vendor/orders/${order.id}`)}>
                  Ouvrir la commande
                </DropdownMenuItem>
                {order.actions?.confirm && (
                  <DropdownMenuItem icon={CheckCircle2} onSelect={() => setToConfirm(order)}>
                    Confirmer la commande
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem icon={FileDown} onSelect={() => downloadSlip(order)}>
                  Bon de livraison (PDF)
                </DropdownMenuItem>
              </DropdownMenu>
            )}
            pagination={{
              page: state.page,
              pageSize: page?.pageSize ?? 25,
              total: page?.total ?? 0,
              onPageChange: (next) => setState({ page: next }),
              itemLabel: "commandes",
            }}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={toConfirm !== null}
        onOpenChange={(open) => !open && setToConfirm(null)}
        title={`Confirmer la commande ${orderLabel(toConfirm?.reference ?? null)} ?`}
        description="Vous confirmez que les articles sont disponibles. La commande passe à « Confirmée » et le client en est informé."
        confirmLabel="Confirmer la commande"
        confirmIcon={CheckCircle2}
        onConfirm={() => (toConfirm ? confirmOrder(toConfirm) : undefined)}
      />
    </div>
  );
}
