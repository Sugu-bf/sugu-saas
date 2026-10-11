"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CircleAlert,
  CircleCheck,
  Clock,
  Download,
  ListFilter,
  Package,
  Plus,
  SlidersHorizontal,
  Truck,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Alert,
  Button,
  DataTable,
  Dialog,
  DialogClose,
  DialogContent,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  Money,
  PageHeader,
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
  Stat,
  Toolbar,
  ToolbarFilter,
  ToolbarSearch,
  agencyDeliveryStatus,
  type DataTableColumn,
  type SortState,
} from "@/design-system";
import { loadStateOf } from "@/lib/query/load-state";
import { replaceUrlQuery } from "@/lib/utils/replace-url-query";
import { AssignCourierDialog } from "@/features/agency/components/assign-courier-dialog";
import {
  DeliveryActionDialogs,
  statusActionOf,
  type DeliveryIntent,
} from "@/features/agency/components/delivery-actions";
import { CourierIdentity, DeliveryLink, DeliveryPayment, DeliveryStatus, Destination, Recipient } from "@/features/agency/components/delivery-bits";
import { DeliveryRowActions } from "@/features/agency/components/delivery-row-actions";
import { AgencyPage, KpiRow, TodayLabel } from "@/features/agency/components/page";
import { useCouriers } from "@/features/agency/couriers/hooks";
import {
  BULK_LIMIT,
  DELIVERY_PAGE_SIZES,
  exportDeliveriesCsv,
  type DeliveryDateFilter,
  type DeliveryPriorityFilter,
  type DeliverySortKey,
} from "@/features/agency/deliveries/api";
import {
  DELIVERY_STATUS_CODES,
  deliveryLabel,
  type BulkOutcome,
  type DeliveryOverview,
  type DeliveryRow,
  type DeliveryScope,
} from "@/features/agency/deliveries/contract";
import { useBulkDeliveryAction, useDeliveries } from "@/features/agency/deliveries/hooks";
import { describeAgencyFailure, describeRejection } from "@/features/agency/errors";
import { formatCount, formatDay, formatTime, parseDate } from "@/features/agency/format";
import { useAgencyId } from "@/features/agency/session";
import {
  CLEARED_FILTERS,
  filtersOf,
  isNarrowed,
  readListState,
  statusSelectValue,
  withStatusSelect,
  writeListState,
  type ListState,
} from "./list-state";

// ── What the page offers ────────────────────────────────────

/** The groups counted above the list. Each figure is the size of the list its card filters. */
const GROUPS: { scope: DeliveryScope; count: keyof DeliveryOverview; label: string; hint: string; icon: LucideIcon }[] = [
  { scope: "to_assign", count: "toAssign", label: "À assigner", hint: "En attente d'un livreur", icon: Package },
  { scope: "on_the_way", count: "onTheWay", label: "En cours", hint: "Chez un livreur ou en route", icon: Truck },
  { scope: "delivered_today", count: "deliveredToday", label: "Livrées aujourd'hui", hint: "", icon: CircleCheck },
  { scope: "failed", count: "failed", label: "Échecs", hint: "Tentatives à relancer", icon: CircleAlert },
  { scope: "late", count: "late", label: "En retard", hint: "Heure annoncée dépassée", icon: Clock },
];

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  // What the dashboard lists first: late, to accept, to assign or failed.
  { value: "needs_action", label: "À traiter en priorité" },
  { value: "to_accept", label: agencyDeliveryStatus.resolve("to_accept").label },
  ...DELIVERY_STATUS_CODES.map((code) => ({ value: code as string, label: agencyDeliveryStatus.resolve(code).label })),
];

const DATE_OPTIONS: { value: DeliveryDateFilter | ""; label: string }[] = [
  { value: "", label: "Toutes les dates" },
  { value: "today", label: "Aujourd'hui" },
  { value: "yesterday", label: "Hier" },
  { value: "week", label: "Cette semaine" },
];

const PRIORITY_OPTIONS: { value: DeliveryPriorityFilter | ""; label: string }[] = [
  { value: "", label: "Toutes les priorités" },
  { value: "urgent", label: "Urgentes" },
  { value: "normal", label: "Normales" },
  { value: "low", label: "Basses" },
];

/** Statuses a selection can be moved to at once; the server refuses, row by row, what a single change would. */
const BULK_STATUSES = ["in_transit", "delivered", "delivery_failed", "pending"] as const;

