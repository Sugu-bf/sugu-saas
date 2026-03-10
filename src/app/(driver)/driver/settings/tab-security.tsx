"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DriverSettings } from "@/features/driver/schema";
import {
  useUpdateDriverPassword,
  useToggleDriver2FA,
  useRevokeDriverSession,
  useRevokeOtherDriverSessions,
} from "@/features/driver/hooks";
import { SectionCard, PillInput, PillBadge, PillButton, Field } from "./settings-ui";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Shield,
  Lock,
  Loader2,
  Smartphone,
  Monitor,
  MapPin,
  Clock,
  CheckCircle2,
  CircleDot,
  ShieldOff,
  Info,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// Onglet 5 — Sécurité
// ────────────────────────────────────────────────────────────

type PasswordStrength = "weak" | "medium" | "strong";

interface TabSecurityProps {
  data: DriverSettings;
}

export function TabSecurity({ data }: TabSecurityProps) {
  const security = data.security;

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Mutation hooks
  const updatePasswordMutation = useUpdateDriverPassword();
  const toggle2FAMutation = useToggleDriver2FA();
  const revokeSessionMutation = useRevokeDriverSession();
  const revokeOtherSessionsMutation = useRevokeOtherDriverSessions();

  const getStrength = (pwd: string): PasswordStrength => {
    if (pwd.length < 6) return "weak";
    if (pwd.length < 10 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return "medium";
    return "strong";
  };

  const strength = getStrength(newPwd);
  const strengthColors = { weak: "bg-red-500", medium: "bg-amber-500", strong: "bg-green-500" };
  const strengthLabels = { weak: "Faible", medium: "Moyen", strong: "Fort" };
  const strengthWidths = { weak: "33%", medium: "66%", strong: "100%" };

  // Password requirements
  const requirements = [
    { label: "8 caractères minimum", met: newPwd.length >= 8 },
    { label: "Une majuscule", met: /[A-Z]/.test(newPwd) },
    { label: "Un chiffre", met: /[0-9]/.test(newPwd) },
    { label: "Un caractère spécial", met: /[^A-Za-z0-9]/.test(newPwd) },
  ];

  /** Handle password update */
  const handleUpdatePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPwd !== confirmPwd) {
      setPasswordError("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      await updatePasswordMutation.mutateAsync({
        currentPassword: currentPwd,
        newPassword: newPwd,
        newPasswordConfirmation: confirmPwd,
      });
      setPasswordSuccess(true);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      toast.success("Mot de passe mis à jour avec succès");
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch {
      setPasswordError("Le mot de passe actuel est incorrect ou la requête a échoué.");
      toast.error("Erreur lors de la mise à jour du mot de passe");
    }
  };

  /** Handle 2FA toggle */
  const handleToggle2FA = async () => {
    try {
      await toggle2FAMutation.mutateAsync();
      toast.success(security.twoFactorEnabled ? "2FA désactivée" : "2FA activée avec succès");
    } catch {
      toast.error("Erreur lors de la modification de la 2FA");
    }
  };

  /** Handle revoking a single session */
  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSessionMutation.mutateAsync(sessionId);
      toast.success("Session révoquée");
    } catch {
      toast.error("Erreur lors de la révocation de la session");
    }
  };

  /** Handle revoking all other sessions */
  const handleRevokeOtherSessions = async () => {
    try {
      await revokeOtherSessionsMutation.mutateAsync();
      toast.success("Toutes les autres sessions ont été déconnectées");
    } catch {
      toast.error("Erreur lors de la déconnexion des sessions");
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Card 1: Mot de passe ─── */}
      <SectionCard title="Mot de passe" id="security-password" className="animate-card-enter">
        <div className="mt-5 space-y-4">
          <Field label="Mot de passe actuel">
            <PillInput
              type={showCurrentPwd ? "text" : "password"}
              value={currentPwd}
              onChange={setCurrentPwd}
              suffix={
                <button onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="text-gray-400 hover:text-gray-600">
                  {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
          </Field>
          <Field label="Nouveau mot de passe">
            <PillInput
              type={showNewPwd ? "text" : "password"}
              value={newPwd}
              onChange={setNewPwd}
              suffix={
                <button onClick={() => setShowNewPwd(!showNewPwd)} className="text-gray-400 hover:text-gray-600">
                  {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            {newPwd && (
              <div className="mt-2 space-y-2">
                {/* Strength bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className={cn("h-full rounded-full transition-all duration-300", strengthColors[strength])} style={{ width: strengthWidths[strength] }} />
                </div>
                <p className={cn("text-xs font-medium", strength === "strong" ? "text-green-600" : strength === "medium" ? "text-amber-600" : "text-red-600")}>
                  {strengthLabels[strength]}
                </p>
                {/* Requirements checklist */}
                <div className="grid grid-cols-2 gap-1.5">
                  {requirements.map((req) => (
                    <div key={req.label} className="flex items-center gap-1.5 text-[11px]">
                      <CheckCircle2 className={cn("h-3 w-3", req.met ? "text-green-500" : "text-gray-300 dark:text-gray-600")} />
                      <span className={cn(req.met ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500")}>{req.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Field>
          <Field label="Confirmer le nouveau mot de passe">
            <PillInput type="password" value={confirmPwd} onChange={setConfirmPwd} />
          </Field>
          {passwordError && (
            <p className="text-xs text-red-500">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-xs text-green-600"><CheckCircle2 className="inline h-3 w-3" /> Mot de passe mis à jour avec succès.</p>
          )}
          <PillButton
            variant="primary"
            onClick={handleUpdatePassword}
            disabled={updatePasswordMutation.isPending || !currentPwd || !newPwd || !confirmPwd}
          >
            {updatePasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Mettre à jour le mot de passe
          </PillButton>
        </div>
      </SectionCard>

      {/* ─── Card 2: Double authentification ─── */}
      <SectionCard title="Double authentification (2FA)" id="security-2fa" className="animate-card-enter" style={{ animationDelay: "60ms" } as React.CSSProperties}>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ajoutez une couche de sécurité supplémentaire à votre compte en activant la vérification par SMS.
          </p>

          {/* Status */}
          <div className="flex items-center gap-2">
            {security.twoFactorEnabled ? (
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
            variant={security.twoFactorEnabled ? "outline" : "primary"}
            onClick={handleToggle2FA}
            disabled={toggle2FAMutation.isPending}
          >
            {toggle2FAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {security.twoFactorEnabled ? "Désactiver la 2FA" : "Activer la 2FA"}
          </PillButton>
        </div>
      </SectionCard>

      {/* ─── Card 3: Appareils connectés ─── */}
      <SectionCard
        title="Appareils connectés"
        id="security-sessions"
        badge={<PillBadge variant="default">{security.sessions.length} sessions</PillBadge>}
        className="animate-card-enter"
        style={{ animationDelay: "120ms" } as React.CSSProperties}
      >
        <div className="mt-4 space-y-2">
          {security.sessions.map((s) => (
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
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{s.device}</span>
                  {s.current && <PillBadge variant="green"><CircleDot className="inline h-3 w-3 text-green-500" /> Session actuelle</PillBadge>}
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {s.os} • <MapPin className="inline h-3 w-3" /> {s.location} • <Clock className="inline h-3 w-3" /> {s.lastActivity}
                </p>
              </div>
              {!s.current && (
                <PillButton
                  variant="danger-outline"
                  size="sm"
                  onClick={() => handleRevokeSession(s.id)}
                  disabled={revokeSessionMutation.isPending}
                >
                  {revokeSessionMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Révoquer
                </PillButton>
              )}
            </div>
          ))}
        </div>
        {security.sessions.length > 1 && (
          <PillButton
            variant="danger-outline"
            size="sm"
            className="mt-3 w-full"
            onClick={handleRevokeOtherSessions}
            disabled={revokeOtherSessionsMutation.isPending}
          >
            {revokeOtherSessionsMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Déconnecter tous les autres appareils
          </PillButton>
        )}
      </SectionCard>
    </div>
  );
}
