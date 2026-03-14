"use client";

import { useState } from "react";
import type { DriverSettings } from "@/features/driver/schema";
import {
  useUpdateDriverPassword,
  useToggleDriver2FA,
  useRevokeDriverSession,
  useRevokeOtherDriverSessions,
} from "@/features/driver/hooks";
import { SectionCard, PillBadge, PillButton } from "@/components/shared/settings-ui";
import { PasswordSection } from "@/components/shared/settings-security/password-section";
import { SessionsList, type UnifiedSession } from "@/components/shared/settings-security/sessions-list";
import { toast } from "sonner";
import {
  Shield,
  Loader2,
  CircleDot,
  ShieldOff,
  Info,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// Onglet 5 — Sécurité (Driver)
// ────────────────────────────────────────────────────────────

interface TabSecurityProps {
  data: DriverSettings;
}

export function TabSecurity({ data }: TabSecurityProps) {
  const security = data.security;

  // Mutation hooks
  const updatePasswordMutation = useUpdateDriverPassword();
  const toggle2FAMutation = useToggleDriver2FA();
  const revokeSessionMutation = useRevokeDriverSession();
  const revokeOtherSessionsMutation = useRevokeOtherDriverSessions();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(security.twoFactorEnabled);

  /** Handle password update */
  const handleUpdatePassword = async (currentPassword: string, newPassword: string, newPasswordConfirmation: string) => {
    await updatePasswordMutation.mutateAsync({
      currentPassword,
      newPassword,
      newPasswordConfirmation,
    });
    toast.success("Mot de passe mis à jour avec succès");
  };

  /** Handle 2FA toggle */
  const handleToggle2FA = async () => {
    try {
      await toggle2FAMutation.mutateAsync();
      setTwoFactorEnabled((prev) => !prev);
      toast.success(twoFactorEnabled ? "2FA désactivée" : "2FA activée avec succès");
    } catch {
      toast.error("Erreur lors de la modification de la 2FA");
    }
  };

  /** Handle revoking sessions */
  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSessionMutation.mutateAsync(sessionId);
      toast.success("Session révoquée");
    } catch {
      toast.error("Erreur lors de la révocation de la session");
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      await revokeOtherSessionsMutation.mutateAsync();
      toast.success("Toutes les autres sessions ont été déconnectées");
    } catch {
      toast.error("Erreur lors de la déconnexion des sessions");
    }
  };

  // Map driver sessions to unified format
  const unifiedSessions: UnifiedSession[] = security.sessions.map((s) => ({
    id: s.id,
    device: s.device,
    os: s.os,
    location: s.location,
    current: s.current,
    lastActivity: s.lastActivity,
  }));

  return (
    <div className="space-y-6">
      {/* ─── Card 1: Mot de passe (shared) ─── */}
      <PasswordSection
        onSubmit={handleUpdatePassword}
        isPending={updatePasswordMutation.isPending}
        buttonVariant="primary"
        showRequirements
        className="animate-card-enter"
      />

      {/* ─── Card 2: Double authentification (driver-specific: simple toggle) ─── */}
      <SectionCard title="Double authentification (2FA)" id="security-2fa" className="animate-card-enter" style={{ animationDelay: "60ms" } as React.CSSProperties}>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ajoutez une couche de sécurité supplémentaire à votre compte en activant la vérification par SMS.
          </p>

          {/* Status */}
          <div className="flex items-center gap-2">
            {twoFactorEnabled ? (
              <PillBadge variant="green"><CircleDot className="inline h-3 w-3 text-green-500" /> Activé</PillBadge>
            ) : (
              <PillBadge variant="red"><ShieldOff className="inline h-3 w-3" /> Non activé</PillBadge>
            )}
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Recommandé : Activez la 2FA pour protéger votre compte et vos gains
            </p>
          </div>

          <PillButton
            variant={twoFactorEnabled ? "outline" : "primary"}
            onClick={handleToggle2FA}
            disabled={toggle2FAMutation.isPending}
          >
            {toggle2FAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {twoFactorEnabled ? "Désactiver la 2FA" : "Activer la 2FA"}
          </PillButton>
        </div>
      </SectionCard>

      {/* ─── Card 3: Appareils connectés (shared) ─── */}
      <SessionsList
        sessions={unifiedSessions}
        onRevoke={handleRevokeSession}
        onRevokeAll={handleRevokeOtherSessions}
        isRevoking={revokeSessionMutation.isPending}
        isRevokingAll={revokeOtherSessionsMutation.isPending}
        revokeLabel="Révoquer"
        revokeAllLabel="Déconnecter tous les autres appareils"
        className="animate-card-enter"
        style={{ animationDelay: "120ms" } as React.CSSProperties}
      />
    </div>
  );
}
