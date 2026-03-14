"use client";

import { SectionCard, MiniToggle } from "@/components/shared/settings-ui";

// ────────────────────────────────────────────────────────────
// Shared Event Preferences Table for Notifications Tab
// ────────────────────────────────────────────────────────────

export interface EventRow {
  /** Unique key or id for the event */
  id: string;
  /** Icon element */
  icon: React.ReactNode;
  /** Display label */
  label: string;
  /** Channel toggles */
  sms: boolean;
  email: boolean;
  push: boolean;
  whatsapp: boolean;
}

export interface EventPreferencesTableProps {
  /** Event rows to display */
  events: EventRow[];
  /** Toggle callback — receives event index and channel key */
  onToggle: (index: number, channel: "sms" | "email" | "push" | "whatsapp") => void;
  /** Optional className for animation */
  className?: string;
  /** Optional style for animation delay */
  style?: React.CSSProperties;
}

export function EventPreferencesTable({
  events,
  onToggle,
  className,
  style,
}: EventPreferencesTableProps) {
  return (
    <SectionCard title="Préférences par événement" id="notif-events" className={className} style={style}>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Événement</th>
              {["SMS", "Email", "Push", "WhatsApp"].map((h) => (
                <th key={h} className="w-16 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {events.map((ev, idx) => (
              <tr key={ev.id} className="transition-colors hover:bg-white/30 dark:hover:bg-white/5">
                <td className="py-2.5">
                  <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span>{ev.icon}</span>
                    {ev.label}
                  </span>
                </td>
                {(["sms", "email", "push", "whatsapp"] as const).map((key) => (
                  <td key={key} className="py-2.5 text-center">
                    <MiniToggle checked={ev[key]} onChange={() => onToggle(idx, key)} label={`${key.toUpperCase()} pour ${ev.label}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
