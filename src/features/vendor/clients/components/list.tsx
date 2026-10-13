"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Contact, Crown, Download, Eye, Heart, MoreHorizontal, Phone, ShoppingBag, Sparkles, UserPlus, UserSearch, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, DataTable, DropdownMenu, DropdownMenuItem, ErrorState, IconButton, PageHeader, StatusBadge, Tabs, TabsList, TabsTrigger, Toolbar, ToolbarFilter, ToolbarSearch, customerSegment, type DataTableColumn, type SortState } from "@/design-system";
import { useListAddress } from "@/features/vendor/sugubox/hooks";
import { CLIENT_PAGE_SIZES, exportClientsCsv, type ClientFilters } from "../api";
import { CLIENT_SORTS, SEGMENTS, type Client, type ClientSort, type ClientSummary } from "../contract";
import { useClientSummary, useClients } from "../hooks";
import { ClientCell, ClientsPage, Figure, KpiGrid, clientPath, describeFailure, formatDay, formatFrancs, formatUnits, plural } from "./bits";
import { CreateClientDialog } from "./create-dialog";

const SORT_OF: Record<string, ClientSort> = { client: "name", orders: "orders", spent: "spent", lastOrder: "last_order" };
const COLUMN_OF: Record<ClientSort, string> = { name: "client", orders: "orders", spent: "spent", last_order: "lastOrder" };

const ordersOf = (client: Client) => `/vendor/orders?q=${encodeURIComponent(client.phone ?? client.name)}`;

/** The rules of the segments, as the server applies them. */
function rulesText(rules: ClientSummary["rules"]): string {
  return `VIP : ${formatFrancs(rules.vipSpent)} dépensés ou ${rules.vipOrders} commandes. Fidèle : ${rules.loyalOrders} commandes ou plus. Nouveau : client depuis ${rules.newDays} jours au plus. Inactif : aucune commande depuis ${rules.inactiveDays} jours.`;
}

