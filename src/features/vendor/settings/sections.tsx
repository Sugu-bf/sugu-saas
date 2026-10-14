"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { BarChart3, Calculator, Crown, ExternalLink, Facebook, MapPin, MessageCircle, Package, PackageCheck, PackageX, Truck } from "lucide-react";
import { Alert, Badge, Button, DataTable, EmptyState, ErrorState, FormField, Input, Select, Skeleton, Switch, formatMoneyFromFrancs, asFrancs, type DataTableColumn } from "@/design-system";
import { api } from "@/lib/http/client";
import { env } from "@/lib/env";
import { ClosingPanel, ReadOnlyValue, SecuritySection, SettingsForm, SettingsGroup, SettingsPanel, describeSettingsFailure, useDraft } from "@/features/settings";
import {
  VENDOR_DELETION_CHECK,
  VENDOR_EVENTS,
  VENDOR_PASSWORD_FIELDS,
  changeVendorPassword,
  deleteVendorAccount,
  revokeOtherVendorSessions,
  revokeVendorSession,
  saveLegal,
  saveNotifications,
  saveTimezone,
  type NotificationMatrix,
  type VendorChannel,
  type VendorSettingsModel,
} from "./api";
import { useVendorSessions, vendorSettingsKeys } from "./hooks";

const marketplace = () => env.NEXT_PUBLIC_MARKETPLACE_URL.replace(/\/+$/, "");

// ── Livraison ─────────────────────────────────────────────────

const shippingSchema = z.object({
  data: z.object({
    partners: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        rates: z.array(z.object({ id: z.string(), zone_name: z.string().nullish(), flat_amount: z.number(), cod_supported: z.boolean().nullish() })),
      }),
    ),
  }),
});

interface OfferRow {
  id: string;
  agency: string;
  zones: string[];
  from: number;
  to: number;
  cod: boolean;
}

/**
 * What the buyers of the shop are offered at the checkout, read where the
 * checkout reads it. The seller does not set prices or delays: the agency
 * the buyer chooses does.
 */
export function DeliverySection({ model }: { model: VendorSettingsModel }) {
  const offers = useQuery({
    queryKey: ["checkout", "shipping-options", "BF"],
    queryFn: async () => shippingSchema.parse(await api.get<unknown>("checkout/shipping-options", { params: { country_code: "BF" } })).data.partners,
    staleTime: 5 * 60_000,
  });

  const rows: OfferRow[] = (offers.data ?? [])
    .filter((partner) => partner.rates.length > 0)
    .map((partner) => {
      const amounts = partner.rates.map((rate) => rate.flat_amount);
      return {
        id: partner.id,
        agency: partner.name,
        zones: [...new Set(partner.rates.map((rate) => rate.zone_name).filter((name): name is string => Boolean(name)))],
        from: Math.min(...amounts),
        to: Math.max(...amounts),
        cod: partner.rates.some((rate) => rate.cod_supported),
      };
    });

  const columns: DataTableColumn<OfferRow>[] = [
    { id: "agency", header: "Agence", mobile: "title", cell: (row) => <span className="font-medium text-foreground">{row.agency}</span> },
    { id: "zones", header: "Zones desservies", mobile: "subtitle", cell: (row) => <span className="line-clamp-2">{row.zones.join(", ") || "—"}</span> },
    {
      id: "price",
      header: "Tarif",
      numeric: true,
      mobile: "field",
      cell: (row) => (row.from === row.to ? formatMoneyFromFrancs(asFrancs(row.from)) : `${formatMoneyFromFrancs(asFrancs(row.from))} – ${formatMoneyFromFrancs(asFrancs(row.to))}`),
    },
    { id: "cod", header: "Paiement à la livraison", mobile: "badge", cell: (row) => <Badge tone={row.cod ? "success" : "neutral"}>{row.cod ? "Accepté" : "Non"}</Badge> },
  ];

  const address = [model.contact.street, model.contact.city].filter(Boolean).join(", ");

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <SettingsPanel title="Livraison" description="Où vos colis sont collectés, et par qui ils sont livrés.">
        <SettingsGroup title="Adresse de collecte" description="Les livreurs viennent chercher vos colis à l'adresse de votre boutique.">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <ReadOnlyValue value={address} placeholder="Adresse non renseignée" />
            </div>
            <Button asChild variant="secondary" size="compact" icon={MapPin}>
              <Link href="?section=profile">Modifier dans Mon profil</Link>
            </Button>
          </div>
          {!address && <Alert tone="warning" title="Ajoutez l'adresse de votre boutique">Sans elle, l&apos;agence ne sait pas où collecter vos commandes.</Alert>}
        </SettingsGroup>
        <Alert tone="info" title="Le tarif et le délai sont ceux de l'agence">
          Votre client choisit son agence au moment de commander ; le prix de la livraison est celui que cette agence a fixé pour sa zone. Les commandes en paiement à la livraison
          suivent les règles de la plateforme.
        </Alert>
      </SettingsPanel>

      <SettingsPanel title="Agences proposées à vos clients" description="Les agences actives et leurs tarifs au Burkina Faso, tels que le paiement les affiche.">
        {offers.isPending ? (
          <Skeleton className="h-40 w-full rounded-panel" />
        ) : offers.isError ? (
          <ErrorState title="Agences indisponibles" description={describeSettingsFailure(offers.error).message} onRetry={() => offers.refetch()} retrying={offers.isFetching} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Truck} title="Aucune agence active" description="Aucune agence ne propose de tarif pour le moment." />
        ) : (
          <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} caption="Agences et tarifs" empty={{ title: "Aucune agence active", icon: Truck }} />
        )}
      </SettingsPanel>
    </div>
  );
}

