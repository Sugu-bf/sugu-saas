"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BarChart3, Eye, Mail, MessageCircle, Phone, Send, UserPlus, Users, X } from "lucide-react";
import {
  Avatar,
  Button,
  DataTable,
  DescriptionList,
  FormField,
  PageHeader,
  Select,
  Sheet,
  SheetContent,
  Stat,
  StatusBadge,
  Toolbar,
  ToolbarFilter,
  ToolbarSearch,
  lanayaLeadStatus,
  type DataTableColumn,
} from "@/design-system";
import { KpiRow, LanayaPage, formatDate, formatPhone, formatRelative } from "@/features/lanaya/components/frame";
import { AddLeadDialog, CapacityCard, NetworkTabs, QuickInvitation } from "@/features/lanaya/components/network";
import type { LanayaLead, LeadFilters } from "@/features/lanaya/contract";
import { describeLanayaFailure } from "@/features/lanaya/errors";
import { useLanayaLeads, useLanayaOverview, useUpdateLead } from "@/features/lanaya/hooks";
import { loadStateOf } from "@/lib/query/load-state";

const STATUS_OPTIONS = [{ value: "", label: "Tous les statuts" }, ...lanayaLeadStatus.options()];
const PERIOD_OPTIONS = [
  { value: "", label: "Toute la période" },
  { value: "7", label: "7 derniers jours" },
  { value: "30", label: "30 derniers jours" },
  { value: "90", label: "90 derniers jours" },
];
/** The statuses a Lanabaga sets by hand; "Invitation envoyée" and "Converti" follow the invitations. */
const MANUAL_STATUSES = ["prospect", "contacted", "no_response", "lost"];

const PAGE_SIZE = 10;

function LeadCell({ lead }: { lead: LanayaLead }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={lead.contact_name} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground">{lead.contact_name}</span>
        <span className="block truncate text-meta text-foreground-muted">{lead.company_name}</span>
      </span>
    </span>
  );
}

