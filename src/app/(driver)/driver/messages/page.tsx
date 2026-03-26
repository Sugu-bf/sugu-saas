import type { Metadata } from "next";
import { MessagesContent } from "./messages-content";

export const metadata: Metadata = {
  title: "Messages | SUGUPro Livreur",
  description: "Gérez vos conversations clients en temps réel.",
};

export default function CourierMessagesPage() {
  return <MessagesContent />;
}
