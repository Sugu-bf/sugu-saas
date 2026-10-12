"use client";

import type { ReactNode } from "react";
import { Check, CircleAlert, ClipboardCheck, Clock, MapPinCheck, PackageCheck, ThumbsUp, Truck, type LucideIcon } from "lucide-react";
import { Alert, Button, Card, ErrorState, Skeleton, cn, iconTileClass, type Tone } from "@/design-system";
import { formatTime } from "@/features/agency/format";
import { DriverPage, ScreenHeader } from "@/features/driver/components/frame";
import { useMissionActions } from "@/features/driver/components/mission-actions";
import { describeDriverFailure } from "@/features/driver/errors";
import { can, missionLabel, type MissionAction, type MissionDetail } from "@/features/driver/missions/contract";
import { useMission } from "@/features/driver/missions/hooks";
import { ACTION_LABEL, blockedReason } from "@/features/driver/missions/wording";

// « Mettre à jour la mission », after its mock-up: the steps of the trip one
// under the other, what is done with its hour, and a button on the step the
// server allows now. No step is ticked by this screen: each one is read from
// what the server recorded.

interface Step {
  action: MissionAction;
  title: string;
  /** While it is still to do, then once it is done. */
  todo: string;
  done: string;
  icon: LucideIcon;
  tone: Tone | "brand";
}

const STEPS: Step[] = [
  { action: "accept", title: "Accepter la mission", todo: "Votre agence vous l'a confiée.", done: "Vous avez accepté la mission.", icon: ThumbsUp, tone: "info" },
  { action: "confirm_collection", title: "Confirmer la collecte", todo: "Récupérez le colis auprès de la boutique.", done: "Vous avez récupéré le colis auprès de la boutique.", icon: PackageCheck, tone: "success" },
  { action: "start_transit", title: "En transit", todo: "Démarrez la livraison une fois le colis en main.", done: "Le colis est en route vers le client.", icon: Truck, tone: "info" },
  { action: "mark_arrived", title: "Arrivé chez le client", todo: "Confirmez une fois sur place.", done: "Vous êtes sur place.", icon: MapPinCheck, tone: "warning" },
  { action: "mark_delivered", title: "Remettre le colis", todo: "Saisissez le code de livraison que le client vous donne.", done: "Le colis est remis au client.", icon: ClipboardCheck, tone: "neutral" },
];

/** Whether a step is behind this mission, and when it happened if the server says it. */
function progressOf(mission: MissionDetail, action: MissionAction): { done: boolean; at: string | null } {
  const stage = mission.stage;
  const after = (stages: string[]) => stages.includes(stage);
  switch (action) {
    case "accept":
      return { done: mission.acceptedAt !== null, at: mission.acceptedAt };
    case "confirm_collection":
      // A mission without a boutique code has nothing to confirm: collected once it is on the road.
      return { done: mission.pickedAt !== null || after(["collected", "in_transit", "arrived", "delivered"]), at: mission.pickedAt };
    case "start_transit":
      return { done: after(["in_transit", "arrived", "delivered"]), at: null };
    case "mark_arrived":
      return { done: after(["arrived", "delivered"]), at: null };
    case "mark_delivered":
      return { done: stage === "delivered", at: mission.deliveredAt };
    default:
      return { done: false, at: null };
  }
}

export function MissionStepsContent({ id }: { id: string }) {
  const { data: mission, isLoading, isError, error, refetch, isFetching } = useMission(id);
  const back = { label: "Retour à la mission", href: `/driver/deliveries/${id}` };

  if (isLoading) {
    return (
      <DriverPage aria-busy>
        <p role="status" className="sr-only">
          Chargement des étapes…
        </p>
        <Skeleton className="h-11 w-2/3" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-panel" />
        ))}
      </DriverPage>
    );
  }

  if (isError || !mission) {
    return (
      <DriverPage>
        <ScreenHeader title="Mettre à jour la mission" back={back} />
        <Card flush>
          <ErrorState title="Impossible de charger la mission" description={describeDriverFailure(error).message} onRetry={() => refetch()} retrying={isFetching} />
        </Card>
      </DriverPage>
    );
  }

  return <Steps mission={mission} />;
}

function Steps({ mission }: { mission: MissionDetail }) {
  const actions = useMissionActions(mission);
  const failed = mission.stage === "failed";

  return (
    <DriverPage>
      <ScreenHeader title="Mettre à jour la mission" back={{ label: "Retour à la mission", href: `/driver/deliveries/${mission.id}` }}>
        <p className="text-center text-body font-medium text-foreground tabular-nums md:text-left">{mission.reference ?? missionLabel(null)}</p>
      </ScreenHeader>

      <ol className="flex flex-col gap-3">
        {STEPS.map((step) => {
          const { done, at } = progressOf(mission, step.action);
          const allowed = can(mission, step.action);
          const held = blockedReason(mission.blocked[step.action]);
          return (
            <StepCard key={step.action} step={step} done={done} at={at} current={allowed}>
              {held && !done && <Alert tone="warning" title={held} />}
              {allowed && (
                <Button variant="primary" loading={actions.busy === step.action} onClick={() => actions.perform(step.action)} className="h-touch w-full">
                  {ACTION_LABEL[step.action]}
                </Button>
              )}
            </StepCard>
          );
        })}

        <li>
          <Card className={cn("flex items-start gap-3", failed && "border-danger-border bg-danger-bg")}>
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-pill", iconTileClass.danger)}>
              <CircleAlert className="size-5" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div>
                <h2 className="text-body font-semibold text-foreground">Échec de livraison</h2>
                <p className="text-label font-normal text-foreground-muted">{failed ? (mission.failure?.reason ?? "La livraison a été signalée en échec.") : "Signaler un problème."}</p>
              </div>
              {can(mission, "mark_failed") && (
                <Button variant="destructive" loading={actions.busy === "mark_failed"} onClick={() => actions.perform("mark_failed")} className="h-touch w-full">
                  {ACTION_LABEL.mark_failed}
                </Button>
              )}
            </div>
          </Card>
        </li>
      </ol>

      {actions.dialogs}
    </DriverPage>
  );
}

function StepCard({ step, done, at, current, children }: { step: Step; done: boolean; at: string | null; current: boolean; children: ReactNode }) {
  const Icon = done ? Check : step.icon;
  return (
    <li>
      <Card data-step={step.action} data-state={done ? "done" : current ? "current" : "upcoming"} className={cn("flex items-start gap-3", current && "border-border-strong")}>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-pill", done ? "bg-success-icon text-surface" : iconTileClass[step.tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div>
            <h2 className="text-body font-semibold text-foreground">
              {step.title}
              <span className="sr-only">{done ? " : fait" : current ? " : à faire maintenant" : " : à venir"}</span>
            </h2>
            <p className="text-label font-normal text-foreground-muted">{done ? step.done : step.todo}</p>
            {done && at && (
              <p className="mt-1 flex items-center gap-1 text-label font-normal text-foreground-muted tabular-nums">
                <Clock className="size-3.5" aria-hidden="true" />
                {formatTime(at)}
              </p>
            )}
          </div>
          {children}
        </div>
        {done && (
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-pill", iconTileClass.success)} aria-hidden="true">
            <Check className="size-4" />
          </span>
        )}
      </Card>
    </li>
  );
}
