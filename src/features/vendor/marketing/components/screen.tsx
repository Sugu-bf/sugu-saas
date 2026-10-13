"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgePercent, CalendarClock, CheckCircle2, Clock, MoreHorizontal, PackageSearch, Pencil, Power, PowerOff, ShoppingBag, Tag, TicketPercent, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, Button, Card, ConfirmDialog, DataTable, DropdownMenu, DropdownMenuItem, ErrorState, IconButton, PageHeader, Skeleton, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, type DataTableColumn } from "@/design-system";
import { Figure, KpiGrid } from "@/features/vendor/clients/components/bits";
import { ProductThumb } from "@/features/vendor/catalog/components/product-bits";
import type { Coupon, MarketingBoard, Promotion } from "../contract";
import { useMarketing, useMarketingCommand } from "../hooks";
import { MARKETING, MarketingPage, TypeBadge, describeChangeFailure, describeLoadFailure, formatFrancs, formatPeriod, formatReduction, formatUnits } from "./bits";
import { CouponDialog } from "./coupon-dialog";
import { PromotionDialog } from "./promotion-dialog";

type Tab = "codes" | "promotions";

/**
 * `/vendor/marketing`: the promotional codes and the product promotions of
 * the store, two tabs of one page (`?onglet=promotions`).
 */
