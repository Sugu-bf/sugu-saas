import type { Metadata } from "next";
import { CreateDeliveryForm } from "./create-delivery-form";

export const metadata: Metadata = {
  title: "Nouvelle course | SUGUPro Agence",
  description: "Saisissez une livraison que votre agence prend en charge elle-même.",
};

export default function NewDeliveryPage() {
  return <CreateDeliveryForm />;
}
