"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Bike, Car, FileCheck2, Lock, Mail, MessageSquare, Package, RefreshCw, ShieldCheck, Trash2, Truck, User } from "lucide-react";
import { Alert, Button, Card, ErrorState, FormField, Input, Select, Textarea } from "@/design-system";
import { queryKeys } from "@/lib/query/keys";
import {
  ClosingPanel,
  PhoneInput,
  ReadOnlyValue,
  SecuritySection,
  SettingsForm,
  SettingsFrame,
  SettingsPanel,
  ToggleRow,
  describeSettingsFailure,
  describeSettingsLoadFailure,
  useDraft,
  type SettingsSection,
} from "@/features/settings";
import { SettingsLoading } from "@/features/vendor/settings/screen";
import {
  DRIVER_DELETION_CHECK,
  DRIVER_PASSWORD_FIELDS,
  VEHICLE_TYPES,
  changeDriverPassword,
  deleteDriverAccount,
  fetchDriverSettings,
  revokeDriverSession,
  revokeOtherDriverSessions,
  saveDriverProfile,
  saveDriverVehicle,
  saveMissionEmail,
  type DriverSettingsModel,
} from "./api";

// `/driver/settings`: the five sections of a courier's settings (V9),
// after frames 9 to 12 of the mock-up. The documents (KYC) keep their
// own screen; the profile leads to it.

type DriverSection = "profile" | "vehicle" | "notifications" | "security" | "delete";

export const DRIVER_SECTIONS: SettingsSection<DriverSection>[] = [
  { key: "profile", label: "Mon profil", icon: User },
  { key: "vehicle", label: "Véhicule", icon: Bike },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Sécurité", icon: ShieldCheck },
  { key: "delete", label: "Supprimer le compte", icon: Trash2, danger: true },
];

const settingsKey = () => queryKeys.driver.settings();

export function DriverSettingsScreen() {
  const settings = useQuery({ queryKey: settingsKey(), queryFn: fetchDriverSettings, staleTime: 30_000 });
  return (
    <SettingsFrame
      description="Gérez votre profil, votre véhicule et la sécurité de votre compte"
      sections={DRIVER_SECTIONS}
      render={(key) => {
        if (key === "delete") return <CloseDriverAccount />;
        if (settings.isPending) return <SettingsLoading />;
        if (settings.isError) {
          return (
            <Card>
              <ErrorState title="Paramètres indisponibles" description={describeSettingsLoadFailure(settings.error)} onRetry={() => settings.refetch()} retrying={settings.isFetching} />
            </Card>
          );
        }
        const model = settings.data;
        switch (key) {
          case "profile":
            return <DriverProfileSection model={model} />;
          case "vehicle":
            return <DriverVehicleSection model={model} />;
          case "notifications":
            return <DriverNotificationsSection model={model} />;
          case "security":
            return <DriverSecuritySection model={model} />;
        }
      }}
    />
  );
}

function useRefresh() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: settingsKey() });
}

/** Field errors of the server, under the names of the form. */
function mapFields(fields: Record<string, string>, names: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(fields).flatMap(([field, message]) => (names[field] ? [[names[field], message]] : [])));
}

// ── Mon profil ────────────────────────────────────────────────

