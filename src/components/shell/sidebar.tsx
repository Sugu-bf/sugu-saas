"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Warehouse,
  BarChart3,
  Settings,
  HelpCircle,
  Truck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Megaphone,
  MessageSquare,
  Wallet,
} from "lucide-react";
import { type ReactNode } from "react";
import type { UserRole } from "@/types";
import { useSidebar } from "./sidebar-context";
import { useSession } from "@/features/auth";

// --- Navigation definitions ---
interface SideNavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
}

interface SideNavSection {
  title?: string;
  items: SideNavItem[];
}

const vendorSections: SideNavSection[] = [
  {
    title: "VUE D'ENSEMBLE",
    items: [
      { label: "Tableau de bord", href: "/vendor/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
      { label: "Commandes", href: "/vendor/orders", icon: <ShoppingCart className="h-5 w-5" />, badge: 2 },
      { label: "Produits", href: "/vendor/products", icon: <Package className="h-5 w-5" /> },
      { label: "Clients", href: "/vendor/clients", icon: <Users className="h-5 w-5" /> },
      { label: "Inventaire", href: "/vendor/inventory", icon: <Warehouse className="h-5 w-5" />, badge: 2 },
      { label: "Statistiques", href: "/vendor/statistics", icon: <BarChart3 className="h-5 w-5" /> },
      { label: "Portefeuille", href: "/vendor/wallet", icon: <Wallet className="h-5 w-5" /> },
      { label: "Marketing", href: "/vendor/marketing", icon: <Megaphone className="h-5 w-5" /> },
    ],
  },
  {
    title: "CONFIGURATION",
    items: [
      { label: "Paramètres", href: "/vendor/settings", icon: <Settings className="h-5 w-5" /> },
      { label: "Support", href: "/vendor/tickets", icon: <MessageSquare className="h-5 w-5" /> },
      { label: "Aide", href: "/vendor/help", icon: <HelpCircle className="h-5 w-5" /> },
    ],
  },
];

const agencySections: SideNavSection[] = [
  {
    title: "VUE D'ENSEMBLE",
    items: [
      { label: "Dashboard", href: "/agency/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
      { label: "Livraisons", href: "/agency/deliveries", icon: <Truck className="h-5 w-5" /> },
      { label: "Livreurs", href: "/agency/drivers", icon: <Users className="h-5 w-5" /> },
      { label: "Statistiques", href: "/agency/statistics", icon: <BarChart3 className="h-5 w-5" /> },
    ],
  },
  {
    title: "CONFIGURATION",
    items: [
      { label: "Paramètres", href: "/agency/settings", icon: <Settings className="h-5 w-5" /> },
    ],
  },
];

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const { collapsed, toggle } = useSidebar();
  const { data: user } = useSession();
  const pathname = usePathname();
  const sections = role === "vendor" ? vendorSections : agencySections;

  const businessName = user?.business_name ?? (role === "vendor" ? "Ma Boutique" : "Mon Agence");
  const roleLabel = role === "vendor" ? "Vendeur" : "Agence";
  const initials = businessName.charAt(0).toUpperCase();

  return (
    <aside
      id="sidebar"
      className={cn(
        "hidden lg:relative lg:flex inset-y-0 left-0 z-40 flex-col border-r border-gray-200/60 bg-white/80 backdrop-blur-xl transition-all duration-300 dark:border-gray-800/60 dark:bg-gray-950/80",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      {/* Logo + Store/Agency name */}
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-200/60 px-4 dark:border-gray-800/60">
        <Link
          href={`/${role}/dashboard`}
          className={cn("flex items-center gap-2.5", collapsed && "mx-auto")}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sugu-400 to-sugu-600 text-sm font-bold text-white shadow-md shadow-sugu-500/20">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="max-w-[140px] truncate text-sm font-bold text-gray-900 dark:text-white">
                {businessName}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                {roleLabel}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu principal">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className={cn(sIdx > 0 && "mt-6")}>
            {section.title && !collapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-gradient-to-r from-sugu-50 to-sugu-100/60 text-sugu-600 shadow-sm dark:from-sugu-950/40 dark:to-sugu-950/20 dark:text-sugu-400"
                          : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-white",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span
                        className={cn(
                          "flex-shrink-0 transition-colors",
                          isActive
                            ? "text-sugu-500"
                            : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300",
                        )}
                      >
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span className="flex-1">{item.label}</span>
                      )}
                      {!collapsed && item.badge !== undefined && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-sugu-400 to-sugu-500 px-1.5 text-[10px] font-bold text-white shadow-sm shadow-sugu-500/20">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Premium CTA (bottom) */}
      {!collapsed && (
        <div className="border-t border-gray-200/60 p-3 dark:border-gray-800/60">
          <div className="rounded-2xl bg-gradient-to-r from-sugu-500 to-sugu-600 p-4 text-white shadow-lg shadow-sugu-500/25">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" />
              Passez au Premium
              <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                PRO
              </span>
            </div>
            <button className="mt-3 w-full rounded-xl bg-white/20 px-3 py-2 text-xs font-semibold transition-all hover:bg-white/30 active:scale-[0.98]">
              Mettre à niveau
            </button>
          </div>
        </div>
      )}

      {/* Collapse toggle (desktop only) */}
      <div className="hidden border-t border-gray-200/60 p-3 dark:border-gray-800/60 lg:block">
        <button
          onClick={toggle}
          className="flex w-full items-center justify-center rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100/80 hover:text-gray-600 dark:hover:bg-gray-800/50 dark:hover:text-gray-300"
          aria-label={collapsed ? "Étendre le menu" : "Réduire le menu"}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  );
}