export function ProspectsContent() {
  const [filters, setFilters] = useState<LeadFilters>({ page: 1 });
  const [searchInput, setSearchInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [opened, setOpened] = useState<LanayaLead | null>(null);
  const [inviting, setInviting] = useState<LanayaLead | null>(null);

  const leads = useLanayaLeads(filters);
  const overview = useLanayaOverview();
  const page = leads.data;
  const summary = page?.summary;
  const narrowed = Boolean(filters.status || filters.city || filters.period || filters.search);

  const setFilter = (patch: Partial<LeadFilters>) => setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  const clear = () => {
    setSearchInput("");
    setFilters({ page: 1 });
  };

  const conversion = summary && summary.total > 0 ? Math.round((summary.converted / summary.total) * 100) : null;

  const columns: DataTableColumn<LanayaLead>[] = [
    { id: "lead", header: "Prospect", mobile: "title", className: "@2xl:max-w-44", cell: (lead) => <LeadCell lead={lead} /> },
    { id: "phone", header: "Contact", className: "whitespace-nowrap tabular-nums", cell: (lead) => formatPhone(lead.phone) },
    { id: "city", header: "Ville", className: "whitespace-nowrap", cell: (lead) => lead.city },
    // Beside the invitation form there is no room for it: it stays on the sheet of the prospect and in the phone card.
    { id: "source", header: "Source", mobile: "detail", className: "@2xl:hidden @[56rem]:table-cell", cell: (lead) => lead.declared_source.label },
    { id: "status", header: "Statut", mobile: "badge", cell: (lead) => <StatusBadge domain="lanayaLead" code={lead.status.value} /> },
    { id: "activity", header: "Dernière activité", mobile: "detail", className: "whitespace-nowrap", cell: (lead) => formatRelative(lead.last_activity_at) },
  ];

  function invite(lead: LanayaLead) {
    setOpened(null);
    setInviting(lead);
    requestAnimationFrame(() => document.getElementById("invitation")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <LanayaPage>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader className="min-w-0 flex-1" title="Prospects" description="Gérez vos prospects, suivez les invitations et convertissez-les en vendeurs." hideDescriptionOnPhone />
        <NetworkTabs current="prospects" />
      </div>

      <KpiRow label="Vos prospects" columns={3}>
        <Stat layout="figure" label="Prospects actifs" icon={Users} value={summary?.active ?? "—"} hint="Nouveaux et en discussion" loading={!summary && !leads.isError} />
        <Stat layout="figure" label="Invitations en attente" icon={Mail} value={summary?.invitations_open ?? "—"} hint="En attente de réponse" loading={!summary && !leads.isError} />
        <Stat
          layout="figure"
          label="Taux de conversion"
          icon={BarChart3}
          value={conversion === null ? "—" : `${conversion} %`}
          hint={summary ? (summary.total > 0 ? `${summary.converted} vendeur${summary.converted > 1 ? "s" : ""} sur ${summary.total} prospect${summary.total > 1 ? "s" : ""}` : "Aucun prospect pour l'instant") : undefined}
          loading={!summary && !leads.isError}
        />
      </KpiRow>

      {/* The form beside the list from 1400 px (mockup 6); under it before, where the list needs the whole width. */}
      <div className="grid items-start gap-4 min-[87.5rem]:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-3">
          <Toolbar
            className="rounded-panel border border-border bg-surface p-3"
            search={<ToolbarSearch label="Rechercher un prospect, un téléphone" value={searchInput} onValueChange={setSearchInput} onSubmit={(value) => setFilter({ search: value.trim() || undefined })} />}
            filters={
              <>
                <ToolbarFilter label="Statut" hideLabelInline value={filters.status ?? ""} onValueChange={(value) => setFilter({ status: value || undefined })} options={STATUS_OPTIONS} />
                {(page?.cities.length ?? 0) > 1 && (
                  <ToolbarFilter
                    label="Ville"
                    hideLabelInline
                    value={filters.city ?? ""}
                    onValueChange={(value) => setFilter({ city: value || undefined })}
                    options={[{ value: "", label: "Toutes les villes" }, ...(page?.cities ?? []).map((city) => ({ value: city, label: city }))]}
                  />
                )}
                <ToolbarFilter label="Période" hideLabelInline value={filters.period ?? ""} onValueChange={(value) => setFilter({ period: value || undefined })} options={PERIOD_OPTIONS} />
              </>
            }
            activeFilterCount={(filters.status ? 1 : 0) + (filters.city ? 1 : 0) + (filters.period ? 1 : 0)}
            onResetFilters={clear}
            countAction={
              narrowed ? (
                <Button variant="quiet" size="compact" icon={X} onClick={clear}>
                  Tout afficher
                </Button>
              ) : undefined
            }
          />

          <DataTable
            caption="Prospects"
            density="compact"
            header={{
              title: "Liste des prospects",
              description: "Tous vos prospects et leur statut d'évolution.",
              actions: (
                <Button variant="outline" size="compact" icon={UserPlus} onClick={() => setAdding(true)}>
                  Ajouter un prospect
                </Button>
              ),
            }}
            columns={columns}
            rows={page?.items ?? []}
            getRowId={(lead) => lead.id}
            state={loadStateOf(leads)}
            refreshing={leads.isFetching && leads.isSuccess}
            error={{ title: "Les prospects n'ont pas pu être chargés", description: describeLanayaFailure(leads.error).message, onRetry: () => leads.refetch(), retrying: leads.isFetching }}
            empty={
              narrowed
                ? { title: "Aucun prospect ne correspond", description: "Modifiez la recherche ou les filtres.", action: <Button icon={X} onClick={clear}>Tout afficher</Button> }
                : {
                    icon: UserPlus,
                    title: "Aucun prospect pour l'instant",
                    description: "Ajoutez les vendeurs que vous connaissez et qui acceptent d'être contactés.",
                    action: (
                      <Button variant="outline" icon={UserPlus} onClick={() => setAdding(true)}>
                        Ajouter un prospect
                      </Button>
                    ),
                  }
            }
            rowActionsLabel="Actions"
            mobileRowActions="footer"
            rowActions={(lead) => (
              <Button size="compact" icon={Eye} onClick={() => setOpened(lead)}>
                Voir
              </Button>
            )}
            pagination={
              page && page.meta.total > PAGE_SIZE
                ? { page: page.meta.current_page, pageSize: PAGE_SIZE, total: page.meta.total, onPageChange: (next) => setFilter({ page: next }), itemLabel: "prospects", variant: "numbered" }
                : undefined
            }
          />
        </div>

        <div className="grid min-w-0 items-start gap-4 md:grid-cols-2 min-[87.5rem]:grid-cols-1">
          <QuickInvitation id="invitation" lead={inviting} onLeadUsed={() => setInviting(null)} />
          <CapacityCard capacity={overview.data?.capacity} loading={overview.isPending} />
        </div>
      </div>

      <AddLeadDialog open={adding} onOpenChange={setAdding} />
      <LeadSheet lead={opened} onClose={() => setOpened(null)} onInvite={invite} />
    </LanayaPage>
  );
}

function LeadSheet({ lead, onClose, onInvite }: { lead: LanayaLead | null; onClose: () => void; onInvite: (lead: LanayaLead) => void }) {
  const update = useUpdateLead();
  const manual = lead ? MANUAL_STATUSES.includes(lead.status.value) : false;

  async function changeStatus(status: string) {
    if (!lead || status === lead.status.value) return;
    try {
      await update.mutateAsync({ id: lead.id, input: { status } });
      toast.success("Statut du prospect mis à jour.");
      onClose();
    } catch (error) {
      toast.error(describeLanayaFailure(error).message);
    }
  }

  const digits = lead?.phone.replace(/\D/g, "") ?? "";
  const canInvite = lead ? !["invited", "registered"].includes(lead.status.value) : false;

  return (
    <Sheet open={lead !== null} onOpenChange={(open) => !open && onClose()}>
      {lead && (
        <SheetContent
          title={lead.contact_name}
          description={lead.company_name}
          footer={
            canInvite ? (
              <Button variant="primary" icon={Send} onClick={() => onInvite(lead)} className="w-full">
                Inviter ce prospect
              </Button>
            ) : undefined
          }
        >
          <div className="flex flex-col gap-4">
            <StatusBadge domain="lanayaLead" code={lead.status.value} />
            <DescriptionList
              layout="stacked"
              items={[
                { label: "Téléphone", value: <span className="tabular-nums">{formatPhone(lead.phone)}</span>, icon: Phone },
                { label: "E-mail", value: lead.email ?? "—", icon: Mail },
                { label: "Ville", value: lead.city },
                { label: "Secteur", value: lead.sector ?? "—" },
                { label: "Source", value: lead.declared_source.label },
                { label: "Votre lien", value: lead.relation_to_lanabaga ?? "—" },
                { label: "Ajouté le", value: formatDate(lead.created_at) },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Button asChild size="compact" icon={Phone}>
                <a href={`tel:+${digits}`}>Appeler</a>
              </Button>
              <Button asChild size="compact" icon={MessageCircle}>
                <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </Button>
            </div>
            {manual ? (
              <FormField label="Statut du suivi" hint="« Invitation envoyée » et « Converti » suivent ses invitations.">
                <Select value={lead.status.value} onChange={(e) => changeStatus(e.target.value)} disabled={update.isPending} options={lanayaLeadStatus.options().filter((option) => MANUAL_STATUSES.includes(option.value))} />
              </FormField>
            ) : (
              <p className="text-label font-normal text-foreground-muted">
                {lead.status.value === "registered" ? "Ce prospect a accepté votre invitation : sa boutique figure dans vos vendeurs." : "Une invitation est en cours : son statut suit la réponse du vendeur."}
              </p>
            )}
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
