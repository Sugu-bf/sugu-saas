"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Info, MapPinned, MoreHorizontal, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  EmptyState,
  DialogContent,
  DropdownMenu,
  DropdownMenuItem,
  ErrorState,
  FormField,
  IconButton,
  Input,
  Select,
  Skeleton,
  Switch,
  formatMoneyFromFrancs,
  asFrancs,
} from "@/design-system";
import { MAP_AREA_ZOOM } from "@/lib/map-tiles";
import { StaticMap } from "@/features/agency/components/static-map";
import { SettingsPanel, describeSettingsFailure } from "@/features/settings";
import { createZone, fetchAgencyZones, fetchZoneCatalog, removeZone, updateZone, type AgencyZone, type ZoneDraft } from "./api";

// "Zones de couverture", frames 6 and 7 of the V9 mock-up: where the agency
// delivers and at what price. The checkout reads exactly this: a zone the
// agency pauses is no longer offered by it, a price is charged as it is.
//
// - Prices are whole francs; the server refuses 0 (shown as free delivery),
//   decimals and anything above its ceiling, and the form says so first.
// - Pausing a zone pauses the agency's offer only: the zone is shared with
//   the other agencies that serve it. SUGU may close a zone itself; the
//   table then says so instead of "Actif".
// - The map places a zone where its geometry says, or at the town its name
//   starts with, said to be approximate. It never draws an area it does
//   not know.

const DELAYS = ["Le jour même", "24 h", "1–2 jours", "2–3 jours", "3–5 jours"];

function statusOf(zone: AgencyZone): { label: string; tone: "success" | "neutral" | "warning" } {
  if (!zone.zoneActive) return { label: "Fermée par SUGU", tone: "warning" };
  return zone.enabled ? { label: "Actif", tone: "success" } : { label: "En pause", tone: "neutral" };
}

type Editing = { mode: "create" } | { mode: "edit"; zone: AgencyZone };

