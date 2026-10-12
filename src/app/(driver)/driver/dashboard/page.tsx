import type { Metadata } from "next";
import { DriverDashboardContent } from "./dashboard-content";

export const metadata: Metadata = {
  title: "Accueil | SUGUPro Coursier",
  description: "Vos missions à accepter, en cours et terminées, et la prochaine mission à traiter.",
};

export default function DriverDashboardPage() {
  return <DriverDashboardContent />;
}
