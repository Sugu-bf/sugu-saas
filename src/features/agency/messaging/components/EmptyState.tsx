"use client";

import { MessageSquare } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({
  title = "Aucune conversation",
  description = "Les conversations de vos coursiers apparaîtront ici.",
}: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sugu-50 to-sugu-100 dark:from-sugu-950/40 dark:to-sugu-900/20">
        <MessageSquare className="h-10 w-10 text-sugu-500" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
