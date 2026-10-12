import { Suspense } from "react";
import type { Metadata } from "next";
import { AddDocumentContent } from "./add-document-content";

export const metadata: Metadata = {
  title: "Ajouter un document | SUGUPro Coursier",
  description: "Transmettre ou remplacer une pièce de votre dossier.",
};

export default function DriverAddDocumentPage() {
  // The form reads the type asked for from the address.
  return (
    <Suspense fallback={null}>
      <AddDocumentContent />
    </Suspense>
  );
}
