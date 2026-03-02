import type { Metadata } from "next";
import { TicketsContent } from "./tickets-content";

export const metadata: Metadata = {
  title: "Support | SUGUPro Vendeur",
  description:
    "Gérez vos tickets de support — suivi des demandes, conversations avec l'équipe SUGU.",
};

export default function VendorTicketsPage() {
  return <TicketsContent />;
}
