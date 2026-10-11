"use client";

import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import type { LucideIcon } from "lucide-react";
import { cn } from "../cn";

export interface DropdownMenuProps {
  /** The element that opens the menu: a `Button` or an `IconButton`. */
  trigger: ReactElement;
  children: ReactNode;
  align?: "start" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Called when the menu closes, before the focus goes back to the trigger.
   * `event.preventDefault()` leaves the focus where the chosen action put it:
   * the toolbar of an editor gives it back to the text.
   */
  onCloseAutoFocus?: (event: Event) => void;
  className?: string;
}

export function DropdownMenu({ trigger, children, align = "end", open, onOpenChange, onCloseAutoFocus, className }: DropdownMenuProps) {
  return (
    <Menu.Root open={open} onOpenChange={onOpenChange}>
      <Menu.Trigger asChild>{trigger}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align={align}
          sideOffset={4}
          collisionPadding={8}
          onCloseAutoFocus={onCloseAutoFocus}
          className={cn(
            "sugu-ui z-dropdown max-h-(--radix-dropdown-menu-content-available-height) min-w-44 overflow-y-auto rounded-panel border border-border bg-surface-elevated p-1 shadow-overlay animate-ds-fade",
            className,
          )}
        >
          {children}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

export interface DropdownMenuItemProps extends ComponentPropsWithoutRef<typeof Menu.Item> {
  icon?: LucideIcon;
  tone?: "default" | "danger";
}

export function DropdownMenuItem({ icon: Icon, tone = "default", className, children, ...props }: DropdownMenuItemProps) {
  return (
    <Menu.Item
      className={cn(
        "flex h-control cursor-default items-center gap-2 rounded-compact px-2 text-body outline-none select-none touch:h-touch",
        "data-[highlighted]:bg-surface-hover data-[disabled]:text-disabled-foreground",
        tone === "danger" ? "text-danger-fg" : "text-foreground",
        className,
      )}
      {...props}
    >
      {props.asChild ? (
        // The child (e.g. a `Link`) becomes the item and brings its own content.
        children
      ) : (
        <>
          {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
          <span className="truncate">{children}</span>
        </>
      )}
    </Menu.Item>
  );
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <Menu.Label className="px-2 py-1.5 text-meta font-medium text-foreground-subtle">{children}</Menu.Label>;
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="-mx-1 my-1 h-px bg-border" />;
}
