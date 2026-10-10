"use client";

import { cn } from "@/design-system";
import { WorkspaceBrand } from "./brand";
import { NavList } from "./nav-list";
import type { NavGroup } from "./navigation";

export const SIDEBAR_ID = "shell-sidebar";

export interface SidebarProps {
  groups: NavGroup[];
  activeId: string | null;
  collapsed: boolean;
  home: string;
  name: string;
  spaceLabel: string;
}

/** Desktop navigation (from 1024px). Scrolls on its own, independently of the page. */
export function Sidebar({ groups, activeId, collapsed, home, name, spaceLabel }: SidebarProps) {
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
    </aside>
  );
}
