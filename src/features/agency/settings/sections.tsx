"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike, Car, Crown, MessageSquare, Package, Pencil, Plus, Star, Truck, Users } from "lucide-react";
import { Alert, Badge, Button, EmptyState, ErrorState, FormField, Input, Skeleton, StatusBadge, Textarea, formatMoneyFromCents } from "@/design-system";
import { MethodIdentity } from "@/features/finance/components/bits";
import { useFinanceScope, useMethods, useSummary } from "@/features/finance/hooks";
import { FINANCE_SPACES, financePaths } from "@/features/finance/spaces";
import { isForbidden } from "@/features/finance/wording";
import { CountedTextarea, ImageField, PhoneInput, ReadOnlyValue, SecuritySection, SettingsForm, SettingsGroup, SettingsPanel, ToggleRow, describeSettingsFailure, useDraft } from "@/features/settings";
import {
  AGENCY_PASSWORD_FIELDS,
  changeAgencyPassword,
  fetchAgencyAccount,
  fetchAgencySecurity,
  fetchAgencyZones,
  revokeAgencySession,
  revokeOtherAgencySessions,
  saveAgencyAccount,
  saveAgencySettings,
  uploadAgencyLogo,
  type AgencySettingsModel,
} from "./api";

export const agencySettingsKey = (agencyId: string) => ["agency", agencyId, "settings", "v9"] as const;

// ── Mon agence ────────────────────────────────────────────────

interface AgencyValues {
  name: string;
  rccm: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  quartier: string;
  city: string;
}

const SERVER_FIELDS: Record<string, keyof AgencyValues> = {
  agencyName: "name",
  rccm: "rccm",
  description: "description",
  phonePrimary: "phone",
  email: "email",
  address: "address",
  quartier: "quartier",
  city: "city",
};