export function ClientList() {
  const router = useRouter();
  const address = useListAddress(CLIENT_PAGE_SIZES);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const segment = (SEGMENTS as readonly string[]).includes(address.get("statut")) ? address.get("statut") : "";
  const city = address.get("ville");
  const sort = (CLIENT_SORTS as readonly string[]).includes(address.get("tri")) ? (address.get("tri") as ClientSort) : undefined;
  const direction = address.get("sens") === "asc" ? "asc" : address.get("sens") === "desc" ? "desc" : undefined;
  const filters: ClientFilters = { search: address.search, segment, city, sort, direction };

  const summary = useClientSummary();
  const { data, isPending, isFetching, isError, error, refetch } = useClients({ ...filters, page: address.page, pageSize: address.pageSize });

  const counts = summary.data?.segments;
  const narrowed = Boolean(address.search || segment || city);
  const sortState: SortState | null = sort ? { columnId: COLUMN_OF[sort], direction: direction ?? (sort === "name" ? "asc" : "desc") } : null;
  // The sheet opens over the list as it is filtered: going back finds it again.
  const open = (client: Client) => router.push(clientPath(client.id, window.location.search));

  const exportList = async () => {
    setExporting(true);
    try {
      await exportClientsCsv(filters);
      toast.success(narrowed ? "Les clients affichés ont été exportés." : "Vos clients ont été exportés.");
    } catch (failure) {
      toast.error(describeFailure(failure).replace("chargés", "exportés"));
    } finally {
      setExporting(false);
    }
  };

  const columns: DataTableColumn<Client>[] = [
    { id: "client", header: "Client", mobile: "title", sortable: true, cell: (row) => <ClientCell client={row} /> },
    { id: "segment", header: "Statut", mobile: "badge", cell: (row) => <StatusBadge domain="customerSegment" code={row.segment} /> },
    {
      id: "orders",
      header: "Commandes",
      numeric: true,
      sortable: true,
      mobile: "subtitle",
      cell: (row) => formatUnits(row.orders),
      mobileCell: (row) => `${plural(row.orders, "commande", "commandes")} · ${formatFrancs(row.spent)}`,
    },
    { id: "spent", header: "Total dépensé", numeric: true, sortable: true, mobile: "hidden", cell: (row) => <span className="font-semibold text-foreground">{formatFrancs(row.spent)}</span> },
    {
      id: "lastOrder",
      header: "Dernière commande",
      sortable: true,
      mobile: "field",
      cell: (row) => <span className="whitespace-nowrap">{formatDay(row.lastOrderAt)}</span>,
      mobileCell: (row) => (row.lastOrderAt ? [formatDay(row.lastOrderAt), row.city].filter(Boolean).join(" · ") : null),
    },
    { id: "city", header: "Ville", mobile: "hidden", cell: (row) => row.city ?? "—" },
  ];

  return (
    <ClientsPage aria-busy={isPending}>
      <PageHeader
        title="Mes clients"
        description="Gérez et suivez vos clients"
        titleAddon={summary.data ? <span className="text-body text-foreground-muted tabular-nums md:hidden">{plural(summary.data.total, "client", "clients")}</span> : undefined}
        primaryAction={{ label: "Ajouter un client", icon: UserPlus, onSelect: () => setCreating(true) }}
        secondaryActions={[{ label: "Exporter", icon: Download, onSelect: exportList, loading: exporting, disabled: exporting || summary.data?.total === 0 }]}
      />

      {isError && !data ? (
        <Card>
          <ErrorState title="Clients indisponibles" description={describeFailure(error)} onRetry={() => refetch()} retrying={isFetching} />
        </Card>
      ) : (
        <>
          <Card>
            <Toolbar
              search={<ToolbarSearch value={address.typed} onValueChange={address.setTyped} onSubmit={address.submitSearch} label="Rechercher un client (nom, téléphone, e-mail)" />}
              activeFilterCount={[segment, city].filter(Boolean).length}
              onResetFilters={() => address.reset(["statut", "ville"])}
              filters={
                <>
                  <ToolbarFilter
                    label="Statut"
                    hideLabelInline
                    value={segment}
                    onValueChange={(value) => address.update({ statut: value || null })}
                    options={[{ value: "", label: "Tous les statuts" }, ...customerSegment.options()]}
                  />
                  <ToolbarFilter
                    label="Ville"
                    hideLabelInline
                    value={city}
                    onValueChange={(value) => address.update({ ville: value || null })}
                    options={[{ value: "", label: "Toutes les villes" }, ...(summary.data?.cities ?? []).map((name) => ({ value: name, label: name }))]}
                  />
                </>
              }
            />
          </Card>

          <KpiGrid label="Vos clients en chiffres">
            <Figure icon={Users} label="Total clients" value={summary.data ? formatUnits(summary.data.total) : undefined} loading={summary.isPending} onSelect={() => address.update({ statut: null })} pressed={!segment} />
            <Figure icon={Sparkles} label={`Nouveaux (${summary.data?.rules.newDays ?? 30} jours)`} value={counts ? formatUnits(counts.new ?? 0) : undefined} loading={summary.isPending} onSelect={() => address.update({ statut: "new" })} pressed={segment === "new"} />
            <Figure icon={Heart} label="Clients fidèles" value={counts ? formatUnits(counts.loyal ?? 0) : undefined} loading={summary.isPending} onSelect={() => address.update({ statut: "loyal" })} pressed={segment === "loyal"} />
            <Figure icon={Crown} label="Clients VIP" value={counts ? formatUnits(counts.vip ?? 0) : undefined} loading={summary.isPending} onSelect={() => address.update({ statut: "vip" })} pressed={segment === "vip"} />
          </KpiGrid>

          {/* On a phone the statuses are a row of pills, each with the count of the whole store. */}
          <Tabs value={segment || "all"} onValueChange={(value) => address.update({ statut: value === "all" ? null : value })} className="md:hidden">
            <TabsList label="Filtrer les clients par statut" variant="pills">
              <TabsTrigger value="all" count={summary.data?.total}>
                Tous
              </TabsTrigger>
              {SEGMENTS.filter((code) => (counts?.[code] ?? 0) > 0 || code === segment).map((code) => (
                <TabsTrigger key={code} value={code} count={counts?.[code]} tone={customerSegment.resolve(code).tone}>
                  {customerSegment.resolve(code).label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <DataTable
            caption="Clients de la boutique"
            columns={columns}
            rows={data?.rows ?? []}
            getRowId={(row) => row.id}
            state={isPending ? "loading" : "ready"}
            refreshing={isFetching}
            sort={sortState}
            onSortChange={(next) => address.update({ tri: SORT_OF[next.columnId] ?? null, sens: next.direction })}
            rowActionsLabel="Actions"
            rowActions={(row) => (
              <>
                <Button size="compact" icon={Eye} onClick={() => open(row)} aria-label={`Voir la fiche de ${row.name}`}>
                  Voir
                </Button>
                <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Autres actions pour ${row.name}`} />}>
                  <DropdownMenuItem icon={Contact} onSelect={() => open(row)}>
                    Ouvrir la fiche
                  </DropdownMenuItem>
                  <DropdownMenuItem icon={ShoppingBag} disabled={row.orders === 0} onSelect={() => router.push(ordersOf(row))}>
                    Voir ses commandes
                  </DropdownMenuItem>
                  {row.phone && (
                    <DropdownMenuItem asChild>
                      <a href={`tel:${row.phone}`}>
                        <Phone className="size-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">Appeler</span>
                      </a>
                    </DropdownMenuItem>
                  )}
                </DropdownMenu>
              </>
            )}
            empty={
              narrowed
                ? { icon: UserSearch, title: "Aucun client ne correspond", description: "Modifiez la recherche ou les filtres.", action: <Button onClick={() => address.reset(["statut", "ville"])}>Tout afficher</Button> }
                : {
                    icon: Users,
                    title: "Aucun client pour le moment",
                    description: "Vos acheteurs apparaissent ici dès leur première commande. Vous pouvez aussi enregistrer un client vous-même.",
                    action: (
                      <Button variant="primary" icon={UserPlus} onClick={() => setCreating(true)}>
                        Ajouter un client
                      </Button>
                    ),
                  }
            }
            pagination={
              data && data.total > 0
                ? { page: data.page, pageSize: data.pageSize, total: data.total, onPageChange: address.setPage, variant: "numbered", pageSizeOptions: [...CLIENT_PAGE_SIZES], onPageSizeChange: address.setPageSize, itemLabel: "clients" }
                : undefined
            }
          />

          {summary.data && <p className="text-meta text-foreground-muted">{rulesText(summary.data.rules)} Le total dépensé compte les commandes livrées.</p>}
        </>
      )}

      <CreateClientDialog open={creating} onOpenChange={setCreating} onCreated={open} />
    </ClientsPage>
  );
}
