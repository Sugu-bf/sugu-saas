"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, PackageCheck } from "lucide-react";
import { Alert, Button, ConfirmDialog, Dialog, DialogContent, FormField, Input, Select, Textarea, formatMoneyFromCents } from "@/design-system";
import { useOneAtATime } from "@/features/agency/single-flight";
import { describeDriverFailure } from "../errors";
import { FAILURE_CODES, type FailureCode } from "../missions/api";
import { collectionOf, type Mission, type MissionAction, type MissionDetail, type PickupStop } from "../missions/contract";
import { useMissionCommand, type MissionCommand } from "../missions/hooks";
import { ACTION_DONE, ACTION_LABEL, FAILURE_LABEL } from "../missions/wording";

// What a courier does to a mission, and the dialogs that ask what the server
// needs for it: the code a boutique or a customer tells, the reason of a
// failure. A dialog stays open on a refusal and says why, in the words of the
// server; nothing is assumed done before the server has answered.

type Intent = "collect" | "deliver" | "fail" | "delay" | "refuse" | null;

/** Actions that are sent as they are; the others first ask for something. */
const DIRECT: MissionAction[] = ["accept", "start_transit", "mark_arrived"];

export interface MissionActions {
  /** Starts an action: sends it, or opens the dialog that completes it. */
  perform: (action: MissionAction) => void;
  /** The action being sent, to draw its button as busy. */
  busy: MissionAction | null;
  /** To render once in the screen. */
  dialogs: ReactNode;
}

/**
 * The actions of one mission. `pickups` are needed to confirm a collection
 * (the page of the mission has them; a list card opens the page instead).
 */
export function useMissionActions(mission: Mission | MissionDetail, options: { onDone?: (action: MissionAction) => void } = {}): MissionActions {
  const command = useMissionCommand();
  const [intent, setIntent] = useState<Intent>(null);
  const [busy, setBusy] = useState<MissionAction | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  /** Sends a command; true once the server has accepted it. */
  const send = useOneAtATime(async (request: MissionCommand): Promise<boolean> => {
    setBusy(request.type);
    setRefusal(null);
    try {
      await command.mutateAsync(request);
      toast.success(ACTION_DONE[request.type]);
      setIntent(null);
      options.onDone?.(request.type);
      return true;
    } catch (error) {
      const message = describeDriverFailure(error).message;
      // In a dialog the refusal is written where the courier is looking.
      if (DIRECT.includes(request.type)) toast.error(message);
      else setRefusal(message);
      return false;
    } finally {
      setBusy(null);
    }
  });

  const perform = (action: MissionAction) => {
    setRefusal(null);
    switch (action) {
      case "accept":
      case "start_transit":
      case "mark_arrived":
        void send({ type: action, id: mission.id });
        return;
      case "confirm_collection":
        return setIntent("collect");
      case "mark_delivered":
        return setIntent("deliver");
      case "mark_failed":
        return setIntent("fail");
      case "signal_delay":
        return setIntent("delay");
      case "refuse":
        return setIntent("refuse");
    }
  };

  const close = (open: boolean) => {
    if (!open && busy === null) setIntent(null);
  };
  const pickups = "pickups" in mission ? mission.pickups : [];

  const dialogs = (
    <>
      <Dialog open={intent === "collect"} onOpenChange={close}>
        {intent === "collect" && (
          <CollectDialog pickups={pickups} busy={busy === "confirm_collection"} refusal={refusal} onConfirm={(productId, pickupCode) => send({ type: "confirm_collection", id: mission.id, productId, pickupCode })} />
        )}
      </Dialog>

      <Dialog open={intent === "deliver"} onOpenChange={close}>
        {intent === "deliver" && (
          <DeliverDialog
            mission={mission}
            codeIssued={"deliveryCodeIssued" in mission ? mission.deliveryCodeIssued : true}
            busy={busy === "mark_delivered"}
            refusal={refusal}
            onConfirm={(code) => send({ type: "mark_delivered", id: mission.id, code })}
          />
        )}
      </Dialog>

      <Dialog open={intent === "fail"} onOpenChange={close}>
        {intent === "fail" && <FailDialog busy={busy === "mark_failed"} refusal={refusal} onConfirm={(code, reason) => send({ type: "mark_failed", id: mission.id, code, reason })} />}
      </Dialog>

      <Dialog open={intent === "delay"} onOpenChange={close}>
        {intent === "delay" && <DelayDialog busy={busy === "signal_delay"} refusal={refusal} onConfirm={(reason) => send({ type: "signal_delay", id: mission.id, reason })} />}
      </Dialog>

      <ConfirmDialog
        open={intent === "refuse"}
        onOpenChange={close}
        title="Refuser cette mission ?"
        description={
          <>
            Elle est rendue à votre agence, qui la confiera à un autre livreur. Vous ne la verrez plus dans vos missions.
            {refusal && <span className="mt-2 block text-danger-fg">{refusal}</span>}
          </>
        }
        confirmLabel={ACTION_LABEL.refuse}
        tone="danger"
        onConfirm={async () => {
          if (!(await send({ type: "refuse", id: mission.id }))) throw new Error("refused");
        }}
      />
    </>
  );

  return { perform, busy, dialogs };
}

// ── Dialogs ─────────────────────────────────────────────────

