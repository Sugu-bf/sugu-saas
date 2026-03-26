import type { Metadata } from "next";
import { MobileChatContent } from "./mobile-chat-content";

export const metadata: Metadata = {
  title: "Chat | SUGUPro Livreur",
  description: "Conversation en temps réel avec votre client.",
};

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function DriverMobileChatPage({ params }: PageProps) {
  const { conversationId } = await params;
  return <MobileChatContent conversationId={conversationId} />;
}
