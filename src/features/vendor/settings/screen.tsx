"use client";

import { Bell, CreditCard, Crown, Palette, Puzzle, Scale, Shield, Trash2, Truck, User } from "lucide-react";
import { Card, ErrorState, Skeleton } from "@/design-system";
import { SettingsFrame, describeSettingsLoadFailure, type SettingsSection } from "@/features/settings";
import { useVendorSettingsModel } from "./hooks";
import { PaymentsSection } from "./payments-section";
import { ProfileSection } from "./profile-section";
import { CloseVendorAccount, DeliverySection, DisplaySection, IntegrationsSection, LegalSection, NotificationsSection, SecuritySettings, SubscriptionSection } from "./sections";

// `/vendor/settings`: the ten sections of the seller's settings (V9).

type VendorSection = "profile" | "payments" | "delivery" | "notifications" | "security" | "integrations" | "display" | "subscription" | "legal" | "delete";

export const VENDOR_SECTIONS: SettingsSection<VendorSection>[] = [
  { key: "profile", label: "Mon profil", icon: User },
  { key: "payments", label: "Paiements & Facturation", icon: CreditCard },
  { key: "delivery", label: "Livraison", icon: Truck },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Sécurité", icon: Shield },
  { key: "integrations", label: "Intégrations", icon: Puzzle },
  { key: "display", label: "Préférences d'affichage", icon: Palette },
  { key: "subscription", label: "Mon abonnement", icon: Crown },
  { key: "legal", label: "Mentions légales", icon: Scale },
  { key: "delete", label: "Supprimer le compte", icon: Trash2, danger: true },
];

export function VendorSettingsScreen() {
  const settings = useVendorSettingsModel();

  return (
    <SettingsFrame
      description="Gérez les paramètres de votre boutique"
      sections={VENDOR_SECTIONS}
      render={(key) => {
        // The sections that only read other sources do not wait for the settings.
        if (key === "payments") return <PaymentsSection />;
        if (key === "integrations") return <IntegrationsSection />;
        if (key === "subscription") return <SubscriptionSection />;
        if (key === "delete") return <CloseVendorAccount />;

        if (settings.isPending) return <SettingsLoading />;
        if (settings.isError) {
          return (
            <Card>
              <ErrorState title="Paramètres indisponibles" description={describeSettingsLoadFailure(settings.error)} onRetry={() => settings.refetch()} retrying={settings.isFetching} />
            </Card>
          );
        }
        const model = settings.data;
        switch (key) {
          case "profile":
            return <ProfileSection model={model} />;
          case "delivery":
            return <DeliverySection model={model} />;
          case "notifications":
            return <NotificationsSection model={model} />;
          case "security":
            return <SecuritySettings model={model} />;
          case "display":
            return <DisplaySection model={model} />;
          case "legal":
            return <LegalSection model={model} />;
        }
      }}
    />
  );
}

export function SettingsLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <span className="sr-only" role="status">
        Chargement des paramètres…
      </span>
      <Skeleton className="h-16 w-full rounded-panel" />
      <Skeleton className="h-80 w-full rounded-panel" />
    </div>
  );
}
