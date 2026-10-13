"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Box, CalendarDays, Check, FileText, Link2, MapPin, Package, PackageSearch, Printer, ShoppingCart, Store, Truck, Warehouse } from "lucide-react";
import { Alert, Badge, Button, Card, DataTable, DescriptionList, EmptyState, PageHeader, StatusBadge, cn, suguBoxOutboundStatus, type DataTableColumn } from "@/design-system";
import type { ExpeditionDetail, ExpeditionLine, ReceptionDetail, ReceptionLine } from "../contract";
import { useExpedition, useReception } from "../hooks";
import { BOX, BinChip, BoxPage, DetailSkeleton, Journey, PageFailure, ProductCell, formatDay, formatDayShortTime, formatDayTime, formatUnits, isNotFound, plural, type JourneyStep } from "./bits";

// The page of one reception and of one expedition, after their mock-ups.
// Both are the warehouse's documents: the seller reads them, prints them,
// and opens the order an expedition serves. Nothing here changes them.

function NotFound({ title, back }: { title: string; back: { label: string; href: string } }) {
  return (
    <Card>
      <EmptyState
        icon={PackageSearch}
        title={title}
        description="Elle n'existe pas, ou elle n'appartient pas à votre boutique."
        action={
          <Button asChild variant="primary">
            <Link href={back.href}>{back.label}</Link>
          </Button>
        }
      />
    </Card>
  );
}

function PanelHeading({ icon: Icon, children, actions }: { icon: typeof Box; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-section-title text-foreground">
        <Icon className="size-5 shrink-0 text-foreground" aria-hidden="true" />
        {children}
      </h2>
      {actions}
    </div>
  );
}

// ── Reception ───────────────────────────────────────────────

/** What a line says once its two quantities are compared: the check of the warehouse, in a word. */
function lineState(line: ReceptionLine, closed: boolean) {
  if (line.received >= line.expected) return <Badge tone="success" icon={Check}>Conforme</Badge>;
  if (closed) return <Badge tone="warning">Écart ({formatUnits(line.received - line.expected).replace("-", "−")})</Badge>;
  if (line.received > 0) return <Badge tone="info">Reçu en partie</Badge>;
  return <Badge tone="neutral">En attente</Badge>;
}

function receptionSteps(reception: ReceptionDetail): JourneyStep[] {
  const { status, timeline } = reception;
  const started = Boolean(timeline.firstReceivedAt) || status === "in_progress" || status === "completed";
  const done = status === "completed";
  return [
    { label: "Créée", at: formatDayShortTime(timeline.createdAt), state: "done" },
    { label: "En attente", at: started ? "Dépôt arrivé" : null, state: started ? "done" : "current" },
    { label: "Contrôle", at: timeline.firstReceivedAt ? formatDayShortTime(timeline.firstReceivedAt) : null, state: done ? "done" : started ? "current" : "upcoming" },
    { label: "Terminée", at: timeline.completedAt ? formatDayShortTime(timeline.completedAt) : null, state: done ? "done" : "upcoming" },
  ];
}

