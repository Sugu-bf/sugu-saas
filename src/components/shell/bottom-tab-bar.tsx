"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Menu,
  X,
  Truck,
  BarChart3,
  Warehouse,
  Megaphone,
  Settings,
  MessageSquare,
  HelpCircle,
  Sparkles,
  MapPin,
  Banknote,
} from "lucide-react";
import { useState, useEffect, useCallback, type ReactNode } from "react";
import type { UserRole } from "@/types";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
interface TabItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
}

// ────────────────────────────────────────────────────────────
// Vendor tabs & drawer items
// ────────────────────────────────────────────────────────────
const vendorTabs: TabItem[] = [
  { label: "Accueil", href: "/vendor/dashboard", icon: <LayoutDashboard className="h-6 w-6" /> },
  { label: "Commandes", href: "/vendor/orders", icon: <ShoppingCart className="h-6 w-6" />, badge: 2 },
  { label: "Produits", href: "/vendor/products", icon: <Package className="h-6 w-6" /> },
  { label: "Messages", href: "/vendor/messages", icon: <MessageSquare className="h-6 w-6" /> },
];

const vendorDrawerItems: TabItem[] = [
  { label: "Clients", href: "/vendor/clients", icon: <Users className="h-5 w-5" /> },
  { label: "Inventaire", href: "/vendor/inventory", icon: <Warehouse className="h-5 w-5" />, badge: 2 },
  { label: "Statistiques", href: "/vendor/statistics", icon: <BarChart3 className="h-5 w-5" /> },
  { label: "Marketing", href: "/vendor/marketing", icon: <Megaphone className="h-5 w-5" /> },
  { label: "Paramètres", href: "/vendor/settings", icon: <Settings className="h-5 w-5" /> },
  { label: "Support", href: "/vendor/tickets", icon: <MessageSquare className="h-5 w-5" /> },
  { label: "Aide", href: "/vendor/help", icon: <HelpCircle className="h-5 w-5" /> },
];

// ────────────────────────────────────────────────────────────
// Agency tabs & drawer items
// ────────────────────────────────────────────────────────────
const agencyTabs: TabItem[] = [
  { label: "Accueil", href: "/agency/dashboard", icon: <LayoutDashboard className="h-6 w-6" /> },
  { label: "Livraisons", href: "/agency/deliveries", icon: <Truck className="h-6 w-6" /> },
  { label: "Livreurs", href: "/agency/drivers", icon: <Users className="h-6 w-6" /> },
  { label: "Messages", href: "/agency/messages", icon: <MessageSquare className="h-6 w-6" /> },
];

const agencyDrawerItems: TabItem[] = [
  { label: "Statistiques", href: "/agency/statistics", icon: <BarChart3 className="h-5 w-5" /> },
  { label: "Paramètres", href: "/agency/settings", icon: <Settings className="h-5 w-5" /> },
];

// ────────────────────────────────────────────────────────────
// Driver tabs & drawer items
// ────────────────────────────────────────────────────────────
const driverTabs: TabItem[] = [
  { label: "Accueil", href: "/driver/dashboard", icon: <LayoutDashboard className="h-6 w-6" /> },
  { label: "Livraisons", href: "/driver/deliveries", icon: <Package className="h-6 w-6" />, badge: 3 },
  { label: "Navigation", href: "/driver/navigation", icon: <MapPin className="h-6 w-6" /> },
  { label: "Gains", href: "/driver/earnings", icon: <Banknote className="h-6 w-6" /> },
];

const driverDrawerItems: TabItem[] = [
  { label: "Paramètres", href: "/driver/settings", icon: <Settings className="h-5 w-5" /> },
  { label: "Support", href: "/driver/support", icon: <MessageSquare className="h-5 w-5" /> },
];

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────
interface BottomTabBarProps {
  role: UserRole;
}

// Patterns where the bottom tab bar should be hidden (individual chat pages)
const HIDE_BOTTOM_BAR_PATTERNS = [
  /^\/vendor\/messages\/[^/]+$/,
  /^\/agency\/messages\/[^/]+$/,
];

