"use client";

import Link from "next/link";
import { Button, Tooltip, buttonVariants, cn } from "@/design-system";
import { WorkspaceBrand } from "./brand";
import { NavList } from "./nav-list";
import type { NavGroup, WorkspaceNavigation } from "./navigation";

export const SIDEBAR_ID = "shell-sidebar";

export interface SidebarProps {
  groups: NavGroup[];
  activeId: string | null;
  collapsed: boolean;
  home: string;
  name: string;
  spaceLabel: string;
  /** The main action of the space, at the foot of the sidebar. */
  action?: WorkspaceNavigation["action"];
}

/** Desktop navigation (from 1024px). Scrolls on its own, independently of the page. */
export function Sidebar({ groups, activeId, collapsed, home, name, spaceLabel, action }: SidebarProps) {
  return (
    <aside
      id={SIDEBAR_ID}
      data-collapsed={collapsed || undefined}
      className={cn(
        "sugu-ui hidden shrink-0 flex-col border-r border-border bg-surface lg:flex",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <WorkspaceBrand href={home} name={name} caption={spaceLabel} compact={collapsed} />
      </div>
      <nav
        aria-label="Navigation principale"
        className={cn("min-h-0 flex-1 overflow-y-auto py-3", collapsed ? "px-2" : "px-3")}
      >
        <NavList groups={groups} activeId={activeId} collapsed={collapsed} />
      </nav>
      {action && (
        <div className={cn("shrink-0 border-t border-border py-3", collapsed ? "px-2" : "px-3")}>
          {collapsed ? (
            <Tooltip content={action.label} side="right">
              <Link href={action.href} aria-label={action.label} className={cn(buttonVariants({ variant: "primary", iconOnly: true }), "w-full")}>
                <action.icon className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            </Tooltip>
          ) : (
            <Button asChild variant="primary" icon={action.icon} className="w-full">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}
