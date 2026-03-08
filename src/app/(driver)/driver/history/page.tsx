import type { Metadata } from "next";
import { DriverHistoryContent } from "./history-content";

export const metadata: Metadata = {
  title: "Historique des livraisons | SUGUPro Livreur",
  description:
    "Consultez l'historique complet de vos courses passées, gains et performances.",
};

export default function DriverHistoryPage() {
  return (
    <div className="flex h-full flex-col">
      <DriverHistoryContent />
    </div>
  );
}
