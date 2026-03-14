"use client";

import { useState } from "react";
import type { DriverSettings } from "@/features/driver/schema";
import { useDriverSettings } from "@/features/driver/hooks";
import { PillButton } from "@/components/shared/settings-ui";
import { SettingsShell, SettingsLoadingSkeleton, type SettingsNavItem } from "@/components/shared/settings-shell";
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
// Page Client Wrapper (with React Query)
// ────────────────────────────────────────────────────────────

/** Client entry point: fetches settings via React Query + renders content */
export function SettingsPageClient() {
  const { data, isLoading, error } = useDriverSettings();

  if (isLoading) {
    return <SettingsLoadingSkeleton navItemCount={6} />;
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

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

type DriverSettingsTab = "profile" | "vehicle" | "kyc" | "notifications" | "security" | "delete";

function SettingsContent({ data }: { data: DriverSettings }) {
  const [activeTab, setActiveTab] = useState<DriverSettingsTab>("profile");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const qc = useQueryClient();

  // Dynamic KYC badge: count of not_uploaded documents
  const kycMissing = data.kyc.documents.filter((d) => d.status === "not_uploaded").length;

  const NAV_ITEMS: SettingsNavItem[] = [
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

  return (
    <SettingsShell
      navItems={NAV_ITEMS}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as DriverSettingsTab)}
      lastSavedAt={data.lastSavedAt}
      headerAction={
        <PillButton variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Rafraîchir
        </PillButton>
      }
    >
      {activeTab === "profile" && <TabProfile data={data} />}
      {activeTab === "vehicle" && <TabVehicle data={data} />}
      {activeTab === "kyc" && <TabKyc data={data} />}
      {activeTab === "notifications" && <TabNotifications data={data} />}
      {activeTab === "security" && <TabSecurity data={data} />}
      {activeTab === "delete" && <TabDeleteAccount />}
    </SettingsShell>
  );
}
