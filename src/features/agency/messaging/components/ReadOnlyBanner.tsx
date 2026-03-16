"use client";

import { Eye } from "lucide-react";

export function ReadOnlyBanner() {
  return (
    <div className="glass-card border-t border-border p-4 text-center">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Eye className="h-4 w-4" />
        Mode supervision — lecture seule
      </div>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Seuls les participants peuvent envoyer des messages.
      </p>
    </div>
  );
}
