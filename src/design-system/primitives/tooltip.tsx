"use client";

import type { ReactElement, ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../cn";

export interface TooltipProps {
  content: ReactNode;
  /** A single focusable element. */
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

/**
 * Supplementary hint on hover and keyboard focus. Never the only place a
 * piece of information lives: touch users do not get tooltips.
 */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            collisionPadding={8}
            className={cn(
              "sugu-ui z-tooltip max-w-64 rounded-compact bg-[#18181b] px-2 py-1 text-meta text-white shadow-overlay animate-ds-fade",
              className,
            )}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
