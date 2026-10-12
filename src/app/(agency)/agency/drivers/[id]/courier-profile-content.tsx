"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  Ban,
  Bike,
  CalendarDays,
  Car,
  Check,
  CircleAlert,
  CircleCheck,
  CirclePause,
  CirclePlay,
  Clock,
  ExternalLink,
  FileText,
  HandCoins,
  History,
  IdCard,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Pencil,
  Percent,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  ShieldX,
  Siren,
  Star,
  Timer,
  Truck,
  User,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  DataTable,
  DescriptionList,
  Dialog,
  DialogClose,
  DialogContent,
  ErrorState,
  FormField,
  Input,
  Money,
  PageHeader,
  Select,
  Skeleton,
  Stat,
  StatusBadge,
  cn,
  formatMoneyFromFrancs,
  iconTileClass,
  type DataTableColumn,
  type DescriptionItem,
  type PageAction,
  type Tone,
} from "@/design-system";
import { CourierActionDialogs, courierAbilities, type CourierIntent } from "@/features/agency/components/courier-actions";
import { DeliveryActionDialogs, type DeliveryIntent } from "@/features/agency/components/delivery-actions";
import { DeliveryRowActions } from "@/features/agency/components/delivery-row-actions";
import { DeliveryLink, DeliveryStatus, Destination } from "@/features/agency/components/delivery-bits";
import { AgencyPage, KpiMoney, KpiRow } from "@/features/agency/components/page";
import { Panel } from "@/features/agency/components/panel";
import { StaticMap } from "@/features/agency/components/static-map";
import { DOCUMENT_TYPE_LABEL, documentLabel, vehicleLabel, type Courier, type CourierDayEvent, type CourierDetail, type CourierDocument } from "@/features/agency/couriers/contract";
import { courierDocumentFilePath } from "@/features/agency/couriers/api";
import { useCourier, useCourierAction } from "@/features/agency/couriers/hooks";
import type { DeliveryRow } from "@/features/agency/deliveries/contract";
import { describeAgencyFailure } from "@/features/agency/errors";
import { useAgencyId } from "@/features/agency/session";
import {
  formatCount,
  formatDay,
  formatDayTime,
  formatDuration,
  formatLongDate,
  formatRate,
  formatTime,
  mapsPointHref,
  parseDate,
  relativeTime,
  since,
  telHref,
  whatsappHref,
} from "@/features/agency/format";

const LIST = "/agency/drivers";

const VEHICLE_ICON: Record<string, LucideIcon> = { Moto: Bike, Vélo: Bike, Voiture: Car, Tricycle: Truck };
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-body text-foreground-muted">{children}</p>;
}

// ── Day events ──────────────────────────────────────────────

const EVENT: Record<string, { label: string; icon: LucideIcon; tone: Tone | "brand" }> = {
  assigned: { label: "Course assignée", icon: UserCheck, tone: "info" },
  picked_up: { label: "Colis récupéré", icon: Package, tone: "brand" },
  in_transit: { label: "En cours de livraison", icon: Truck, tone: "info" },
  arrived: { label: "Arrivé chez le client", icon: MapPin, tone: "info" },
  delivered: { label: "Livraison réussie", icon: CircleCheck, tone: "success" },
  delivery_failed: { label: "Tentative échouée", icon: CircleAlert, tone: "danger" },
  incident: { label: "Incident signalé", icon: Siren, tone: "danger" },
  proof_submitted: { label: "Preuve de remise envoyée", icon: FileText, tone: "success" },
  note: { label: "Note ajoutée", icon: FileText, tone: "neutral" },
};

/** An event is named by the status it led to, else by its type; an unknown one is still listed. */
function eventOf(event: CourierDayEvent) {
  return EVENT[event.status ?? ""] ?? EVENT[event.type] ?? { label: "Mise à jour de la course", icon: Clock, tone: "neutral" as const };
}