export function SuguBoxReceptionDetail({ id }: { id: string }) {
  const { data, isError, error, refetch, isFetching, isPending } = useReception(id);
  const back = { label: "Réceptions", href: BOX.receptions };

  if (isPending) {
    return (
      <BoxPage aria-busy>
        <DetailSkeleton />
      </BoxPage>
    );
  }
  if (isError || !data) {
    return (
      <BoxPage>
        <PageHeader title="Réception" back={back} />
        {isNotFound(error) ? <NotFound title="Réception introuvable" back={{ label: "Retour aux réceptions", href: BOX.receptions }} /> : <PageFailure error={error} onRetry={() => refetch()} retrying={isFetching} />}
      </BoxPage>
    );
  }

  const closed = data.status === "completed" || data.status === "cancelled";
  const columns: DataTableColumn<ReceptionLine>[] = [
    { id: "product", header: "Produit", mobile: "title", cell: (row) => <ProductCell name={row.name} variant={row.variant} imageUrl={row.imageUrl} /> },
    { id: "sku", header: "SKU", mobile: "subtitle", cell: (row) => <span className="whitespace-nowrap tabular-nums">{row.sku ?? "—"}</span> },
    { id: "expected", header: "Qté attendue", numeric: true, cell: (row) => formatUnits(row.expected) },
    { id: "received", header: "Qté reçue", numeric: true, cell: (row) => <span className="font-semibold text-foreground">{formatUnits(row.received)}</span> },
    { id: "state", header: "État", mobile: "badge", cell: (row) => lineState(row, closed) },
    { id: "bin", header: "Emplacement", cell: (row) => (row.bin ? <BinChip code={row.bin} /> : <span className="text-foreground-muted">—</span>), mobileCell: (row) => row.bin },
  ];

  return (
    <BoxPage aria-busy={isFetching || undefined}>
      <PageHeader
        title={`Réception ${data.reference}`}
        back={back}
        titleAddon={<StatusBadge domain="suguBoxInbound" code={data.status} />}
        description={`Créée le ${formatDayTime(data.createdAt)}${data.createdBy ? ` par ${data.createdBy}` : ""}`}
        secondaryActions={[{ label: "Imprimer", icon: Printer, onSelect: () => window.print() }]}
      />

      {data.status === "cancelled" ? (
        <Alert tone="warning" title="Réception annulée">
          L&apos;entrepôt n&apos;attend plus ce dépôt{data.timeline.cancelledAt ? ` depuis le ${formatDay(data.timeline.cancelledAt)}` : ""}. Rien de ce qui suit n&apos;entrera en stock.
        </Alert>
      ) : (
        <Card className="px-2 py-4 md:px-6">
          <Journey label="Étapes de la réception" steps={receptionSteps(data)} />
        </Card>
      )}

      <Card className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-3 xl:grid-cols-5">
        <Fact icon={Store} label="Boutique" value={data.storeName ?? "—"} />
        <Fact icon={Warehouse} label="Entrepôt" value={data.warehouse?.name ?? "—"} hint={data.warehouse?.code} />
        <Fact icon={CalendarDays} label="Date prévue" value={formatDay(data.expectedAt)} />
        <Fact icon={Box} label="Articles" value={formatUnits(data.lines)} hint={data.lines > 1 ? "références" : "référence"} />
        <Fact icon={Package} label="Quantité totale" value={formatUnits(data.unitsExpected)} hint={`unités attendues, ${formatUnits(data.unitsReceived)} reçues`} />
      </Card>

      <DataTable
        caption="Articles de la réception"
        tableFrom="narrow"
        header={{ title: <PanelTitleText icon={FileText}>Articles de la réception ({formatUnits(data.items.length)})</PanelTitleText> }}
        columns={columns}
        rows={data.items}
        getRowId={(row) => row.id}
        empty={{ title: "Aucun article", description: "Cette réception n'a pas encore de ligne." }}
      />

      <Card className="flex flex-col gap-3">
        <PanelHeading icon={FileText}>Notes</PanelHeading>
        {data.notes ? <p className="rounded-control bg-surface-subtle p-3 text-body whitespace-pre-line text-foreground">{data.notes}</p> : <p className="text-body text-foreground-muted">L&apos;entrepôt n&apos;a laissé aucune note sur cette réception.</p>}
      </Card>
    </BoxPage>
  );
}

function Fact({ icon: Icon, label, value, hint }: { icon: typeof Box; label: string; value: string; hint?: string | null }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-meta text-foreground-muted">{label}</p>
        <p className="truncate text-body font-semibold text-foreground tabular-nums">{value}</p>
        {hint && <p className="text-meta text-foreground-muted">{hint}</p>}
      </div>
    </div>
  );
}

function PanelTitleText({ icon: Icon, children }: { icon: typeof Box; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <Icon className="size-5 shrink-0 text-foreground" aria-hidden="true" />
      {children}
    </span>
  );
}

// ── Expedition ──────────────────────────────────────────────

const EXPEDITION_WORDS: Record<string, string> = {
  pending: "L'entrepôt Sugu a reçu la demande. La préparation n'a pas encore commencé.",
  picking: "L'entrepôt prélève vos articles dans leurs casiers.",
  packed: "Les articles sont préparés et emballés. Le colis attend son départ de l'entrepôt.",
  shipped: "Le colis a quitté l'entrepôt Sugu.",
  cancelled: "Cette expédition a été annulée. Les articles déjà prélevés ont été remis en casier.",
};

