"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, Send, X } from "lucide-react";
import { Avatar, Button, ConfirmDialog, DataTable, PageHeader, StatusBadge, Toolbar, ToolbarFilter, lanayaInvitationStatus, type DataTableColumn } from "@/design-system";
import { LanayaPage, formatPhone, formatShortDate } from "@/features/lanaya/components/frame";
import { NetworkTabs } from "@/features/lanaya/components/network";
import type { LanayaInvitation } from "@/features/lanaya/contract";
import { describeLanayaFailure } from "@/features/lanaya/errors";
import { useLanayaInvitations, useRevokeInvitation } from "@/features/lanaya/hooks";
import { loadStateOf } from "@/lib/query/load-state";

const STATUS_OPTIONS = [{ value: "", label: "Tous les statuts" }, ...lanayaInvitationStatus.options()];

/** What the answer of the seller was, or until when it is awaited: the date on one line, the store under it. */
function Outcome({ invitation }: { invitation: LanayaInvitation }) {
  const line = (text: string) => <span className="block whitespace-nowrap">{text}</span>;
  switch (invitation.status.value) {
    case "open":
      return line(`Jusqu'au ${formatShortDate(invitation.expires_at)}`);
    case "accepted":
      return (
        <>
          {line(`Le ${formatShortDate(invitation.accepted_at)}`)}
          {invitation.store && <span className="block truncate text-meta text-foreground-muted">{invitation.store.name}</span>}
        </>
      );
    case "expired":
      return line(`Le ${formatShortDate(invitation.expires_at)}`);
    default:
      return <span className="text-foreground-muted">—</span>;
  }
}

const COLUMNS: DataTableColumn<LanayaInvitation>[] = [
  {
    id: "seller",
    header: "Vendeur",
    mobile: "title",
    cell: (invitation) => (
      <span className="flex min-w-0 items-center gap-3">
        <Avatar name={invitation.contact_name} />
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{invitation.contact_name}</span>
          <span className="block truncate text-meta text-foreground-muted">{invitation.company_name}</span>
        </span>
      </span>
    ),
  },
  { id: "phone", header: "Téléphone", className: "whitespace-nowrap tabular-nums", cell: (invitation) => formatPhone(invitation.phone) },
  { id: "status", header: "Statut", mobile: "badge", cell: (invitation) => <StatusBadge domain="lanayaInvitation" code={invitation.status.value} /> },
  { id: "outcome", header: "Réponse", className: "@2xl:max-w-48", cell: (invitation) => <Outcome invitation={invitation} /> },
  { id: "created", header: "Envoyée le", mobile: "detail", className: "whitespace-nowrap", cell: (invitation) => formatShortDate(invitation.created_at) },
];

export function InvitationsContent() {
  const [status, setStatus] = useState("");
  const [revoking, setRevoking] = useState<LanayaInvitation | null>(null);
  const invitations = useLanayaInvitations(status || undefined);
  const revoke = useRevokeInvitation();

  async function confirmRevoke() {
    if (!revoking) return;
    try {
      await revoke.mutateAsync(revoking.id);
      toast.success("Invitation révoquée : son lien ne fonctionne plus.");
    } catch (error) {
      toast.error(describeLanayaFailure(error).message);
      throw error;
    }
  }

  return (
    <LanayaPage>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          className="min-w-0 flex-1"
          title="Invitations"
          description="Les invitations que vous avez envoyées et la réponse des vendeurs."
          hideDescriptionOnPhone
          // The form lives with the prospects (mockup 6): one place to invite from.
          primaryAction={{ label: "Inviter un vendeur", icon: Send, href: "/lanabaga/prospects#invitation" }}
        />
        <NetworkTabs current="invitations" />
      </div>

      <div className="flex min-w-0 flex-col gap-3">
          <Toolbar
            className="rounded-panel border border-border bg-surface p-3"
            filters={<ToolbarFilter label="Statut" hideLabelInline value={status} onValueChange={setStatus} options={STATUS_OPTIONS} />}
            activeFilterCount={status ? 1 : 0}
            onResetFilters={() => setStatus("")}
          />
          <DataTable
            caption="Invitations"
            header={{ title: "Invitations envoyées", description: "Son lien n'est montré qu'à la création de l'invitation." }}
            columns={COLUMNS}
            rows={invitations.data?.items ?? []}
            getRowId={(invitation) => invitation.id}
            state={loadStateOf(invitations)}
            refreshing={invitations.isFetching && invitations.isSuccess}
            error={{
              title: "Les invitations n'ont pas pu être chargées",
              description: describeLanayaFailure(invitations.error).message,
              onRetry: () => invitations.refetch(),
              retrying: invitations.isFetching,
            }}
            empty={
              status
                ? {
                    title: "Aucune invitation avec ce statut",
                    action: (
                      <Button icon={X} onClick={() => setStatus("")}>
                        Tout afficher
                      </Button>
                    ),
                  }
                : { icon: Send, title: "Aucune invitation pour l'instant", description: "Invitez un vendeur depuis la page Prospects, ou depuis la fiche d'un prospect." }
            }
            rowActions={(invitation) =>
              invitation.status.value === "open" ? (
                <Button size="compact" variant="quiet" icon={Ban} onClick={() => setRevoking(invitation)}>
                  Révoquer
                </Button>
              ) : null
            }
            mobileRowActions="footer"
          />
      </div>

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title="Révoquer cette invitation ?"
        description={revoking ? `Le lien envoyé à ${revoking.contact_name} (${revoking.company_name}) ne fonctionnera plus. Vous pourrez l'inviter de nouveau.` : ""}
        confirmLabel="Révoquer l'invitation"
        confirmIcon={Ban}
        tone="danger"
        onConfirm={confirmRevoke}
      />
    </LanayaPage>
  );
}
