import { Metadata } from "next";
import { SettingsPageClient } from "./settings-content";

export const metadata: Metadata = {
  title: "Paramètres | SUGUPro Vendeur",
  description:
    "Gérez votre profil, boutique, réseaux sociaux, horaires d'ouverture et préférences de votre espace vendeur.",
};

export default function VendorSettingsPage() {
  return <SettingsPageClient />;
}
