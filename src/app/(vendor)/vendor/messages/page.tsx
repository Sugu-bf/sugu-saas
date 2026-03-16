import type { Metadata } from "next";
import { MessagesContent } from "./messages-content";

export const metadata: Metadata = {
  title: "Messages | SUGUPro Vendeur",
  description:
    "Gérez vos conversations clients — messagerie en temps réel avec support produit.",
};

export default function VendorMessagesPage() {
  return <MessagesContent />;
}