/** Frame 5 of the V9 mock-up: the identity of the agency, its contact, where it is, where it delivers. */
export function AgencyIdentitySection({ agencyId, model, onOpenZones }: { agencyId: string; model: AgencySettingsModel; onOpenZones: string }) {
  const client = useQueryClient();
  const draft = useDraft<AgencyValues>(
    { name: model.name, rccm: model.rccm, description: model.description, phone: model.phone, email: model.email, address: model.address, quartier: model.quartier, city: model.city },
    "agency-identity",
  );
  const zones = useQuery({ queryKey: ["agency", agencyId, "zones"], queryFn: () => fetchAgencyZones(agencyId), staleTime: 15_000 });
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const { values, set, errors } = draft;
  const locked = !model.canEditIdentity;

  const submit = async () => {
    if (lock.current) return;
    const local: Record<string, string> = {};
    if (values.name.trim().length < 2) local.name = "Indiquez le nom de l'agence.";
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) local.email = "Cette adresse e-mail n'est pas valide.";
    if (values.phone && !/^\+?[0-9 ().-]{6,32}$/.test(values.phone.trim())) local.phone = "Ce numéro n'est pas valide.";
    draft.setErrors(local);
    if (Object.keys(local).length > 0) return;

    lock.current = true;
    setSaving(true);
    try {
      await saveAgencySettings(agencyId, {
        // Name and registration are the owner's: a manager never sends them.
        ...(model.canEditIdentity ? { agencyName: values.name.trim(), rccm: values.rccm.trim() || null } : {}),
        description: values.description.trim() || null,
        email: values.email.trim() || null,
        phonePrimary: values.phone.trim() || null,
        address: values.address.trim() || null,
        quartier: values.quartier.trim() || null,
        city: values.city.trim() || null,
      });
      draft.accept(values);
      await client.invalidateQueries({ queryKey: agencySettingsKey(agencyId) });
      toast.success("Informations de l'agence enregistrées.");
    } catch (error) {
      const failure = describeSettingsFailure(error);
      const fields: Record<string, string> = {};
      for (const [field, message] of Object.entries(failure.fields)) {
        const mapped = SERVER_FIELDS[field];
        if (mapped) fields[mapped] = message;
      }
      draft.setErrors(fields);
      toast.error(failure.message);
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  const initials = (model.name || "A")
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return (
    <SettingsForm
      title="Mon agence"
      description="Informations générales de votre agence de livraison"
      dirty={draft.dirty}
      saving={saving}
      onSubmit={submit}
      onReset={draft.reset}
      submitLabel="Enregistrer"
      notice={
        locked ? (
          <Alert tone="info" title="Le nom, l'immatriculation et le logo sont réservés au propriétaire">
            Vous pouvez modifier la description, les coordonnées et l&apos;adresse de l&apos;agence.
          </Alert>
        ) : undefined
      }
    >
      <div className="grid min-w-0 gap-8 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <SettingsGroup title="Logo de l'agence">
            <ImageField
              label="Logo de l'agence"
              url={model.logoUrl}
              placeholder={<span className="flex size-full items-center justify-center bg-brand text-section-title font-bold text-white">{initials}</span>}
              maxBytes={2 * 1024 * 1024}
              hint="PNG, JPG (max. 2 Mo)"
              buttonLabel="Changer le logo"
              disabled={locked}
              disabledReason="Seul le propriétaire peut changer le logo."
              onUpload={async (file) => {
                await uploadAgencyLogo(agencyId, file);
                await client.invalidateQueries({ queryKey: agencySettingsKey(agencyId) });
                toast.success("Logo enregistré.");
              }}
            />
          </SettingsGroup>
          <FormField label="Nom de l'agence" required error={errors.name} disabled={locked}>
            <Input value={values.name} onChange={(event) => set("name", event.target.value)} maxLength={255} autoComplete="organization" />
          </FormField>
          <FormField label="Description" error={errors.description}>
            <CountedTextarea value={values.description} onChange={(event) => set("description", event.target.value)} maxLength={500} rows={3} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Téléphone" error={errors.phone}>
              <PhoneInput value={values.phone} onChange={(event) => set("phone", event.target.value)} maxLength={32} />
            </FormField>
            <FormField label="Email" error={errors.email}>
              <Input type="email" value={values.email} onChange={(event) => set("email", event.target.value)} maxLength={255} autoComplete="email" />
            </FormField>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <SettingsGroup title="Adresse">
            <FormField label="Adresse" error={errors.address}>
              <Textarea value={values.address} onChange={(event) => set("address", event.target.value)} rows={2} maxLength={500} autoComplete="street-address" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Quartier" error={errors.quartier}>
                <Input value={values.quartier} onChange={(event) => set("quartier", event.target.value)} maxLength={100} />
              </FormField>
              <FormField label="Ville" error={errors.city}>
                <Input value={values.city} onChange={(event) => set("city", event.target.value)} maxLength={100} autoComplete="address-level2" />
              </FormField>
            </div>
          </SettingsGroup>

          <SettingsGroup title="Zones d'intervention principales" description="Les zones où vous livrez, avec leur tarif, se règlent dans Zones de couverture.">
            {zones.isPending ? (
              <Skeleton className="h-8 w-full" />
            ) : zones.isError ? (
              <p className="text-meta text-foreground-muted">Les zones n&apos;ont pas pu être chargées.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {zones.data.zones.map((zone) => (
                  <Badge key={zone.id} tone={zone.atCheckout ? "info" : "neutral"}>
                    {zone.name}
                  </Badge>
                ))}
                <Button asChild variant="quiet" size="compact" icon={Plus}>
                  <Link href={onOpenZones}>{zones.data.zones.length === 0 ? "Ajouter une zone" : "Gérer les zones"}</Link>
                </Button>
              </div>
            )}
          </SettingsGroup>

          <SettingsGroup title="Immatriculation">
            <FormField label="Numéro RCCM" error={errors.rccm} disabled={locked} hint="Registre du commerce de l'agence, s'il lui a été attribué.">
              <Input value={values.rccm} onChange={(event) => set("rccm", event.target.value)} maxLength={255} spellCheck={false} />
            </FormField>
          </SettingsGroup>
        </div>
      </div>
    </SettingsForm>
  );
}

// ── Mon compte ────────────────────────────────────────────────

/** The person signed in, not the agency: changing it never touches the agency. */
export function AgencyAccountSection({ model }: { model: AgencySettingsModel }) {
  const client = useQueryClient();
  const account = useQuery({ queryKey: ["partners", "settings", "profile"], queryFn: fetchAgencyAccount, staleTime: 30_000 });

  if (account.isPending) return <Skeleton className="h-72 w-full rounded-panel" />;
  if (account.isError) {
    return (
      <SettingsPanel title="Mon compte">
        <ErrorState title="Compte indisponible" description={describeSettingsFailure(account.error).message} onRetry={() => account.refetch()} retrying={account.isFetching} />
      </SettingsPanel>
    );
  }
  return <AccountForm account={account.data} role={model.isOwner ? "Propriétaire" : "Gérant"} onSaved={() => client.invalidateQueries({ queryKey: ["partners", "settings", "profile"] })} />;
}

function AccountForm({ account, role, onSaved }: { account: Awaited<ReturnType<typeof fetchAgencyAccount>>; role: string; onSaved: () => unknown }) {
  const draft = useDraft({ firstName: account.firstName, lastName: account.lastName }, "agency-account");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const local: Record<string, string> = {};
    if (!draft.values.firstName.trim()) local.firstName = "Indiquez votre prénom.";
    if (!draft.values.lastName.trim()) local.lastName = "Indiquez votre nom.";
    draft.setErrors(local);
    if (Object.keys(local).length > 0) return;
    setSaving(true);
    try {
      await saveAgencyAccount({ ...account, firstName: draft.values.firstName.trim(), lastName: draft.values.lastName.trim() });
      draft.accept(draft.values);
      await onSaved();
      toast.success("Votre nom a été enregistré.");
    } catch (error) {
      const failure = describeSettingsFailure(error);
      draft.setErrors(failure.fields);
      toast.error(failure.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsForm title="Mon compte" description="Votre compte personnel, distinct de l'agence." dirty={draft.dirty} saving={saving} onSubmit={submit} onReset={draft.reset} submitLabel="Enregistrer">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Prénom" required error={draft.errors.firstName}>
          <Input value={draft.values.firstName} onChange={(event) => draft.set("firstName", event.target.value)} autoComplete="given-name" maxLength={120} />
        </FormField>
        <FormField label="Nom" required error={draft.errors.lastName}>
          <Input value={draft.values.lastName} onChange={(event) => draft.set("lastName", event.target.value)} autoComplete="family-name" maxLength={120} />
        </FormField>
        <FormField label="E-mail de connexion" hint="Il sert à vous connecter : il ne se modifie pas ici.">
          <ReadOnlyValue value={account.email} locked />
        </FormField>
        <FormField label="Téléphone de connexion" hint="Il sert à vous connecter : il ne se modifie pas ici.">
          <ReadOnlyValue value={account.phone} locked />
        </FormField>
        <FormField label="Rôle dans l'agence">
          <ReadOnlyValue value={role} locked />
        </FormField>
      </div>
    </SettingsForm>
  );
}

// ── Véhicules & Flotte ────────────────────────────────────────

const VEHICLE: Record<string, { label: string; icon: typeof Bike }> = {
  moto: { label: "Motos", icon: Bike },
  velo: { label: "Vélos", icon: Bike },
  voiture: { label: "Voitures", icon: Car },
  tricycle: { label: "Tricycles", icon: Truck },
  a_pied: { label: "À pied", icon: Users },
  autre: { label: "Non renseigné", icon: Users },
};

export function FleetSection({ model }: { model: AgencySettingsModel }) {
  const fleet = model.fleet;
  return (
    <SettingsPanel
      primary
      title="Véhicules & Flotte"
      description="Les véhicules de vos livreurs, tels qu'ils sont enregistrés."
      action={
        <Button asChild variant="secondary" size="compact" icon={Users}>
          <Link href="/agency/drivers">Voir les coursiers</Link>
        </Button>
      }
    >
      {fleet.total === 0 ? (
        <EmptyState icon={Bike} title="Aucun coursier" description="Les véhicules apparaissent ici quand vos coursiers sont inscrits." />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-panel border border-border p-3">
              <dt className="text-meta text-foreground-muted">Coursiers</dt>
              <dd className="text-kpi text-foreground tabular-nums">{fleet.total}</dd>
            </div>
            <div className="rounded-panel border border-border p-3">
              <dt className="text-meta text-foreground-muted">Prêts à livrer</dt>
              <dd className="text-kpi text-foreground tabular-nums">{fleet.active}</dd>
            </div>
          </dl>
          <ul className="divide-y divide-border overflow-hidden rounded-panel border border-border">
            {fleet.by_type.map((row) => {
              const vehicle = VEHICLE[row.type] ?? VEHICLE.autre;
              const Icon = vehicle.icon;
              return (
                <li key={row.type} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-subtle text-foreground-muted">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 text-body font-medium text-foreground">{vehicle.label}</span>
                  <span className="text-body text-foreground tabular-nums">{row.total}</span>
                  <Badge tone={row.active > 0 ? "success" : "neutral"}>{row.active} prêt{row.active > 1 ? "s" : ""}</Badge>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="text-meta text-foreground-muted">
        Le véhicule d&apos;un coursier se modifie sur sa fiche. « Prêt à livrer » : coursier actif, documents validés, non suspendu.
      </p>
    </SettingsPanel>
  );
}

// ── Paiements ─────────────────────────────────────────────────

export function AgencyPaymentsSection() {
  const scope = useFinanceScope("agency");
  const methods = useMethods(scope);
  const summary = useSummary(scope);
  const paths = financePaths(FINANCE_SPACES.agency);

  if (methods.isError && isForbidden(methods.error)) {
    return (
      <SettingsPanel title="Paiements" description="Les comptes sur lesquels l'agence reçoit ses retraits.">
        <Alert tone="warning" title="Réservé au propriétaire de l'agence">
          Les moyens de retrait et les versements de l&apos;agence ne sont visibles et modifiables que par son propriétaire.
        </Alert>
      </SettingsPanel>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <SettingsPanel title="Méthodes de retrait" description="Les fonds de l'agence sont versés sur le compte ci-dessous, quand vous en faites la demande.">
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
          <FormField label="Fréquence de versement" hint="Vous demandez chaque retrait depuis les finances de l'agence.">
            <ReadOnlyValue value="À la demande" locked />
          </FormField>
          <FormField label="Montant minimum" hint="Fixé par SUGU pour chaque retrait.">
            {summary.isPending ? <Skeleton className="h-control w-full" /> : <ReadOnlyValue value={summary.data ? formatMoneyFromCents(summary.data.limits.min) : null} placeholder="Indisponible pour le moment" locked />}
          </FormField>
        </div>
        <Alert tone="info" title="Les versements sont faits à votre demande">
          La part de l&apos;agence rejoint son solde 72 heures après la remise du colis. Vous demandez ensuite un retrait depuis{" "}
          <Link href={paths.withdraw} className="font-medium underline underline-offset-2">
            les finances de l&apos;agence
          </Link>
          . Aucun virement automatique n&apos;est programmé.
        </Alert>
      </SettingsPanel>
    </div>
  );
}

// ── Notifications ─────────────────────────────────────────────

/** What the platform tells an agency, and how. Nothing here can be turned off: no preference is read. */
export function AgencyNotificationsSection() {
  return (
    <SettingsPanel primary title="Notifications" description="Ce que SUGU vous envoie, et par quel moyen.">
      <div className="divide-y divide-border">
        <ToggleRow
          icon={Package}
          title="Nouvelle demande de livraison"
          description="Une boutique vous confie un colis : notification dans l'application SUGU Pro et dans votre espace."
          checked
          lockedNote="Indispensable au traitement des livraisons."
        />
        <ToggleRow
          icon={MessageSquare}
          title="Nouveau message"
          description="Un message arrive dans une conversation que vous supervisez : notification dans l'application et dans votre espace."
          checked
          lockedNote="Envoyé à chaque message."
        />
      </div>
      <Alert tone="info" title="Pas d'envoi par e-mail, SMS ou WhatsApp">
        Les notifications d&apos;agence passent par l&apos;application SUGU Pro et par votre espace. Aucun autre canal n&apos;est utilisé, il n&apos;y a donc rien à régler ici pour le moment.
      </Alert>
    </SettingsPanel>
  );
}

// ── Sécurité ──────────────────────────────────────────────────

export function AgencySecuritySection() {
  const client = useQueryClient();
  const key = ["partners", "settings", "security"] as const;
  // One answer of the server, read twice: the sessions, and the date of the last change.
  const sessions = useQuery({ queryKey: key, queryFn: fetchAgencySecurity, staleTime: 15_000, select: (data) => data.sessions });
  const changedAt = useQuery({ queryKey: key, queryFn: fetchAgencySecurity, staleTime: 15_000, select: (data) => data.passwordChangedAt });
  return (
    <SecuritySection
      password={{
        changedAt: changedAt.data ?? null,
        fieldMap: AGENCY_PASSWORD_FIELDS,
        submit: async (values) => {
          await changeAgencyPassword(values);
          await client.invalidateQueries({ queryKey: key });
        },
      }}
      sessions={{ query: sessions, revoke: revokeAgencySession, revokeOthers: revokeOtherAgencySessions }}
    />
  );
}

// ── Mon abonnement ────────────────────────────────────────────

export function AgencySubscriptionSection() {
  return (
    <SettingsPanel primary title="Mon abonnement" description="L'offre SUGU Pro de votre agence.">
      <div className="flex flex-wrap items-center gap-3 rounded-panel border border-border p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-subtle text-foreground-muted">
          <Crown className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-foreground">Offre standard</p>
          <p className="text-meta text-foreground-muted">Toutes les fonctions de l&apos;espace agence sont incluses. SUGU prélève sa commission sur chaque livraison.</p>
        </div>
        <Badge tone="success">Active</Badge>
      </div>
      <Alert tone="info" title="Pas d'abonnement payant pour le moment">
        Aucune offre payante n&apos;est proposée aux agences : aucun renouvellement ni facture d&apos;abonnement. Vous serez informé avant toute nouvelle offre.
      </Alert>
    </SettingsPanel>
  );
}

