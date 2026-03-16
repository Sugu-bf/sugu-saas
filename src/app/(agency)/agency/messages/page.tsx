import { Metadata } from "next";
import { AgencyMessagingPage } from "@/features/agency/messaging";

export const metadata: Metadata = {
  title: "Conversations | Agence SUGU",
  description:
    "Supervisez les conversations de vos coursiers avec les clients. Mode lecture seule.",
};

export default function AgencyMessagesPage() {
  return <AgencyMessagingPage />;
}
