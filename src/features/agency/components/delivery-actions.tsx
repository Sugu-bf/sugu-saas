"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, Check, CircleAlert, PackageCheck, Truck, Undo2, type LucideIcon } from "lucide-react";
import { Button, ConfirmDialog, Dialog, DialogClose, DialogContent, FormField, Input, Textarea } from "@/design-system";
import { deliveryLabel, type DeliveryRow } from "../deliveries/contract";
import { useDeliveryAction } from "../deliveries/hooks";
import { describeAgencyFailure } from "../errors";
import { useOneAtATime } from "../single-flight";
import { AssignCourierDialog } from "./assign-courier-dialog";

// ============================================================
// What the agency does to ONE delivery, wherever it is shown:
// the list, its page, the dashboard. The server says what is
// allowed (`nextStatuses`, `canAssign`, `canReassign`,
// `awaitingDecision`); this file words it and asks before acting.
// ============================================================

export type DeliveryTarget = Pick<DeliveryRow, "id" | "reference" | "status" | "courier" | "feeFrancs" | "nextStatuses" | "canAssign" | "canReassign" | "awaitingDecision">;

export type DeliveryIntent =
  | { kind: "accept"; delivery: DeliveryTarget }
  | { kind: "refuse"; delivery: DeliveryTarget }
  | { kind: "assign"; delivery: DeliveryTarget }
  | { kind: "status"; delivery: DeliveryTarget; status: string }
  | { kind: "price"; delivery: DeliveryTarget };

interface StatusAction {
  label: string;
  icon: LucideIcon;
  /** What will happen, said before it does. */
  consequence: string;
  done: string;
  tone?: "danger";
  /** Asks why: the reason is kept in the notes of the delivery. */
  withReason?: boolean;
}

/** The status changes an agency makes by hand. `assigned` is not one: it comes with the choice of a courier. */
const STATUS_ACTIONS: Record<string, StatusAction> = {
  in_transit: {
    label: "Marquer en livraison",
    icon: Truck,
    consequence: "Le livreur est parti vers le client avec le colis. La collecte est datée de maintenant.",
    done: "en livraison",
  },
  delivered: {
    label: "Marquer comme remise",
    icon: PackageCheck,
    consequence: "Vous confirmez que le colis a été remis au client. La livraison est terminée.",
    done: "remise au client",
  },
  delivery_failed: {
    label: "Déclarer un échec",
    icon: CircleAlert,
    consequence: "La tentative est enregistrée comme échouée. Vous pourrez relancer la livraison ou la confier à un autre livreur.",
    done: "déclarée en échec",
    tone: "danger",
    withReason: true,
  },
  pending: {
    label: "Remettre à assigner",
    icon: Undo2,
    consequence: "La livraison revient parmi celles qui attendent un livreur. Son livreur actuel en est déchargé.",
    done: "remise à assigner",
  },
};

export function statusActionOf(status: string): StatusAction | null {
  return STATUS_ACTIONS[status] ?? null;
}

/** The status changes to offer for a delivery, in the order the server allows them. */
export function statusActionsFor(delivery: Pick<DeliveryRow, "nextStatuses">): { status: string; action: StatusAction }[] {
  return delivery.nextStatuses.flatMap((status) => {
    const action = statusActionOf(status);
    return action ? [{ status, action }] : [];
  });
}

/** How the choice of a courier is called for this delivery: a first choice, a change, or a new attempt. */
export function assignLabelOf(delivery: Pick<DeliveryRow, "status" | "courier">): string {
  if (delivery.status === "delivery_failed") return "Relancer";
  return delivery.courier ? "Réassigner" : "Assigner";
}

const REASON_FORM = "delivery-reason-form";
const PRICE_FORM = "delivery-price-form";

/**
 * A reason, typed. Lives inside the dialog: a dialog reopened mounts a new
 * one, so the field always starts empty.
 */
function ReasonForm({ label, placeholder, hint, required, onSubmit }: { label: string; placeholder: string; hint?: string; required: boolean; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      id={REASON_FORM}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const text = reason.trim();
        if (required && text === "") setError("Indiquez le motif du refus : il est transmis à l'expéditeur.");
        else onSubmit(text);
      }}
    >
      <FormField label={label} required={required} hint={hint} error={error}>
        <Textarea
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError(null);
          }}
          placeholder={placeholder}
        />
      </FormField>
    </form>
  );
}

function PriceForm({ francs, onSubmit }: { francs: number; onSubmit: (francs: number) => void }) {
  const [amount, setAmount] = useState(String(francs));
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      id={PRICE_FORM}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const value = Number(amount.replace(/\s/g, "").replace(",", "."));
        if (!Number.isFinite(value) || value <= 0) setError("Saisissez un montant supérieur à zéro.");
        else onSubmit(value);
      }}
    >
      <FormField label="Prix de la livraison" required error={error}>
        <Input
          inputMode="numeric"
          suffix="FCFA"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError(null);
          }}
        />
      </FormField>
    </form>
  );
}

export interface DeliveryActionDialogsProps {
  /** What the user asked for; null when nothing is open. */
  intent: DeliveryIntent | null;
  onClose: () => void;
  /** Called once the server has accepted the action, e.g. to leave a page whose delivery was refused. */
  onDone?: (intent: DeliveryIntent) => void;
}

