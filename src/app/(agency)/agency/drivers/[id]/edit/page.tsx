import type { Metadata } from "next";
import { EditDriverForm } from "./edit-driver-form";

export const metadata: Metadata = {
  title: "Modifier le livreur | SUGUPro Agence",
};

export default async function EditDriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditDriverForm id={id} />;
}
