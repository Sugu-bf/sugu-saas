"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronDown, ChevronRight, Mail, MapPin, Phone, ReceiptText, ShoppingBag, ShoppingCart, UserRound, Wallet } from "lucide-react";
import { Avatar, Button, Card, DropdownMenu, DropdownMenuItem, EmptyState, ErrorState, Skeleton, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger } from "@/design-system";
import type { ClientOrder, ClientSheet as Sheet } from "../contract";
import { useClient } from "../hooks";
import { CLIENTS, ClientsPage, Figure, KpiGrid, describeFailure, formatDay, formatFrancs, formatPhone, formatUnits, isNotFound } from "./bits";

const orderPath = (id: string) => `/vendor/orders/${id}`;
const ordersOf = (client: Sheet) => `/vendor/orders?q=${encodeURIComponent(client.phone ?? client.name)}`;

/**
 * The sheet of a customer, opened from the list (`?client=`): who they are,
 * what they ordered in this store, and their last orders. Nothing of what
 * they bought elsewhere.
 */
export function ClientSheet({ id }: { id: string }) {
  const params = useSearchParams();
  const { data, isPending, isError, error, refetch, isFetching } = useClient(id);

  // Back to the list as it was filtered.
  const back = new URLSearchParams(params.toString());
  back.delete("client");
  const backHref = back.toString() ? `${CLIENTS}?${back.toString()}` : CLIENTS;

  const backLink = (
    <Link href={backHref} className="inline-flex min-h-8 items-center gap-2 self-start rounded-pill text-label font-medium text-foreground-muted underline-offset-4 hover:text-foreground hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Retour aux clients
    </Link>
  );

  if (isPending) {
    return (
      <ClientsPage aria-busy>
        {backLink}
        <Card className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-pill" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
        </Card>
        <KpiGrid label="Chiffres du client">
          {["Commandes", "Total dépensé", "Panier moyen", "Dernière commande"].map((label) => (
            <Figure key={label} icon={ShoppingBag} label={label} value={undefined} loading />
          ))}
        </KpiGrid>
        <span className="sr-only" role="status">
          Chargement de la fiche…
        </span>
      </ClientsPage>
    );
  }

  if (isError || !data) {
    return (
      <ClientsPage>
        {backLink}
        <Card>
          {isNotFound(error) ? (
            <EmptyState
              icon={UserRound}
              title="Client introuvable"
              description="Cette fiche n'existe pas, ou ce client n'est pas un client de votre boutique."
              action={
                <Button asChild variant="primary">
                  <Link href={backHref}>Revenir à la liste</Link>
                </Button>
              }
            />
          ) : (
            <ErrorState title="Fiche indisponible" description={describeFailure(error)} onRetry={() => refetch()} retrying={isFetching} />
          )}
        </Card>
      </ClientsPage>
    );
  }

  const client = data;
  const since = `Client depuis le ${formatDay(client.since)}`;

  const identity = (
    <Card className="flex flex-col gap-3">
      <h2 className="text-section-title text-foreground">Informations</h2>
      <dl className="flex flex-col divide-y divide-border">
        <Fact icon={UserRound} label="Nom complet" value={client.name} />
        <Fact icon={Phone} label="Téléphone" value={client.phone ? <a href={`tel:${client.phone}`} className="tabular-nums underline-offset-4 hover:underline">{formatPhone(client.phone)}</a> : "Non renseigné"} />
        <Fact icon={Mail} label="E-mail" value={client.email ? <a href={`mailto:${client.email}`} className="underline-offset-4 [overflow-wrap:anywhere] hover:underline">{client.email}</a> : "Non renseigné"} />
        <Fact icon={MapPin} label="Ville" value={client.city ?? "Non renseignée"} hint={client.city ? "Ville de sa dernière livraison" : undefined} />
        <Fact icon={CalendarDays} label="Client depuis" value={formatDay(client.since)} hint={client.fromMarketplace ? "Date de sa première commande" : "Enregistré par vos soins"} />
        <Fact icon={UserRound} label="Statut" value={<StatusBadge domain="customerSegment" code={client.segment} />} />
      </dl>
    </Card>
  );

  const history = (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-section-title text-foreground">Historique des commandes</h2>
        {client.recentOrders.length > 0 && (
          <Link href={ordersOf(client)} className="inline-flex min-h-6 items-center text-label font-medium whitespace-nowrap text-primary underline-offset-4 hover:underline">
            Voir toutes
          </Link>
        )}
      </div>
      {client.recentOrders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Aucune commande" description="Ce client n'a pas encore commandé dans votre boutique." />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {client.recentOrders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
      {client.orders > client.recentOrders.length && <p className="text-meta text-foreground-muted">Les {client.recentOrders.length} dernières commandes sont affichées.</p>}
    </Card>
  );

  return (
    <ClientsPage>
      {backLink}

      <Card className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Avatar name={client.name} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-page-title text-foreground [overflow-wrap:anywhere]">{client.name}</h1>
            <StatusBadge domain="customerSegment" code={client.segment} />
          </div>
          <div className="mt-1 flex flex-col gap-0.5 text-body text-foreground-muted">
            {client.phone && (
              <span className="inline-flex items-center gap-2 tabular-nums">
                <Phone className="size-4 shrink-0" aria-hidden="true" />
                {formatPhone(client.phone)}
              </span>
            )}
            {client.email && (
              <span className="inline-flex min-w-0 items-center gap-2">
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                <span className="[overflow-wrap:anywhere]">{client.email}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 max-md:w-full md:items-end">
          <DropdownMenu
            align="end"
            trigger={
              <Button className="max-md:w-full">
                Actions
                <ChevronDown className="size-4" aria-hidden="true" />
              </Button>
            }
          >
            <DropdownMenuItem asChild disabled={client.orders === 0}>
              <Link href={ordersOf(client)}>
                <ShoppingBag className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">Voir ses commandes</span>
              </Link>
            </DropdownMenuItem>
            {client.phone && (
              <DropdownMenuItem asChild>
                <a href={`tel:${client.phone}`}>
                  <Phone className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">Appeler</span>
                </a>
              </DropdownMenuItem>
            )}
            {client.email && (
              <DropdownMenuItem asChild>
                <a href={`mailto:${client.email}`}>
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">Écrire un e-mail</span>
                </a>
              </DropdownMenuItem>
            )}
          </DropdownMenu>
          <p className="text-label text-foreground-muted">{since}</p>
        </div>
      </Card>

      <KpiGrid label="Chiffres du client">
        <Figure icon={ShoppingBag} label="Commandes" value={formatUnits(client.orders)} />
        <Figure icon={Wallet} label="Total dépensé" value={formatFrancs(client.spent)} />
        <Figure icon={ShoppingCart} label="Panier moyen" value={client.deliveredOrders > 0 ? formatFrancs(client.averageBasket) : "—"} />
        <Figure icon={CalendarDays} label="Dernière commande" value={formatDay(client.lastOrderAt)} />
      </KpiGrid>
      <p className="-mt-2 text-meta text-foreground-muted">Commandes hors annulations. Total dépensé et panier moyen : commandes livrées ({formatUnits(client.deliveredOrders)}), dans votre boutique uniquement.</p>

      {/* Side by side on a wide screen; two tabs on a phone, as the mock-up draws them. */}
      <div className="hidden gap-4 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start">
        {identity}
        {history}
      </div>
      <Tabs defaultValue="overview" className="md:hidden">
        <TabsList label="Sections de la fiche">
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="orders" count={client.orders}>
            Commandes
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">{identity}</TabsContent>
        <TabsContent value="orders">{history}</TabsContent>
      </Tabs>

      {client.orders > 0 && (
        <Button asChild variant="primary" icon={ReceiptText} className="md:hidden">
          <Link href={ordersOf(client)}>Voir toutes les commandes</Link>
        </Button>
      )}
    </ClientsPage>
  );
}

function Fact({ icon: Icon, label, value, hint }: { icon: typeof Phone; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <Icon className="mt-0.5 size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-label text-foreground-muted">{label}</dt>
        <dd className="text-body font-medium text-foreground">{value}</dd>
        {hint && <dd className="text-meta text-foreground-muted">{hint}</dd>}
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: ClientOrder }) {
  return (
    <li>
      <Link href={orderPath(order.id)} className="group flex items-center gap-3 rounded-control py-2.5 outline-offset-2">
        <ShoppingBag className="size-5 shrink-0 text-foreground" strokeWidth={1.75} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-foreground tabular-nums group-hover:underline">{order.reference}</span>
          <span className="block truncate text-meta text-foreground-muted tabular-nums">
            {formatDay(order.date)} · {formatFrancs(order.amount)}
          </span>
        </span>
        <StatusBadge domain="order" code={order.status} />
        <ChevronRight className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
      </Link>
    </li>
  );
}
