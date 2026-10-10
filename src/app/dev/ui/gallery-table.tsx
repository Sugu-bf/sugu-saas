"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Eye, MoreHorizontal, PackageCheck, Plus, Printer, XCircle } from "lucide-react";
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
  StatusBadge,
  Toolbar,
  ToolbarCount,
  ToolbarFilter,
  ToolbarSearch,
  orderStatus,
  type DataTableColumn,
  type SortState,
} from "@/design-system";
import { queryDemoOrders, type DemoOrder } from "./gallery-data";

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" });
const PAGE_SIZE = 10;

type ForcedState = "live" | "loading" | "error" | "empty";

function demoOnly(action: string) {
  toast.info(`${action} : démonstration, aucune requête envoyée.`);
}

const COLUMNS: DataTableColumn<DemoOrder>[] = [
  {
    id: "reference",
    header: "Référence",
    sortable: true,
    mobile: "title",
    cell: (order) => <span className="font-medium tabular-nums">{order.reference}</span>,
  },
  {
    id: "customer",
    header: "Client",
    mobile: "subtitle",
    cell: (order) => (
      <>
        {order.customer} <span className="text-foreground-muted">· {order.city}</span>
      </>
    ),
  },
  {
    id: "placedAt",
    header: "Date",
    sortable: true,
    cell: (order) => <span className="tabular-nums">{DATE.format(new Date(order.placedAt))}</span>,
  },
  {
    id: "status",
    header: "Commande",
    mobile: "badge",
    cell: (order) => <StatusBadge domain="order" code={order.status} />,
  },
  {
    id: "payment",
    header: "Paiement",
    cell: (order) => <StatusBadge domain="orderPayment" code={order.paymentStatus} />,
  },
  {
    id: "fee",
    header: "Livraison",
    numeric: true,
    cell: (order) => <Money cents={order.deliveryFeeCents} />,
  },
  {
    id: "total",
    header: "Total",
    numeric: true,
    sortable: true,
    cell: (order) => <Money francs={order.totalFrancs} className="font-medium" />,
  },
];

