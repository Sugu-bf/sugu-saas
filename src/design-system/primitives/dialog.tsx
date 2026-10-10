"use client";

import { useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { X, type LucideIcon } from "lucide-react";
import { cn } from "../cn";
import { Button, IconButton } from "./button";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const OVERLAY = "sugu-ui fixed inset-0 z-overlay bg-black/45 animate-ds-fade";

// Phone: anchored to the bottom, full width. From 768px: centred.
const PANEL = [
  "sugu-ui fixed z-modal flex flex-col bg-surface-elevated shadow-overlay outline-none animate-ds-pop",
  "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-panel border-t border-border",
  "md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:max-h-[85dvh] md:w-[calc(100vw-3rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-panel md:border md:animate-ds-fade",
].join(" ");

const SIZE = { sm: "md:max-w-md", md: "md:max-w-lg", lg: "md:max-w-2xl" } as const;

export interface DialogContentProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Action row, usually built with `Button`s. Stays visible while the body scrolls. */
  footer?: ReactNode;
  size?: keyof typeof SIZE;
  className?: string;
}

/** Modal panel: focus trapped, Escape and the close button dismiss it. */
export function DialogContent({ title, description, children, footer, size = "md", className }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={OVERLAY} />
      <DialogPrimitive.Content
        className={cn(PANEL, SIZE[size], className)}
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <DialogPrimitive.Title className="text-section-title text-foreground">{title}</DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="mt-0.5 text-body text-foreground-muted">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close asChild>
            <IconButton icon={X} label="Fermer" size="compact" tooltip={false} className="-mr-1" />
          </DialogPrimitive.Close>
        </div>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Stacked full-width buttons on phones, right-aligned row from 768px. */
export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:flex-row md:justify-end">
      {children}
    </div>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What will happen, in plain words. */
  description: ReactNode;
  confirmLabel: string;
  confirmIcon?: LucideIcon;
  cancelLabel?: string;
  /** `danger` for destructive or irreversible actions. */
  tone?: "default" | "danger";
  /** May return a promise: the dialog shows a spinner and stays open until it settles. */
  onConfirm: () => void | Promise<void>;
}

/**
 * Replaces `window.confirm()`. Focus lands on "Annuler", so pressing Enter
 * by reflex never triggers the action.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmIcon,
  cancelLabel = "Annuler",
  tone = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // The caller reports the failure; the dialog stays open for a retry.
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={OVERLAY} />
        <AlertDialogPrimitive.Content className={cn(PANEL, SIZE.sm)}>
          <div className="px-4 py-4">
            <AlertDialogPrimitive.Title className="text-section-title text-foreground">
              {title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="mt-1 text-body text-foreground-muted">
              {description}
            </AlertDialogPrimitive.Description>
          </div>
          <DialogFooter>
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="secondary" disabled={pending}>
                {cancelLabel}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <Button
              variant={tone === "danger" ? "destructive" : "primary"}
              icon={confirmIcon}
              loading={pending}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
