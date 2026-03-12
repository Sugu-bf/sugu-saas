"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { DriverSettings } from "@/features/driver/schema";
import { useDriverSettings } from "@/features/driver/hooks";
import { PillButton } from "./settings-ui";
import { TabProfile } from "./tab-profile";
import { TabVehicle } from "./tab-vehicle";
import { TabKyc } from "./tab-kyc";
import { TabNotifications } from "./tab-notifications";
import { TabSecurity } from "./tab-security";
import { TabDeleteAccount } from "./tab-delete-account";
import {
  User,
  Bike,
  FileCheck,
  Bell,
  Shield,
  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type DriverSettingsTab = "profile" | "vehicle" | "kyc" | "notifications" | "security" | "delete";

interface NavItem {
  key: DriverSettingsTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  danger?: boolean;
}

// ────────────────────────────────────────────────────────────
// Page Client Wrapper (with React Query)
// ────────────────────────────────────────────────────────────

/** Client entry point: fetches settings via React Query + renders content */
export function SettingsPageClient() {
  const { data, isLoading, error } = useDriverSettings();

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1440px] py-20 text-center">
        <p className="text-red-500">Erreur lors du chargement des paramètres.</p>
        <p className="mt-2 text-sm text-gray-500">Veuillez réessayer.</p>
      </div>
    );
  }

  return <SettingsContent data={data} />;
}

/** Skeleton while settings are loading */
function SettingsLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-10 w-40 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
      </header>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <div className="glass-card space-y-2 rounded-2xl p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        </div>
        <div className="space-y-6 xl:col-span-9">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card animate-pulse rounded-2xl p-6">
              <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="mt-6 space-y-4">
                <div className="h-10 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="h-10 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

interface SettingsContentProps {
  data: DriverSettings;
}

function SettingsContent({ data }: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState<DriverSettingsTab>("profile");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const qc = useQueryClient();

  // Dynamic KYC badge: count of not_uploaded documents
  const kycMissing = data.kyc.documents.filter((d) => d.status === "not_uploaded").length;

  const NAV_ITEMS: NavItem[] = [
    { key: "profile", label: "Mon profil", icon: <User className="h-4 w-4" /> },
    { key: "vehicle", label: "Véhicule", icon: <Bike className="h-4 w-4" /> },
    { key: "kyc", label: "Documents KYC", icon: <FileCheck className="h-4 w-4" />, badge: kycMissing > 0 ? kycMissing : undefined },
    { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { key: "security", label: "Sécurité", icon: <Shield className="h-4 w-4" /> },
    { key: "delete", label: "Supprimer le compte", icon: <Trash2 className="h-4 w-4" />, danger: true },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await qc.invalidateQueries({ queryKey: queryKeys.driver.settings() });
    setIsRefreshing(false);
  };

  /* eslint-disable react-hooks/purity */
  const lastSaveLabel = useMemo(() => {
    const lastSaveDate = new Date(data.lastSavedAt);
    const minutesAgo = Math.round((Date.now() - lastSaveDate.getTime()) / 60000);
    return minutesAgo < 1 ? "à l'instant" : `il y a ${minutesAgo} min`;
  }, [data.lastSavedAt]);
  /* eslint-enable react-hooks/purity */

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-20">
      {/* ════════════ Header ════════════ */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            <span className="text-gray-500 dark:text-gray-400">Dernière sauvegarde: {lastSaveLabel}</span>
          </div>
          <PillButton variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Rafraîchir
          </PillButton>
        </div>
      </header>

      {/* ════════════ Layout: Nav + Content ════════════ */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* ──── Left: Settings Navigation ──── */}
        <nav className="xl:col-span-3" aria-label="Navigation des paramètres">
          <div className="glass-card sticky top-4 space-y-0.5 rounded-2xl p-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all",
                  activeTab === item.key
                    ? "bg-sugu-500 text-white"
                    : item.danger
                      ? "text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                      : "text-gray-600 hover:bg-gray-100/80 dark:text-gray-400 dark:hover:bg-gray-800/50",
                )}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && (
                  <span className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                    activeTab === item.key ? "bg-white/20 text-white" : "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
                  )}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* ──── Right: Tab Content (75% width) ──── */}
        <div className="xl:col-span-9">
          {activeTab === "profile" && <TabProfile data={data} />}
          {activeTab === "vehicle" && <TabVehicle data={data} />}
          {activeTab === "kyc" && <TabKyc data={data} />}
          {activeTab === "notifications" && <TabNotifications data={data} />}
          {activeTab === "security" && <TabSecurity data={data} />}
          {activeTab === "delete" && <TabDeleteAccount />}
        </div>
      </div>
    </div>
  );
}