const SORT_OF_COLUMN: Record<string, DeliverySortKey> = { status: "status", time: "created_at", amount: "shipping_amount" };
const COLUMN_OF_SORT: Record<DeliverySortKey, string> = { status: "status", created_at: "time", shipping_amount: "amount", eta: "time" };

// ── Rows ────────────────────────────────────────────────────

function CreatedAt({ iso }: { iso: string | null }) {
  const date = parseDate(iso);
  if (!date) return <span className="text-foreground-muted">—</span>;
  const today = new Date().toDateString() === date.toDateString();
  return (
    <span className="flex flex-col whitespace-nowrap tabular-nums">
      <time dateTime={iso ?? undefined}>{formatTime(iso)}</time>
      {!today && <span className="text-meta text-foreground-muted">{formatDay(iso)}</span>}
    </span>
  );
}

/**
 * Left out of the table while it is narrower than 1088px (a 1280px screen with
 * the menu open): nine columns do not fit there. Both are on the page of the
 * delivery, and in the cards of a phone.
 */
const NARROW_HIDDEN = "@2xl:hidden @[68rem]:table-cell";

const COLUMNS: DataTableColumn<DeliveryRow>[] = [
  {
    id: "reference",
    header: "N°",
    mobile: "title",
    className: "whitespace-nowrap",
    cell: (delivery) => <DeliveryLink delivery={delivery} />,
  },
  {
    id: "client",
    header: "Client",
    mobile: "subtitle",
    className: "@2xl:max-w-32",
    cell: (delivery) => <Recipient delivery={delivery} />,
    mobileCell: (delivery) => delivery.recipient.name ?? "Destinataire non renseigné",
  },
  {
    id: "address",
    header: "Adresse",
    className: "@2xl:max-w-36",
    cell: (delivery) => <Destination delivery={delivery} />,
    mobileCell: (delivery) => <Destination delivery={delivery} icon={false} wrap />,
  },
  {
    id: "status",
    header: "Statut",
    sortable: true,
    mobile: "badge",
    cell: (delivery) => <DeliveryStatus delivery={delivery} late="icon" />,
    mobileCell: (delivery) => <DeliveryStatus delivery={delivery} />,
  },
  {
    id: "courier",
    header: "Coursier",
    className: "@2xl:max-w-32",
    // As the mock-up names a courier in this column: « Moussa K. ». The cards of a phone have room for the whole name.
    cell: (delivery) => <CourierIdentity courier={delivery.courier} short />,
    mobileCell: (delivery) => <CourierIdentity courier={delivery.courier} />,
  },
  {
    id: "payment",
    header: "Paiement",
    mobile: "detail",
    className: NARROW_HIDDEN,
    cell: (delivery) => <DeliveryPayment delivery={delivery} />,
  },
  {
    id: "time",
    header: "Heure",
    sortable: true,
    mobile: "detail",
    className: NARROW_HIDDEN,
    cell: (delivery) => <CreatedAt iso={delivery.createdAt} />,
  },
  {
    id: "amount",
    header: "Montant",
    numeric: true,
    sortable: true,
    cell: (delivery) => <Money francs={delivery.feeFrancs} className="font-medium" />,
  },
];

// ── Page ────────────────────────────────────────────────────

