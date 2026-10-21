"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ChevronRight, CircleCheck, Clock, FileSignature, HandCoins, Package, Send, ShieldCheck, Store, UserPlus, Users } from "lucide-react";
import { Avatar, Badge, Button, Card, DataTable, ErrorState, PageHeader, Skeleton, Stat, StatusBadge, type DataTableColumn } from "@/design-system";
import { useSession } from "@/features/auth";
import { KpiRow, LanayaPage, Panel, formatDate, formatPhone, formatRelative } from "@/features/lanaya/components/frame";
import { useLanayaOverview } from "@/features/lanaya/hooks";
import type { LanayaInvitation, LanayaOverview } from "@/features/lanaya/contract";
import { describeLanayaFailure } from "@/features/lanaya/errors";

/**
 * Tableau de bord du Lanabaga (maquette 8). Every figure comes from the
 * server; before the assignments of Lot 2 no seller is "active", and the
 * board says so. No chart (the mission asks for a light home), and the
 * commissions block says plainly that nothing is computed in this phase.
 */
export function DashboardContent() {
  const { data: user } = useSession();
  const overview = useLanayaOverview();
  const firstName = user?.name?.split(" ")[0] ?? "";

  const header = (
    <PageHeader
      title={firstName ? `Bonjour, ${firstName}` : "Bonjour"}
      titleAddon={<Badge tone="success" icon={CircleCheck}>Compte admis</Badge>}
      description="Voici un aperçu de votre espace Lanabaga et des actions à suivre."
      hideDescriptionOnPhone
      primaryAction={{ label: "Inviter un vendeur", icon: Send, href: "/lanabaga/prospects#invitation" }}
    />
  );

  if (overview.isError) {
    return (
      <LanayaPage>
        {header}
        <Card flush>
          <ErrorState title="Le tableau de bord n'a pas pu être chargé" description={describeLanayaFailure(overview.error).message} onRetry={() => overview.refetch()} retrying={overview.isFetching} />
        </Card>
      </LanayaPage>
    );
  }

  const data = overview.data;
  const loading = !overview.isSuccess;

  return (
    <LanayaPage aria-busy={loading || undefined}>
      {header}

      <KpiRow label="Votre activité">
        <Stat layout="figure" label="Vendeurs actifs" icon={Users} value={data ? `${data.capacity.active} / ${data.capacity.effective}` : "—"} hint="Sur votre capacité actuelle" loading={loading} />
        <Stat layout="figure" label="Invitations en attente" icon={Send} value={data?.counts.invitations_open ?? "—"} hint="En attente de réponse" loading={loading} />
        <Stat layout="figure" label="Actions requises" icon={AlertTriangle} value={data?.counts.actions_required ?? "—"} hint="À traiter rapidement" loading={loading} />
        <Stat layout="figure" label="Capacité disponible" icon={Package} value={data?.capacity.available ?? "—"} hint="Places disponibles" loading={loading} />
      </KpiRow>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SellersCard data={data} loading={loading} />
        <ActionsCard data={data} loading={loading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <RecentLeadsCard data={data} loading={loading} />
        <StatusCard data={data} loading={loading} />
        <CommissionsCard />
      </div>
    </LanayaPage>
  );
}

const SELLER_COLUMNS: DataTableColumn<LanayaInvitation>[] = [
  {
    id: "seller",
    header: "Vendeur",
    mobile: "title",
    cell: (seller) => (
      <span className="flex min-w-0 items-center gap-3">
        <Avatar name={seller.store?.name ?? seller.company_name} />
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{seller.store?.name ?? seller.company_name}</span>
          <span className="block truncate text-meta text-foreground-muted tabular-nums">{formatPhone(seller.phone)}</span>
        </span>
      </span>
    ),
  },
  {
    id: "status",
    header: "Statut",
    mobile: "badge",
    cell: (seller) => (seller.store_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>),
  },
  { id: "city", header: "Ville", cell: (seller) => seller.store?.city ?? <span className="text-foreground-muted">—</span>, mobileCell: (seller) => seller.store?.city ?? null },
  { id: "accepted", header: "Présentée le", className: "whitespace-nowrap", cell: (seller) => formatDate(seller.accepted_at) },
];

function SellersCard({ data, loading }: { data?: LanayaOverview; loading: boolean }) {
  return (
    <DataTable
      caption="Mes vendeurs"
      header={{
        title: "Mes vendeurs",
        description: "Les boutiques que vous avez présentées à SUGU.",
        actions: (
          <Button asChild size="compact" variant="outline" trailingIcon={ArrowRight}>
            <Link href="/lanabaga/sellers">Voir tous les vendeurs</Link>
          </Button>
        ),
      }}
      columns={SELLER_COLUMNS}
      rows={data?.sellers ?? []}
      getRowId={(seller) => seller.id}
      state={loading ? "loading" : "ready"}
      loadingRowCount={3}
      tableFrom="narrow"
      empty={{
        icon: Store,
        title: "Aucun vendeur présenté pour l'instant",
        description: "Une boutique apparaît ici quand son propriétaire accepte votre invitation.",
        action: (
          <Button asChild size="compact" variant="outline" icon={UserPlus}>
            <Link href="/lanabaga/prospects">Ajouter un prospect</Link>
          </Button>
        ),
      }}
    />
  );
}

const ACTION_COPY: Record<string, { title: string; body: (count: number) => string; href: string; icon: typeof Clock }> = {
  invitations_expiring: {
    title: "Invitations bientôt expirées",
    body: (n) => `${n} invitation${n > 1 ? "s expirent" : " expire"} dans moins de 3 jours.`,
    href: "/lanabaga/invitations",
    icon: Clock,
  },
  invitations_waiting: {
    title: "Invitations en attente",
    body: (n) => `${n} invitation${n > 1 ? "s sont" : " est"} en attente de réponse depuis plus de 5 jours.`,
    href: "/lanabaga/invitations",
    icon: Send,
  },
};

function ActionsCard({ data, loading }: { data?: LanayaOverview; loading: boolean }) {
  // The moment the board was opened: the count of days stays stable across renders.
  const [now] = useState(() => Date.now());
  const agreementSoon = (() => {
    const until = data?.profile.agreement?.valid_until;
    if (!until) return null;
    const days = Math.ceil((new Date(until).getTime() - now) / 86_400_000);
    return days <= 30 ? days : null;
  })();
  const count = (data?.actions.length ?? 0) + (agreementSoon !== null ? 1 : 0);

  return (
    <Panel title="Actions prioritaires" description="Les éléments qui demandent votre attention." actions={count > 0 ? <Badge tone="warning">{`${count} action${count > 1 ? "s" : ""}`}</Badge> : undefined}>
      {loading ? (
        <Skeleton className="h-24 rounded-control" />
      ) : count === 0 ? (
        <p className="text-body text-foreground-muted">Rien à traiter pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {agreementSoon !== null && (
            <ActionRow icon={FileSignature} title="Convention à renouveler" body={`Votre convention arrive à échéance dans ${agreementSoon} jour${agreementSoon > 1 ? "s" : ""}.`} href="/lanabaga/compliance" />
          )}
          {data?.actions.map((action) => {
            const copy = ACTION_COPY[action.key];
            return copy ? <ActionRow key={action.key} icon={copy.icon} title={copy.title} body={copy.body(action.count)} href={copy.href} /> : null;
          })}
        </ul>
      )}
    </Panel>
  );
}

function ActionRow({ icon: Icon, title, body, href }: { icon: typeof Clock; title: string; body: string; href: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-control border border-border p-3 hover:bg-surface-subtle focus-visible:outline-2">
        <Icon className="size-5 shrink-0 text-foreground-subtle" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium text-foreground">{title}</span>
          <span className="block text-label font-normal text-foreground-muted">{body}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
      </Link>
    </li>
  );
}

function RecentLeadsCard({ data, loading }: { data?: LanayaOverview; loading: boolean }) {
  return (
    <Panel
      title="Prospects récents"
      description="Les derniers prospects ajoutés."
      actions={
        <Button asChild size="compact" variant="quiet" trailingIcon={ArrowRight}>
          <Link href="/lanabaga/prospects">Voir tous</Link>
        </Button>
      }
    >
      {loading ? (
        <Skeleton className="h-28 rounded-control" />
      ) : !data || data.recent_leads.length === 0 ? (
        <p className="text-body text-foreground-muted">Aucun prospect pour l&apos;instant.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.recent_leads.map((lead) => (
            <li key={lead.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <Avatar name={lead.contact_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-foreground">{lead.contact_name}</p>
                <p className="truncate text-meta text-foreground-muted">{lead.city}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-meta text-foreground-subtle">{formatRelative(lead.created_at)}</span>
                <StatusBadge domain="lanayaLead" code={lead.status.value} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function StatusCard({ data, loading }: { data?: LanayaOverview; loading: boolean }) {
  const agreement = data?.profile.agreement;
  return (
    <Panel title="Statut Lanaya" description="État de votre compte et de votre conformité.">
      {loading || !data ? (
        <Skeleton className="h-28 rounded-control" />
      ) : (
        <ul className="flex flex-col gap-2">
          <StatusRow icon={FileSignature} ok={!!agreement?.in_force} title={agreement?.in_force ? "Convention valide" : "Convention à régulariser"} body={agreement ? `Signée le ${formatDate(agreement.signed_at)}${agreement.valid_until ? `, jusqu'au ${formatDate(agreement.valid_until)}` : ""}` : "Aucune convention en vigueur"} />
          <StatusRow icon={ShieldCheck} ok={data.profile.identity_status.value === "verified"} title={`Identité : ${data.profile.identity_status.label}`} body="Vérifiée par l'équipe Risk & Compliance de SUGU" />
          {/* Pas de badge avant qu'il ne soit gagné (cahier §16-17) : un niveau, sans score. */}
          <StatusRow icon={Users} ok title={`Niveau : ${data.level.label}`} body="Aucun badge n'est attribué pendant le pilote : il se mérite par des commandes réellement accompagnées." />
        </ul>
      )}
    </Panel>
  );
}

function StatusRow({ icon: Icon, ok, title, body }: { icon: typeof Clock; ok: boolean; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3 rounded-control border border-border p-3">
      <Icon className={ok ? "mt-0.5 size-5 shrink-0 text-success-icon" : "mt-0.5 size-5 shrink-0 text-warning-icon"} aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-body font-medium text-foreground">{title}</span>
        <span className="block text-label font-normal text-foreground-muted">{body}</span>
      </span>
    </li>
  );
}

/** Required by the specification (§21.1, mission §26): shown, and honestly empty. */
function CommissionsCard() {
  return (
    <Panel title="Commissions et honoraires" description="Votre rémunération Lanaya.">
      <div className="flex items-start gap-3">
        <HandCoins className="mt-0.5 size-5 shrink-0 text-foreground-subtle" aria-hidden="true" />
        <p className="text-body text-foreground-muted">
          Pas encore ouvert : aucune commission n&apos;est calculée pendant cette phase du programme. Présenter une boutique ne donne pas, à lui seul, droit à une commission.
        </p>
      </div>
    </Panel>
  );
}
