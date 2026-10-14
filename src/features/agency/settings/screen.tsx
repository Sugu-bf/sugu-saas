"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell, Building2, Car, CreditCard, Crown, MapPinned, ShieldCheck, User } from "lucide-react";
import { Card, ErrorState } from "@/design-system";
import { useSession } from "@/features/auth/hooks";
import { SettingsFrame, describeSettingsLoadFailure, type SettingsSection } from "@/features/settings";
import { SettingsLoading } from "@/features/vendor/settings/screen";
import { fetchAgencySettings } from "./api";
import {
  AgencyAccountSection,
  AgencyIdentitySection,
  AgencyNotificationsSection,
  AgencyPaymentsSection,
  AgencySecuritySection,
  AgencySubscriptionSection,
  FleetSection,
  agencySettingsKey,
} from "./sections";
import { ZonesSection } from "./zones-section";

// `/agency/settings`: the eight sections of an agency's settings (V9).

type AgencySection = "agency" | "account" | "vehicles" | "zones" | "payments" | "notifications" | "security" | "subscription";

export const AGENCY_SECTIONS: SettingsSection<AgencySection>[] = [
  { key: "agency", label: "Mon agence", icon: Building2 },
  { key: "account", label: "Mon compte", icon: User },
  { key: "vehicles", label: "Véhicules & Flotte", icon: Car },
  { key: "zones", label: "Zones de couverture", icon: MapPinned },
  { key: "payments", label: "Paiements", icon: CreditCard },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Sécurité", icon: ShieldCheck },
  { key: "subscription", label: "Mon abonnement", icon: Crown },
];

export function AgencySettingsScreen() {
  const pathname = usePathname();
  const session = useSession();
  const agencyId = session.data?.delivery_partner_id ?? null;
  const settings = useQuery({
    queryKey: agencySettingsKey(agencyId ?? "none"),
    queryFn: () => fetchAgencySettings(agencyId!),
    enabled: agencyId !== null,
    staleTime: 30_000,
  });

  return (
    <SettingsFrame
      description="Gérez les paramètres de votre agence"
      sections={AGENCY_SECTIONS}
      render={(key) => {
        if (key === "notifications") return <AgencyNotificationsSection />;
        if (key === "security") return <AgencySecuritySection />;
        if (key === "subscription") return <AgencySubscriptionSection />;
        if (key === "payments") return <AgencyPaymentsSection />;

        if (!agencyId) {
          if (session.isPending) return <SettingsLoading />;
          return (
            <Card>
              <ErrorState title="Agence introuvable" description="Votre compte n'est rattaché à aucune agence." />
            </Card>
          );
        }
        if (key === "zones") return <ZonesSection agencyId={agencyId} />;

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
          case "agency":
            return <AgencyIdentitySection agencyId={agencyId} model={model} onOpenZones={`${pathname}?section=zones`} />;
          case "account":
            return <AgencyAccountSection model={model} />;
          case "vehicles":
            return <FleetSection model={model} />;
        }
      }}
    />
  );
}
