import type { Metadata } from "next";
import { DashboardContent } from "./dashboard-content";

export const metadata: Metadata = {
  title: "Tableau de bord | SUGUPro Lanabaga",
  description: "Votre espace Lanabaga : vendeurs présentés, invitations en attente, actions à suivre et statut de votre compte.",
};

export default function LanabagaDashboardPage() {
  return <DashboardContent />;
}
