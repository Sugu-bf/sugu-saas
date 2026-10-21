import type { Metadata } from "next";
import { InvitationsContent } from "./invitations-content";

export const metadata: Metadata = {
  title: "Invitations | SUGUPro Lanabaga",
  description: "Les invitations envoyées aux vendeurs et leur réponse.",
};

export default function LanabagaInvitationsPage() {
  return <InvitationsContent />;
}