export function ZonesSection({ agencyId }: { agencyId: string }) {
  const client = useQueryClient();
  const key = ["agency", agencyId, "zones"] as const;
  const zones = useQuery({ queryKey: key, queryFn: () => fetchAgencyZones(agencyId), staleTime: 15_000 });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [removing, setRemoving] = useState<AgencyZone | null>(null);
  const refresh = () => client.invalidateQueries({ queryKey: key });

  const toggle = useMutation({
    mutationFn: (zone: AgencyZone) => updateZone(agencyId, zone.id, { enabled: !zone.enabled }),
    onSuccess: async (_data, zone) => {
      toast.success(zone.enabled ? `${zone.name} : mise en pause.` : `${zone.name} : de nouveau proposée.`);
      await refresh();
    },
    onError: (error) => toast.error(describeSettingsFailure(error, { not_found: "Votre agence ne dessert plus cette zone. La liste a été actualisée." }).message),
  });

  const list = zones.data?.zones ?? [];
  const placed = list.filter((zone) => zone.position);

  const actions = (zone: AgencyZone) => (
    <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions pour ${zone.name}`} size="compact" variant="quiet" />}>
      <DropdownMenuItem icon={Pencil} onSelect={() => setEditing({ mode: "edit", zone })}>
        Modifier le tarif ou le délai
      </DropdownMenuItem>
      <DropdownMenuItem icon={zone.enabled ? Pause : Play} onSelect={() => toggle.mutate(zone)}>
        {zone.enabled ? "Mettre en pause" : "Proposer à nouveau"}
      </DropdownMenuItem>
      <DropdownMenuItem icon={Trash2} tone="danger" onSelect={() => setRemoving(zone)}>
        Retirer la zone
      </DropdownMenuItem>
    </DropdownMenu>
  );


  return (
    <SettingsPanel
      primary
      title="Zones de couverture"
      description="Définissez les zones où votre agence effectue des livraisons."
      action={
        <Button variant="primary" icon={Plus} onClick={() => setEditing({ mode: "create" })} className="w-full sm:w-auto">
          Ajouter une zone
        </Button>
      }
    >
      {zones.isPending ? (
        <Skeleton className="h-64 w-full rounded-panel" />
      ) : zones.isError ? (
        <ErrorState title="Zones indisponibles" description={describeSettingsFailure(zones.error).message} onRetry={() => zones.refetch()} retrying={zones.isFetching} />
      ) : (
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)]">
          <ZonesMap zones={placed} total={list.length} />
          <div className="flex min-w-0 flex-col gap-3">
            {list.length === 0 ? (
              <EmptyState icon={MapPinned} title="Aucune zone" description="Ajoutez la première zone où vous livrez : elle sera proposée au paiement." />
            ) : (
              <>
                {/* A table from 768px, as in the mock-up; one card per zone on a phone. */}
                <div className="hidden overflow-hidden rounded-panel border border-border md:block">
                  <table className="w-full text-body">
                    <caption className="sr-only">Zones desservies, tarifs et délais</caption>
                    <thead className="bg-surface-subtle text-left text-label text-foreground-muted">
                      <tr>
                        <th scope="col" className="px-4 py-2.5 font-medium">Zone</th>
                        <th scope="col" className="px-3 py-2.5 text-right font-medium">Tarif (FCFA)</th>
                        <th scope="col" className="px-3 py-2.5 font-medium">Délai estimé</th>
                        <th scope="col" className="px-3 py-2.5 font-medium">Statut</th>
                        <th scope="col" className="w-12 px-3 py-2.5 text-right font-medium">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {list.map((zone) => {
                        const status = statusOf(zone);
                        return (
                          <tr key={zone.id}>
                            <th scope="row" className="px-4 py-3 text-left font-medium text-foreground">{zone.name}</th>
                            <td className="px-3 py-3 text-right text-foreground tabular-nums">{formatMoneyFromFrancs(asFrancs(zone.tarif), { currency: false })}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-foreground-muted">{zone.delay || "—"}</td>
                            <td className="px-3 py-3">
                              <Badge tone={status.tone}>{status.label}</Badge>
                            </td>
                            <td className="px-3 py-2 text-right">{actions(zone)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-panel border border-border md:hidden">
                  {list.map((zone) => {
                    const status = statusOf(zone);
                    return (
                      <li key={zone.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body font-medium text-foreground">{zone.name}</p>
                          <p className="text-meta text-foreground-muted tabular-nums">
                            {formatMoneyFromFrancs(asFrancs(zone.tarif))} · {zone.delay || "délai non précisé"}
                          </p>
                        </div>
                        <Badge tone={status.tone}>{status.label}</Badge>
                        {actions(zone)}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <Alert tone="info" title="Ces tarifs sont ceux du paiement">
              Le client qui choisit votre agence paie le tarif de sa zone, tel qu&apos;il est affiché ici. Une zone en pause n&apos;est plus proposée par votre agence.
            </Alert>
          </div>
        </div>
      )}

      {editing && (
        <ZoneDialog
          agencyId={agencyId}
          editing={editing}
          maxTarif={zones.data?.maxTarif ?? 1_000_000}
          onClose={() => setEditing(null)}
          onSaved={async (message) => {
            toast.success(message);
            setEditing(null);
            await refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Retirer ${removing?.name ?? "la zone"} ?`}
        description="Votre agence ne sera plus proposée pour cette zone au paiement. Les livraisons déjà commandées ne changent pas."
        confirmLabel="Retirer la zone"
        confirmIcon={Trash2}
        tone="danger"
        onConfirm={async () => {
          if (!removing) return;
          try {
            await removeZone(agencyId, removing.id);
            toast.success(`${removing.name} retirée.`);
          } catch (error) {
            toast.error(describeSettingsFailure(error, { not_found: "Votre agence ne dessert déjà plus cette zone." }).message);
          } finally {
            await refresh();
          }
        }}
      />
    </SettingsPanel>
  );
}

function ZonesMap({ zones, total }: { zones: AgencyZone[]; total: number }) {
  if (zones.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-panel border border-dashed border-border-strong p-6 text-center">
        <MapPinned className="size-6 text-foreground-subtle" aria-hidden="true" />
        <p className="text-meta text-foreground-muted">
          {total === 0 ? "Vos zones apparaîtront ici." : "La position de vos zones n'est pas connue : elles ne peuvent pas être placées sur la carte."}
        </p>
      </div>
    );
  }
  const lat = zones.reduce((sum, zone) => sum + zone.position!.lat, 0) / zones.length;
  const lng = zones.reduce((sum, zone) => sum + zone.position!.lng, 0) / zones.length;
  const pin = (zone: AgencyZone) => (
    <span className="flex flex-col items-center gap-1">
      <span className={zone.atCheckout ? "size-3.5 rounded-pill border-2 border-white bg-brand shadow-raised" : "size-3.5 rounded-pill border-2 border-white bg-foreground-subtle shadow-raised"} />
      <span className="rounded-compact bg-surface/95 px-1.5 py-0.5 text-meta font-medium whitespace-nowrap text-foreground shadow-raised">{zone.name}</span>
    </span>
  );
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <StaticMap
        lat={lat}
        lng={lng}
        zoom={MAP_AREA_ZOOM}
        label={`Carte des zones : ${zones.map((zone) => zone.name).join(", ")}`}
        marker={null}
        others={zones.map((zone) => ({ lat: zone.position!.lat, lng: zone.position!.lng, marker: pin(zone) }))}
        className="h-64 xl:h-80"
      />
      <figcaption className="flex items-start gap-1.5 text-meta text-foreground-muted">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Position approximative de chaque localité{zones.length < total ? ` · ${total - zones.length} zone${total - zones.length > 1 ? "s" : ""} sans position connue` : ""}.
      </figcaption>
    </figure>
  );
}

