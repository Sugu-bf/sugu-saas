"use client";

import { use } from "react";
import { useSession } from "@/features/auth";
import { useAgencyConversation } from "@/features/agency/messaging/hooks";
import { MessageViewer } from "@/features/agency/messaging/components/MessageViewer";
import { EmptyState } from "@/features/agency/messaging/components/EmptyState";
import { ChatSkeleton } from "@/features/agency/messaging/components/ChatSkeleton";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Mobile-only: full-screen conversation view.
 * On desktop (>= lg), redirect to /agency/messages.
 */
export default function AgencyConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const agencyId = session?.delivery_partner_id ?? undefined;

  const { data, isLoading } = useAgencyConversation(agencyId, conversationId);
  const conversation = data?.data ?? null;

  const handleBack = useCallback(() => {
    router.push("/agency/messages");
  }, [router]);

  if (isLoading) {
    return (
      <div className="glass-card flex-1 overflow-hidden rounded-2xl animate-fade-in">
        <ChatSkeleton />
      </div>
    );
  }

  if (!conversation || !agencyId) {
    return (
      <EmptyState
        title="Conversation introuvable"
        description="Cette conversation n'existe pas ou a été supprimée."
      />
    );
  }

  return (
    <div className="glass-card flex-1 overflow-hidden rounded-2xl animate-fade-in">
      <MessageViewer
        agencyId={agencyId}
        conversation={conversation}
        onBack={handleBack}
      />
    </div>
  );
}