function expeditionSteps(expedition: ExpeditionDetail): Array<JourneyStep & { sentence: string }> {
  const { status, timeline } = expedition;
  const rank = { pending: 0, picking: 1, packed: 2, shipped: 3 }[status] ?? 0;
  const step = (index: number, label: string, at: string | null, sentence: string): JourneyStep & { sentence: string } => ({
    label,
    sentence,
    at: at ? formatDayShortTime(at) : null,
    // The last step reached is where the expedition stands; a shipped one has nothing left to do.
    state: rank > index || (rank === index && status === "shipped") ? "done" : rank === index ? "current" : "upcoming",
  });
  return [
    { label: "Créée", sentence: expedition.order ? "L'expédition a été créée automatiquement depuis la commande." : "L'expédition a été créée par l'entrepôt.", at: formatDayShortTime(timeline.createdAt), state: rank === 0 ? "current" : "done" },
    step(1, "Préparation", timeline.pickingStartedAt, "Les articles sont prélevés dans leurs casiers."),
    step(2, "Prête", timeline.packedAt, "Tous les articles sont préparés et emballés."),
    step(3, "Expédiée", timeline.shippedAt, "Le colis a quitté l'entrepôt Sugu."),
  ];
}

function pickState(line: ExpeditionLine) {
  if (line.picked >= line.requested) return <Badge tone="success" icon={Check}>Préparé</Badge>;
  if (line.picked > 0) return <Badge tone="info">En cours</Badge>;
  return <Badge tone="neutral">À préparer</Badge>;
}

const expeditionColumns: DataTableColumn<ExpeditionLine>[] = [
  { id: "product", header: "Produit", mobile: "title", cell: (row) => <ProductCell name={row.name} variant={row.variant} imageUrl={row.imageUrl} /> },
  { id: "sku", header: "SKU", mobile: "subtitle", cell: (row) => <span className="whitespace-nowrap tabular-nums">{row.sku ?? "—"}</span> },
  { id: "quantity", header: "Quantité", numeric: true, cell: (row) => <span className="whitespace-nowrap">{formatUnits(row.picked)} / {formatUnits(row.requested)}</span> },
  { id: "state", header: "Statut de préparation", mobile: "badge", cell: (row) => pickState(row) },
  { id: "bin", header: "Emplacement", className: "hidden @3xl:table-cell", cell: (row) => (row.bin ? <BinChip code={row.bin} /> : <span className="text-foreground-muted">—</span>), mobileCell: (row) => row.bin },
];

