import type { Metadata } from "next";
import { OrdersContent } from "./orders-content";

export const metadata: Metadata = {
  title: "Commandes suivies | SUGUPro Lanabaga",
  description: "Les commandes des boutiques que vous accompagnez, dont SUGU vous a confié le suivi.",
};

export default function LanabagaOrdersPage() {
  return <OrdersContent />;
}
