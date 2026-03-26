"use client";

import type { Message } from "@/lib/messaging/types";

interface SystemEventBubbleProps {
  message: Message;
}

export function SystemEventBubble({ message }: SystemEventBubbleProps) {
  return (
    <div className="flex justify-center py-2">
      <div className="glass-card rounded-xl border border-border px-4 py-2 text-center">
        <p className="text-xs text-muted-foreground">{message.body}</p>
      </div>
    </div>
  );
}
