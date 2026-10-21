"use client";

import { useState } from "react";
import { PackageSearch } from "lucide-react";
import { Alert, DataTable, PageHeader, StatusBadge, type DataTableColumn } from "@/design-system";
import { LanayaPage, formatDate } from "@/features/lanaya/components/frame";
import type { LanayaAttribution } from "@/features/lanaya/contract";
import { describeLanayaFailure } from "@/features/lanaya/errors";
import { useFollowedOrders } from "@/features/lanaya/hooks";
import { loadStateOf } from "@/lib/query/load-state";

const PAGE_SIZE = 20;

const COLUMNS: DataTableColumn<LanayaAttribution>[] = [
  {
    id: "order",
    header: "Commande",
    mobile: "title",
    cell: (row) => <span className="font-medium whitespace-nowrap text-foreground tabular-nums">{row.order?.number ?? "—"}</span>,
  },
  { id: "store", header: "Boutique", cell: (row) => row.store?.name ?? <span className="text-foreground-muted">—</span>, mobileCell: (row) => row.store?.name ?? null },
  { id: "status", header: "Statut de la commande", mobile: "badge", cell: (row) => (row.order ? <StatusBadge domain="order" code={row.order.status.value} /> : null) },
  { id: "placed", header: "Passée le", mobile: "detail", className: "whitespace-nowrap", cell: (row) => formatDate(row.order?.placed_at) },
  { id: "since", header: "Suivie depuis", className: "whitespace-nowrap", cell: (row) => formatDate(row.attributed_at) },
];

/**
 * Les commandes dont SUGU a confié le suivi au Lanabaga, pour la part d'une
 * boutique qu'il accompagne (DEC-31). Ni montant, ni acheteur, ni adresse :
 * le serveur ne les envoie pas. Une attribution retirée disparaît d'ici.
 */
export function OrdersContent() {
  const [page, setPage] = useState(1);
  const orders = useFollowedOrders(page);
  const meta = orders.data?.meta;

  return (
    <LanayaPage>
      <PageHeader title="Commandes suivies" description="Les commandes des boutiques que vous accompagnez, dont SUGU vous a confié le suivi." hideDescriptionOnPhone />
      <Alert tone="info" title="Suivre n'est pas encaisser">
        Vous voyez où en est chaque commande, sans montant ni données de l&apos;acheteur. Aucune commission n&apos;est calculée pendant cette phase du programme.
      </Alert>
      <DataTable
        caption="Commandes suivies"
        header={{ title: "Commandes suivies", description: meta ? `${meta.total} commande${meta.total > 1 ? "s" : ""}` : undefined }}
        columns={COLUMNS}
        rows={orders.data?.items ?? []}
        getRowId={(row) => row.id}
        state={loadStateOf(orders)}
        refreshing={orders.isFetching && orders.isSuccess}
        error={{ title: "Les commandes n'ont pas pu être chargées", description: describeLanayaFailure(orders.error).message, onRetry: () => orders.refetch(), retrying: orders.isFetching }}
        empty={{ icon: PackageSearch, title: "Aucune commande suivie pour l'instant", description: "SUGU vous attribue le suivi d'une commande d'une boutique que vous accompagnez." }}
        pagination={meta && meta.total > PAGE_SIZE ? { page: meta.current_page, pageSize: PAGE_SIZE, total: meta.total, onPageChange: setPage, itemLabel: "commandes" } : undefined}
      />
    </LanayaPage>
  );
}
