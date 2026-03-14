"use client";

import { SectionCard, PillBadge, PillButton } from "@/components/shared/settings-ui";
import { Smartphone, Monitor, MapPin, Clock, CircleDot, Loader2, Globe } from "lucide-react";

// ────────────────────────────────────────────────────────────
// Shared Sessions List for Settings Security Tab
// ────────────────────────────────────────────────────────────

/** Unified session type — supports both driver and vendor shapes */
export interface UnifiedSession {
  id: string;
  device: string;
  /** Driver field */
  os?: string;
  /** Vendor field */
  browser?: string;
  /** Vendor field */
  ip?: string;
  location: string;
  /** Vendor field (ISO date) */
  time?: string;
  current: boolean;
  /** Driver field */
  lastActivity?: string;
}

export interface SessionsListProps {
  /** List of sessions to display */
  sessions: UnifiedSession[];
  /** Callback to revoke a single session */
  onRevoke: (sessionId: string) => void;
  /** Callback to revoke all other sessions */
  onRevokeAll: () => void;
  /** Whether a single session revocation is in progress */
  isRevoking: boolean;
  /** Whether "revoke all others" is in progress */
  isRevokingAll: boolean;
  /** Whether sessions are loading (vendor does lazy query) */
  isLoading?: boolean;
  /** Optional className for animation */
  className?: string;
  /** Optional style for animation delay */
  style?: React.CSSProperties;
  /** Revoke button label (driver: "Révoquer", vendor: "Déconnecter") */
  revokeLabel?: string;
  /** Revoke all button label */
  revokeAllLabel?: string;
  /** Optional time formatter */
  formatTime?: (time: string) => string;
}

/** Default relative time formatter */
function defaultFormatTime(time: string): string {
  try {
    const date = new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return time;
  }
}

export function SessionsList({
  sessions,
  onRevoke,
  onRevokeAll,
  isRevoking,
  isRevokingAll,
  isLoading = false,
  className,
  style,
  revokeLabel = "Révoquer",
  revokeAllLabel = "Déconnecter tous les autres appareils",
  formatTime = defaultFormatTime,
}: SessionsListProps) {
  return (
    <SectionCard
      title="Appareils connectés"
      id="security-sessions"
      badge={!isLoading && sessions.length > 0 ? <PillBadge variant="default">{sessions.length} sessions</PillBadge> : undefined}
      className={className}
      style={style}
    >
      <div className="mt-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Chargement des sessions...</span>
          </div>
        ) : sessions.length > 0 ? (
          sessions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/30 px-4 py-3 backdrop-blur dark:bg-white/5">
              {s.current ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950/30">
                  <Smartphone className="h-5 w-5 text-green-500" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                  <Monitor className="h-5 w-5 text-gray-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {s.device}
                    {s.browser ? ` — ${s.browser}` : ""}
                  </span>
                  {s.current && <PillBadge variant="green"><CircleDot className="inline h-3 w-3 text-green-500" /> Session actuelle</PillBadge>}
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {s.os && <>{s.os} • </>}
                  {s.ip && <><Globe className="inline h-3 w-3" /> {s.ip} • </>}
                  <MapPin className="inline h-3 w-3" /> {s.location}
                  {s.lastActivity && <> • <Clock className="inline h-3 w-3" /> {s.lastActivity}</>}
                  {s.time && <> • <Clock className="inline h-3 w-3" /> {formatTime(s.time)}</>}
                </p>
              </div>
              {!s.current && (
                <PillButton
                  variant="danger-outline"
                  size="sm"
                  onClick={() => onRevoke(s.id)}
                  disabled={isRevoking}
                >
                  {isRevoking ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {revokeLabel}
                </PillButton>
              )}
            </div>
          ))
        ) : (
          <div className="py-4 text-center">
            <Monitor className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Seule votre session actuelle est active.
            </p>
          </div>
        )}
      </div>
      {sessions.length > 1 && (
        <PillButton
          variant="danger-outline"
          size="sm"
          className="mt-3 w-full"
          onClick={onRevokeAll}
          disabled={isRevokingAll}
        >
          {isRevokingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {revokeAllLabel}
        </PillButton>
      )}
    </SectionCard>
  );
}
