"use client";

import { cn } from "@/lib/utils";

interface ReadReceiptProps {
  isOwn: boolean;
  isRead: boolean;
}

export function ReadReceipt({ isOwn, isRead }: ReadReceiptProps) {
  if (!isOwn) return null;

  return (
    <span
      className={cn(
        "ml-1 inline-flex items-center text-[11px]",
        isRead ? "text-blue-500" : "text-gray-400 dark:text-gray-500",
      )}
      aria-label={isRead ? "Lu" : "Envoyé"}
    >
      {isRead ? "✓✓" : "✓"}
    </span>
  );
}
