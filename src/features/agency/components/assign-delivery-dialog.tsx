"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button, Dialog, DialogClose, DialogContent, EmptyState, ErrorState, Money, Skeleton, cn } from "@/design-system";
import { deliveryLabel } from "../deliveries/contract";
import { useDeliveries, useDeliveryAction } from "../deliveries/hooks";
import { describeAgencyFailure } from "../errors";
import { formatDayTime } from "../format";

export interface AssignDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Who receives the delivery: his name, and the user id assignment expects. */
  courier: { name: string; userId: string } | null;
}

/**
 * Gives one of the deliveries waiting for a courier to this courier. The
 * list is the one the server counts as "to assign", oldest first: the
 * delivery that has waited longest is the first offered.
 */
export function AssignDeliveryDialog({ open, onOpenChange, courier }: AssignDeliveryDialogProps) {
  const action = useDeliveryAction();
  return (
    <Dialog open={open} onOpenChange={(next) => !action.isPending && onOpenChange(next)}>
      {/* Mounted with the dialog: a dialog reopened asks the list again and starts from nothing chosen. */}
      {open && <AssignDeliveryPanel courier={courier} action={action} close={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function AssignDeliveryPanel({ courier, action, close }: { courier: AssignDeliveryDialogProps["courier"]; action: ReturnType<typeof useDeliveryAction>; close: () => void }) {
  const groupName = useId();
  const [chosen, setChosen] = useState<string | null>(null);
  const waiting = useDeliveries({ scope: "to_assign", sort: "created_at", direction: "asc", page: 1, pageSize: 50 });

  const rows = waiting.data?.rows ?? [];
  const selected = rows.find((row) => row.id === chosen) ?? null;

  async function confirm() {
    if (!selected || !courier) return;
    try {
      await action.mutateAsync({ type: "assign", id: selected.id, courierUserId: courier.userId });
      toast.success(`Livraison ${deliveryLabel(selected.reference)} confiée à ${courier.name}.`);
      close();
    } catch (error) {
      toast.error(describeAgencyFailure(error).message);
    }
  }

  return (
      <DialogContent
        title={`Confier une course à ${courier?.name ?? "ce livreur"}`}
        description="Les courses acceptées par l'agence qui attendent un livreur, la plus ancienne d'abord."
        footer={
          <>
            <DialogClose asChild>
              <Button disabled={action.isPending}>Annuler</Button>
            </DialogClose>
            <Button variant="primary" icon={Send} disabled={!selected} loading={action.isPending} onClick={confirm}>
              Confier la course
            </Button>
          </>
        }
      >
        {waiting.isError ? (
          <ErrorState
            title="Les courses n'ont pas pu être chargées"
            description={describeAgencyFailure(waiting.error).message}
            onRetry={() => waiting.refetch()}
            retrying={waiting.isFetching}
            className="py-6"
          />
        ) : !waiting.isSuccess ? (
          <div className="flex flex-col gap-2" role="status" aria-label="Chargement des courses">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="Aucune course n'attend de livreur" description="Les nouvelles courses apparaîtront ici dès que l'agence les aura acceptées." className="py-6" />
        ) : (
          <fieldset disabled={action.isPending} className="flex min-w-0 flex-col gap-1.5">
            <legend className="sr-only">Course à confier</legend>
            {rows.map((row) => (
              <label
                key={row.id}
                className={cn(
                  "flex min-w-0 cursor-pointer items-center gap-3 rounded-control border border-border p-2.5 transition-colors duration-100 hover:bg-surface-subtle",
                  "has-[:checked]:border-primary has-[:checked]:bg-brand-subtle",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus-ring",
                )}
              >
                <input type="radio" name={groupName} value={row.id} checked={chosen === row.id} onChange={() => setChosen(row.id)} className="sr-only" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-medium text-foreground tabular-nums">
                    {deliveryLabel(row.reference)}
                    <span className="font-normal text-foreground-muted"> · {row.recipient.name ?? "Destinataire non renseigné"}</span>
                  </span>
                  <span className="truncate text-meta text-foreground-muted">
                    {[row.recipient.address, row.zone?.name ?? row.recipient.city].filter(Boolean).join(", ") || "Adresse non renseignée"} · créée le {formatDayTime(row.createdAt)}
                  </span>
                </span>
                <Money francs={row.feeFrancs} className="shrink-0 text-body font-medium" />
              </label>
            ))}
          </fieldset>
        )}
        {waiting.isSuccess && waiting.data.total > rows.length && rows.length > 0 && (
          <p className="mt-3 text-meta text-foreground-muted">
            {rows.length} courses affichées sur {waiting.data.total} : les plus anciennes.
          </p>
        )}
      </DialogContent>
  );
}
