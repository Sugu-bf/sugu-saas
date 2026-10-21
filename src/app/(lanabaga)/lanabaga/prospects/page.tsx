import type { Metadata } from "next";
import { ProspectsContent } from "./prospects-content";

export const metadata: Metadata = {
  title: "Prospects | SUGUPro Lanabaga",
  description: "Vos prospects : suivi, invitations et capacité.",
};

export default function LanabagaProspectsPage() {
  return <ProspectsContent />;
}
