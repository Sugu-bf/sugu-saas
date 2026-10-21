"use client";

import Link from "next/link";
import { ExternalLink, Store, UserPlus } from "lucide-react";
import { Alert, Avatar, Badge, Button, DataTable, PageHeader, type DataTableColumn } from "@/design-system";
import { LanayaPage, formatDate, formatPhone } from "@/features/lanaya/components/frame";
import { NetworkTabs } from "@/features/lanaya/components/network";
import type { LanayaInvitation } from "@/features/lanaya/contract";
import { describeLanayaFailure } from "@/features/lanaya/errors";
import { useLanayaSellers } from "@/features/lanaya/hooks";
import { env } from "@/lib/env";
import { loadStateOf } from "@/lib/query/load-state";

/** The public page of the shop, on the marketplace (the same address as the seller's own "Voir ma boutique"). */
const storeHref = (slug: string) => `${env.NEXT_PUBLIC_MARKETPLACE_URL.replace(/\/+$/, "")}/store/${encodeURIComponent(slug)}`;

const COLUMNS: DataTableColumn<LanayaInvitation>[] = [
  {
    id: "store",
    header: "Boutique",
    mobile: "title",
    cell: (seller) => (
      <span className="flex min-w-0 items-center gap-3">
        <Avatar name={seller.store?.name ?? seller.company_name} />
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{seller.store?.name ?? seller.company_name}</span>
          <span className="block truncate text-meta text-foreground-muted">{seller.contact_name}</span>
        </span>
      </span>
    ),
  },
  { id: "phone", header: "Téléphone", className: "whitespace-nowrap tabular-nums", cell: (seller) => formatPhone(seller.phone) },
  {
    id: "status",
    header: "Statut",
    mobile: "badge",
    cell: (seller) => (seller.store_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>),
  },
  {
    id: "city",
    header: "Ville",
    cell: (seller) => seller.store?.city ?? <span className="text-foreground-muted">—</span>,
    mobileCell: (seller) => seller.store?.city ?? null,
  },
  { id: "accepted", header: "Présentée le", className: "whitespace-nowrap", cell: (seller) => formatDate(seller.accepted_at) },
];

export function SellersContent() {
  const sellers = useLanayaSellers();
  const total = sellers.data?.meta.total;

  return (
    <LanayaPage>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader className="min-w-0 flex-1" title="Mes vendeurs" description="Les boutiques dont le propriétaire a accepté votre mise en relation avec SUGU." hideDescriptionOnPhone />
        <NetworkTabs current="sellers" />
      </div>

      <Alert tone="info" title="Présenter une boutique n'est pas encore l'accompagner">
        SUGU vous confiera l&apos;accompagnement de boutiques dans une prochaine étape du programme. Aucune commission n&apos;est calculée pour l&apos;instant.
      </Alert>

      <DataTable
        caption="Vendeurs présentés"
        header={{ title: "Vendeurs présentés", description: total !== undefined ? `${total} boutique${total > 1 ? "s" : ""}` : undefined }}
        columns={COLUMNS}
        rows={sellers.data?.items ?? []}
        getRowId={(seller) => seller.id}
        state={loadStateOf(sellers)}
        error={{
          title: "Vos vendeurs n'ont pas pu être chargés",
          description: describeLanayaFailure(sellers.error).message,
          onRetry: () => sellers.refetch(),
          retrying: sellers.isFetching,
        }}
        empty={{
          icon: Store,
          title: "Aucun vendeur présenté pour l'instant",
          description: "Une boutique apparaît ici quand son propriétaire accepte votre invitation.",
          action: (
            <Button asChild variant="outline" icon={UserPlus}>
              <Link href="/lanabaga/prospects">Inviter un vendeur</Link>
            </Button>
          ),
        }}
        rowActions={(seller) =>
          seller.store?.slug && seller.store_active ? (
            <Button asChild size="compact" variant="quiet" icon={ExternalLink}>
              <a href={storeHref(seller.store.slug)} target="_blank" rel="noopener noreferrer">
                Voir la boutique
              </a>
            </Button>
          ) : null
        }
        mobileRowActions="footer"
      />
    </LanayaPage>
  );
}