export function SuguBoxExpeditionDetail({ id }: { id: string }) {
  const { data, isError, error, refetch, isFetching, isPending } = useExpedition(id);
  const back = { label: "Expéditions", href: BOX.expeditions };

  if (isPending) {
    return (
      <BoxPage aria-busy>
        <DetailSkeleton />
      </BoxPage>
    );
  }
  if (isError || !data) {
    return (
      <BoxPage>
        <PageHeader title="Expédition" back={back} />
        {isNotFound(error) ? <NotFound title="Expédition introuvable" back={{ label: "Retour aux expéditions", href: BOX.expeditions }} /> : <PageFailure error={error} onRetry={() => refetch()} retrying={isFetching} />}
      </BoxPage>
    );
  }

  const status = suguBoxOutboundStatus.resolve(data.status);
  const steps = expeditionSteps(data);
  const cancelled = data.status === "cancelled";
  const orderHref = data.order ? `/vendor/orders/${data.order.id}` : null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Le lien de l'expédition est copié.");
    } catch {
      toast.error("Le lien n'a pas pu être copié. Copiez l'adresse de la page.");
    }
  };

  return (
    <BoxPage aria-busy={isFetching || undefined}>
      <PageHeader
        title={`Expédition ${data.reference}`}
        back={back}
        titleAddon={<StatusBadge domain="suguBoxOutbound" code={data.status} />}
        description={`Créée le ${formatDayTime(data.createdAt)} · ${plural(data.unitsRequested, "article", "articles")}`}
        secondaryActions={[
          { label: "Imprimer le bon", icon: Printer, onSelect: () => window.print() },
          { label: "Copier le lien", icon: Link2, onSelect: copyLink },
        ]}
      />

      <Card className="flex flex-col gap-5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-start gap-3 xl:max-w-md">
          <status.icon className="mt-0.5 size-7 shrink-0 text-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-section-title text-foreground">{status.known ? status.label : "Statut inconnu"}</h2>
            <p className="text-body text-foreground-muted">{EXPEDITION_WORDS[data.status] ?? "L'entrepôt n'a pas précisé où en est cette expédition."}</p>
          </div>
        </div>
        {!cancelled && (
          <div className="min-w-0 flex-1">
            <Journey label="Étapes de l'expédition" steps={steps} />
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <DataTable
            caption="Articles à expédier"
            tableFrom="narrow"
            header={{
              title: <PanelTitleText icon={Box}>Articles à expédier ({formatUnits(data.items.length)})</PanelTitleText>,
              actions: orderHref ? (
                <Button asChild variant="secondary" size="compact" icon={ShoppingCart}>
                  <Link href={orderHref}>Voir la commande</Link>
                </Button>
              ) : undefined,
            }}
            columns={expeditionColumns}
            rows={data.items}
            getRowId={(row) => row.id}
            empty={{ title: "Aucun article", description: "Cette expédition n'a pas de ligne pour votre boutique." }}
          />

          <Card className="flex flex-col gap-4">
            <PanelHeading icon={Truck}>Suivi d&apos;expédition</PanelHeading>
            <ol className="flex flex-col">
              {steps.map((step, index) => (
                <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < steps.length - 1 && <span aria-hidden="true" className={cn("absolute top-6 left-[11px] h-full w-0.5", step.state === "done" ? "bg-success-icon" : "bg-border")} />}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative z-[1] mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-pill border-2 bg-surface",
                      step.state === "done" && "border-success-icon bg-success-icon text-white",
                      step.state === "current" && !cancelled && "border-primary",
                      (step.state === "upcoming" || (cancelled && step.state !== "done")) && "border-border-strong",
                    )}
                  >
                    {step.state === "done" ? <Check className="size-3.5" /> : step.state === "current" && !cancelled ? <span className="size-2 rounded-pill bg-primary" /> : null}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4">
                    <div className="min-w-0">
                      <p className={cn("text-label", step.state === "upcoming" ? "text-foreground-muted" : "font-semibold text-foreground")}>{step.label}</p>
                      <p className="text-meta text-foreground-muted">{step.sentence}</p>
                    </div>
                    <p className="text-meta whitespace-nowrap text-foreground-muted">{step.at ?? (step.state === "done" ? "" : cancelled ? "Annulée" : "En attente")}</p>
                  </div>
                </li>
              ))}
              {cancelled && (
                <li className="flex gap-3 pt-5">
                  <span aria-hidden="true" className="mt-0.5 size-6 shrink-0 rounded-pill border-2 border-border-strong bg-surface-subtle" />
                  <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4">
                    <div>
                      <p className="text-label font-semibold text-foreground">Annulée</p>
                      <p className="text-meta text-foreground-muted">{EXPEDITION_WORDS.cancelled}</p>
                    </div>
                    <p className="text-meta whitespace-nowrap text-foreground-muted">{data.timeline.cancelledAt ? formatDayShortTime(data.timeline.cancelledAt) : ""}</p>
                  </div>
                </li>
              )}
            </ol>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <PanelHeading
              icon={ShoppingCart}
              actions={
                orderHref ? (
                  <Button asChild variant="secondary" size="compact">
                    <Link href={orderHref}>Voir la commande</Link>
                  </Button>
                ) : undefined
              }
            >
              Commande
            </PanelHeading>
            {data.order ? (
              <DescriptionList
                items={[
                  { label: "N° de commande", value: <Link href={orderHref!} className="font-medium text-primary tabular-nums underline-offset-4 hover:underline">{data.order.number}</Link> },
                  { label: "Date", value: formatDayTime(data.order.placedAt) },
                  { label: "Client", value: data.order.customer ?? "—" },
                  { label: "Vos articles", value: plural(data.unitsRequested, "article", "articles") },
                ]}
              />
            ) : (
              <p className="text-body text-foreground-muted">Cette sortie de stock ne vient pas d&apos;une commande de la marketplace.</p>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <PanelHeading icon={MapPin}>Destination</PanelHeading>
            {data.recipient ? (
              <p className="text-body text-foreground">
                <span className="block font-semibold">{data.recipient.name ?? "Destinataire"}</span>
                {data.recipient.zone && <span className="block">{data.recipient.zone}</span>}
                {data.recipient.city && <span className="block">{data.recipient.city}</span>}
              </p>
            ) : (
              <p className="text-body text-foreground-muted">Aucune adresse de livraison n&apos;est attachée à cette expédition.</p>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <PanelHeading icon={Warehouse}>Entrepôt</PanelHeading>
            <DescriptionList
              items={[
                { label: "Préparée par", value: data.warehouse?.name ?? "—" },
                { label: "Code", value: data.warehouse?.code ?? "—" },
                { label: "Prête le", value: data.packedAt ? formatDayTime(data.packedAt) : "En attente" },
                { label: "Expédiée le", value: data.shippedAt ? formatDayTime(data.shippedAt) : "En attente" },
              ]}
            />
          </Card>
        </div>
      </div>
    </BoxPage>
  );
}