export function DeliveriesContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const agencyId = useAgencyId();

  // The list state lives here and is mirrored in the URL: a reload, a shared
  // link or "back" from a delivery lands on the same filters, sort and page.
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
    setListState(readListState(new URLSearchParams(urlQuery)));
  }, [urlQuery]);

  const [searchInput, setSearchInput] = useState(state.search);
  useEffect(() => setSearchInput(state.search), [state.search]);

  const filters = useMemo(() => filtersOf(state), [state]);
  const deliveries = useDeliveries({ ...filters, page: state.page, pageSize: state.pageSize });
  // Names for the courier filter. A filter that fails to load is left out; the list does not depend on it.
  const couriers = useCouriers({ page: 1, pageSize: 100, sort: "name", direction: "asc" });
  const bulk = useBulkDeliveryAction();

  const [intent, setIntent] = useState<DeliveryIntent | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [refused, setRefused] = useState<{ done: string; outcome: BulkOutcome; names: Record<string, string> } | null>(null);
  const [exporting, setExporting] = useState<"all" | "selection" | null>(null);

  const page = deliveries.data;
  const loadState = loadStateOf(deliveries);
  const overview = page?.overview ?? null;
  const narrowed = isNarrowed(state);
  const moreFilterCount = (state.courier ? 1 : 0) + (state.priority ? 1 : 0);
  const activeFilterCount = (statusSelectValue(state) ? 1 : 0) + (state.date ? 1 : 0) + (state.zone ? 1 : 0) + moreFilterCount;

  const zoneOptions = useMemo(
    () => [{ value: "", label: "Toutes les zones" }, ...(page?.zones ?? []).map((zone) => ({ value: zone.id, label: `${zone.name} (${zone.count})` }))],
    [page?.zones],
  );
  const courierOptions = useMemo(
    () => [{ value: "", label: "Tous les livreurs" }, ...(couriers.data?.rows ?? []).map((courier) => ({ value: courier.userId, label: courier.name }))],
    [couriers.data],
  );

  const clearFilters = () => setState({ ...CLEARED_FILTERS });

  async function runExport(scope: "all" | "selection") {
    if (!agencyId) return;
    setExporting(scope);
    try {
      await exportDeliveriesCsv(agencyId, filters, scope === "selection" ? selectedIds : undefined);
      toast.success(scope === "selection" ? "Sélection exportée." : "Export des livraisons téléchargé.");
    } catch (error) {
      toast.error(`Export impossible. ${describeAgencyFailure(error).message}`);
    } finally {
      setExporting(null);
    }
  }

  /** Reports a change made to a selection: what was done, and what the server refused, one by one. */
  function reportBulk(outcome: BulkOutcome, done: (count: number) => string) {
    const names = Object.fromEntries((page?.rows ?? []).map((row) => [row.id, deliveryLabel(row.reference)]));
    if (outcome.rejected.length === 0) {
      toast.success(done(outcome.updatedCount));
    } else {
      setRefused({ done: outcome.updatedCount > 0 ? done(outcome.updatedCount) : "Aucune livraison n'a été modifiée.", outcome, names });
    }
    // What was refused stays selected, to be handled otherwise.
    setSelectedIds(outcome.rejected.map((entry) => entry.id));
  }

  async function runBulkStatus(status: string) {
    const action = statusActionOf(status);
    try {
      const outcome = await bulk.mutateAsync({ type: "status", ids: selectedIds, status });
      reportBulk(outcome, (count) => `${count} livraison${count > 1 ? "s" : ""} : ${action?.done ?? "mise à jour"}.`);
    } catch (error) {
      toast.error(describeAgencyFailure(error).message);
    }
  }

  const sort: SortState = { columnId: COLUMN_OF_SORT[state.sort], direction: state.direction };
  const tooMany = selectedIds.length > BULK_LIMIT;

  const moreFilters = (
    <>
      <ToolbarFilter
        label="Livreur"
        hideLabelInline
        value={state.courier}
        onValueChange={(value) => setState({ courier: value })}
        options={courierOptions}
      />
      <ToolbarFilter
        label="Priorité"
        hideLabelInline
        value={state.priority}
        onValueChange={(value) => setState({ priority: value as DeliveryPriorityFilter | "" })}
        options={PRIORITY_OPTIONS}
      />
    </>
  );

  return (
    <AgencyPage>
      <PageHeader
        title="Livraisons"
        description="Suivez, filtrez et assignez vos courses."
        hideDescriptionOnPhone
        meta={<TodayLabel />}
        primaryAction={{ label: "Nouvelle course", icon: Plus, href: "/agency/deliveries/new" }}
      />

      <KpiRow label="Livraisons par situation">
        {GROUPS.map((group) => {
          const value = overview?.[group.count];
          const delivered = group.scope === "delivered_today" && overview;
          return (
            <Stat
              layout="figure"
              key={group.scope}
              label={group.label}
              icon={group.icon}
              value={value === undefined ? "—" : formatCount(value)}
              hint={delivered ? `Hier : ${formatCount(overview.deliveredYesterday)}` : group.hint}
              loading={loadState === "loading"}
              pressed={state.scope === group.scope}
              onSelect={() => setState({ scope: state.scope === group.scope ? "" : group.scope, status: "" })}
            />
          );
        })}
      </KpiRow>

      {overview && overview.awaitingDecision > 0 && state.scope !== "awaiting_decision" && (
        <Alert
          tone="warning"
          actionsPlacement="end"
          title={`${formatCount(overview.awaitingDecision)} demande${overview.awaitingDecision > 1 ? "s attendent" : " attend"} votre décision`}
          actions={
            <Button size="compact" icon={ListFilter} onClick={() => setState({ ...CLEARED_FILTERS, scope: "awaiting_decision" })}>
              Voir ces demandes
            </Button>
          }
        >
          Acceptez-les pour leur assigner un livreur, ou refusez-les : l&apos;expéditeur choisira une autre agence.
        </Alert>
      )}

      <Toolbar
        className="rounded-panel border border-border bg-surface p-3"
        collapseFilters="narrow"
        search={
          <ToolbarSearch
            label="N° de course, client, téléphone ou livreur"
            value={searchInput}
            onValueChange={setSearchInput}
            onSubmit={(value) => setState({ search: value.trim() })}
          />
        }
        filters={
          <>
            <ToolbarFilter
              label="Statut"
              hideLabelInline
              value={statusSelectValue(state)}
              onValueChange={(value) => setState(withStatusSelect(value, state))}
              options={STATUS_OPTIONS}
            />
            <ToolbarFilter
              label="Date de création"
              hideLabelInline
              value={state.date}
              onValueChange={(value) => setState({ date: value as DeliveryDateFilter | "" })}
              options={DATE_OPTIONS}
            />
            {/* Offered only when the deliveries fall in zones: a filter with one choice filters nothing. */}
            {zoneOptions.length > 1 && (
              <ToolbarFilter label="Zone" hideLabelInline value={state.zone} onValueChange={(value) => setState({ zone: value })} options={zoneOptions} />
            )}
            {/* In the "Filtres" sheet of a narrow screen, every filter is there; on a wide one these two sit behind "Filtres avancés". */}
            <div className="flex flex-col gap-4 group-data-[inline]/filters:hidden">{moreFilters}</div>
          </>
        }
        activeFilterCount={activeFilterCount}
        onResetFilters={clearFilters}
        actions={
          <div className="hidden @[57rem]:block">
            <Sheet>
              <SheetTrigger asChild>
                <Button icon={SlidersHorizontal}>
                  Filtres avancés
                  {moreFilterCount > 0 && (
                    <span className="rounded-pill bg-brand-subtle px-1.5 text-meta text-foreground tabular-nums">
                      {moreFilterCount}
                      <span className="sr-only"> actifs</span>
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                title="Filtres avancés"
                footer={
                  <>
                    <Button variant="quiet" icon={X} onClick={() => setState({ courier: "", priority: "" })}>
                      Réinitialiser
                    </Button>
                    <SheetClose asChild>
                      <Button variant="primary">Voir les résultats</Button>
                    </SheetClose>
                  </>
                }
              >
                <div className="flex flex-col gap-4 [&>*]:w-full">{moreFilters}</div>
              </SheetContent>
            </Sheet>
          </div>
        }
        countAction={
          narrowed ? (
            <Button variant="quiet" size="compact" icon={X} onClick={clearFilters}>
              Tout afficher
            </Button>
          ) : undefined
        }
        count={
          narrowed ? (
            <p className="text-meta text-foreground-muted" aria-live="polite">
              La liste est filtrée.
            </p>
          ) : undefined
        }
      />

      <DataTable
        caption="Livraisons"
        header={{
          title: page ? `${formatCount(page.total)} livraison${page.total > 1 ? "s" : ""}` : "Livraisons",
          description: narrowed ? "Courses correspondant à la recherche et aux filtres." : "Liste de toutes les courses de l'agence.",
          actions: (
            <Button icon={Download} loading={exporting === "all"} disabled={exporting !== null || !agencyId} onClick={() => runExport("all")}>
              Exporter
            </Button>
          ),
        }}
        columns={COLUMNS}
        rows={page?.rows ?? []}
        getRowId={(delivery) => delivery.id}
        state={loadState}
        refreshing={deliveries.isFetching && loadState === "ready"}
        loadingRowCount={state.pageSize}
        error={{
          title: "Les livraisons n'ont pas pu être chargées",
          description: describeAgencyFailure(deliveries.error).message,
          onRetry: () => deliveries.refetch(),
          retrying: deliveries.isFetching,
        }}
        empty={
          narrowed
            ? {
                title: "Aucune livraison ne correspond",
                description: "Modifiez la recherche ou les filtres pour élargir les résultats.",
                action: (
                  <Button icon={X} onClick={clearFilters}>
                    Tout afficher
                  </Button>
                ),
              }
            : {
                icon: Package,
                title: "Aucune livraison pour le moment",
                description: "Les demandes de la marketplace et les courses que vous créez apparaîtront ici.",
                action: (
                  <Button asChild variant="primary" icon={Plus}>
                    <Link href="/agency/deliveries/new">Nouvelle course</Link>
                  </Button>
                ),
              }
        }
        sort={sort}
        onSortChange={(next) => setState({ sort: SORT_OF_COLUMN[next.columnId] ?? "created_at", direction: next.direction })}
        selection={{
          selectedIds,
          onChange: setSelectedIds,
          getRowLabel: (delivery) => `la livraison ${deliveryLabel(delivery.reference)}`,
        }}
        bulkActions={() => (
          <>
            {tooMany && (
              <p className="text-meta text-foreground-muted" role="status">
                {BULK_LIMIT} livraisons au plus par action groupée.
              </p>
            )}
            <Button size="compact" variant="primary" icon={UserPlus} disabled={tooMany || bulk.isPending} onClick={() => setBulkAssignOpen(true)}>
              Assigner
            </Button>
            <DropdownMenu
              trigger={
                <Button size="compact" icon={Truck} disabled={tooMany} loading={bulk.isPending && !bulkAssignOpen}>
                  Changer le statut
                </Button>
              }
            >
              <DropdownMenuLabel>Passer la sélection à</DropdownMenuLabel>
              {BULK_STATUSES.map((status) => {
                const action = statusActionOf(status);
                return (
                  action && (
                    <DropdownMenuItem key={status} icon={action.icon} onSelect={() => runBulkStatus(status)}>
                      {agencyDeliveryStatus.resolve(status).label}
                    </DropdownMenuItem>
                  )
                );
              })}
            </DropdownMenu>
            <Button size="compact" icon={Download} loading={exporting === "selection"} disabled={exporting !== null} onClick={() => runExport("selection")}>
              Exporter la sélection
            </Button>
          </>
        )}
        rowActionsLabel="Actions"
        density="compact"
        mobileRowActions="footer"
        rowActions={(delivery) => <DeliveryRowActions delivery={delivery} onIntent={setIntent} />}
        pagination={{
          page: state.page,
          pageSize: state.pageSize,
          total: page?.total ?? 0,
          onPageChange: (next) => setState({ page: next }),
          itemLabel: "livraisons",
          variant: "numbered",
          pageSizeOptions: [...DELIVERY_PAGE_SIZES],
          onPageSizeChange: (pageSize) => setState({ pageSize }),
        }}
      />

      <DeliveryActionDialogs intent={intent} onClose={() => setIntent(null)} />

      <AssignCourierDialog
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        title={`Assigner ${selectedIds.length} livraison${selectedIds.length > 1 ? "s" : ""}`}
        description="Le livreur choisi reçoit chaque livraison que l'agence a acceptée et qui n'est pas encore partie. Les autres vous sont signalées."
        onAssign={async (courier) => {
          try {
            const outcome = await bulk.mutateAsync({ type: "assign", ids: selectedIds, courierUserId: courier.userId });
            reportBulk(outcome, (count) => `${count} livraison${count > 1 ? "s" : ""} confiée${count > 1 ? "s" : ""} à ${courier.name}.`);
          } catch (error) {
            toast.error(describeAgencyFailure(error).message);
            throw error;
          }
        }}
      />

      <Dialog open={refused !== null} onOpenChange={(open) => !open && setRefused(null)}>
        <DialogContent
          title="Certaines livraisons n'ont pas été modifiées"
          description={refused?.done}
          footer={
            <DialogClose asChild>
              <Button variant="primary">Compris</Button>
            </DialogClose>
          }
        >
          <ul className="flex flex-col divide-y divide-border rounded-control border border-border">
            {refused?.outcome.rejected.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-0.5 px-3 py-2">
                <span className="text-body font-medium text-foreground tabular-nums">{refused.names[entry.id] ?? "Livraison hors de cette page"}</span>
                <span className="text-body text-foreground-muted">{describeRejection(entry.reason)}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </AgencyPage>
  );
}