function DriverProfileSection({ model }: { model: DriverSettingsModel }) {
  const refresh = useRefresh();
  const locked = model.locks.identity;
  const draft = useDraft(
    { firstName: model.profile.firstName, lastName: model.profile.lastName, phone: model.profile.phone, address: model.profile.address, quarter: model.profile.quarter, city: model.profile.city },
    "driver-profile",
  );
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const { values, set, errors } = draft;
  const initials = `${model.profile.firstName.charAt(0)}${model.profile.lastName.charAt(0)}`.toUpperCase() || "?";

  const submit = async () => {
    if (lock.current) return;
    const local: Record<string, string> = {};
    if (!locked) {
      if (!values.firstName.trim()) local.firstName = "Indiquez votre prénom.";
      if (!values.lastName.trim()) local.lastName = "Indiquez votre nom.";
      if (values.phone && !/^\+?[0-9 ().-]{6,25}$/.test(values.phone.trim())) local.phone = "Ce numéro n'est pas valide.";
    }
    draft.setErrors(local);
    if (Object.keys(local).length > 0) return;
    lock.current = true;
    setSaving(true);
    try {
      await saveDriverProfile({ ...values, firstName: values.firstName.trim(), lastName: values.lastName.trim(), phone: values.phone.trim() }, locked);
      draft.accept(values);
      await refresh();
      toast.success("Profil enregistré.");
    } catch (error) {
      const failure = describeSettingsFailure(error);
      draft.setErrors(mapFields(failure.fields, { first_name: "firstName", last_name: "lastName", phone: "phone", full_address: "address", quarter: "quarter", city: "city" }));
      toast.error(failure.message);
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <SettingsForm title="Mon profil" description="Informations personnelles" dirty={draft.dirty} saving={saving} onSubmit={submit} onReset={draft.reset} submitLabel="Enregistrer">
      <div className="grid min-w-0 gap-8 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-pill border border-border bg-surface-subtle text-section-title font-bold text-foreground">
              {model.profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- the photo comes from the media server, sized by the frame
                <img src={model.profile.avatarUrl} alt="Votre photo" className="size-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <p className="text-meta text-foreground-muted">La photo de votre profil est celle que votre agence a enregistrée avec votre dossier.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Prénom" required={!locked} error={errors.firstName} disabled={locked}>
              <Input value={values.firstName} onChange={(event) => set("firstName", event.target.value)} autoComplete="given-name" maxLength={100} />
            </FormField>
            <FormField label="Nom" required={!locked} error={errors.lastName} disabled={locked}>
              <Input value={values.lastName} onChange={(event) => set("lastName", event.target.value)} autoComplete="family-name" maxLength={100} />
            </FormField>
          </div>
          <FormField label="Téléphone" error={errors.phone} disabled={locked}>
            <PhoneInput value={values.phone} onChange={(event) => set("phone", event.target.value)} maxLength={25} />
          </FormField>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <FormField label="Email" hint="L'adresse de connexion ne se modifie pas ici.">
            <ReadOnlyValue value={model.profile.email} locked />
          </FormField>
          <FormField label="Adresse" error={errors.address}>
            <Textarea value={values.address} onChange={(event) => set("address", event.target.value)} rows={2} maxLength={255} autoComplete="street-address" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Quartier" error={errors.quarter}>
              <Input value={values.quarter} onChange={(event) => set("quarter", event.target.value)} maxLength={100} />
            </FormField>
            <FormField label="Ville" error={errors.city}>
              <Input value={values.city} onChange={(event) => set("city", event.target.value)} maxLength={100} autoComplete="address-level2" />
            </FormField>
          </div>
          <Alert tone="info" title={locked ? "Votre identité a été vérifiée" : "Votre dossier n'est pas encore validé"}>
            {locked
              ? "Votre nom et votre numéro sont ceux que votre agence a vérifiés : demandez-lui de les modifier. Votre adresse reste modifiable ici."
              : "Vous pouvez corriger votre nom et votre numéro jusqu'à la validation de votre dossier par votre agence."}
          </Alert>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border p-3">
        <span className="flex min-w-0 items-center gap-3">
          <FileCheck2 className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-body font-medium text-foreground">Mon dossier</span>
            <span className="block text-meta text-foreground-muted">
              {model.kyc.canDeliver ? "Validé : vous pouvez livrer." : `${model.kyc.submitted} pièce${model.kyc.submitted > 1 ? "s" : ""} envoyée${model.kyc.submitted > 1 ? "s" : ""} sur ${model.kyc.required}.`}
            </span>
          </span>
        </span>
        <Button asChild variant="secondary" size="compact">
          <Link href="/driver/documents">Voir mes documents</Link>
        </Button>
      </div>
    </SettingsForm>
  );
}

// ── Véhicule ──────────────────────────────────────────────────

const VEHICLE_ICONS: Record<string, typeof Bike> = { moto: Bike, velo: Bike, voiture: Car, tricycle: Truck };

function DriverVehicleSection({ model }: { model: DriverSettingsModel }) {
  const refresh = useRefresh();
  const locked = model.locks.vehicle;
  const draft = useDraft({ type: model.vehicle.type || "moto", brand: model.vehicle.brand, model: model.vehicle.model, plate: model.vehicle.plate }, "driver-vehicle");
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const { values, set, errors } = draft;
  const Icon = VEHICLE_ICONS[values.type] ?? Bike;
  const knownType = VEHICLE_TYPES.some((type) => type.value === values.type);

  const submit = async () => {
    if (lock.current) return;
    const local: Record<string, string> = {};
    if (!locked && !values.type) local.type = "Choisissez le type de véhicule.";
    draft.setErrors(local);
    if (Object.keys(local).length > 0) return;
    lock.current = true;
    setSaving(true);
    try {
      await saveDriverVehicle({ ...values, plate: values.plate.trim().toUpperCase(), brand: values.brand.trim(), model: values.model.trim() }, locked);
      draft.accept({ ...values, plate: values.plate.trim().toUpperCase() });
      await refresh();
      toast.success("Véhicule enregistré.");
    } catch (error) {
      const failure = describeSettingsFailure(error);
      draft.setErrors(mapFields(failure.fields, { type: "type", brand: "brand", model: "model", license_plate: "plate" }));
      toast.error(failure.message);
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <SettingsForm title="Véhicule" description="Informations sur votre véhicule de livraison" dirty={draft.dirty} saving={saving} onSubmit={submit} onReset={draft.reset} submitLabel="Enregistrer">
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <FormField label="Type de véhicule" required={!locked} error={errors.type} disabled={locked}>
            <Select value={values.type} onChange={(event) => set("type", event.target.value)} options={[...VEHICLE_TYPES, ...(knownType ? [] : [{ value: values.type, label: values.type }])]} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Marque" error={errors.brand}>
              <Input value={values.brand} onChange={(event) => set("brand", event.target.value)} maxLength={100} placeholder="Ex. Yamaha" />
            </FormField>
            <FormField label="Modèle" error={errors.model}>
              <Input value={values.model} onChange={(event) => set("model", event.target.value)} maxLength={100} placeholder="Ex. YBR 125" />
            </FormField>
          </div>
          <FormField label="Immatriculation" error={errors.plate} disabled={locked}>
            <Input value={values.plate} onChange={(event) => set("plate", event.target.value.toUpperCase())} maxLength={30} spellCheck={false} autoCapitalize="characters" className="tabular-nums" />
          </FormField>
        </div>
        <div className="order-first flex min-w-0 flex-col gap-4 xl:order-none">
          <div className="flex aspect-[16/7] w-full flex-col items-center justify-center gap-2 rounded-panel border border-border bg-surface-subtle xl:aspect-[16/10]">
            <Icon className="size-12 text-foreground-subtle" aria-hidden="true" />
            <span className="text-label text-foreground-muted">{[values.brand, values.model].filter(Boolean).join(" ") || "Votre véhicule"}</span>
          </div>
          <Alert tone="info" title={locked ? "Véhicule validé avec votre dossier" : "Votre agence vérifie votre véhicule"}>
            {locked
              ? "Le type et l'immatriculation sont ceux de la carte grise validée : pour en changer, adressez-vous à votre agence. La marque et le modèle restent modifiables."
              : "Ces informations seront vérifiées par votre agence avec votre carte grise. Les modifier ne valide rien automatiquement."}
          </Alert>
        </div>
      </div>
    </SettingsForm>
  );
}

// ── Notifications ─────────────────────────────────────────────

function DriverNotificationsSection({ model }: { model: DriverSettingsModel }) {
  const client = useQueryClient();
  const [missionEmail, setMissionEmail] = useState(model.missionEmail);
  const save = useMutation({
    mutationFn: saveMissionEmail,
    onMutate: (on) => setMissionEmail(on),
    onSuccess: async (_data, on) => {
      toast.success(on ? "Vous recevrez aussi un e-mail à chaque nouvelle mission." : "Plus d'e-mail pour les nouvelles missions.");
      await client.invalidateQueries({ queryKey: settingsKey() });
    },
    onError: (error) => {
      // Nothing is shown as saved that the server did not keep.
      setMissionEmail(model.missionEmail);
      toast.error(describeSettingsFailure(error).message);
    },
  });

  return (
    <SettingsPanel primary title="Notifications" description="Ce que vous recevez, et ce que vous pouvez choisir.">
      <div className="divide-y divide-border">
        <ToggleRow icon={Package} title="Nouvelles missions" description="Recevez des alertes pour les nouvelles missions (application et espace)." checked lockedNote="Indispensable à votre travail : toujours activée." />
        <ToggleRow icon={RefreshCw} title="Changements de mission" description="Échec de livraison ou mission retirée par votre agence." checked lockedNote="Toujours activée." />
        <ToggleRow
          icon={Mail}
          title="E-mail des nouvelles missions"
          description={model.profile.email ? `En plus de l'application, un e-mail à ${model.profile.email}.` : "Aucune adresse e-mail sur votre compte."}
          checked={missionEmail}
          disabled={save.isPending || !model.profile.email}
          onCheckedChange={(on) => save.mutate(on)}
        />
        <ToggleRow icon={MessageSquare} title="Messages" description="Nouveaux messages de vos conversations (application et espace)." checked lockedNote="Toujours activée." />
      </div>
      <p className="flex items-center gap-1.5 text-meta text-foreground-muted">
        <Lock className="size-3" aria-hidden="true" />
        Aucune alerte n&apos;est envoyée par SMS ou WhatsApp.
      </p>
    </SettingsPanel>
  );
}

// ── Sécurité ──────────────────────────────────────────────────

function DriverSecuritySection({ model }: { model: DriverSettingsModel }) {
  const refresh = useRefresh();
  const sessions = useQuery({ queryKey: settingsKey(), queryFn: fetchDriverSettings, staleTime: 30_000, select: (data) => data.sessions });
  return (
    <SecuritySection
      password={{
        changedAt: model.passwordChangedAt,
        fieldMap: DRIVER_PASSWORD_FIELDS,
        submit: async (values) => {
          await changeDriverPassword(values);
          await refresh();
        },
      }}
      sessions={{ query: sessions, revoke: revokeDriverSession, revokeOthers: revokeOtherDriverSessions }}
    />
  );
}

// ── Supprimer le compte ───────────────────────────────────────

function CloseDriverAccount() {
  return (
    <ClosingPanel
      checkPath={DRIVER_DELETION_CHECK}
      submit={deleteDriverAccount}
      consequences={[
        "Vous ne recevrez plus de missions et ne pourrez plus vous connecter.",
        "Votre agence voit votre compte comme inactif.",
        "Vos livraisons passées et vos gains restent enregistrés, pour la traçabilité.",
      ]}
    />
  );
}

