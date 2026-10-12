"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, CirclePause, CirclePlay, ShieldCheck, ShieldX, UserCheck } from "lucide-react";
import { Button, ConfirmDialog, Dialog, DialogClose, DialogContent, FormField, Textarea } from "@/design-system";
import type { Courier } from "../couriers/contract";
import { useCourierAction, type CourierAction } from "../couriers/hooks";
import { describeAgencyFailure } from "../errors";
import { useOneAtATime } from "../single-flight";
import { AssignDeliveryDialog } from "./assign-delivery-dialog";

// ============================================================
// What the agency does to the ACCOUNT of a courier, from the
// list or from his page: pause it, suspend it, bring it back,
// approve his documents, hand him a delivery. Each one says
// what it changes before it does.
//
// There is no "remove a courier": the backend has no such
// route. An account that must stop is suspended.
// ============================================================

export type CourierTarget = Pick<Courier, "id" | "userId" | "name" | "activity" | "status" | "isActive" | "kycVerified">;

export type CourierIntent =
  | { kind: "pause"; courier: CourierTarget }
  | { kind: "resume"; courier: CourierTarget }
  | { kind: "suspend"; courier: CourierTarget }
  | { kind: "activate"; courier: CourierTarget }
  | { kind: "verify"; courier: CourierTarget }
  | { kind: "reject"; courier: CourierTarget }
  | { kind: "assign"; courier: CourierTarget };

/** What can be done to this account, given what the server says of it. */
export function courierAbilities(courier: CourierTarget) {
  const suspended = courier.activity === "suspended" || courier.status === "suspended";
  const toVerify = courier.activity === "to_verify";
  const working = courier.activity === "available" || courier.activity === "on_delivery";
  return {
    /** A delivery can be handed to him. */
    assign: working,
    pause: working,
    resume: courier.activity === "paused",
    suspend: !suspended,
    activate: suspended,
    verify: toVerify && !suspended,
  };
}

const SUSPEND_FORM = "courier-suspend-form";

/** Why the account is suspended. Lives inside the dialog: a dialog reopened mounts a new one, empty. */
function SuspendForm({ onSubmit }: { onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <form
      id={SUSPEND_FORM}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(reason);
      }}
    >
      <FormField label="Motif" hint="Facultatif. Il est conservé dans l'historique du compte.">
        <Textarea rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Absences répétées, colis non remis…" />
      </FormField>
    </form>
  );
}

export function CourierActionDialogs({ intent, onClose }: { intent: CourierIntent | null; onClose: () => void }) {
  const action = useCourierAction();

  const courier = intent?.courier ?? null;
  const name = courier?.name ?? "";

  /** Runs an action, reports it, and rethrows on failure so the dialog stays open. One at a time: a second click joins the first. */
  const run = useOneAtATime(async (request: CourierAction, done: string) => {
    try {
      await action.mutateAsync(request);
      toast.success(done);
    } catch (error) {
      toast.error(describeAgencyFailure(error).message);
      throw error;
    }
  });

  function suspend(reason: string) {
    if (!courier) return;
    // Closes on success; a refusal is reported by `run` and leaves the dialog open.
    run({ type: "suspend", id: courier.id, reason }, `Compte de ${name} suspendu.`).then(onClose, () => undefined);
  }

  return (
    <>
      <ConfirmDialog
        open={intent?.kind === "pause"}
        onOpenChange={(open) => !open && onClose()}
        title={`Mettre ${name} en pause ?`}
        description="Plus aucune course ne lui sera proposée tant que la pause dure. Celles qu'il a déjà en main restent les siennes."
        confirmLabel="Mettre en pause"
        confirmIcon={CirclePause}
        onConfirm={() => (courier ? run({ type: "pause", id: courier.id }, `${name} est en pause.`) : undefined)}
      />

      <ConfirmDialog
        open={intent?.kind === "resume"}
        onOpenChange={(open) => !open && onClose()}
        title={`Reprendre l'activité de ${name} ?`}
        description="Des courses pourront de nouveau lui être confiées."
        confirmLabel="Reprendre l'activité"
        confirmIcon={CirclePlay}
        onConfirm={() => (courier ? run({ type: "resume", id: courier.id }, `${name} est de nouveau disponible.`) : undefined)}
      />

      <ConfirmDialog
        open={intent?.kind === "activate"}
        onOpenChange={(open) => !open && onClose()}
        title={`Réactiver le compte de ${name} ?`}
        description="La suspension est levée : il peut de nouveau se connecter et recevoir des courses."
        confirmLabel="Réactiver le compte"
        confirmIcon={UserCheck}
        onConfirm={() => (courier ? run({ type: "activate", id: courier.id }, `Compte de ${name} réactivé.`) : undefined)}
      />

      <ConfirmDialog
        open={intent?.kind === "verify"}
        onOpenChange={(open) => !open && onClose()}
        title={`Valider les pièces de ${name} ?`}
        description="Vous confirmez avoir vérifié ses pièces justificatives. Son compte devient actif et il peut recevoir des courses."
        confirmLabel="Valider les pièces"
        confirmIcon={ShieldCheck}
        onConfirm={() => (courier ? run({ type: "verify", id: courier.id, approved: true }, `Pièces de ${name} validées : son compte est actif.`) : undefined)}
      />

      <ConfirmDialog
        open={intent?.kind === "reject"}
        onOpenChange={(open) => !open && onClose()}
        title={`Refuser les pièces de ${name} ?`}
        description="Ses pièces ne sont pas validées et son compte est suspendu. Vous pourrez le réactiver une fois les bonnes pièces reçues."
        confirmLabel="Refuser les pièces"
        confirmIcon={ShieldX}
        tone="danger"
        onConfirm={() => (courier ? run({ type: "verify", id: courier.id, approved: false }, `Pièces de ${name} refusées : son compte est suspendu.`) : undefined)}
      />

      <Dialog open={intent?.kind === "suspend"} onOpenChange={(open) => !open && !action.isPending && onClose()}>
        <DialogContent
          size="sm"
          title={`Suspendre le compte de ${name} ?`}
          description="Il ne peut plus recevoir de course tant que vous ne réactivez pas son compte. Ses livraisons passées et ses gains sont conservés."
          footer={
            <>
              <DialogClose asChild>
                <Button disabled={action.isPending}>Annuler</Button>
              </DialogClose>
              <Button type="submit" form={SUSPEND_FORM} variant="destructive" icon={Ban} loading={action.isPending}>
                Suspendre le compte
              </Button>
            </>
          }
        >
          <SuspendForm onSubmit={suspend} />
        </DialogContent>
      </Dialog>

      <AssignDeliveryDialog
        open={intent?.kind === "assign"}
        onOpenChange={(open) => !open && onClose()}
        courier={courier ? { name: courier.name, userId: courier.userId } : null}
      />
    </>
  );
}
