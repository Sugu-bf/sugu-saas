import { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsPageLoading } from "@/features/settings/loading";
import { AgencySettingsScreen } from "@/features/agency/settings/screen";

export const metadata: Metadata = {
  title: "Paramètres | SUGUPro Agence",
  description: "L'agence, votre compte, la flotte, les zones et tarifs, les paiements et la sécurité.",
};

export default function AgencySettingsPage() {
  // The open section is read from the address (?section=…).
  return (
    <Suspense fallback={<SettingsPageLoading sections={8} />}>
      <AgencySettingsScreen />
    </Suspense>
  );
}
