"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Tooltip, cn } from "@/design-system";
import type { NavGroup, NavItem } from "./navigation";

export interface NavListProps {
  groups: NavGroup[];
  /** Id of the active entry (see `findActiveItem`). */
  activeId: string | null;
  /** Icon rail: labels move to tooltips, headings become separators. */
  collapsed?: boolean;
  /** 44px rows, for the drawer and the phone menu. */
  touch?: boolean;
  onNavigate?: () => void;
}

/** Grouped navigation links. Shared by the sidebar, the drawer and the phone menu. */
export function NavList({ groups, activeId, collapsed = false, touch = false, onNavigate }: NavListProps) {
  // Folded sections, by group id. A section holding the active page stays open.
  const [folded, setFolded] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group, index) => {
        const holdsActive = group.items.some((item) => item.id === activeId);
        const canFold = Boolean(group.collapsible && group.label) && !collapsed;
        const isFolded = canFold && !holdsActive && folded[group.id] === true;
        const listId = `nav-group-${group.id}`;
        const headingClass = cn("flex items-center text-meta font-medium text-foreground-subtle", touch ? "h-9" : "h-6");

        return (
          <div key={group.id} className={cn(collapsed && index > 0 && "border-t border-border pt-4")}>
            {group.label && !collapsed && (
              <div className="mb-1 px-2.5">
                {canFold ? (
                  <button
                    type="button"
                    aria-expanded={!isFolded}
                    aria-controls={listId}
                    onClick={() => setFolded((current) => ({ ...current, [group.id]: !isFolded }))}
                    className={cn(headingClass, "w-full justify-between rounded-compact hover:text-foreground")}
                  >
                    {group.label}
                    <ChevronDown
                      className={cn("size-3.5 transition-transform duration-100", isFolded && "-rotate-90")}
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <p className={headingClass}>{group.label}</p>
                )}
              </div>
            )}
            <ul id={listId} hidden={isFolded} className="flex flex-col gap-0.5" aria-label={group.label}>
              {group.items.map((item) => (
                <li key={item.id}>
                  <NavLink
                    item={item}
                    active={item.id === activeId}
                    collapsed={collapsed}
                    touch={touch}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

interface NavLinkProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  touch: boolean;
  onNavigate?: () => void;
}

function NavLink({ item, active, collapsed, touch, onNavigate }: NavLinkProps) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-control text-body transition-colors duration-100",
        touch ? "h-touch px-3" : "h-control px-2.5",
        collapsed && "justify-center px-0",
        active
          ? "bg-brand-subtle font-medium text-foreground"
          : "text-foreground-muted hover:bg-surface-hover hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-foreground-subtle")} aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}
