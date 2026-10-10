"use client";

import type { ComponentPropsWithoutRef } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../cn";

export const Tabs = TabsPrimitive.Root;

export interface TabsListProps extends ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  /** Accessible name of the tab set. */
  label: string;
}

/** Underlined tab bar. Scrolls sideways on narrow screens instead of wrapping. */
export function TabsList({ label, className, ...props }: TabsListProps) {
  return (
    <div data-ds-tabs-scroller className="scrollbar-none relative overflow-x-auto border-b border-border">
      <TabsPrimitive.List aria-label={label} className={cn("flex min-w-max gap-1", className)} {...props} />
    </div>
  );
}

export interface TabsTriggerProps extends ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  /** Count supplied by the API. Omit it rather than computing it from one page. */
  count?: number;
}

export function TabsTrigger({ count, className, children, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "-mb-px inline-flex h-control items-center gap-1.5 border-b-2 border-transparent px-3 text-body font-medium whitespace-nowrap text-foreground-muted transition-colors duration-100 touch:h-touch",
        "hover:text-foreground data-[state=active]:border-brand data-[state=active]:text-foreground",
        "disabled:text-disabled-foreground",
        // The list clips overflow: keep the focus outline inside the trigger.
        "focus-visible:-outline-offset-2",
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className="rounded-pill bg-neutral-bg px-1.5 text-meta text-neutral-fg tabular-nums">{count}</span>
      )}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("pt-4", className)} {...props} />;
}
