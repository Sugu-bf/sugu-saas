"use client";

import { createContext, useContext, type ComponentPropsWithoutRef } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../cn";
import type { Tone } from "./badge";

export const Tabs = TabsPrimitive.Root;

type TabsVariant = "underline" | "pills";
const VariantContext = createContext<TabsVariant>("underline");

export interface TabsListProps extends ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  /** Accessible name of the tab set. */
  label: string;
  /**
   * `underline` (default): a tab bar on a rule, for the sections of a page.
   * `pills`: fully rounded chips, for the filters of a list (statuses, levels),
   * each with its count and, when it stands for a status, a dot of its tone.
   */
  variant?: TabsVariant;
}

/** Tab bar. Scrolls sideways on narrow screens instead of wrapping. */
export function TabsList({ label, variant = "underline", className, ...props }: TabsListProps) {
  return (
    <VariantContext.Provider value={variant}>
      <div data-ds-tabs-scroller className={cn("scrollbar-none relative overflow-x-auto", variant === "underline" && "border-b border-border")}>
        <TabsPrimitive.List aria-label={label} className={cn("flex min-w-max", variant === "pills" ? "gap-2" : "gap-1", className)} {...props} />
      </div>
    </VariantContext.Provider>
  );
}

export interface TabsTriggerProps extends ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  /** Count supplied by the API. Omit it rather than computing it from one page. */
  count?: number;
  /** Tone of the status the tab filters on, shown as a dot (`pills` only). */
  tone?: Tone;
}

const DOT: Record<Tone, string> = {
  success: "bg-success-icon",
  warning: "bg-warning-icon",
  danger: "bg-danger-icon",
  info: "bg-info-icon",
  neutral: "bg-neutral-icon",
};

export function TabsTrigger({ count, tone, className, children, ...props }: TabsTriggerProps) {
  const pills = useContext(VariantContext) === "pills";
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "group inline-flex h-control items-center text-body font-medium whitespace-nowrap text-foreground-muted transition-colors duration-100 touch:h-touch",
        "hover:text-foreground disabled:text-disabled-foreground",
        // The list clips overflow: keep the focus outline inside the trigger.
        "focus-visible:-outline-offset-2",
        pills
          ? [
              "gap-2 rounded-pill border border-border bg-surface px-3.5 hover:bg-surface-subtle",
              "data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
            ]
          : "-mb-px gap-1.5 border-b-2 border-transparent px-3 data-[state=active]:border-brand data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    >
      {pills && tone && <span className={cn("size-2 shrink-0 rounded-pill group-data-[state=active]:bg-primary-foreground", DOT[tone])} aria-hidden="true" />}
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "rounded-pill text-meta tabular-nums",
            pills
              ? "bg-surface-subtle px-2 py-0.5 font-semibold text-foreground-muted group-data-[state=active]:bg-black/15 group-data-[state=active]:text-primary-foreground"
              : "bg-neutral-bg px-1.5 text-neutral-fg",
          )}
        >
          {count}
        </span>
      )}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("pt-4", className)} {...props} />;
}
