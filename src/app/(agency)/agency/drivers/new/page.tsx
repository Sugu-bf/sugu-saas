import type { Metadata } from "next";
import { CreateDriverForm } from "./create-driver-form";

export const metadata: Metadata = {
  title: "Nouveau livreur | SUGUPro Agence",
  description: "Créez le compte d'un livreur et rattachez-le à votre agence.",
};

export default function CreateDriverPage() {
  return <CreateDriverForm />;
}
