"use client";

import Link from "next/link";
import { ChevronRight, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { IconButton } from "@/design-system";
import type { User } from "@/types";
import { WorkspaceBrand } from "./brand";
import type { NavItem, ShellContext } from "./navigation";
import { SIDEBAR_ID } from "./sidebar";
import { UserMenu } from "./user-menu";

export interface TopbarProps {
  user: User | null | undefined;
  home: string;
  name: string;
  spaceLabel: string;
  context: ShellContext;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  /** Opens the navigation drawer (tablet). */
  onOpenDrawer: () => void;
  drawerOpen: boolean;
  userMenuItems: NavItem[];
  onLogout: () => void;
  loggingOut: boolean;
}

/**
 * Top bar. Holds only working controls: navigation toggles, where you are,
 * and the account menu. No search and no notification bell — neither has a
 * backend contract yet.
 */
export function Topbar({
  user,
  home,
  name,
  spaceLabel,
  context,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenDrawer,
  drawerOpen,
  userMenuItems,
  onLogout,
  loggingOut,
}: TopbarProps) {
  return (
    <header className="sugu-ui z-header flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 md:px-4 lg:h-16 lg:px-6">
      {/* Phone: no sidebar, so the bar carries the identity of the space. */}
      <WorkspaceBrand href={home} name={name} caption={context.page ?? spaceLabel} className="md:hidden" />

      <IconButton
        icon={Menu}
        label="Ouvrir le menu"
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        onClick={onOpenDrawer}
        className="hidden md:inline-flex lg:hidden"
      />
      <IconButton
        icon={sidebarCollapsed ? PanelLeftOpen : PanelLeftClose}
        label={sidebarCollapsed ? "Étendre le menu" : "Réduire le menu"}
        aria-controls={SIDEBAR_ID}
        aria-expanded={!sidebarCollapsed}
        onClick={onToggleSidebar}
        className="hidden lg:inline-flex"
      />

      {context.page && (
        <nav aria-label="Emplacement" className="hidden min-w-0 md:block">
          <ol className="flex min-w-0 items-center gap-1 text-body">
            {context.group && (
              <li className="hidden items-center gap-1 text-foreground-muted lg:flex">
                <span className="truncate">{context.group}</span>
                <ChevronRight className="size-3.5 shrink-0 text-foreground-subtle" aria-hidden="true" />
              </li>
            )}
            <li className="min-w-0 truncate font-medium text-foreground">
              {context.parentHref ? (
                <Link href={context.parentHref} className="rounded-compact underline underline-offset-2">
                  {context.page}
                </Link>
              ) : (
                <span aria-current="page">{context.page}</span>
              )}
            </li>
          </ol>
        </nav>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {user && <UserMenu user={user} items={userMenuItems} onLogout={onLogout} loggingOut={loggingOut} />}
      </div>
    </header>
  );
}
