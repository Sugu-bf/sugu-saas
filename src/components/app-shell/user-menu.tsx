"use client";

import Link from "next/link";
import { ArrowLeftRight, ChevronDown, LogOut } from "lucide-react";
import { Avatar, Button, DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/design-system";
import type { User } from "@/types";
import type { NavItem, SpaceSwitch } from "./navigation";

export interface UserMenuProps {
  user: User;
  /** Destinations flagged `inUserMenu` in the navigation config. */
  items: NavItem[];
  /** The other spaces of the session: "Passer à l'espace …". */
  switches?: SpaceSwitch[];
  onLogout: () => void;
  loggingOut: boolean;
}

/** Account menu of the topbar. Every entry leads somewhere real. */
export function UserMenu({ user, items, switches = [], onLogout, loggingOut }: UserMenuProps) {
  const displayName = user.name || user.email;
  return (
    <DropdownMenu
      className="w-60"
      trigger={
        <Button variant="quiet" aria-label={`Menu du compte, ${displayName}`} className="gap-2 px-1.5 touch:px-1.5">
          <Avatar name={displayName} src={user.avatar_url} />
          <span className="hidden max-w-40 truncate text-foreground md:inline">{displayName}</span>
          <ChevronDown className="hidden size-4 text-foreground-subtle md:inline" aria-hidden="true" />
        </Button>
      }
    >
      <div className="px-2 py-1.5">
        <p className="truncate text-body font-medium text-foreground">{displayName}</p>
        {user.email && user.email !== displayName && (
          <p className="truncate text-meta text-foreground-muted">{user.email}</p>
        )}
      </div>
      <DropdownMenuSeparator />
      {switches.map((item) => (
        <DropdownMenuItem key={item.space} asChild>
          <Link href={item.href}>
            <ArrowLeftRight className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        </DropdownMenuItem>
      ))}
      {switches.length > 0 && <DropdownMenuSeparator />}
      {items.map((item) => (
        <DropdownMenuItem key={item.id} asChild>
          <Link href={item.href}>
            <item.icon className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        </DropdownMenuItem>
      ))}
      {items.length > 0 && <DropdownMenuSeparator />}
      <DropdownMenuItem icon={LogOut} tone="danger" disabled={loggingOut} onSelect={onLogout}>
        Se déconnecter
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
