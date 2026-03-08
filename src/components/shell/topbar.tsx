"use client";

import Link from "next/link";
import { Search, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { UserMenu } from "./user-menu";
import { useSidebar } from "./sidebar-context";
import { useSession } from "@/features/auth";
import type { UserRole } from "@/types";

interface TopbarProps {
  role: UserRole;
}

export function Topbar({ role }: TopbarProps) {
  const { collapsed, toggle } = useSidebar();
  const { data: user } = useSession();

  const businessName = user?.business_name ?? (
    role === "vendor" ? "Ma Boutique" : role === "agency" ? "Mon Agence" : user?.name ?? "Livreur"
  );
  const initials = businessName.charAt(0).toUpperCase();
  const roleLabel = role === "vendor" ? "VENDEUR" : role === "agency" ? "AGENCE" : "LIVREUR";

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200/60 bg-white/80 px-3 backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-950/80 lg:h-16 lg:px-6"
      role="banner"
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile: brand logo + name (sidebar is hidden on mobile) */}
        <Link
          href={`/${role}/dashboard`}
          className="flex items-center gap-2 lg:hidden"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sugu-400 to-sugu-600 text-xs font-bold text-white shadow-md shadow-sugu-500/20">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="max-w-[160px] truncate text-sm font-bold text-gray-900 dark:text-white">
              {businessName}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
              {roleLabel}
            </span>
          </div>
        </Link>

        {/* Desktop: Collapse toggle icon */}
        <button
          onClick={toggle}
          className="hidden h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700 active:scale-95 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 lg:flex"
          aria-label={collapsed ? "Étendre le menu" : "Réduire le menu"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>

        {/* Search bar (desktop only) */}
        <div className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 lg:flex lg:w-80">
          <Search className="h-4 w-4 flex-shrink-0" />
          <span>Rechercher des produits, commandes...</span>
        </div>
      </div>

      {/* Right: user menu */}
      <div className="flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  );
}