export function DeliveryActionDialogs({ intent, onClose, onDone }: DeliveryActionDialogsProps) {
  const action = useDeliveryAction();

  const delivery = intent?.delivery ?? null;
  const name = deliveryLabel(delivery?.reference ?? null);
  const statusAction = intent?.kind === "status" ? statusActionOf(intent.status) : null;
  const refusing = intent?.kind === "refuse";
  const reasoned = refusing || (intent?.kind === "status" && Boolean(statusAction?.withReason));

  /** Runs an action, reports it, and rethrows on failure so the dialog stays open. One at a time: a second click joins the first. */
  const run = useOneAtATime(async (request: Parameters<typeof action.mutateAsync>[0], done: string) => {
    if (!intent) return;
    try {
      await action.mutateAsync(request);
      toast.success(done);
      onDone?.(intent);
    } catch (error) {
      toast.error(describeAgencyFailure(error).message);
      throw error;
    }
  });

  /** The same, for a form inside a dialog: closes it on success, leaves it open on a refusal. */
  function submit(request: Parameters<typeof action.mutateAsync>[0], done: string) {
    run(request, done).then(onClose, () => undefined);
  }

  return (
    <>
      <ConfirmDialog
        open={intent?.kind === "accept"}
        onOpenChange={(open) => !open && onClose()}
        title={`Accepter la livraison ${name} ?`}
        description="Votre agence s'engage à la livrer. Vous pourrez ensuite lui assigner un livreur."
        confirmLabel="Accepter la livraison"
        confirmIcon={Check}
        onConfirm={() => (delivery ? run({ type: "accept", id: delivery.id }, `Livraison ${name} acceptée.`) : undefined)}
      />

      <ConfirmDialog
        open={intent?.kind === "status" && statusAction !== null && !statusAction.withReason}
        onOpenChange={(open) => !open && onClose()}
        title={`${statusAction?.label ?? "Changer le statut"} : livraison ${name} ?`}
        description={statusAction?.consequence ?? ""}
        confirmLabel={statusAction?.label ?? "Confirmer"}
        confirmIcon={statusAction?.icon}
        tone={statusAction?.tone === "danger" ? "danger" : "default"}
        onConfirm={() =>
          delivery && intent?.kind === "status"
            ? run({ type: "status", id: delivery.id, status: intent.status }, `Livraison ${name} ${statusAction?.done ?? "mise à jour"}.`)
            : undefined
        }
      />

      <Dialog open={reasoned} onOpenChange={(open) => !open && !action.isPending && onClose()}>
        <DialogContent
          size="sm"
          title={refusing ? `Refuser la livraison ${name} ?` : `${statusAction?.label ?? ""} : livraison ${name}`}
          description={
            refusing ? "La demande retourne à l'expéditeur, qui devra choisir une autre agence. Cette décision ne se rattrape pas." : statusAction?.consequence
          }
          footer={
            <>
              <DialogClose asChild>
                <Button disabled={action.isPending}>Annuler</Button>
              </DialogClose>
              <Button type="submit" form={REASON_FORM} variant="destructive" icon={refusing ? Ban : statusAction?.icon} loading={action.isPending}>
                {refusing ? "Refuser la livraison" : statusAction?.label}
              </Button>
            </>
          }
        >
          <ReasonForm
            label={refusing ? "Motif du refus" : "Motif de l'échec"}
            required={refusing}
            hint={refusing ? undefined : "Facultatif. Il est conservé dans les notes de la livraison."}
            placeholder={refusing ? "Zone non desservie, aucun livreur disponible…" : "Client absent, adresse introuvable…"}
            onSubmit={(reason) => {
              if (!delivery || !intent) return;
              if (intent.kind === "refuse") submit({ type: "refuse", id: delivery.id, reason }, `Livraison ${name} refusée.`);
              else if (intent.kind === "status") {
                submit({ type: "status", id: delivery.id, status: intent.status, memo: reason || undefined }, `Livraison ${name} ${statusAction?.done ?? "mise à jour"}.`);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={intent?.kind === "price"} onOpenChange={(open) => !open && !action.isPending && onClose()}>
        <DialogContent
          size="sm"
          title={`Prix de la livraison ${name}`}
          description="Ce que le client paie pour la livraison. Le serveur refuse un montant trop éloigné du prix annoncé, et tout changement une fois la livraison payée."
          footer={
            <>
              <DialogClose asChild>
                <Button disabled={action.isPending}>Annuler</Button>
              </DialogClose>
              <Button type="submit" form={PRICE_FORM} variant="primary" icon={Check} loading={action.isPending}>
                Enregistrer le prix
              </Button>
            </>
          }
        >
          <PriceForm
            francs={delivery?.feeFrancs ?? 0}
            onSubmit={(francs) => delivery && submit({ type: "price", id: delivery.id, francs }, `Prix de la livraison ${name} mis à jour.`)}
          />
        </DialogContent>
      </Dialog>

      <AssignCourierDialog
        open={intent?.kind === "assign"}
        onOpenChange={(open) => !open && onClose()}
        title={`${delivery ? assignLabelOf(delivery) : "Assigner"} la livraison ${name}`}
        description={
          delivery?.courier
            ? `Actuellement confiée à ${delivery.courier.name}. Les codes de collecte et de remise sont renouvelés pour le nouveau livreur.`
            : "Le livreur choisi est prévenu et reçoit les codes de collecte et de remise."
        }
        currentCourierUserId={delivery?.status === "delivery_failed" ? null : (delivery?.courier?.userId ?? null)}
        confirmLabel={delivery ? assignLabelOf(delivery) : "Assigner"}
        onAssign={(courier) =>
          delivery ? run({ type: "assign", id: delivery.id, courierUserId: courier.userId }, `Livraison ${name} confiée à ${courier.name}.`) : undefined
        }
      />
    </>
  );
}