export function BottomTabBar({ role }: BottomTabBarProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabs = role === "vendor" ? vendorTabs : role === "agency" ? agencyTabs : driverTabs;
  const drawerItems = role === "vendor" ? vendorDrawerItems : role === "agency" ? agencyDrawerItems : driverDrawerItems;

  // Hide bottom bar on individual chat pages so the composer is not covered
  const shouldHide = HIDE_BOTTOM_BAR_PATTERNS.some((re) => re.test(pathname));

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Close drawer on route change
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Check if a drawer item is active (to highlight the Menu tab)
  const isDrawerItemActive = drawerItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );

  // Don't render at all on chat detail pages
  if (shouldHide) return null;

  return (
    <>
      {/* ═══════ Bottom Tab Bar ═══════ */}
      <nav
        id="bottom-tab-bar"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200/60 bg-white/90 backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-950/90 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Navigation mobile"
      >
        <div className="flex h-16 items-stretch justify-around">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors duration-200",
                  isActive
                    ? "text-sugu-500"
                    : "text-gray-400 active:text-gray-600 dark:text-gray-500 dark:active:text-gray-300",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute top-1.5 h-1 w-1 rounded-full bg-sugu-500" />
                )}

                {/* Icon with optional badge */}
                <span className="relative mt-1">
                  {tab.icon}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm">
                      {tab.badge}
                    </span>
                  )}
                </span>

                <span className="text-[10px] font-medium leading-tight">
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* ═══════ Menu (More) Tab ═══════ */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors duration-200",
              drawerOpen || isDrawerItemActive
                ? "text-sugu-500"
                : "text-gray-400 active:text-gray-600 dark:text-gray-500 dark:active:text-gray-300",
            )}
            aria-label="Plus de menus"
            aria-expanded={drawerOpen}
          >
            {(drawerOpen || isDrawerItemActive) && (
              <span className="absolute top-1.5 h-1 w-1 rounded-full bg-sugu-500" />
            )}
            <span className="mt-1">
              <Menu className="h-6 w-6" />
            </span>
            <span className="text-[10px] font-medium leading-tight">Menu</span>
          </button>
        </div>
      </nav>

      {/* ═══════ Drawer Overlay + Sheet ═══════ */}
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          drawerOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] rounded-t-3xl border-t border-gray-200/60 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-gray-800/60 dark:bg-gray-950 lg:hidden",
          drawerOpen ? "translate-y-0" : "translate-y-full",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navigation"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Menu
          </h2>
          <button
            onClick={closeDrawer}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors active:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:active:bg-gray-700"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="overflow-y-auto px-4 pb-4" aria-label="Navigation secondaire">
          <ul className="space-y-1">
            {drawerItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeDrawer}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                      isActive
                        ? "bg-gradient-to-r from-sugu-50 to-sugu-100/60 text-sugu-600 shadow-sm dark:from-sugu-950/40 dark:to-sugu-950/20 dark:text-sugu-400"
                        : "text-gray-600 active:bg-gray-100 dark:text-gray-400 dark:active:bg-gray-800/50",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "flex-shrink-0 transition-colors",
                        isActive
                          ? "text-sugu-500"
                          : "text-gray-400 dark:text-gray-500",
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-sugu-400 to-sugu-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Premium CTA */}
        {role === "vendor" && (
          <div className="border-t border-gray-200/60 px-4 py-4 dark:border-gray-800/60">
            <div className="rounded-2xl bg-gradient-to-r from-sugu-500 to-sugu-600 p-4 text-white shadow-lg shadow-sugu-500/25">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4" />
                Passez au Premium
                <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                  PRO
                </span>
              </div>
              <p className="mt-1 text-xs text-white/70">
                Débloquez les statistiques avancées, le marketing et plus encore.
              </p>
              <button className="mt-3 w-full rounded-xl bg-white/20 px-3 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] active:bg-white/30">
                Mettre à niveau
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
