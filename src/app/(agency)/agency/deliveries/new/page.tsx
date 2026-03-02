import type { Metadata } from "next";
import { CreateDeliveryForm } from "./create-delivery-form";

export const metadata: Metadata = {
  title: "Nouvelle livraison | SUGUPro Agence",
  description: "Créer une nouvelle livraison manuellement.",
};

export default function NewDeliveryPage() {
  return (
    <div className="flex h-full flex-col">
      <CreateDeliveryForm />
    </div>
  );
}
