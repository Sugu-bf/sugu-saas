import { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsPageLoading } from "@/features/settings/loading";
import { DriverSettingsScreen } from "@/features/driver/settings/screen";

export const metadata: Metadata = {
  title: "Paramètres | SUGUPro Coursier",
  description: "Votre profil, votre véhicule, vos notifications et la sécurité de votre compte.",
};

export default function DriverSettingsPage() {
  // The open section is read from the address (?section=…).
  return (
    <Suspense fallback={<SettingsPageLoading sections={5} />}>
      <DriverSettingsScreen />
    </Suspense>
  );
}