interface ZoneDialogProps {
  agencyId: string;
  editing: Editing;
  maxTarif: number;
  onClose: () => void;
  onSaved: (message: string) => void | Promise<void>;
}

function ZoneDialog({ agencyId, editing, maxTarif, onClose, onSaved }: ZoneDialogProps) {
  const listId = useId();
  const zone = editing.mode === "edit" ? editing.zone : null;
  const [values, setValues] = useState({
    name: zone?.name ?? "",
    tarif: zone ? String(zone.tarif) : "",
    delay: zone?.delay ?? "1–2 jours",
    enabled: zone?.enabled ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const catalog = useQuery({
    queryKey: ["agency", agencyId, "zones", "catalog"],
    queryFn: () => fetchZoneCatalog(agencyId),
    enabled: editing.mode === "create",
    staleTime: 60_000,
  });

  const set = (key: keyof typeof values, value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    const local: Record<string, string> = {};
    const name = values.name.trim().replace(/\s+/g, " ");
    const tarif = values.tarif.replace(/[\s  ]/g, "");
    if (!zone && name.length < 2) local.name = "Indiquez le nom de la zone (ville, commune ou quartier).";
    if (!/^\d+$/.test(tarif)) local.tarif = "Le tarif est un montant entier en FCFA, sans centimes.";
    else if (Number(tarif) < 1) local.tarif = "Le tarif doit être d'au moins 1 FCFA : 0 serait proposé comme une livraison gratuite.";
    else if (Number(tarif) > maxTarif) local.tarif = `Le tarif ne peut pas dépasser ${formatMoneyFromFrancs(asFrancs(maxTarif))}.`;
    if (!values.delay.trim()) local.delay = "Indiquez le délai annoncé au client.";
    setErrors(local);
    if (Object.values(local).some(Boolean)) return;

    lock.current = true;
    setSaving(true);
    const draft: ZoneDraft = { name, tarif: Number(tarif), delay: values.delay.trim(), enabled: values.enabled };
    try {
      if (zone) {
        const change: Partial<Omit<ZoneDraft, "name">> = {};
        if (draft.tarif !== zone.tarif) change.tarif = draft.tarif;
        if (draft.delay !== zone.delay) change.delay = draft.delay;
        if (draft.enabled !== zone.enabled) change.enabled = draft.enabled;
        if (Object.keys(change).length === 0) {
          onClose();
          return;
        }
        await updateZone(agencyId, zone.id, change);
        await onSaved(`${zone.name} mise à jour.`);
      } else {
        await createZone(agencyId, draft);
        await onSaved(`${name} ajoutée.`);
      }
    } catch (error) {
      const failure = describeSettingsFailure(error);
      const fields = { ...failure.fields };
      if (failure.kind === "conflict") fields.name = failure.message;
      setErrors(fields);
      if (Object.keys(fields).length === 0) toast.error(failure.message);
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={zone ? `Modifier ${zone.name}` : "Ajouter une zone"}
        description={zone ? "Le nouveau tarif s'applique aux prochaines commandes." : "La zone sera proposée au paiement dès son ajout, au tarif indiqué."}
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {!zone && (
            <FormField label="Zone" required error={errors.name} hint="Choisissez une zone existante ou saisissez-en une nouvelle.">
              <Input value={values.name} onChange={(event) => set("name", event.target.value)} list={listId} maxLength={100} autoComplete="off" />
            </FormField>
          )}
          {!zone && (
            <datalist id={listId}>
              {(catalog.data ?? []).map((option) => (
                <option key={option.id} value={option.name} />
              ))}
            </datalist>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tarif" required error={errors.tarif}>
              <Input value={values.tarif} onChange={(event) => set("tarif", event.target.value)} inputMode="numeric" suffix="FCFA" className="tabular-nums" />
            </FormField>
            <FormField label="Délai estimé" required error={errors.delay}>
              <Select value={values.delay} onChange={(event) => set("delay", event.target.value)} options={[...DELAYS, ...(DELAYS.includes(values.delay) ? [] : [values.delay])].map((delay) => ({ value: delay, label: delay }))} />
            </FormField>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2.5">
            <span id={`${listId}-enabled`} className="text-body text-foreground">
              Proposer cette zone au paiement
            </span>
            <Switch checked={values.enabled} onCheckedChange={(checked) => set("enabled", checked)} aria-labelledby={`${listId}-enabled`} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" icon={zone ? Pencil : Plus} loading={saving}>
              {zone ? "Enregistrer" : "Ajouter la zone"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
