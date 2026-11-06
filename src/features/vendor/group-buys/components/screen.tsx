"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, Banknote, CheckCircle2, Hourglass, Package, RefreshCw, Settings2, ShoppingBag, Tags, Users } from "lucide-react";
import { Alert, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton, Stat, Tabs, TabsContent, TabsList, TabsTrigger, asCents, centsToFrancs } from "@/design-system";
import { Amount, formatUnits } from "@/features/vendor/clients/components/bits";
import type { GroupBuy, GroupBuyList, GroupBuyPage, StoreGroupBuying } from "../contract";
import { useGroupBuySummary, useGroupBuyingSettings, useGroupBuys } from "../hooks";
import { GROUP_BUYING_SETTINGS, GroupBuyCard, GroupBuysPage, GroupListSkeleton, PRODUCTS, describeLoadFailure, useServerNow } from "./bits";

const TAB_PARAM = "onglet";
const PAST_TAB = "termines";

/**
 * `/vendor/group-buys`: the groups customers run on the seller's products.
 * Two lists of one page, running and past (`?onglet=termines`), under the
 * figures of the last 30 days. Everything is the server's: states, prices,
 * quantities and counts; the page only measures the time left.
 */
export function GroupBuysScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const list: GroupBuyList = params.get(TAB_PARAM) === PAST_TAB ? "past" : "running";

  const summary = useGroupBuySummary();
  const settings = useGroupBuyingSettings();
  const stores = settings.data?.stores ?? null;
  const switchedOff = stores !== null && stores.length > 0 && stores.every((store) => !store.enabled);

  const setList = (next: string) => router.replace(next === "past" ? `${pathname}?${TAB_PARAM}=${PAST_TAB}` : pathname, { scroll: false });

  return (
    <GroupBuysPage>
      <PageHeader
        title="Achats groupés"
        description="Vos clients se regroupent pour atteindre vos prix par quantité : chaque palier atteint fait baisser le prix pour tout le groupe."
        hideDescriptionOnPhone
        secondaryActions={[{ label: "Réglages", icon: Settings2, href: GROUP_BUYING_SETTINGS }]}
      />

      {switchedOff && (
        <Alert
          tone="info"
          title="L'achat groupé est désactivé"
          actionsPlacement="end"
          actions={
            <Button asChild size="compact" icon={Settings2}>
              <Link href={GROUP_BUYING_SETTINGS}>Activer l&apos;achat groupé</Link>
            </Button>
          }
        >
          Vos clients ne peuvent pas lancer de groupe sur vos produits.
        </Alert>
      )}

      <SummaryBand summary={summary} />

      <Tabs value={list} onValueChange={setList}>
        <TabsList label="Groupes">
          <TabsTrigger value="running" count={summary.data?.running}>
            En cours
          </TabsTrigger>
          <TabsTrigger value="past">Terminés</TabsTrigger>
        </TabsList>
        <TabsContent value="running">
          <GroupList list="running" stores={stores} />
        </TabsContent>
        <TabsContent value="past">
          <GroupList list="past" stores={stores} />
        </TabsContent>
      </Tabs>
    </GroupBuysPage>
  );
}

// ── The last 30 days ────────────────────────────────────────

function SummaryBand({ summary }: { summary: ReturnType<typeof useGroupBuySummary> }) {
  const headingId = useId();

  if (summary.isError) {
    return (
      <Alert
        tone="warning"
        title="Les chiffres des 30 derniers jours n'ont pas pu être chargés."
        actions={
          <Button size="compact" icon={RefreshCw} loading={summary.isFetching} onClick={() => void summary.refetch()}>
            Réessayer
          </Button>
        }
      />
    );
  }

  const data = summary.data;
  const loading = summary.isPending;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-label font-medium text-foreground-muted">
        Ces 30 derniers jours
      </h2>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 2xl:grid-cols-6">
        <Stat layout="figure" icon={Users} label="Groupes lancés" value={data && formatUnits(data.groupsStarted)} loading={loading} />
        <Stat layout="figure" icon={CheckCircle2} label="Prix obtenus" value={data && formatUnits(data.groupsLocked)} loading={loading} />
        <Stat layout="figure" icon={Hourglass} label="En cours" value={data && formatUnits(data.running)} hint="en ce moment" loading={loading} />
        <Stat layout="figure" icon={ShoppingBag} label="Commandes" value={data && formatUnits(data.orders)} loading={loading} />
        <Stat layout="figure" icon={Package} label="Unités commandées" value={data && formatUnits(data.units)} loading={loading} />
        <Stat layout="figure" icon={Banknote} label="Chiffre d'affaires" value={data && <Amount francs={centsToFrancs(asCents(data.revenue))} />} loading={loading} />
      </div>
    </section>
  );
}

