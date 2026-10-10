"use client";

import Link from "next/link";
import { Menu, type LucideIcon } from "lucide-react";
import { cn } from "@/design-system";
import type { NavItem } from "./navigation";

export interface MobileNavigationProps {
  tabs: NavItem[];
  activeId: string | null;
  /** The current page lives in the menu, not in a tab. */
  menuActive: boolean;
  menuOpen: boolean;
  onOpenMenu: () => void;
}

const SLOT = "relative flex h-16 w-full flex-col items-center justify-center gap-1 text-meta";

function TabContent({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active: boolean }) {
  return (
    <>
      {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-pill bg-brand" aria-hidden="true" />}
      <Icon className={cn("size-5", active ? "text-primary" : "text-foreground-subtle")} aria-hidden="true" />
      <span className="max-w-full truncate px-1">{label}</span>
    </>
  );
}

/**
 * Phone tab bar (below 768px): the ranked destinations of the role plus
 * "Menu", which opens everything else. Fixed to the bottom; its height is
 * published as `--shell-bottom-inset` by the shell.
 */
export function MobileNavigation({ tabs, activeId, menuActive, menuOpen, onOpenMenu }: MobileNavigationProps) {
  const menuHighlighted = menuActive || menuOpen;
  return (
    <nav
      aria-label="Navigation rapide"
      className="sugu-ui fixed inset-x-0 bottom-0 z-nav border-t border-border bg-surface pb-[env(safe-area-inset-bottom,0px)] md:hidden"
    >
      <ul className="flex">
        {tabs.map((tab) => {
          const active = tab.id === activeId && !menuOpen;
          return (
            <li key={tab.id} className="min-w-0 flex-1">
              <Link
                href={tab.href}
                aria-current={tab.id === activeId ? "page" : undefined}
                className={cn(SLOT, active ? "font-medium text-foreground" : "text-foreground-muted")}
              >
                <TabContent icon={tab.icon} label={tab.shortLabel ?? tab.label} active={active} />
              </Link>
            </li>
          );
        })}
        <li className="min-w-0 flex-1">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={onOpenMenu}
            className={cn(SLOT, menuHighlighted ? "font-medium text-foreground" : "text-foreground-muted")}
          >
            <TabContent icon={Menu} label="Menu" active={menuHighlighted} />
          </button>
        </li>
      </ul>
    </nav>
  );
}