export function OrdersTableDemo() {
  const [forced, setForced] = useState<ForcedState>("live");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortState | null>({ columnId: "placedAt", direction: "desc" });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const result = useMemo(
    () => queryDemoOrders({ page, pageSize: PAGE_SIZE, search, status, sort }),
    [page, search, status, sort],
  );

  // Mimic the short wait of a server round trip on every query change.
  function runQuery(update: () => void) {
    update();
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 250);
  }

  const rows = forced === "empty" ? [] : result.rows;
  const total = forced === "empty" ? 0 : result.total;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label text-foreground-muted">État simulé</span>
        <ButtonGroup label="État simulé de la table">
          {(
            [
              ["live", "Données"],
              ["loading", "Chargement"],
              ["error", "Erreur"],
              ["empty", "Vide"],
            ] as const
          ).map(([value, label]) => (
            <Button key={value} size="compact" aria-pressed={forced === value} onClick={() => setForced(value)}>
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      <Toolbar
        search={
          <ToolbarSearch
            label="Rechercher une commande"
            value={searchInput}
            onValueChange={setSearchInput}
            onSubmit={(value) =>
              runQuery(() => {
                setSearch(value);
                setPage(1);
              })
            }
          />
        }
        filters={
          <>
            <ToolbarFilter
              label="Statut"
              value={status}
              onValueChange={(value) =>
                runQuery(() => {
                  setStatus(value);
                  setPage(1);
                })
              }
              options={[{ value: "", label: "Tous" }, ...orderStatus.options()]}
            />
            <ToolbarFilter
              label="Trier par"
              value={sort ? `${sort.columnId}:${sort.direction}` : ""}
              onValueChange={(value) => {
                const [columnId, direction] = value.split(":");
                runQuery(() => {
                  setSort({ columnId, direction: direction === "asc" ? "asc" : "desc" });
                  setPage(1);
                });
              }}
              options={[
                { value: "placedAt:desc", label: "Plus récentes" },
                { value: "placedAt:asc", label: "Plus anciennes" },
                { value: "total:desc", label: "Montant décroissant" },
                { value: "total:asc", label: "Montant croissant" },
                { value: "reference:asc", label: "Référence A → Z" },
                { value: "reference:desc", label: "Référence Z → A" },
              ]}
            />
          </>
        }
        activeFilterCount={status === "" ? 0 : 1}
        onResetFilters={() =>
          runQuery(() => {
            setStatus("");
            setPage(1);
          })
        }
        count={
          <ToolbarCount
            total={forced === "loading" || forced === "error" ? undefined : total}
            noun={{ one: "commande", other: "commandes" }}
            selected={selectedIds.length}
          />
        }
        actions={
          <Button icon={Download} onClick={() => demoOnly("Export")}>
            Exporter
          </Button>
        }
      />

      <DataTable
        caption="Commandes de démonstration"
        columns={COLUMNS}
        rows={rows}
        getRowId={(order) => order.id}
        state={forced === "loading" ? "loading" : forced === "error" ? "error" : "ready"}
        refreshing={forced === "live" && refreshing}
        error={{
          title: "Impossible de charger les commandes",
          onRetry: () => setForced("live"),
        }}
        empty={{
          title: "Aucune commande",
          description: "Les commandes de vos clients apparaîtront ici.",
          action: (
            <Button variant="primary" icon={Plus} onClick={() => demoOnly("Nouvelle vente")}>
              Créer une vente
            </Button>
          ),
        }}
        sort={sort}
        onSortChange={(next) =>
          runQuery(() => {
            setSort(next);
            setPage(1);
          })
        }
        selection={{
          selectedIds,
          onChange: setSelectedIds,
          getRowLabel: (order) => `la commande ${order.reference}`,
          isRowSelectable: (order) => order.status !== "canceled",
        }}
        bulkActions={() => (
          <Button size="compact" icon={PackageCheck} onClick={() => setConfirmOpen(true)}>
            Marquer comme préparées
          </Button>
        )}
        rowActions={(order) => (
          <DropdownMenu
            trigger={
              <IconButton
                icon={MoreHorizontal}
                label={`Actions pour la commande ${order.reference}`}
                size="compact"
                tooltip={false}
              />
            }
          >
            <DropdownMenuItem icon={Eye} onSelect={() => demoOnly("Voir la commande")}>
              Voir la commande
            </DropdownMenuItem>
            <DropdownMenuItem icon={Printer} onSelect={() => demoOnly("Impression")}>
              Imprimer le bon
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              icon={XCircle}
              tone="danger"
              disabled={order.status === "canceled" || order.status === "delivered"}
              onSelect={() => demoOnly("Annulation")}
            >
              Annuler la commande
            </DropdownMenuItem>
          </DropdownMenu>
        )}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          onPageChange: (next) => runQuery(() => setPage(next)),
          itemLabel: "commandes",
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Marquer ${selectedIds.length} commande${selectedIds.length > 1 ? "s" : ""} comme préparée${selectedIds.length > 1 ? "s" : ""} ?`}
        description="Démonstration : la sélection sera simplement vidée, aucune requête n'est envoyée."
        confirmLabel="Marquer comme préparées"
        confirmIcon={PackageCheck}
        onConfirm={async () => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          setSelectedIds([]);
          toast.success("Sélection traitée (démonstration).");
        }}
      />
    </div>
  );
}

/** The same table inside a phone-wide frame, to review the card layout on a desktop screen. */
export function PhoneListDemo() {
  const { rows } = queryDemoOrders({ page: 1, pageSize: 4, search: "", status: "", sort: null });
  return (
    <div className="w-full max-w-[375px]">
      <DataTable
        caption="Commandes, rendu téléphone"
        columns={COLUMNS}
        rows={rows}
        getRowId={(order) => order.id}
        empty={{ title: "Aucune commande" }}
        rowActions={(order) => (
          <Button size="compact" icon={Eye} onClick={() => demoOnly(`Voir ${order.reference}`)}>
            Voir
          </Button>
        )}
      />
    </div>
  );
}
