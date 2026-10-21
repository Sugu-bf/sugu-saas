import type { Metadata } from "next";
import { InvitationLanding } from "./invitation-landing";

export const metadata: Metadata = {
  title: "Invitation Lanaya | SUGU Pro",
  description: "Une invitation au programme Lanaya de SUGU.",
  // The link is a secret given to one person: never indexed.
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitationPage({ params }: Props) {
  const { token } = await params;
  return <InvitationLanding token={token} />;
}
