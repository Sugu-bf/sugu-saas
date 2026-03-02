import type { Metadata } from "next";
import { getAgencySettings } from "@/features/agency/service";
import { SettingsContent } from "./settings-content";

export const metadata: Metadata = {
  title: "Paramètres | SUGUPro Agence",
  description:
    "Gérez les paramètres de votre agence — identité, horaires, véhicules, zones et notifications.",
};

export default async function AgencySettingsPage() {
  const data = await getAgencySettings();
  return <SettingsContent data={data} />;
}