function CollectDialog({ pickups, busy, refusal, onConfirm }: { pickups: PickupStop[]; busy: boolean; refusal: string | null; onConfirm: (productId: string, pickupCode: string) => void }) {
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [asked, setAsked] = useState<string | null>(null);
  const toCollect = pickups.filter((pickup) => !pickup.collected);

  return (
    <DialogContent title="Confirmer la collecte" description="Vérifiez le colis avec la boutique, puis saisissez le code qu'elle vous donne.">
      <div className="flex flex-col gap-4">
        {refusal && <Alert tone="danger" title={refusal} />}
        {toCollect.length === 0 && <Alert tone="success" title="Tous les colis de cette mission sont collectés." />}
        {toCollect.map((pickup) => {
          const product = pickup.products[0];
          const code = codes[pickup.id] ?? "";
          const missingCode = pickup.codeRequired && code.trim().length < 4;
          return (
            <form
              key={pickup.id}
              className="flex flex-col gap-3 rounded-panel border border-border p-3"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                if (!product || missingCode) return;
                setAsked(pickup.id);
                onConfirm(product.id, code);
              }}
            >
              <div className="min-w-0">
                <p className="text-body font-medium text-foreground">{pickup.name ?? "Point de collecte"}</p>
                {pickup.address && <p className="text-label font-normal text-foreground-muted">{pickup.address}</p>}
              </div>
              {pickup.products.length > 0 && (
                <ul className="flex flex-col gap-1 text-label font-normal text-foreground">
                  {pickup.products.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        {item.name}
                        {item.variant && <span className="text-foreground-muted"> · {item.variant}</span>}
                      </span>
                      <span className="shrink-0 text-foreground-muted tabular-nums">× {item.quantity}</span>
                    </li>
                  ))}
                </ul>
              )}
              {!product ? (
                <Alert tone="warning" title="Aucun article n'est rattaché à cette boutique : la collecte ne peut pas être confirmée d'ici. Contactez votre agence." />
              ) : (
                <>
                  {pickup.codeRequired && (
                    <FormField label="Code de collecte" hint="Donné par la boutique au moment de la remise." required>
                      <Input
                        value={code}
                        onChange={(event) => setCodes((current) => ({ ...current, [pickup.id]: event.target.value.toUpperCase() }))}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        maxLength={10}
                        className="font-mono tracking-widest"
                      />
                    </FormField>
                  )}
                  <Button type="submit" variant="primary" icon={PackageCheck} loading={busy && asked === pickup.id} disabled={missingCode || (busy && asked !== pickup.id)} className="h-touch w-full">
                    {ACTION_LABEL.confirm_collection}
                  </Button>
                </>
              )}
            </form>
          );
        })}
      </div>
    </DialogContent>
  );
}

function DeliverDialog({ mission, codeIssued, busy, refusal, onConfirm }: { mission: Mission; codeIssued: boolean; busy: boolean; refusal: string | null; onConfirm: (code: string) => void }) {
  const [code, setCode] = useState("");
  const { amount, label } = collectionOf(mission);
  const ready = code.trim().length >= 4 && codeIssued;

  return (
    <DialogContent title="Remettre le colis" description="Le client vous donne son code de livraison une fois le colis vérifié et payé.">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          if (ready) onConfirm(code);
        }}
      >
        {refusal && <Alert tone="danger" title={refusal} />}
        {!codeIssued && <Alert tone="warning" title="Aucun code n'a été émis pour cette livraison : elle ne peut pas être clôturée d'ici. Contactez votre agence." />}

        <div className="rounded-panel border border-border bg-surface-subtle p-3">
          <p className="text-label text-foreground-muted">À la remise</p>
          {amount !== null && <p className="text-section-title font-semibold text-foreground tabular-nums">{formatMoneyFromCents(amount)}</p>}
          <p className="text-body text-foreground">{label}</p>
        </div>

        <FormField label="Code de livraison" hint="Demandez-le au client : il prouve que le colis lui a été remis." required>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={10}
            disabled={!codeIssued}
            className="font-mono tracking-widest"
          />
        </FormField>

        <Button type="submit" variant="primary" icon={Check} loading={busy} disabled={!ready} className="h-touch w-full">
          Valider la livraison
        </Button>
      </form>
    </DialogContent>
  );
}

function FailDialog({ busy, refusal, onConfirm }: { busy: boolean; refusal: string | null; onConfirm: (code: FailureCode, reason: string) => void }) {
  const [code, setCode] = useState<FailureCode | "">("");
  const [reason, setReason] = useState("");

  return (
    <DialogContent title="Signaler un échec de livraison" description="La mission est clôturée en échec. Votre agence décide de la suite.">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          if (code) onConfirm(code, reason.trim() || FAILURE_LABEL[code]);
        }}
      >
        {refusal && <Alert tone="danger" title={refusal} />}
        <FormField label="Que s'est-il passé ?" required>
          <Select value={code} onChange={(event) => setCode(event.target.value as FailureCode | "")} placeholder="Choisir un motif" options={FAILURE_CODES.map((value) => ({ value, label: FAILURE_LABEL[value] }))} />
        </FormField>
        <FormField label="Précisions" hint="Facultatif. Lu par votre agence.">
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} />
        </FormField>
        <Button type="submit" variant="destructive" loading={busy} disabled={!code} className="h-touch w-full">
          {ACTION_LABEL.mark_failed}
        </Button>
      </form>
    </DialogContent>
  );
}

function DelayDialog({ busy, refusal, onConfirm }: { busy: boolean; refusal: string | null; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");

  return (
    <DialogContent title="Signaler un retard" description="Votre agence est prévenue. La mission continue.">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onConfirm(reason);
        }}
      >
        {refusal && <Alert tone="danger" title={refusal} />}
        <FormField label="Motif du retard" hint="Facultatif.">
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} />
        </FormField>
        <Button type="submit" variant="primary" loading={busy} className="h-touch w-full">
          {ACTION_LABEL.signal_delay}
        </Button>
      </form>
    </DialogContent>
  );
}
