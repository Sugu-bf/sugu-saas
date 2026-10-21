import type { Metadata } from "next";
import { DocumentsContent } from "./documents-content";

export const metadata: Metadata = {
  title: "Documents | SUGUPro Lanabaga",
  description: "Les pièces de votre dossier Lanabaga et leur examen par SUGU.",
};

export default function LanabagaDocumentsPage() {
  return <DocumentsContent />;
}
