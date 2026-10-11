"use client";

import { useState, type ReactNode } from "react";
import { UserPlus } from "lucide-react";
import { Button, Dialog, DialogClose, DialogContent } from "@/design-system";
import type { Courier } from "../couriers/contract";
import { CourierPicker } from "./courier-picker";

export interface AssignCourierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What is being given to a courier, e.g. « Assigner la livraison SU-2026-0042 ». */
  title: string;
  description?: ReactNode;
  /** User id of the courier who already carries it: shown as such, and not offered again. */
  currentCourierUserId?: string | null;
  confirmLabel?: string;
  /** May return a promise: the dialog stays open, busy, until it settles; it closes on success. */
  onAssign: (courier: Courier) => void | Promise<void>;
}

/** Chooses the courier of one delivery or of a selection. */
export function AssignCourierDialog({ open, onOpenChange, ...props }: AssignCourierDialogProps) {
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      {/* Mounted with the dialog: a dialog reopened starts from nothing chosen and an empty search. */}
      {open && <AssignCourierPanel {...props} pending={pending} setPending={setPending} close={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function AssignCourierPanel({
  title,
  description,
  currentCourierUserId = null,
  confirmLabel = "Assigner",
  onAssign,
  pending,
  setPending,
  close,
}: Omit<AssignCourierDialogProps, "open" | "onOpenChange"> & { pending: boolean; setPending: (pending: boolean) => void; close: () => void }) {
  const [chosen, setChosen] = useState<Courier | null>(null);

  async function confirm() {
    if (!chosen) return;
    setPending(true);
    try {
      await onAssign(chosen);
      close();
    } catch {
      // The caller reports the failure; the dialog stays open for another choice.
    } finally {
      setPending(false);
    }
  }

  return (
      <DialogContent
        title={title}
        description={description}
        footer={
          <>
            <DialogClose asChild>
              <Button disabled={pending}>Annuler</Button>
            </DialogClose>
            <Button variant="primary" icon={UserPlus} disabled={!chosen} loading={pending} onClick={confirm}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        <CourierPicker value={chosen?.userId} onChange={(_userId, courier) => setChosen(courier)} currentCourierUserId={currentCourierUserId} disabled={pending} />
      </DialogContent>
  );
}