export function MarketingScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = params.get("onglet") === "promotions" ? "promotions" : "codes";

  const { data, isPending, isError, error, refetch, isFetching } = useMarketing();
  const command = useMarketingCommand();
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [promotionForm, setPromotionForm] = useState<{ editing: Promotion | null } | null>(null);
  const [removing, setRemoving] = useState<Promotion | null>(null);
  // The row a change was asked for, while the server answers.
  const busy = command.isPending && "id" in command.variables ? command.variables.id : null;

  const setTab = (next: string) => router.replace(next === "promotions" ? `${pathname}?onglet=promotions` : pathname, { scroll: false });

  const change = (variables: Parameters<typeof command.mutate>[0], done: string) =>
    command.mutate(variables, {
      onSuccess: () => toast.success(done),
      onError: (failure) => toast.error(describeChangeFailure(failure).message),
    });

  const couponColumns: DataTableColumn<Coupon>[] = [
    { id: "code", header: "Code", mobile: "title", cell: (row) => <span className="font-semibold whitespace-nowrap text-foreground tabular-nums">{row.code}</span> },
    { id: "type", header: "Type", mobile: "field", cell: (row) => <TypeBadge type={row.type} /> },
    { id: "reduction", header: "Réduction", mobile: "subtitle", cell: (row) => <span className="font-semibold whitespace-nowrap text-primary tabular-nums">{formatReduction(row.type, row.value)}</span> },
    { id: "conditions", header: "Conditions", mobile: "field", cell: (row) => <Conditions coupon={row} /> },
    {
      id: "uses",
      header: "Utilisations",
      mobile: "field",
      cell: (row) => (
        <span className="whitespace-nowrap tabular-nums">
          <span className="font-semibold text-foreground">{formatUnits(row.redemptions)}</span>
          {row.usageLimit !== null && <span className="text-foreground-muted"> / {formatUnits(row.usageLimit)}</span>}
        </span>
      ),
    },
    { id: "status", header: "Statut", mobile: "badge", cell: (row) => <StatusBadge domain="discount" code={row.status} /> },
    { id: "period", header: "Période", mobile: "field", cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatPeriod(row.startsAt, row.endsAt)}</span> },
  ];

  const promotionColumns: DataTableColumn<Promotion>[] = [
    {
      id: "product",
      header: "Produit",
      mobile: "title",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-3">
          <ProductThumb src={row.product.image} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">{row.product.name}</span>
            {row.product.sku && <span className="block truncate text-meta text-foreground-muted tabular-nums">{row.product.sku}</span>}
          </span>
        </span>
      ),
    },
    { id: "price", header: "Prix actuel", numeric: true, mobile: "field", cell: (row) => formatFrancs(row.product.price) },
    { id: "promoPrice", header: "Prix promo", numeric: true, mobile: "subtitle", cell: (row) => <span className="font-semibold text-foreground">{formatFrancs(row.promoPrice)}</span> },
    { id: "reduction", header: "Réduction", mobile: "field", cell: (row) => <span className="font-semibold whitespace-nowrap text-primary tabular-nums">−{row.discountPercent} %</span> },
    {
      id: "status",
      header: "Statut",
      mobile: "badge",
      cell: (row) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusBadge domain="discount" code={row.status} />
          {/* A promotion on a product that is no longer on sale shows nowhere. */}
          {row.product.status !== "active" && <StatusBadge domain="product" code={row.product.status} />}
        </span>
      ),
    },
    { id: "period", header: "Période", mobile: "field", cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatPeriod(row.startsAt, row.endsAt)}</span> },
  ];

  const header = (
    <PageHeader
      title="Marketing"
      description="Créez des promotions et fidélisez vos clients"
      primaryAction={
        tab === "codes"
          ? { label: "Créer un code", icon: TicketPercent, onSelect: () => setCreatingCoupon(true) }
          : { label: "Créer une promotion", icon: BadgePercent, onSelect: () => setPromotionForm({ editing: null }) }
      }
    />
  );

  if (isPending) {
    return (
      <MarketingPage aria-busy>
        {header}
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-24 w-full rounded-panel" />
        <Skeleton className="h-72 w-full rounded-panel" />
        <span className="sr-only" role="status">
          Chargement…
        </span>
      </MarketingPage>
    );
  }

  if (isError || !data) {
    return (
      <MarketingPage>
        {header}
        <Card>
          <ErrorState title="Marketing indisponible" description={describeLoadFailure(error)} onRetry={() => refetch()} retrying={isFetching} />
        </Card>
      </MarketingPage>
    );
  }

  const { summary } = data;

  return (
    <MarketingPage>
      {header}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList label="Sections du marketing">
          <TabsTrigger value="codes" count={summary.coupons.total}>
            Codes promotionnels
          </TabsTrigger>
          <TabsTrigger value="promotions" count={summary.promotions.total}>
            Promotions produits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="flex flex-col gap-4">
          <KpiGrid label="Vos codes promotionnels en chiffres">
            <Figure icon={CheckCircle2} label="Codes actifs" value={formatUnits(summary.coupons.active)} />
            <Figure icon={CalendarClock} label="À venir" value={formatUnits(summary.coupons.scheduled)} />
            <Figure icon={Clock} label="Expirés" value={formatUnits(summary.coupons.expired)} />
            <Figure icon={ShoppingBag} label="Utilisations totales" value={formatUnits(summary.coupons.redemptions)} />
          </KpiGrid>

          <CouponNotes board={data} />

          <DataTable
            caption="Codes promotionnels"
            columns={couponColumns}
            rows={data.couponList}
            getRowId={(row) => row.id}
            refreshing={isFetching}
            rowActionsLabel="Actions"
            rowActions={(row) => {
              // A code is switched off, or back on while its dates still allow it.
              const canSwitch = row.isActive ? row.status !== "expired" : true;
              return (
                <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions pour le code ${row.code}`} loading={busy === row.id} />}>
                  <DropdownMenuItem
                    icon={row.isActive ? PowerOff : Power}
                    disabled={!canSwitch || command.isPending}
                    onSelect={() => change({ type: "toggle-coupon", id: row.id }, row.isActive ? `Le code ${row.code} est désactivé.` : `Le code ${row.code} est réactivé.`)}
                  >
                    {row.isActive ? "Désactiver" : "Réactiver"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    icon={Tag}
                    onSelect={() => {
                      void navigator.clipboard?.writeText(row.code).then(
                        () => toast.success(`Code ${row.code} copié.`),
                        () => toast.error("Le code n'a pas pu être copié."),
                      );
                    }}
                  >
                    Copier le code
                  </DropdownMenuItem>
                </DropdownMenu>
              );
            }}
            empty={{
              icon: TicketPercent,
              title: "Aucun code promotionnel",
              description: "Un code offre une réduction sur les articles de votre boutique à qui le saisit dans son panier.",
              action: (
                <Button variant="primary" icon={TicketPercent} onClick={() => setCreatingCoupon(true)}>
                  Créer un code
                </Button>
              ),
            }}
          />
        </TabsContent>

        <TabsContent value="promotions" className="flex flex-col gap-4">
          <KpiGrid label="Vos promotions produits en chiffres">
            <Figure icon={BadgePercent} label="Produits en promo" value={formatUnits(summary.promotions.total)} />
            <Figure icon={CheckCircle2} label="Actives" value={formatUnits(summary.promotions.active)} />
            <Figure icon={CalendarClock} label="À venir" value={formatUnits(summary.promotions.scheduled)} />
            <Figure icon={Clock} label="Expirées" value={formatUnits(summary.promotions.expired)} />
          </KpiGrid>

          {summary.promotions.savings > 0 && (
            <p className="text-meta text-foreground-muted">
              {formatFrancs(summary.promotions.savings)} de réduction accordés sur {formatUnits(summary.promotions.orders)} commande{summary.promotions.orders > 1 ? "s" : ""}, comptés à la commande.
            </p>
          )}

          <DataTable
            caption="Promotions produits"
            columns={promotionColumns}
            rows={data.promotionList}
            getRowId={(row) => row.id}
            refreshing={isFetching}
            rowActionsLabel="Actions"
            rowActions={(row) => (
              <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions pour la promotion de ${row.product.name}`} loading={busy === row.id} />}>
                <DropdownMenuItem icon={Pencil} disabled={command.isPending} onSelect={() => setPromotionForm({ editing: row })}>
                  Modifier
                </DropdownMenuItem>
                {row.isActive ? (
                  <DropdownMenuItem icon={PowerOff} disabled={command.isPending} onSelect={() => change({ type: "switch-promotion", id: row.id, active: false }, `La promotion de ${row.product.name} est désactivée.`)}>
                    Désactiver
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem icon={Power} disabled={command.isPending} onSelect={() => change({ type: "switch-promotion", id: row.id, active: true }, `La promotion de ${row.product.name} est réactivée.`)}>
                    Réactiver
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href={`/vendor/products/${row.product.id}`}>
                    <PackageSearch className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">Ouvrir la fiche produit</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem icon={Trash2} tone="danger" disabled={command.isPending} onSelect={() => setRemoving(row)}>
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenu>
            )}
            empty={{
              icon: BadgePercent,
              title: "Aucune promotion produit",
              description: "Une promotion baisse le prix d'un de vos produits en vente, entre deux dates.",
              action: (
                <Button variant="primary" icon={BadgePercent} onClick={() => setPromotionForm({ editing: null })}>
                  Créer une promotion
                </Button>
              ),
            }}
          />
        </TabsContent>
      </Tabs>

      {summary.truncated && <Alert tone="info" title="Les 200 éléments les plus récents sont affichés." />}

      <CouponDialog open={creatingCoupon} onOpenChange={setCreatingCoupon} />
      <PromotionDialog open={promotionForm !== null} editing={promotionForm?.editing ?? null} onOpenChange={(open) => !open && setPromotionForm(null)} />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Supprimer cette promotion ?"
        description={removing ? `${removing.product.name} repasse à ${formatFrancs(removing.product.price)} dès maintenant, sur la marketplace comme au paiement. La promotion quitte cette liste.` : ""}
        confirmLabel="Supprimer la promotion"
        confirmIcon={Trash2}
        tone="danger"
        onConfirm={async () => {
          if (!removing) return;
          try {
            await command.mutateAsync({ type: "delete-promotion", id: removing.id });
            toast.success(`La promotion de ${removing.product.name} est supprimée.`);
          } catch (failure) {
            toast.error(describeChangeFailure(failure).message);
          } finally {
            setRemoving(null);
          }
        }}
      />
    </MarketingPage>
  );
}

