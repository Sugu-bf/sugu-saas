"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Download, FileText, Info, Pencil, Plus, Star } from "lucide-react";
import { Alert, Badge, Button, DataTable, EmptyState, ErrorState, Input, FormField, Skeleton, StatusBadge, formatMoneyFromCents, formatMoneyFromFrancs, asFrancs, type DataTableColumn } from "@/design-system";
import { MethodIdentity } from "@/features/finance/components/bits";
import { useFinanceScope, useMethods, useSummary } from "@/features/finance/hooks";
import { FINANCE_SPACES, financePaths } from "@/features/finance/spaces";
import { ReadOnlyValue, SettingsGroup, SettingsPanel, describeSettingsFailure } from "@/features/settings";
import { downloadInvoice, type VendorInvoice } from "./api";
import { useRecentInvoices } from "./hooks";

// "Paiements & Facturation", frame 2 of the V9 mock-up.
//
// - The withdrawal methods are those of the wallet (V5): read here, changed
//   on the wallet's own screen, never a second list.
// - Withdrawals are asked by the seller and checked by SUGU: there is no
//   frequency nor automatic transfer to set, and the screen says so instead
//   of offering switches that nothing would apply. The minimum is SUGU's.
// - The invoices are those the shop issued for its orders, the real
//   documents, downloaded through the portal.

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const INVOICE_TONE: Record<string, "success" | "warning" | "info" | "neutral"> = {
  paid: "success",
  partially_paid: "warning",
  issued: "info",
  draft: "neutral",
};

export function PaymentsSection() {
  const scope = useFinanceScope("vendor");
  const methods = useMethods(scope);
  const summary = useSummary(scope);
  const invoices = useRecentInvoices();
  const paths = financePaths(FINANCE_SPACES.vendor);

  const columns: DataTableColumn<VendorInvoice>[] = [
    { id: "number", header: "N° facture", mobile: "title", cell: (row) => <span className="font-medium whitespace-nowrap text-foreground tabular-nums">{row.invoice_number}</span> },
    { id: "date", header: "Date", mobile: "subtitle", cell: (row) => <span className="whitespace-nowrap tabular-nums">{DATE.format(new Date(row.issued_at ?? row.created_at))}</span> },
    { id: "order", header: "Commande", mobile: "field", cell: (row) => <span className="whitespace-nowrap tabular-nums">{row.order_number ?? "—"}</span> },
    { id: "amount", header: "Montant", numeric: true, mobile: "field", cell: (row) => formatMoneyFromFrancs(asFrancs(row.total_amount)) },
    { id: "status", header: "Statut", mobile: "badge", cell: (row) => <Badge tone={INVOICE_TONE[row.status] ?? "neutral"}>{row.status_label ?? row.status}</Badge> },
    {
      id: "action",
      header: "Action",
      mobile: "field",
      cell: (row) => (
        <Button
          variant="quiet"
          size="compact"
          icon={Download}
          onClick={async () => {
            try {
              await downloadInvoice(row);
            } catch (error) {
              toast.error(describeSettingsFailure(error, { server: "La facture n'a pas pu être téléchargée. Réessayez." }).message);
            }
          }}
        >
          Télécharger
        </Button>
      ),
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <SettingsPanel title="Méthodes de retrait" description="Vos fonds sont versés sur le compte ci-dessous, quand vous en faites la demande.">
        {methods.isPending ? (
          <Skeleton className="h-[4.5rem] w-full rounded-panel" />
        ) : methods.isError ? (
          <ErrorState title="Méthodes indisponibles" description={describeSettingsFailure(methods.error).message} onRetry={() => methods.refetch()} retrying={methods.isFetching} />
        ) : (
          <div className="flex flex-col gap-3">
            {methods.data.map((method) => (
              <div key={method.id} className="flex flex-wrap items-center gap-3 rounded-panel border border-border p-3">
                <MethodIdentity method={method}>
                  {method.isDefault && (
                    <Badge tone="success" icon={Star}>
                      Principal
                    </Badge>
                  )}
                  {method.state !== "verified" && <StatusBadge domain="payoutMethod" code={method.state} />}
                </MethodIdentity>
                <Button asChild variant="secondary" size="compact" icon={Pencil} className="w-full sm:w-auto">
                  <Link href={paths.methods}>Modifier</Link>
                </Button>
              </div>
            ))}
            <Link
              href={`${paths.methods}?ajouter=1`}
              className="flex min-h-touch items-center justify-center gap-2 rounded-panel border border-dashed border-border-strong text-label text-primary hover:bg-brand-subtle"
            >
              <Plus className="size-4" aria-hidden="true" />
              Ajouter un moyen de retrait
            </Link>
          </div>
        )}
      </SettingsPanel>

      <SettingsPanel title="Paramètres de versement">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Fréquence de versement" hint="Vous demandez chaque retrait depuis votre portefeuille.">
            <ReadOnlyValue value="À la demande" locked />
          </FormField>
          <FormField label="Montant minimum" hint="Fixé par SUGU pour chaque retrait.">
            {summary.isPending ? (
              <Skeleton className="h-control w-full" />
            ) : summary.data ? (
              <Input value={formatMoneyFromCents(summary.data.limits.min, { currency: false })} readOnly suffix="FCFA" className="bg-surface-subtle tabular-nums" />
            ) : (
              <ReadOnlyValue value={null} placeholder="Indisponible pour le moment" />
            )}
          </FormField>
        </div>
        <Alert tone="info" title="Les versements sont faits à votre demande">
          Les ventes livrées rejoignent votre solde 72 heures après la livraison. Vous demandez ensuite un retrait depuis{" "}
          <Link href={paths.withdraw} className="font-medium underline underline-offset-2">
            votre portefeuille
          </Link>
          ; SUGU le verse sur votre méthode principale vérifiée. Aucun virement automatique n&apos;est programmé.
        </Alert>
      </SettingsPanel>

      <SettingsPanel title="Historique des factures" description="Les factures émises pour les commandes de votre boutique.">
        {invoices.isPending ? (
          <Skeleton className="h-40 w-full rounded-panel" />
        ) : invoices.isError ? (
          <ErrorState title="Factures indisponibles" description={describeSettingsFailure(invoices.error).message} onRetry={() => invoices.refetch()} retrying={invoices.isFetching} />
        ) : invoices.data.invoices.length === 0 ? (
          <EmptyState icon={FileText} title="Aucune facture" description="Les factures apparaissent ici dès que vous en émettez une depuis une commande." />
        ) : (
          <SettingsGroup title={`${invoices.data.invoices.length} sur ${invoices.data.total}`} className="gap-3">
            <DataTable columns={columns} rows={invoices.data.invoices} getRowId={(row) => row.id} caption="Factures récentes" empty={{ title: "Aucune facture", icon: FileText }} />
            <p className="flex items-center gap-1.5 text-meta text-foreground-muted">
              <Info className="size-3.5" aria-hidden="true" />
              Les factures se créent depuis le détail d&apos;une commande.
            </p>
          </SettingsGroup>
        )}
      </SettingsPanel>
    </div>
  );
}