function DayEvents({ events }: { events: CourierDayEvent[] }) {
  const [all, setAll] = useState(false);
  if (events.length === 0) return <Empty>Rien d&apos;enregistré aujourd&apos;hui pour ce livreur.</Empty>;
  const shown = all ? events : events.slice(0, DAY_EVENTS_SHOWN);
  return (
    <>
    <ol className="flex flex-col">
      {shown.map((event, index) => {
        const { label, icon: Icon, tone } = eventOf(event);
        const last = index === shown.length - 1;
        return (
          <li key={`${event.at}-${index}`} className="flex gap-3">
            <time dateTime={event.at} className="w-10 shrink-0 pt-1.5 text-meta text-foreground-muted tabular-nums">
              {formatTime(event.at)}
            </time>
            <div className="flex flex-col items-center">
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-control", iconTileClass[tone])}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
              {!last && <span className="my-1 w-px flex-1 bg-border" aria-hidden="true" />}
            </div>
            <div className={cn("min-w-0 flex-1 pt-1", !last && "pb-4")}>
              <p className="text-body font-medium text-foreground">{label}</p>
              <p className="truncate text-meta text-foreground-muted">
                <Link href={`/agency/deliveries/${event.deliveryId}`} className="rounded-compact tabular-nums underline-offset-2 hover:underline">
                  {event.reference ?? "Course sans numéro"}
                </Link>
                {event.memo && ` · ${event.memo}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
    {events.length > DAY_EVENTS_SHOWN && (
      <Button variant="quiet" size="compact" className="mt-3" aria-expanded={all} onClick={() => setAll(!all)}>
        {all ? "Réduire" : `Voir toute la journée (${events.length})`}
      </Button>
    )}
    </>
  );
}

// ── Documents ───────────────────────────────────────────────

function expiryOf(document: CourierDocument): { text: string; tone: Tone } | null {
  const date = parseDate(document.expiresOn);
  if (!date) return null;
  const days = Math.round((date.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  if (days < 0) return { text: `Expirée le ${formatLongDate(document.expiresOn)}`, tone: "danger" };
  if (days <= 30) return { text: `Expire le ${formatLongDate(document.expiresOn)}`, tone: "warning" };
  return { text: `Valable jusqu'au ${formatLongDate(document.expiresOn)}`, tone: "neutral" };
}

const DOCUMENT_TYPES = Object.entries(DOCUMENT_TYPE_LABEL).map(([value, label]) => ({ value, label }));
/** The backend takes pictures and PDF up to 5 MB (AddCourierKycDocumentRequest). */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function AddDocumentDialog({ courier, open, onOpenChange }: { courier: Courier; open: boolean; onOpenChange: (open: boolean) => void }) {
  const action = useCourierAction();
  return (
    <Dialog open={open} onOpenChange={(next) => !action.isPending && onOpenChange(next)}>
      {/* Mounted with the dialog: a dialog reopened starts from an empty form. */}
      {open && <AddDocumentPanel courier={courier} action={action} close={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function AddDocumentPanel({ courier, action, close }: { courier: Courier; action: ReturnType<typeof useCourierAction>; close: () => void }) {
  const [type, setType] = useState("id_card");
  const [number, setNumber] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!file) next.file = "Choisissez le fichier de la pièce.";
    else if (file.size > MAX_FILE_BYTES) next.file = "Le fichier dépasse 5 Mo.";
    else if (!/\.(jpe?g|png|pdf)$/i.test(file.name)) next.file = "Formats acceptés : JPG, PNG ou PDF.";
    setErrors(next);
    if (Object.keys(next).length > 0 || !file) return;

    try {
      await action.mutateAsync({
        type: "document",
        id: courier.id,
        document: { type, name: documentLabel(type), number: number.trim() || undefined, expiresOn: expiresOn || undefined, file },
      });
      toast.success("Pièce ajoutée. Elle attend votre vérification.");
      close();
    } catch (error) {
      const failure = describeAgencyFailure(error);
      setErrors({ file: failure.fields["files.0"] ?? failure.fields.files ?? "", number: failure.fields.document_number ?? "", expiresOn: failure.fields.expires_on ?? "" });
      toast.error(failure.message);
    }
  }

  return (
      <DialogContent
        size="sm"
        title="Ajouter une pièce"
        description={`Au dossier de ${courier.name}. Photo ou PDF, 5 Mo au plus.`}
        footer={
          <>
            <DialogClose asChild>
              <Button disabled={action.isPending}>Annuler</Button>
            </DialogClose>
            <Button type="submit" form="courier-document-form" variant="primary" icon={Check} loading={action.isPending}>
              Ajouter la pièce
            </Button>
          </>
        }
      >
        <form id="courier-document-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
          <FormField label="Type de pièce" required>
            <Select value={type} onChange={(event) => setType(event.target.value)} options={DOCUMENT_TYPES} />
          </FormField>
          <FormField label="Numéro de la pièce" error={errors.number || null}>
            <Input value={number} onChange={(event) => setNumber(event.target.value)} maxLength={100} autoComplete="off" />
          </FormField>
          <FormField label="Date d'expiration" error={errors.expiresOn || null}>
            <Input type="date" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} />
          </FormField>
          {/* A native file field: wired to its label, hint and error by hand. */}
          <FormField id="courier-document-file" label="Fichier" required error={errors.file || null} hint="JPG, PNG ou PDF.">
            <input
              id="courier-document-file"
              type="file"
              required
              aria-invalid={errors.file ? true : undefined}
              aria-describedby={errors.file ? "courier-document-file-error courier-document-file-hint" : "courier-document-file-hint"}
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setErrors((current) => ({ ...current, file: "" }));
              }}
              className="block w-full text-body text-foreground file:mr-3 file:h-control file:cursor-pointer file:rounded-button file:border file:border-solid file:border-border-strong file:bg-surface file:px-3 file:text-label file:font-medium file:text-foreground hover:file:bg-surface-subtle"
            />
          </FormField>
        </form>
      </DialogContent>
  );
}

function CommissionDialog({ courier, rate, own, open, onOpenChange }: { courier: Courier; rate: number; own: boolean; open: boolean; onOpenChange: (open: boolean) => void }) {
  const action = useCourierAction();
  return (
    <Dialog open={open} onOpenChange={(next) => !action.isPending && onOpenChange(next)}>
      {/* Mounted with the dialog: the field starts from the rate of the moment. */}
      {open && <CommissionPanel courier={courier} rate={rate} own={own} action={action} close={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function CommissionPanel({ courier, rate, own, action, close }: { courier: Courier; rate: number; own: boolean; action: ReturnType<typeof useCourierAction>; close: () => void }) {
  const [value, setValue] = useState(String(rate).replace(".", ","));
  const [error, setError] = useState<string | null>(null);

  async function save(next: number | null) {
    try {
      await action.mutateAsync({ type: "commission", id: courier.id, rate: next });
      toast.success(next === null ? `${courier.name} revient au taux de l'agence.` : `Part de ${courier.name} fixée à ${formatRate(next)}.`);
      close();
    } catch (failure) {
      toast.error(describeAgencyFailure(failure).message);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = Number(value.replace(",", ".").trim());
    if (value.trim() === "" || !Number.isFinite(next) || next < 0 || next > 100) {
      setError("Saisissez un pourcentage entre 0 et 100.");
      return;
    }
    void save(next);
  }

  return (
      <DialogContent
        size="sm"
        title={`Part de ${courier.name}`}
        description="Ce qui lui revient sur le prix de chaque livraison qu'il termine ; le reste revient à l'agence. Les livraisons déjà terminées gardent le taux du jour de leur remise."
        footer={
          <>
            {own && (
              <Button variant="quiet" disabled={action.isPending} onClick={() => save(null)}>
                Revenir au taux de l&apos;agence
              </Button>
            )}
            <Button type="submit" form="courier-commission-form" variant="primary" icon={Check} loading={action.isPending}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="courier-commission-form" onSubmit={submit} noValidate>
          <FormField label="Part du livreur" required error={error}>
            <Input
              inputMode="decimal"
              suffix="%"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
            />
          </FormField>
        </form>
      </DialogContent>
  );
}

// ── Page ────────────────────────────────────────────────────

const RECENT_COLUMNS: DataTableColumn<DeliveryRow>[] = [
  { id: "reference", header: "N°", mobile: "title", className: "whitespace-nowrap", cell: (delivery) => <DeliveryLink delivery={delivery} /> },
  {
    id: "client",
    header: "Client",
    mobile: "subtitle",
    className: "@2xl:max-w-36",
    cell: (delivery) => (
      <span className="block truncate" title={delivery.recipient.name ?? undefined}>
        {delivery.recipient.name ?? "—"}
      </span>
    ),
  },
  {
    id: "address",
    header: "Adresse",
    // The address gives way first: it is cut with its tooltip, a name should be read whole beside the menu of the row.
    className: "@2xl:max-w-28 @4xl:max-w-44",
    cell: (delivery) => <Destination delivery={delivery} icon={false} />,
    mobileCell: (delivery) => <Destination delivery={delivery} icon={false} wrap />,
  },
  { id: "amount", header: "Montant", numeric: true, cell: (delivery) => <Money francs={delivery.feeFrancs} /> },
  { id: "status", header: "Statut", mobile: "badge", cell: (delivery) => <DeliveryStatus delivery={delivery} late="icon" />, mobileCell: (delivery) => <DeliveryStatus delivery={delivery} stacked /> },
  { id: "date", header: "Date", className: "whitespace-nowrap", cell: (delivery) => <span className="tabular-nums">{formatDayTime(delivery.createdAt)}</span> },
];

/** Events of the day shown before « Voir toute la journée ». */
const DAY_EVENTS_SHOWN = 6;

export function CourierProfileContent({ id }: { id: string }) {
  const query = useCourier(id);
  const agencyId = useAgencyId();
  const [intent, setIntent] = useState<CourierIntent | null>(null);
  // What is asked of one of his last deliveries, from its menu.
  const [deliveryIntent, setDeliveryIntent] = useState<DeliveryIntent | null>(null);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [commissionOpen, setCommissionOpen] = useState(false);

  // Opened from "Vérifier les pièces": the documents are what the visitor came for.
  const ready = query.isSuccess;
  useEffect(() => {
    if (ready && window.location.hash === "#pieces") document.getElementById("pieces")?.scrollIntoView({ block: "start" });
  }, [ready]);

  if (query.isError) {
    const failure = describeAgencyFailure(query.error);
    return (
      <AgencyPage>
        <PageHeader title="Livreur" back={{ label: "Retour aux livreurs", href: LIST }} />
        <div className="rounded-panel border border-border bg-surface">
          <ErrorState
            title={failure.kind === "not_found" ? "Ce livreur est introuvable" : "La fiche du livreur n'a pas pu être chargée"}
            description={failure.message}
            onRetry={failure.kind === "not_found" ? undefined : () => query.refetch()}
            retrying={query.isFetching}
          />
        </div>
      </AgencyPage>
    );
  }

  if (!query.isSuccess) return <CourierProfileSkeleton />;

  const { courier, activity }: CourierDetail = query.data;
  const can = courierAbilities(courier);
  const vehicle = vehicleLabel(courier.vehicleType);
  const VehicleIcon = VEHICLE_ICON[vehicle ?? ""] ?? Bike;
  const identity = courier.documents?.find((document) => document.type === "id_card") ?? null;
  const history = `/agency/deliveries?courier=${encodeURIComponent(courier.userId)}`;
  const suspended = courier.activity === "suspended";

  const primary: PageAction | undefined = can.assign
    ? { label: "Confier une course", icon: Send, onSelect: () => setIntent({ kind: "assign", courier }) }
    : can.verify
      ? { label: "Valider les pièces", icon: ShieldCheck, onSelect: () => setIntent({ kind: "verify", courier }) }
      : can.activate
        ? { label: "Réactiver le compte", icon: UserCheck, onSelect: () => setIntent({ kind: "activate", courier }) }
        : can.resume
          ? { label: "Reprendre l'activité", icon: CirclePlay, onSelect: () => setIntent({ kind: "resume", courier }) }
          : undefined;

  const secondaryActions: PageAction[] = [
    ...(courier.phone ? [{ label: "Appeler", icon: Phone, href: telHref(courier.phone) }, { label: "WhatsApp", icon: MessageCircle, href: whatsappHref(courier.phone) }] : []),
    { label: "Historique complet", icon: History, href: history },
  ];
  const moreActions: PageAction[] = [
    { label: "Modifier la fiche", icon: Pencil, href: `${LIST}/${courier.id}/edit` },
    ...(can.pause ? [{ label: "Mettre en pause", icon: CirclePause, onSelect: () => setIntent({ kind: "pause", courier }) }] : []),
    ...(can.resume && primary?.label !== "Reprendre l'activité" ? [{ label: "Reprendre l'activité", icon: CirclePlay, onSelect: () => setIntent({ kind: "resume", courier }) }] : []),
    ...(can.suspend ? [{ label: "Suspendre le compte", icon: Ban, tone: "danger" as const, onSelect: () => setIntent({ kind: "suspend", courier }) }] : []),
  ];

  const personal: DescriptionItem[] = [
    { label: "Nom complet", icon: User, value: courier.name },
    {
      label: "Téléphone",
      icon: Phone,
      value: courier.phone ? (
        <a href={telHref(courier.phone)} className="rounded-compact tabular-nums underline-offset-2 hover:underline">
          {courier.phone}
        </a>
      ) : (
        "Non renseigné"
      ),
    },
    ...(courier.email ? [{ label: "E-mail", icon: Mail, value: <span className="break-all">{courier.email}</span> }] : []),
    { label: "Inscrit le", icon: CalendarDays, value: formatLongDate(courier.hiredAt ?? courier.createdAt) },
    ...(courier.address || courier.quartier ? [{ label: "Adresse", icon: MapPin, value: courier.address ?? courier.quartier }] : []),
    {
      label: "Pièce d'identité",
      icon: IdCard,
      value: identity ? (identity.number ? <span className="tabular-nums">{identity.number}</span> : "Transmise") : "Non transmise",
    },
    ...(courier.emergencyContactName || courier.emergencyContactPhone
      ? [{ label: "Contact d'urgence", icon: Siren, value: [courier.emergencyContactName, courier.emergencyContactPhone].filter(Boolean).join(" · ") }]
      : []),
  ];

  const vehicleItems: DescriptionItem[] = [
    { label: "Type", value: vehicle ?? "Non renseigné" },
    ...(courier.vehicleMake ? [{ label: "Marque et modèle", value: courier.vehicleMake }] : []),
    ...(courier.vehicleColor ? [{ label: "Couleur", value: courier.vehicleColor }] : []),
    { label: "Immatriculation", value: courier.vehiclePlate ? <span className="tabular-nums">{courier.vehiclePlate}</span> : "Non renseignée" },
    ...(courier.vehicleYear ? [{ label: "Année", value: <span className="tabular-nums">{courier.vehicleYear}</span> }] : []),
  ];

  const mission = activity?.mission ?? null;
  const position = activity?.lastPosition ?? null;
  const earnings = activity?.earnings ?? null;
  const rhythm = activity?.rhythm ?? null;
  const delivered30 = rhythm ? rhythm.byWeekday.reduce((sum, count) => sum + count, 0) : 0;

  return (
    <AgencyPage>
      <PageHeader
        title={courier.name}
        back={{ label: "Retour aux livreurs", href: LIST }}
        leading={<Avatar name={courier.name} size="xl" />}
        titleAddon={<StatusBadge domain="courierActivity" code={courier.activity} />}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {courier.employeeId && (
              <span>
                Matricule <span className="font-medium text-foreground tabular-nums">{courier.employeeId}</span>
              </span>
            )}
            <Badge tone={courier.kycVerified ? "success" : "warning"} icon={courier.kycVerified ? ShieldCheck : CircleAlert}>
              {courier.kycVerified ? "Pièces validées" : "Pièces à vérifier"}
            </Badge>
            {/* An account waiting for its documents was never opened: it is not « en pause », which the agency decides. */}
            <Badge tone={suspended ? "danger" : courier.isActive ? "success" : "neutral"} icon={suspended ? Ban : courier.isActive ? CircleCheck : CirclePause}>
              {suspended ? "Compte suspendu" : courier.isActive ? "Compte actif" : courier.activity === "to_verify" ? "Compte non activé" : "Compte en pause"}
            </Badge>
            {since(courier.hiredAt) && <Badge icon={Clock}>{since(courier.hiredAt)}</Badge>}
          </span>
        }
        primaryAction={primary}
        secondaryActions={secondaryActions}
        moreActions={moreActions}
      />

      {!activity && (
        <Alert tone="info" title="Activité indisponible">
          Le détail de l&apos;activité de ce livreur n&apos;a pas été transmis. Sa fiche et ses pièces restent consultables.
        </Alert>
      )}

      <KpiRow columns={4} label="Chiffres du livreur">
        <Stat
          layout="figure"
          label="Livraisons"
          icon={Package}
          value={formatCount(courier.totalDeliveries)}
          hint={activity ? `${formatCount(activity.deliveriesThisMonth)} ce mois-ci` : undefined}
        />
        <Stat
          layout="figure"
          label="Taux de succès"
          icon={Star}
          value={courier.successRate === null ? "—" : formatRate(courier.successRate)}
          hint={courier.successRate === null ? "Pas encore de livraison" : `${formatCount(courier.completedDeliveries)} livraison${courier.completedDeliveries > 1 ? "s" : ""} réussie${courier.completedDeliveries > 1 ? "s" : ""}`}
        />
        <Stat
          layout="figure"
          label="Temps moyen"
          icon={Timer}
          value={activity?.averageDeliveryMinutes === null || activity?.averageDeliveryMinutes === undefined ? "—" : formatDuration(activity.averageDeliveryMinutes)}
          hint="De la collecte à la remise, sur 90 jours"
        />
        <Stat
          layout="figure"
          label="Revenus générés"
          icon={HandCoins}
          value={activity ? <KpiMoney francs={activity.revenueTotalFrancs} /> : "—"}
          hint={activity ? `${formatMoneyFromFrancs(activity.revenueThisMonthFrancs)} ce mois-ci` : undefined}
        />
      </KpiRow>

      <div
        className={cn(
          "grid gap-4 [grid-template-areas:'mission''position''personal''vehicle''zone''earnings''recent''day''documents']",
          "md:grid-cols-2 md:[grid-template-areas:'mission_position''personal_vehicle''zone_earnings''recent_recent''day_documents']",
          "xl:grid-cols-3 xl:[grid-template-areas:'personal_mission_position''vehicle_zone_earnings''recent_recent_day''documents_documents_documents']",
        )}
      >
        <Panel title="Mission actuelle" className="[grid-area:mission]" actions={mission && <DeliveryStatus delivery={mission} />}>
          {mission ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2.5">
                  <span className={cn("flex size-8 items-center justify-center rounded-control", iconTileClass.brand)}>
                    <Package className="size-4" aria-hidden="true" />
                  </span>
                  <DeliveryLink delivery={mission} />
                </span>
                <Button asChild variant="outline" size="compact" trailingIcon={ArrowRight}>
                  <Link href={`/agency/deliveries/${mission.id}`}>Voir la course</Link>
                </Button>
              </div>
              <DescriptionList
                className="-my-2"
                items={[
                  {
                    label: "Client",
                    icon: User,
                    value: (
                      <span className="flex flex-col md:items-end">
                        <span>{mission.recipient.name ?? "Non renseigné"}</span>
                        {mission.recipient.phone && (
                          <a href={telHref(mission.recipient.phone)} className="rounded-compact text-meta text-foreground-muted tabular-nums underline-offset-2 hover:underline">
                            {mission.recipient.phone}
                          </a>
                        )}
                      </span>
                    ),
                  },
                  { label: "Adresse de livraison", icon: MapPin, value: [mission.recipient.address, mission.zone?.name ?? mission.recipient.city].filter(Boolean).join(", ") || "Non renseignée" },
                  ...(mission.eta ? [{ label: "Arrivée prévue", icon: Clock, value: <span className="tabular-nums">{formatDayTime(mission.eta)}</span> }] : []),
                ]}
              />
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <Empty>{can.assign ? "Aucune course en main : ce livreur est disponible." : "Aucune course en main."}</Empty>
              {can.assign && (
                <Button size="compact" icon={Send} onClick={() => setIntent({ kind: "assign", courier })}>
                  Confier une course
                </Button>
              )}
            </div>
          )}
        </Panel>

        <Panel
          title="Dernière position"
          className="[grid-area:position]"
          actions={
            position && (
              <Button asChild variant="outline" size="compact" trailingIcon={ExternalLink}>
                <a href={mapsPointHref(position.lat, position.lng)} target="_blank" rel="noreferrer">
                  Ouvrir la carte
                </a>
              </Button>
            )
          }
        >
          {position ? (
            <StaticMap
              lat={position.lat}
              lng={position.lng}
              label={`Carte : dernière position connue de ${courier.name}`}
              marker={
                <span className="flex size-10 items-center justify-center rounded-pill border-2 border-white bg-brand text-white shadow-overlay">
                  <VehicleIcon className="size-5" />
                </span>
              }
            >
              <p className="flex items-center gap-2 rounded-control bg-surface px-2.5 py-1.5 text-meta text-foreground shadow-raised">
                <Navigation className="size-3.5 shrink-0 text-info-icon" aria-hidden="true" />
                <span>
                  <span className="block font-medium">{relativeTime(position.recordedAt) ?? "Position transmise"}</span>
                  {position.recordedAt && <span className="text-foreground-muted tabular-nums">{formatDayTime(position.recordedAt)}</span>}
                </span>
              </p>
            </StaticMap>
          ) : (
            <Empty>Le téléphone de ce livreur n&apos;a transmis aucune position.</Empty>
          )}
        </Panel>

        <Panel
          title="Informations personnelles"
          className="[grid-area:personal]"
          actions={
            <Button asChild size="compact">
              <Link href={`${LIST}/${courier.id}/edit`}>Modifier</Link>
            </Button>
          }
        >
          <DescriptionList items={personal} className="-my-2" />
        </Panel>

        <Panel
          title="Véhicule"
          className="[grid-area:vehicle]"
          actions={
            <Button asChild size="compact">
              <Link href={`${LIST}/${courier.id}/edit`}>Modifier</Link>
            </Button>
          }
        >
          <div className="mb-2 flex items-center gap-3">
            <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-control", iconTileClass.brand)}>
              <VehicleIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-foreground">{[vehicle, courier.vehicleMake].filter(Boolean).join(" – ") || "Véhicule non renseigné"}</p>
              {courier.vehiclePlate && <p className="text-meta text-foreground-muted tabular-nums">{courier.vehiclePlate}</p>}
            </div>
          </div>
          <DescriptionList items={vehicleItems} className="-mb-2" />
        </Panel>

        <Panel title="Zone et rythme" className="[grid-area:zone]">
          <DescriptionList
            className="-mt-2"
            items={[
              { label: "Zone principale", icon: MapPin, value: courier.quartier ?? "Non renseignée" },
              ...(courier.branch ? [{ label: "Antenne", icon: MapPin, value: courier.branch }] : []),
              {
                label: "Heures d'activité",
                icon: Clock,
                value:
                  rhythm && rhythm.firstHour !== null && rhythm.lastHour !== null ? (
                    <span className="tabular-nums">
                      {String(rhythm.firstHour).padStart(2, "0")} h – {String(rhythm.lastHour + 1).padStart(2, "0")} h
                    </span>
                  ) : (
                    "—"
                  ),
              },
            ]}
          />
          <div className="mt-2 border-t border-border pt-3">
            <p className="flex items-center gap-2 text-label text-foreground-muted">
              <CalendarDays className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
              Jours actifs
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Jours de la semaine où il a livré">
              {WEEKDAYS.map((day, index) => {
                const active = (rhythm?.byWeekday[index] ?? 0) > 0;
                return (
                  <li key={day}>
                    <Badge tone={active ? "warning" : "neutral"} className={cn(!active && "text-foreground-muted")}>
                      {day}
                      <span className="sr-only">{active ? " : actif" : " : inactif"}</span>
                    </Badge>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-meta text-foreground-muted">
              {rhythm && delivered30 > 0
                ? `Constaté sur ${delivered30 > 1 ? `ses ${formatCount(delivered30)} livraisons` : "sa seule livraison"} des ${rhythm.windowDays} derniers jours.`
                : "Aucune livraison terminée sur les 30 derniers jours."}
            </p>
          </div>
        </Panel>

        <Panel
          title="Gains du mois"
          className="[grid-area:earnings]"
          actions={
            earnings && (
              <Button size="compact" icon={Percent} onClick={() => setCommissionOpen(true)}>
                Modifier le taux
              </Button>
            )
          }
        >
          {earnings ? (
            <>
              <DescriptionList
                className="-my-2"
                items={[
                  {
                    label: "Courses livrées",
                    icon: HandCoins,
                    value: <Money francs={earnings.thisMonth.revenueFrancs} className="font-semibold" />,
                  },
                  {
                    label: "Part de l'agence",
                    icon: Percent,
                    value: (
                      <span className="inline-flex flex-wrap items-center justify-end gap-2">
                        <Money francs={earnings.thisMonth.agencyShareFrancs} />
                        <Badge>{formatRate(Math.round((100 - earnings.commissionRate) * 10) / 10)}</Badge>
                      </span>
                    ),
                  },
                  {
                    label: "Part du livreur",
                    icon: User,
                    value: (
                      <span className="inline-flex flex-wrap items-center justify-end gap-2">
                        <Money francs={earnings.thisMonth.courierShareFrancs} className="font-semibold text-success-fg" />
                        <Badge tone="success">{formatRate(earnings.commissionRate)}</Badge>
                      </span>
                    ),
                  },
                  { label: "Mois dernier", icon: CalendarDays, value: <Money francs={earnings.lastMonth.revenueFrancs} /> },
                ]}
              />
              <p className="mt-3 text-meta text-foreground-muted">
                {earnings.rateIsOwn ? "Taux propre à ce livreur." : "Taux par défaut de l'agence."} Chaque livraison terminée garde le taux du jour de sa remise.
              </p>
            </>
          ) : (
            <Empty>Le partage des gains n&apos;a pas été transmis.</Empty>
          )}
        </Panel>

        <DataTable
          className="[grid-area:recent]"
          caption="Dernières livraisons"
          header={{
            title: "Dernières livraisons",
            actions: (
              <Button asChild variant="outline" size="compact" trailingIcon={ArrowRight}>
                <Link href={history}>Voir toutes les livraisons</Link>
              </Button>
            ),
          }}
          columns={RECENT_COLUMNS}
          density="compact"
          rows={activity?.recentDeliveries ?? []}
          getRowId={(delivery) => delivery.id}
          rowActions={(delivery) => <DeliveryRowActions delivery={delivery} onIntent={setDeliveryIntent} menuOnly />}
          empty={{ icon: Package, title: "Aucune livraison confiée à ce livreur", description: "Ses courses apparaîtront ici dès la première." }}
        />

        <Panel title="Activité du jour" className="[grid-area:day]">
          <DayEvents events={activity?.todayEvents ?? []} />
        </Panel>

        <Panel
          title="Pièces justificatives"
          icon={ShieldCheck}
          tone={courier.kycVerified ? "success" : "warning"}
          className="scroll-mt-4 [grid-area:documents]"
          actions={
            <>
              {can.verify && (
                <>
                  <Button size="compact" icon={ShieldX} onClick={() => setIntent({ kind: "reject", courier })}>
                    Refuser
                  </Button>
                  <Button size="compact" variant="primary" icon={ShieldCheck} onClick={() => setIntent({ kind: "verify", courier })}>
                    Valider les pièces
                  </Button>
                </>
              )}
              <Button size="compact" icon={Plus} onClick={() => setDocumentOpen(true)}>
                Ajouter une pièce
              </Button>
            </>
          }
        >
          <div id="pieces">
            {courier.documents === null ? (
              <Empty>Les pièces sont réservées au responsable de l&apos;agence.</Empty>
            ) : courier.documents.length === 0 ? (
              <Empty>
                {courier.kycVerified
                  ? "Aucune pièce au dossier. Vous pouvez y ajouter sa pièce d'identité et son permis."
                  : "Aucune pièce transmise. Ajoutez sa pièce d'identité et son permis avant de valider son compte."}
              </Empty>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {courier.documents.map((document) => {
                  const expiry = expiryOf(document);
                  return (
                    <li key={document.id} className="flex min-w-0 items-start gap-3 rounded-control border border-border p-3">
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-control", iconTileClass.neutral)}>
                        <IdCard className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="text-body font-medium text-foreground">{documentLabel(document.type)}</span>
                          <StatusBadge domain="kycDocument" code={document.status} />
                        </p>
                        {document.number && <p className="truncate text-meta text-foreground-muted tabular-nums">N° {document.number}</p>}
                        {expiry && <p className={cn("text-meta", expiry.tone === "danger" ? "text-danger-fg" : expiry.tone === "warning" ? "text-warning-fg" : "text-foreground-muted")}>{expiry.text}</p>}
                        {/* Opened through the portal, behind the session: never by a link to the host of the API. */}
                        {document.file === "available" && agencyId && (
                          <a href={courierDocumentFilePath(agencyId, courier.id, document.id)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 rounded-compact text-meta font-medium text-primary underline-offset-2 hover:underline">
                            Voir le fichier
                            <ExternalLink className="size-3" aria-hidden="true" />
                          </a>
                        )}
                        {/* The record outlived its file: said, instead of a link that would answer an error page. */}
                        {document.file === "missing" && <p className="mt-1 text-meta text-warning-fg">Le fichier n&apos;est plus sur le serveur. Ajoutez de nouveau cette pièce.</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {courier.kycVerifiedAt && <p className="mt-3 text-meta text-foreground-muted">Pièces validées le {formatDay(courier.kycVerifiedAt)}.</p>}
          </div>
        </Panel>
      </div>

      <CourierActionDialogs intent={intent} onClose={() => setIntent(null)} />
      <DeliveryActionDialogs intent={deliveryIntent} onClose={() => setDeliveryIntent(null)} />
      <AddDocumentDialog courier={courier} open={documentOpen} onOpenChange={setDocumentOpen} />
      {earnings && <CommissionDialog courier={courier} rate={earnings.commissionRate} own={earnings.rateIsOwn} open={commissionOpen} onOpenChange={setCommissionOpen} />}
    </AgencyPage>
  );
}

export function CourierProfileSkeleton() {
  return (
    <AgencyPage aria-busy>
      <p role="status" className="sr-only">
        Chargement de la fiche du livreur…
      </p>
      <Skeleton className="h-5 w-40" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-pill" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
      </div>
      <KpiRow columns={4} label="Chargement des indicateurs">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-panel" />
        ))}
      </KpiRow>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-56 rounded-panel" />
        ))}
      </div>
    </AgencyPage>
  );
}
