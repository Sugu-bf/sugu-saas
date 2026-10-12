import type { Metadata } from "next";
import { DocumentsContent } from "./documents-content";

export const metadata: Metadata = {
  title: "Mes documents | SUGUPro Coursier",
  description: "L'état de votre dossier et vos pièces justificatives.",
};

export default function DriverDocumentsPage() {
  return <DocumentsContent />;
}
