import type { Metadata } from "next";
import { CourierProfileContent } from "./courier-profile-content";

export const metadata: Metadata = {
  title: "Livreur | SUGUPro Agence",
  description: "La fiche d'un livreur : sa course en main, sa position, son véhicule, ses gains et ses pièces.",
};

export default async function CourierProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourierProfileContent id={id} />;
}
