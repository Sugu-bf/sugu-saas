import type { Metadata } from "next";
import { DriverDeliveriesContent } from "./deliveries-content";

export const metadata: Metadata = {
  title: "Mes Livraisons | SUGUPro Livreur",
  description:
    "Gérez vos livraisons : acceptez, suivez et confirmez vos courses en temps réel.",
};

export default function DriverDeliveriesPage() {
  return (
    <div className="flex h-full flex-col">
      <DriverDeliveriesContent />
    </div>
  );
}