// ── A list ──────────────────────────────────────────────────

/** The groups of every page loaded. One opened between two pages pushes the others down: it would come twice. */
function uniqueGroups(pages: GroupBuyPage[]): GroupBuy[] {
  const seen = new Set<string>();
  const groups: GroupBuy[] = [];
  for (const page of pages) {
    for (const group of page.items) {
      if (seen.has(group.code)) continue;
      seen.add(group.code);
      groups.push(group);
    }
  }
  return groups;
}

function GroupList({ list, stores }: { list: GroupBuyList; stores: StoreGroupBuying[] | null }) {
  const query = useGroupBuys(list);
  const pages = query.data?.pages ?? [];
  const groups = uniqueGroups(pages);
  // The page read last carries the freshest "now" of the server.
  const serverNow = useServerNow(pages[pages.length - 1]?.clock ?? null);
  const label = list === "running" ? "Groupes en cours" : "Groupes terminés";

  if (query.isPending) {
    return (
      <>
        <span className="sr-only" role="status">
          Chargement des groupes…
        </span>
        <GroupListSkeleton />
      </>
    );
  }

  if (query.isError && groups.length === 0) {
    return (
      <Card>
        <ErrorState title="Groupes indisponibles" description={describeLoadFailure(query.error)} onRetry={() => void query.refetch()} retrying={query.isFetching} />
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <Card>
        <EmptyGroups list={list} stores={stores} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul aria-label={label} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <li key={group.code} className="min-w-0">
            <GroupBuyCard group={group} serverNow={serverNow} showStore={(stores?.length ?? 0) > 1} />
          </li>
        ))}
      </ul>
      {query.isFetchNextPageError ? (
        <p role="alert" className="text-meta text-danger-fg">
          Les groupes suivants n&apos;ont pas pu être chargés. Réessayez.
        </p>
      ) : (
        query.isRefetchError && (
          <p role="alert" className="text-meta text-danger-fg">
            La liste n&apos;a pas pu être actualisée : elle peut ne plus être à jour.
          </p>
        )
      )}
      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button onClick={() => void query.fetchNextPage()} loading={query.isFetchingNextPage}>
            Afficher plus de groupes
          </Button>
        </div>
      )}
    </div>
  );
}

/** Says why the list is empty, and what would fill it. */
function EmptyGroups({ list, stores }: { list: GroupBuyList; stores: StoreGroupBuying[] | null }) {
  if (list === "past") {
    return <EmptyState icon={Archive} title="Aucun groupe terminé" description="Les groupes clos, qu'ils aient obtenu leur prix ou non, restent visibles ici." />;
  }

  const enabled = stores?.filter((store) => store.enabled) ?? [];
  if (stores && stores.length > 0 && enabled.length === 0) {
    // The banner above the figures carries the way to turn it on.
    return <EmptyState icon={Users} title="Aucun groupe en cours" description="L'achat groupé est désactivé : vos clients ne peuvent pas encore se regrouper sur vos produits." />;
  }
  if (enabled.length > 0 && enabled.every((store) => store.productsWithTiers === 0)) {
    return (
      <EmptyState
        icon={Tags}
        title="Aucun groupe en cours"
        description="Ajoutez des prix par quantité à vos produits pour qu'ils puissent être achetés en groupe."
        action={
          <Button asChild variant="primary" icon={Package}>
            <Link href={PRODUCTS}>Voir mes produits</Link>
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={Users}
      title="Aucun groupe en cours"
      description="Un client lance un groupe depuis la fiche d'un produit qui a des prix par quantité, puis le partage à ses proches. Les groupes en cours apparaîtront ici."
    />
  );
}

/** What the page shows before its screen has read the address. */
export function GroupBuysLoading() {
  return (
    <GroupBuysPage aria-busy>
      <Skeleton className="h-9 w-64 max-w-full" />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 2xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-panel" />
        ))}
      </div>
      <Skeleton className="h-10 w-56 max-w-full" />
      <GroupListSkeleton />
    </GroupBuysPage>
  );
}