/** The conditions of a code, each on its own short line. */
function Conditions({ coupon }: { coupon: Coupon }) {
  const lines = [coupon.minSubtotal ? `Min. ${formatFrancs(coupon.minSubtotal)}` : "Sans minimum"];
  if (coupon.perCustomerLimit) lines.push(coupon.perCustomerLimit === 1 ? "1 fois par client" : `${coupon.perCustomerLimit} fois par client`);
  return (
    <span className="flex flex-col text-foreground">
      <span className="whitespace-nowrap tabular-nums">{lines[0]}</span>
      {lines[1] && <span className="text-meta whitespace-nowrap text-foreground-muted">{lines[1]}</span>}
    </span>
  );
}

/** What a seller must know about the codes before counting on them. */
function CouponNotes({ board }: { board: MarketingBoard }) {
  const ignored = board.couponList.filter((coupon) => !coupon.appliedAtCheckout);
  return (
    <>
      {ignored.length > 0 && (
        <Alert tone="warning" title={ignored.length === 1 ? `Le code ${ignored[0].code} n'est pas appliqué au paiement.` : `${ignored.length} codes ne sont pas appliqués au paiement.`}>
          La livraison gratuite n&apos;est pas prise en charge par le paiement de la marketplace : ces codes n&apos;apportent aucune réduction à l&apos;acheteur. Désactivez-les.
        </Alert>
      )}
      {board.summary.coupons.savings > 0 && <p className="text-meta text-foreground-muted">{formatFrancs(board.summary.coupons.savings)} de réduction accordés par vos codes, comptés à la commande.</p>}
    </>
  );
}

/** What the page shows before its screen has read the address. */
export function MarketingLoading() {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4" aria-busy="true">
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-24 w-full rounded-panel" />
      <Skeleton className="h-72 w-full rounded-panel" />
    </div>
  );
}

export { MARKETING };
