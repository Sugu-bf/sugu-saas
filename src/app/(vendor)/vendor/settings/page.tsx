import { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsPageLoading } from "@/features/settings/loading";
import { VendorSettingsScreen } from "@/features/vendor/settings/screen";

export const metadata: Metadata = {
  title: "Paramètres | SUGUPro Vendeur",
  description: "Le profil, les paiements, la livraison, les notifications et la sécurité de votre boutique.",
};

export default function VendorSettingsPage() {
  // The open section is read from the address (?section=…).
  return (
    <Suspense fallback={<SettingsPageLoading sections={10} />}>
      <VendorSettingsScreen />
    </Suspense>
  );
}
