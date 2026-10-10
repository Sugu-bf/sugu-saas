"use client";

import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../cn";
import { IconButton } from "./button";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const SIDE = {
  right:
    "inset-y-0 right-0 w-full max-w-md border-l border-border animate-ds-sheet-right",
  bottom:
    "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-panel border-t border-border animate-ds-sheet-bottom",
  left: "inset-y-0 left-0 w-full max-w-xs border-r border-border animate-ds-sheet-left",
} as const;

export interface SheetContentProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** `right` for detail panels, `bottom` for phone menus and filters, `left` for navigation drawers. */
  side?: keyof typeof SIDE;
  className?: string;
}

/** Side or bottom panel. Same focus and Escape behaviour as `Dialog`. */
export function SheetContent({ title, description, children, footer, side = "right", className }: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="sugu-ui fixed inset-0 z-overlay bg-black/45 animate-ds-fade" />
      <DialogPrimitive.Content
        className={cn(
          "sugu-ui fixed z-modal flex flex-col bg-surface-elevated shadow-overlay outline-none",
          SIDE[side],
          className,
        )}
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
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:flex-row md:justify-end">
            {footer}
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
