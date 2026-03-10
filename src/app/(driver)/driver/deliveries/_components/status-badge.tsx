// ============================================================
// StatusBadge — Pill badge with animated dot
// ============================================================

import { cn } from "@/lib/utils";
import type { DriverDeliveryStatus } from "@/features/driver/schema";
import { STATUS_CONFIG } from "./status-config";

export function StatusBadge({
  status,
  label,
}: {
  status: DriverDeliveryStatus;
  label: string;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {label}
    </span>
  );
}