// ── Notifications ─────────────────────────────────────────────

const CHANNELS: { key: Exclude<VendorChannel, "app">; label: string; reachable: (r: VendorSettingsModel["notifications"]["reachable"]) => boolean; off: string }[] = [
  { key: "email", label: "E-mail", reachable: (r) => r.email, off: "Aucune adresse e-mail sur votre compte." },
  { key: "push", label: "Application", reachable: (r) => r.push, off: "Installez l'application SUGU Pro et connectez-vous pour recevoir ces alertes." },
  { key: "whatsapp", label: "WhatsApp", reachable: (r) => r.whatsapp, off: "WhatsApp n'est pas encore activé pour votre numéro." },
];

const EVENT_ICONS = { new_order: Package, order_shipped: Truck, order_delivered: PackageCheck, order_cancelled: PackageX, low_stock: BarChart3 } as const;

function toMatrix(model: VendorSettingsModel): NotificationMatrix {
  const matrix: NotificationMatrix = {};
  for (const event of VENDOR_EVENTS) {
    const effective = model.notifications.effective[event.key] ?? {};
    matrix[event.key] = Object.fromEntries(event.channels.map((channel) => [channel, effective[channel] ?? true]));
  }
  return matrix;
}

export function NotificationsSection({ model }: { model: VendorSettingsModel }) {
  const client = useQueryClient();
  const draft = useDraft(toMatrix(model), "vendor-notifications");
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const reachable = model.notifications.reachable;

  const toggle = (event: string, channel: VendorChannel, value: boolean) => draft.set(event, { ...draft.values[event], [channel]: value });

  const submit = async () => {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    try {
      await saveNotifications(draft.values);
      draft.accept(draft.values);
      await client.invalidateQueries({ queryKey: vendorSettingsKeys.settings(), exact: true });
      toast.success("Préférences de notification enregistrées.");
    } catch (error) {
      toast.error(describeSettingsFailure(error).message);
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <SettingsForm
      title="Notifications"
      description="Choisissez comment vous êtes prévenu. Seuls les événements et canaux réellement envoyés par SUGU sont listés."
      dirty={draft.dirty}
      saving={saving}
      onSubmit={submit}
      onReset={draft.reset}
    >
      <SettingsGroup title="Canaux">
        <ul className="grid gap-2 sm:grid-cols-3">
          {CHANNELS.map((channel) => (
            <li key={channel.key} className="flex flex-col gap-1 rounded-control border border-border px-3 py-2.5">
              <span className="flex items-center justify-between gap-2 text-body font-medium text-foreground">
                {channel.label}
                <Badge tone={channel.reachable(reachable) ? "success" : "neutral"}>{channel.reachable(reachable) ? "Disponible" : "Indisponible"}</Badge>
              </span>
              {!channel.reachable(reachable) && <span className="text-meta text-foreground-muted">{channel.off}</span>}
            </li>
          ))}
        </ul>
        <p className="text-meta text-foreground-muted">Aucune alerte n&apos;est envoyée par SMS. Les messages promotionnels de SUGU ne passent pas par ces réglages.</p>
      </SettingsGroup>

      <SettingsGroup title="Événements">
        <div className="overflow-hidden rounded-panel border border-border">
          <table className="w-full text-body">
            <caption className="sr-only">Notifications par événement et par canal</caption>
            <thead className="hidden bg-surface-subtle text-left text-label text-foreground-muted md:table-header-group">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Événement
                </th>
                {CHANNELS.map((channel) => (
                  <th key={channel.key} scope="col" className="w-28 px-2 py-2.5 text-center font-medium">
                    {channel.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {VENDOR_EVENTS.map((event) => {
                const Icon = EVENT_ICONS[event.key];
                const row = draft.values[event.key] ?? {};
                return (
                  <tr key={event.key} className="flex flex-col gap-2 px-4 py-3 md:table-row md:p-0">
                    <th scope="row" className="text-left font-normal md:px-4 md:py-3">
                      <span className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-control bg-surface-subtle text-foreground-muted">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-foreground">{event.label}</span>
                          <span className="block text-meta text-foreground-muted">{event.description}</span>
                        </span>
                      </span>
                    </th>
                    {(event.channels as readonly VendorChannel[]).includes("app") ? (
                      <td colSpan={3} className="md:px-2 md:py-3">
                        <label className="flex items-center justify-between gap-3 md:justify-center">
                          <span className="text-meta text-foreground-muted">Dans l&apos;espace Pro</span>
                          <Switch checked={row.app ?? true} onCheckedChange={(value) => toggle(event.key, "app", value)} aria-label={`${event.label} dans l'espace Pro`} />
                        </label>
                      </td>
                    ) : (
                      CHANNELS.map((channel) => {
                        const offered = (event.channels as readonly VendorChannel[]).includes(channel.key);
                        return (
                          <td key={channel.key} className="md:px-2 md:py-3 md:text-center">
                            {offered ? (
                              <label className="flex items-center justify-between gap-3 md:justify-center">
                                <span className="text-meta text-foreground-muted md:sr-only">{channel.label}</span>
                                <Switch checked={row[channel.key] ?? true} onCheckedChange={(value) => toggle(event.key, channel.key, value)} aria-label={`${event.label} par ${channel.label}`} />
                              </label>
                            ) : (
                              <span className="hidden text-meta text-foreground-subtle md:inline" aria-label={`Pas d'envoi par ${channel.label}`}>
                                —
                              </span>
                            )}
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SettingsGroup>
    </SettingsForm>
  );
}

// ── Sécurité ──────────────────────────────────────────────────

export function SecuritySettings({ model }: { model: VendorSettingsModel }) {
  const sessions = useVendorSessions();
  const client = useQueryClient();
  return (
    <SecuritySection
      password={{
        changedAt: model.passwordChangedAt,
        fieldMap: VENDOR_PASSWORD_FIELDS,
        submit: async (values) => {
          await changeVendorPassword(values);
          await client.invalidateQueries({ queryKey: vendorSettingsKeys.settings() });
        },
      }}
      sessions={{ query: sessions, revoke: revokeVendorSession, revokeOthers: revokeOtherVendorSessions }}
    />
  );
}

// ── Intégrations ──────────────────────────────────────────────

const INTEGRATIONS = [
  { name: "WhatsApp Business", description: "Répondre à vos clients depuis votre compte WhatsApp Business.", icon: MessageCircle },
  { name: "Google Analytics", description: "Mesurer la fréquentation de votre boutique.", icon: BarChart3 },
  { name: "Facebook Pixel", description: "Suivre vos campagnes publicitaires Facebook et Instagram.", icon: Facebook },
  { name: "Comptabilité", description: "Exporter vos ventes vers un logiciel de comptabilité.", icon: Calculator },
];

export function IntegrationsSection() {
  return (
    <SettingsPanel primary title="Intégrations" description="Les services externes que vous pourrez relier à votre boutique.">
      <ul className="divide-y divide-border overflow-hidden rounded-panel border border-border">
        {INTEGRATIONS.map(({ name, description, icon: Icon }) => (
          <li key={name} className="flex items-center gap-3 px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-subtle text-foreground-muted">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium text-foreground">{name}</span>
              <span className="block text-meta text-foreground-muted">{description}</span>
            </span>
            <Badge tone="neutral">Bientôt disponible</Badge>
          </li>
        ))}
      </ul>
      <p className="text-meta text-foreground-muted">Aucune de ces intégrations n&apos;est encore proposée : rien n&apos;est à configurer pour le moment.</p>
    </SettingsPanel>
  );
}

// ── Préférences d'affichage ───────────────────────────────────

const TIMEZONES = [
  { value: "Africa/Ouagadougou", label: "Ouagadougou (GMT)" },
  { value: "Africa/Abidjan", label: "Abidjan (GMT)" },
  { value: "Africa/Bamako", label: "Bamako (GMT)" },
  { value: "Africa/Dakar", label: "Dakar (GMT)" },
  { value: "Africa/Lome", label: "Lomé (GMT)" },
  { value: "Africa/Niamey", label: "Niamey (GMT+1)" },
  { value: "Africa/Lagos", label: "Lagos (GMT+1)" },
];

export function DisplaySection({ model }: { model: VendorSettingsModel }) {
  const client = useQueryClient();
  const draft = useDraft({ timezone: model.timezone }, "vendor-display");
  const [saving, setSaving] = useState(false);
  const known = TIMEZONES.some((zone) => zone.value === draft.values.timezone);

  const submit = async () => {
    setSaving(true);
    try {
      await saveTimezone(draft.values.timezone);
      draft.accept(draft.values);
      await client.invalidateQueries({ queryKey: vendorSettingsKeys.settings(), exact: true });
      toast.success("Fuseau horaire enregistré.");
    } catch (error) {
      toast.error(describeSettingsFailure(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsForm title="Préférences d'affichage" description="Comment les dates et les montants vous sont présentés." dirty={draft.dirty} saving={saving} onSubmit={submit} onReset={draft.reset}>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Fuseau horaire de la boutique" hint="Utilisé pour vos horaires et vos rapports.">
          <Select
            value={draft.values.timezone}
            onChange={(event) => draft.set("timezone", event.target.value)}
            options={[...TIMEZONES, ...(known ? [] : [{ value: draft.values.timezone, label: draft.values.timezone }])]}
          />
        </FormField>
        <FormField label="Langue de l'espace Pro">
          <ReadOnlyValue value="Français" locked />
        </FormField>
        <FormField label="Devise">
          <ReadOnlyValue value="Franc CFA (FCFA)" locked />
        </FormField>
        <FormField label="Format des dates et des montants">
          <ReadOnlyValue value="14/10/2026 · 12 500 FCFA" locked />
        </FormField>
      </div>
      <p className="text-meta text-foreground-muted">L&apos;espace Pro s&apos;affiche en clair, en français, avec les formats du Burkina Faso. Ce sont les seuls proposés pour le moment.</p>
    </SettingsForm>
  );
}

// ── Mon abonnement ────────────────────────────────────────────

export function SubscriptionSection() {
  return (
    <SettingsPanel primary title="Mon abonnement" description="Votre offre SUGU Pro.">
      <div className="flex flex-wrap items-center gap-3 rounded-panel border border-border p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-subtle text-foreground-muted">
          <Crown className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-foreground">Offre standard</p>
          <p className="text-meta text-foreground-muted">Toutes les fonctions de l&apos;espace vendeur sont incluses. Vous ne payez qu&apos;une commission sur vos ventes.</p>
        </div>
        <Badge tone="success">Active</Badge>
      </div>
      <Alert tone="info" title="Pas d'abonnement payant pour le moment">
        SUGU ne propose pas encore d&apos;offre payante : aucun renouvellement, aucune facture d&apos;abonnement. Vous serez informé avant toute nouvelle offre.
      </Alert>
    </SettingsPanel>
  );
}

// ── Mentions légales ──────────────────────────────────────────

const LEGAL_STATUSES = [
  { value: "Individual", label: "Particulier / entrepreneur individuel" },
  { value: "EI", label: "Entreprise individuelle (EI)" },
  { value: "SARL", label: "SARL" },
  { value: "SARLU", label: "SARL unipersonnelle (SARLU)" },
  { value: "SA", label: "Société anonyme (SA)" },
  { value: "SAS", label: "SAS" },
  { value: "GIE", label: "Groupement d'intérêt économique (GIE)" },
  { value: "Cooperative", label: "Coopérative" },
  { value: "Association", label: "Association" },
];

const PLATFORM_TEXTS = [
  { title: "Conditions générales", path: "/conditions-generales" },
  { title: "Politique de confidentialité", path: "/politique-de-confidentialite" },
  { title: "Livraison et retours", path: "/politique-livraison-retours" },
  { title: "Politique anti-fraude", path: "/politique-anti-fraude" },
];

export function LegalSection({ model }: { model: VendorSettingsModel }) {
  const client = useQueryClient();
  const draft = useDraft(model.legal, "vendor-legal");
  const [saving, setSaving] = useState(false);
  const { values, set, errors } = draft;
  const knownStatus = !values.legalStatus || LEGAL_STATUSES.some((status) => status.value === values.legalStatus);

  const submit = async () => {
    setSaving(true);
    try {
      await saveLegal(values);
      draft.accept(values);
      await client.invalidateQueries({ queryKey: vendorSettingsKeys.settings(), exact: true });
      toast.success("Mentions légales enregistrées.");
    } catch (error) {
      const failure = describeSettingsFailure(error);
      draft.setErrors(failure.fields);
      toast.error(failure.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <SettingsForm
        title="Mentions légales"
        description="Les informations administratives de votre activité, telles que vous les déclarez."
        dirty={draft.dirty}
        saving={saving}
        onSubmit={submit}
        onReset={draft.reset}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Raison sociale" error={errors.businessName} hint="Le nom officiel de l'entreprise, s'il diffère du nom de la boutique.">
            <Input value={values.businessName} onChange={(event) => set("businessName", event.target.value)} maxLength={255} />
          </FormField>
          <FormField label="Forme juridique" error={errors.legalStatus}>
            <Select
              value={values.legalStatus}
              onChange={(event) => set("legalStatus", event.target.value)}
              placeholder="Non renseignée"
              options={[...LEGAL_STATUSES, ...(knownStatus ? [] : [{ value: values.legalStatus, label: values.legalStatus }])]}
            />
          </FormField>
          <FormField label="Numéro RCCM" error={errors.rccm} hint="Registre du commerce, s'il vous a été attribué.">
            <Input value={values.rccm} onChange={(event) => set("rccm", event.target.value)} maxLength={50} spellCheck={false} />
          </FormField>
          <FormField label="Numéro IFU" error={errors.taxId} hint="Identifiant financier unique, s'il vous a été attribué.">
            <Input value={values.taxId} onChange={(event) => set("taxId", event.target.value)} maxLength={50} spellCheck={false} />
          </FormField>
          {(model.legal.ninea || values.ninea) && (
            <FormField label="NINEA (Sénégal)" error={errors.ninea}>
              <Input value={values.ninea} onChange={(event) => set("ninea", event.target.value)} maxLength={50} spellCheck={false} />
            </FormField>
          )}
        </div>
        <p className="text-meta text-foreground-muted">Ces informations sont celles que vous déclarez ; SUGU ne les vérifie pas et ne les complète pas. Laissez vide ce qui ne vous concerne pas.</p>
      </SettingsForm>

      <SettingsPanel title="Textes de la plateforme" description="Les règles de SUGU qui s'appliquent à votre activité.">
        <ul className="divide-y divide-border overflow-hidden rounded-panel border border-border">
          {PLATFORM_TEXTS.map((text) => (
            <li key={text.path}>
              <a href={`${marketplace()}${text.path}`} target="_blank" rel="noreferrer" className="flex min-h-touch items-center justify-between gap-3 px-4 py-3 text-body text-foreground hover:bg-surface-subtle">
                {text.title}
                <ExternalLink className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </SettingsPanel>
    </div>
  );
}

// ── Supprimer le compte ───────────────────────────────────────

export function CloseVendorAccount() {
  return (
    <ClosingPanel
      checkPath={VENDOR_DELETION_CHECK}
      submit={deleteVendorAccount}
      consequences={[
        "Votre boutique et vos produits sont retirés de SUGU.",
        "Vous ne pourrez plus vous connecter avec ce compte.",
        "Vos commandes, factures et mouvements d'argent passés sont conservés, comme la loi l'exige.",
      ]}
    />
  );
}

