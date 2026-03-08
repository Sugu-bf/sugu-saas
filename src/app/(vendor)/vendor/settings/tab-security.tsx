"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SectionCard, Toggle, PillInput, PillBadge, PillButton, Field } from "./settings-ui";
import { Eye, EyeOff, Shield, Key, Loader2, Monitor, MapPin, Clock, CheckCircle2, CircleDot, ShieldOff } from "lucide-react";
import {
  useUpdatePassword,
  useToggle2FA,
  useRevokeSession,
  useRevokeOtherSessions,
  useVendorSettings,
} from "@/features/vendor/hooks";

// ────────────────────────────────────────────────────────────
// Onglet 5 — Sécurité
// ────────────────────────────────────────────────────────────

// Login history — no backend endpoint yet, shown as empty state

type PasswordStrength = "weak" | "medium" | "strong";

export function TabSecurity() {
  // Fetch security state from API via React Query
  const { data: settingsData } = useVendorSettings();

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [suspiciousAlert, setSuspiciousAlert] = useState(true);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Mutation hooks
  const updatePasswordMutation = useUpdatePassword();
  const toggle2FAMutation = useToggle2FA();
  const revokeSessionMutation = useRevokeSession();
  const revokeOtherSessionsMutation = useRevokeOtherSessions();

  const getStrength = (pwd: string): PasswordStrength => {
    if (pwd.length < 6) return "weak";
    if (pwd.length < 10 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return "medium";
    return "strong";
  };

  const strength = getStrength(newPwd);
  const strengthColors = { weak: "bg-red-500", medium: "bg-amber-500", strong: "bg-green-500" };
  const strengthLabels = { weak: "Faible", medium: "Moyen", strong: "Fort" };
  const strengthWidths = { weak: "33%", medium: "66%", strong: "100%" };

  // Get sessions from the transformed VendorSettings data
  const apiSessions = settingsData?.security?.activeSessions ?? [];

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
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err) {
      setPasswordError("Le mot de passe actuel est incorrect ou la requête a échoué.");
      console.error("[security] Password update failed:", err);
    }
  };

  /** Handle 2FA toggle */
  const handleToggle2FA = async () => {
    try {
      await toggle2FAMutation.mutateAsync();
    } catch (err) {
      console.error("[security] 2FA toggle failed:", err);
    }
  };

  /** Handle revoking a single session */
  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSessionMutation.mutateAsync(sessionId);
    } catch (err) {
      console.error("[security] Session revoke failed:", err);
    }
  };

  /** Handle revoking all other sessions */
  const handleRevokeOtherSessions = async () => {
    try {
      await revokeOtherSessionsMutation.mutateAsync();
    } catch (err) {
      console.error("[security] Revoke other sessions failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Card 1: Mot de passe ─── */}
      <SectionCard title="Mot de passe" id="security-password">
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
              <div className="mt-2 space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className={cn("h-full rounded-full transition-all duration-300", strengthColors[strength])} style={{ width: strengthWidths[strength] }} />
                </div>
                <p className={cn("text-xs font-medium", strength === "strong" ? "text-green-600" : strength === "medium" ? "text-amber-600" : "text-red-600")}>
                  {strengthLabels[strength]}
                </p>
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
          <div className="flex flex-wrap items-center justify-between">
            <PillButton
              variant="outline"
              onClick={handleUpdatePassword}
              disabled={updatePasswordMutation.isPending || !currentPwd || !newPwd || !confirmPwd}
            >
              {updatePasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Mettre à jour le mot de passe
            </PillButton>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ※ Au moins 8 caractères, 1 majuscule, 1 chiffre
            </span>
          </div>
        </div>
      </SectionCard>

      {/* ─── Card 2: 2FA ─── */}
      <SectionCard title="Authentification à deux facteurs (2FA)" id="security-2fa">
        <div className="mt-4 space-y-4">
          {/* 2FA state — currently no toggle on backend, only stub */}
          <>
            <div className="flex items-center gap-2">
              <PillBadge variant="red"><ShieldOff className="inline h-3 w-3" /> Désactivé</PillBadge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ajoutez une couche de sécurité supplémentaire à votre compte en activant la vérification par SMS.
            </p>
            <PillButton
              variant="primary"
              onClick={handleToggle2FA}
              disabled={toggle2FAMutation.isPending}
            >
              {toggle2FAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Activer la 2FA
            </PillButton>
          </>
          <div className="rounded-xl bg-white/30 px-4 py-3 backdrop-blur dark:bg-white/5">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Codes de secours</span>
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Ces codes vous permettent de vous connecter si vous perdez votre téléphone.
            </p>
            <button className="mt-2 text-xs font-medium text-sugu-500 hover:text-sugu-600 dark:text-sugu-400">
              Générer des codes de secours →
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ─── Card 3: Sessions actives (from API) ─── */}
      <SectionCard title="Sessions actives" id="security-sessions">
        <div className="mt-4 space-y-2">
          {apiSessions.length > 0 ? (
            apiSessions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/30 px-4 py-3 backdrop-blur dark:bg-white/5">
                <Monitor className="h-5 w-5 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{s.device}</span>
                    {s.current && <PillBadge variant="green"><CircleDot className="inline h-3 w-3 text-green-500" /> Session actuelle</PillBadge>}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin className="inline h-3 w-3" /> {s.location} • <Clock className="inline h-3 w-3" /> {s.time}
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
                    Déconnecter
                  </PillButton>
                )}
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Aucune session active trouvée. Les données de session ne sont pas disponibles via l'API actuelle.
            </p>
          )}
        </div>
        {apiSessions.length > 1 && (
          <PillButton
            variant="danger-outline"
            size="sm"
            className="mt-3"
            onClick={handleRevokeOtherSessions}
            disabled={revokeOtherSessionsMutation.isPending}
          >
            {revokeOtherSessionsMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Déconnecter toutes les autres sessions
          </PillButton>
        )}
      </SectionCard>

      {/* ─── Card 4: Alertes de sécurité ─── */}
      <SectionCard title="Alertes de sécurité" id="security-alerts">
        <div className="mt-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/30 px-4 py-3 backdrop-blur dark:bg-white/5">
            <Toggle checked={suspiciousAlert} onChange={() => setSuspiciousAlert(!suspiciousAlert)} label="Alertes connexions suspectes" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Alertes lors de connexions suspectes</span>
          </div>
        </div>
      </SectionCard>

      {/* ─── Card 5: Historique de connexion ─── */}
      <SectionCard title="Historique de connexion" id="security-history">
        <div className="mt-4 py-6 text-center">
          <Clock className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            L&apos;historique de connexion n&apos;est pas encore disponible.
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Cette fonctionnalité sera bientôt ajoutée.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
