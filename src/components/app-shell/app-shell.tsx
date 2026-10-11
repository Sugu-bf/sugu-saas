"use client";

import { useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/design-system";
import { useLogout, useSession } from "@/features/auth";
import type { UserRole } from "@/types";
import { MobileMenu } from "./mobile-menu";
import { MobileNavigation } from "./mobile-navigation";
import {
  WORKSPACES,
  findActiveItem,
  isImmersiveRoute,
  mobileMenuGroups,
  mobileTabs,
  shellContextFor,
  userMenuItems,
  visibleGroups,
  workspaceName,
} from "./navigation";
import { Sidebar } from "./sidebar";
import { useSidebarCollapsed } from "./sidebar-state";
import { Topbar } from "./topbar";

export const MAIN_CONTENT_ID = "contenu";

export interface AppShellProps {
  /** The space being rendered. Access is decided by the guards around the shell. */
  role: UserRole;
  children: ReactNode;
}

type OpenMenu = { side: "bottom" | "left"; pathname: string } | null;

/**
 * The one frame of the pro portal, for the three roles.
 *
 * - from 1024px: sidebar (collapsible) + topbar;
 * - 768 to 1023px: topbar with a menu button opening a drawer;
 * - below 768px: topbar + bottom tab bar + menu panel.
 *
 * `.sugu-ui` is set on the chrome only. `<main>` stays outside the scope so
 * that pages not yet migrated keep their current rendering; a migrated page
 * opts in by carrying the class itself.
 */
export function AppShell({ role, children }: AppShellProps) {
  const workspace = WORKSPACES[role];
  const pathname = usePathname();
  const { data: user } = useSession();
  const logout = useLogout();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const menuOpener = useRef<HTMLElement | null>(null);

  const groups = visibleGroups(workspace, user);
  const activeId = findActiveItem(groups, pathname)?.id ?? null;
  const tabs = mobileTabs(groups);
  const name = workspaceName(workspace, user);
  const immersive = isImmersiveRoute(workspace, pathname);
  // A menu opened on another page is closed: navigating dismisses it.
  const menu = openMenu && openMenu.pathname === pathname ? openMenu : null;
  const closeMenu = () => setOpenMenu(null);
  const openMenuFrom = (side: "bottom" | "left", opener: HTMLElement) => {
    menuOpener.current = opener;
    setOpenMenu({ side, pathname });
  };
  const signOut = () => logout.mutate();

  return (
    <div
      data-shell="pro"
      data-role={role}
      className={cn(
        "flex h-dvh overflow-hidden bg-surface md:[--shell-bottom-inset:0px]",
        // Bottom padding of <main>, published for what sticks to its bottom.
        "[--shell-scroll-pad-bottom:6rem] md:[--shell-scroll-pad-bottom:1rem] lg:[--shell-scroll-pad-bottom:2rem]",
        !immersive && "[--shell-bottom-inset:calc(4rem+env(safe-area-inset-bottom,0px))]",
      )}
    >
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sugu-ui sr-only z-tooltip rounded-control bg-surface px-3 py-2 text-body font-medium text-foreground shadow-overlay focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Aller au contenu
      </a>

      <Sidebar
        groups={groups}
        activeId={activeId}
        collapsed={collapsed}
        home={workspace.home}
        name={name}
        spaceLabel={workspace.spaceLabel}
        action={workspace.action}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          home={workspace.home}
          name={name}
          spaceLabel={workspace.spaceLabel}
          context={shellContextFor(groups, pathname)}
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed(!collapsed)}
          onOpenDrawer={(opener) => openMenuFrom("left", opener)}
          drawerOpen={menu?.side === "left"}
          userMenuItems={userMenuItems(groups)}
          onLogout={signOut}
          loggingOut={logout.isPending}
        />
        {/* Padding and background are the legacy ones: existing pages (the
            messaging screens in particular) compensate for them by hand. */}
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="dashboard-bg min-h-0 flex-1 overflow-y-auto p-4 pb-(--shell-scroll-pad-bottom) lg:p-8 lg:pb-(--shell-scroll-pad-bottom)"
        >
          {children}
        </main>
      </div>

      {!immersive && (
        <MobileNavigation
          tabs={tabs}
          activeId={activeId}
          menuActive={activeId !== null && !tabs.some((tab) => tab.id === activeId)}
          menuOpen={menu?.side === "bottom"}
          onOpenMenu={(opener) => openMenuFrom("bottom", opener)}
        />
      )}

      <MobileMenu
        side={menu?.side ?? "bottom"}
        open={menu !== null}
        onClose={closeMenu}
        getOpener={() => menuOpener.current}
        groups={menu?.side === "left" ? groups : mobileMenuGroups(groups)}
        activeId={activeId}
        name={name}
        spaceLabel={workspace.spaceLabel}
        action={workspace.action}
        onLogout={signOut}
        loggingOut={logout.isPending}
      />
    </div>
  );
}
