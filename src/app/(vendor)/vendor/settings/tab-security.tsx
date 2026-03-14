"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SectionCard, Toggle, PillInput, PillBadge, PillButton } from "@/components/shared/settings-ui";
import { PasswordSection } from "@/components/shared/settings-security/password-section";
import { SessionsList, type UnifiedSession } from "@/components/shared/settings-security/sessions-list";
import {
  Shield, Key, Loader2, MapPin, Clock,
  CheckCircle2, ShieldOff, ShieldCheck, QrCode,
  Copy, Check, AlertTriangle, Globe,
} from "lucide-react";
import {
  useUpdatePassword,
  useEnable2FA,
  useDisable2FA,
  use2FAQrCode,
  useConfirm2FA,
  use2FARecoveryCodes,
  useRegenerate2FARecoveryCodes,
  useActiveSessions,
  useRevokeSession,
  useRevokeOtherSessions,
  useUpdateSecurityAlerts,
  useLoginHistory,
  useVendorSettings,
} from "@/features/vendor/hooks";

// ────────────────────────────────────────────────────────────
// Onglet 5 — Sécurité (Production-grade, Vendor)
// ────────────────────────────────────────────────────────────

export function TabSecurity() {
  // Fetch security state from API via React Query
  const { data: settingsData } = useVendorSettings();

  // 2FA state
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [twoFASuccess, setTwoFASuccess] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  // Mutation hooks
  const updatePasswordMutation = useUpdatePassword();
  const enable2FAMutation = useEnable2FA();
  const disable2FAMutation = useDisable2FA();
  const confirm2FAMutation = useConfirm2FA();
  const regenerateCodesMutation = useRegenerate2FARecoveryCodes();
  const revokeSessionMutation = useRevokeSession();
  const revokeOtherSessionsMutation = useRevokeOtherSessions();
  const updateSecurityAlertsMutation = useUpdateSecurityAlerts();

  // Query hooks
  const is2FAEnabled = settingsData?.security?.isTwoFactorEnabled ?? false;
  const { data: qrCodeData, isLoading: qrLoading } = use2FAQrCode(show2FASetup && !is2FAEnabled);
  const { data: recoveryCodes, isLoading: codesLoading } = use2FARecoveryCodes(showRecoveryCodes && is2FAEnabled);
  const { data: activeSessions, isLoading: sessionsLoading } = useActiveSessions();
  const { data: loginHistory, isLoading: historyLoading } = useLoginHistory();

  // Security alerts
  const suspiciousAlert = settingsData?.security?.suspiciousLoginAlert ?? true;

  /** Handle password update */
  const handleUpdatePassword = async (currentPassword: string, newPassword: string, newPasswordConfirmation: string) => {
    if (newPassword.length < 8) {
      throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    }
    await updatePasswordMutation.mutateAsync({
      currentPassword,
      newPassword,
      newPasswordConfirmation,
    });
  };

  /** Handle enabling 2FA */
  const handleEnable2FA = async () => {
    setTwoFAError(null);
    try {
      await enable2FAMutation.mutateAsync();
      setShow2FASetup(true);
    } catch (err) {
      setTwoFAError("Impossible d'activer la 2FA. Veuillez réessayer.");
      console.error("[security] Enable 2FA failed:", err);
    }
  };

  /** Handle confirming 2FA with code */
  const handleConfirm2FA = async () => {
    setTwoFAError(null);
    if (!twoFACode || twoFACode.length < 6) {
      setTwoFAError("Veuillez entrer un code à 6 chiffres.");
      return;
    }
    try {
      await confirm2FAMutation.mutateAsync({ code: twoFACode });
      setTwoFASuccess(true);
      setShow2FASetup(false);
      setTwoFACode("");
      setShowRecoveryCodes(true);
      setTimeout(() => setTwoFASuccess(false), 5000);
    } catch (err) {
      setTwoFAError("Code invalide. Veuillez réessayer.");
      console.error("[security] Confirm 2FA failed:", err);
    }
  };

  /** Handle disabling 2FA — requires password confirmation */
  const handleDisable2FA = async () => {
    if (!showDisableConfirm) {
      setShowDisableConfirm(true);
      setDisableError(null);
      return;
    }
    if (!disablePassword) {
      setDisableError("Veuillez entrer votre mot de passe.");
      return;
    }
    setDisableError(null);
    try {
      await disable2FAMutation.mutateAsync(disablePassword);
      setShowRecoveryCodes(false);
      setShow2FASetup(false);
      setShowDisableConfirm(false);
      setDisablePassword("");
    } catch (err) {
      setDisableError("Mot de passe incorrect.");
      console.error("[security] Disable 2FA failed:", err);
    }
  };

  /** Copy recovery codes to clipboard */
  const handleCopyRecoveryCodes = async () => {
    if (!recoveryCodes?.length) return;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    } catch (err) {
      console.error("[security] Clipboard copy failed:", err);
    }
  };

  /** Handle regenerating recovery codes */
  const handleRegenerateCodes = async () => {
    try {
      await regenerateCodesMutation.mutateAsync();
    } catch (err) {
      console.error("[security] Regenerate codes failed:", err);
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

  /** Handle toggling suspicious login alerts */
  const handleToggleSuspiciousAlert = async () => {
    try {
      await updateSecurityAlertsMutation.mutateAsync({
        suspiciousLoginAlert: !suspiciousAlert,
      });
    } catch (err) {
      console.error("[security] Toggle alerts failed:", err);
    }
  };

  // Map vendor sessions to unified format
  const unifiedSessions: UnifiedSession[] = (activeSessions ?? []).map((s) => ({
    id: s.id,
    device: s.device,
    browser: s.browser,
    ip: s.ip,
    location: s.location,
    time: s.time,
    current: s.current,
  }));

  return (
    <div className="space-y-6">
      {/* ─── Card 1: Mot de passe (shared) ─── */}
      <PasswordSection
        onSubmit={handleUpdatePassword}
        isPending={updatePasswordMutation.isPending}
        buttonVariant="outline"
        extraContent={
          <span className="text-xs text-gray-400 dark:text-gray-500">
            ※ Au moins 8 caractères, 1 majuscule, 1 chiffre
          </span>
        }
      />

      {/* ─── Card 2: 2FA (Fortify-based) — vendor-specific ─── */}
      <SectionCard title="Authentification à deux facteurs (2FA)" id="security-2fa">
        <div className="mt-4 space-y-4">
          {/* 2FA Status Badge */}
          <div className="flex items-center gap-2">
            {is2FAEnabled ? (
              <PillBadge variant="green"><ShieldCheck className="inline h-3 w-3" /> Activé</PillBadge>
            ) : (
              <PillBadge variant="red"><ShieldOff className="inline h-3 w-3" /> Désactivé</PillBadge>
            )}
          </div>

          {!is2FAEnabled && !show2FASetup && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Protégez votre compte avec une vérification SMS. Chaque connexion nécessitera un code envoyé sur votre téléphone.
              </p>
              <PillButton
                variant="primary"
                onClick={handleEnable2FA}
                disabled={enable2FAMutation.isPending}
              >
                {enable2FAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Activer la 2FA
              </PillButton>
            </>
          )}

          {/* 2FA Setup Flow - QR Code Step */}
          {show2FASetup && !is2FAEnabled && (
            <div className="space-y-4 rounded-xl border border-sugu-200 bg-sugu-50/30 p-4 dark:border-sugu-800 dark:bg-sugu-950/10">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-sugu-500" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Configuration de la 2FA</h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                1. Ouvrez votre application d&apos;authentification (Google Authenticator, Authy, etc.)
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                2. Scannez le QR code ci-dessous ou entrez la clé manuellement
              </p>

              {/* QR Code */}
              <div className="flex justify-center rounded-xl bg-white p-6 dark:bg-gray-800">
                {qrLoading ? (
                  <div className="flex h-48 w-48 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-sugu-500" />
                  </div>
                ) : qrCodeData?.svg ? (
                  <div
                    className="[&_svg]:h-48 [&_svg]:w-48"
                    dangerouslySetInnerHTML={{ __html: _sanitizeSvg(qrCodeData.svg) }}
                  />
                ) : (
                  <div className="flex h-48 w-48 items-center justify-center text-sm text-gray-400">
                    Impossible de charger le QR code
                  </div>
                )}
              </div>

              {/* Confirmation code input */}
              <p className="text-xs text-gray-600 dark:text-gray-400">
                3. Entrez le code à 6 chiffres affiché dans l&apos;application
              </p>
              <div className="flex items-center gap-3">
                <PillInput
                  value={twoFACode}
                  onChange={setTwoFACode}
                  placeholder="000000"
                  className="max-w-[180px] text-center font-mono text-lg tracking-widest"
                />
                <PillButton
                  variant="primary"
                  onClick={handleConfirm2FA}
                  disabled={confirm2FAMutation.isPending || twoFACode.length < 6}
                >
                  {confirm2FAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirmer
                </PillButton>
              </div>
              {twoFAError && (
                <p className="text-xs text-red-500">{twoFAError}</p>
              )}
              <button
                onClick={() => { setShow2FASetup(false); setTwoFACode(""); setTwoFAError(null); }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500"
              >
                Annuler
              </button>
            </div>
          )}

          {/* 2FA Enabled - Show disable + recovery */}
          {is2FAEnabled && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                L&apos;authentification à deux facteurs est activée. Votre compte est protégé.
              </p>
              {showDisableConfirm && (
                <div className="space-y-2 rounded-xl bg-red-50/50 p-3 dark:bg-red-950/20">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Entrez votre mot de passe pour confirmer la désactivation :
                  </p>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Mot de passe actuel"
                    className="w-full max-w-xs rounded-xl border border-gray-200 bg-white/60 px-3 py-2 text-sm backdrop-blur dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200"
                  />
                  {disableError && <p className="text-xs text-red-500">{disableError}</p>}
                </div>
              )}
              <div className="flex items-center gap-2">
                <PillButton
                  variant="danger-outline"
                  onClick={handleDisable2FA}
                  disabled={disable2FAMutation.isPending}
                >
                  {disable2FAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                  {showDisableConfirm ? "Confirmer la désactivation" : "Désactiver la 2FA"}
                </PillButton>
                {showDisableConfirm && (
                  <PillButton
                    variant="outline"
                    onClick={() => { setShowDisableConfirm(false); setDisablePassword(""); setDisableError(null); }}
                  >
                    Annuler
                  </PillButton>
                )}
              </div>
            </>
          )}

          {twoFASuccess && (
            <p className="text-xs text-green-600"><CheckCircle2 className="inline h-3 w-3" /> 2FA activée avec succès !</p>
          )}

          {/* Recovery Codes */}
          <div className="rounded-xl bg-white/30 px-4 py-3 backdrop-blur dark:bg-white/5">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Codes de secours</span>
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Ces codes vous permettent de vous connecter si vous perdez votre téléphone.
            </p>

            {is2FAEnabled && (
              <>
                <button
                  className="mt-2 text-xs font-medium text-sugu-500 hover:text-sugu-600 dark:text-sugu-400"
                  onClick={() => setShowRecoveryCodes(!showRecoveryCodes)}
                >
                  {showRecoveryCodes ? "Masquer les codes →" : "Afficher les codes de secours →"}
                </button>

                {showRecoveryCodes && (
                  <div className="mt-3 space-y-3">
                    {codesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-sugu-500" />
                      </div>
                    ) : recoveryCodes && recoveryCodes.length > 0 ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3 font-mono text-xs dark:bg-gray-800">
                          {recoveryCodes.map((code, idx) => (
                            <span key={idx} className="text-gray-700 dark:text-gray-300">{code}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <PillButton variant="outline" size="sm" onClick={handleCopyRecoveryCodes}>
                            {copiedCodes ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            {copiedCodes ? "Copié !" : "Copier les codes"}
                          </PillButton>
                          <PillButton
                            variant="outline"
                            size="sm"
                            onClick={handleRegenerateCodes}
                            disabled={regenerateCodesMutation.isPending}
                          >
                            {regenerateCodesMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            Régénérer
                          </PillButton>
                        </div>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="inline h-3 w-3" /> Sauvegardez ces codes dans un endroit sûr. Ils ne seront plus affichés.
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">
                        Aucun code de secours disponible.
                        <button
                          className="ml-1 text-sugu-500 hover:text-sugu-600"
                          onClick={handleRegenerateCodes}
                        >
                          Générer des codes
                        </button>
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {!is2FAEnabled && (
              <p className="mt-2 text-[10px] text-gray-400">
                Activez d&apos;abord la 2FA pour accéder aux codes de secours.
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ─── Card 3: Sessions actives (shared) ─── */}
      <SessionsList
        sessions={unifiedSessions}
        onRevoke={handleRevokeSession}
        onRevokeAll={handleRevokeOtherSessions}
        isRevoking={revokeSessionMutation.isPending}
        isRevokingAll={revokeOtherSessionsMutation.isPending}
        isLoading={sessionsLoading}
        revokeLabel="Déconnecter"
        revokeAllLabel="Déconnecter toutes les autres sessions"
      />

      {/* ─── Card 4: Alertes de sécurité (vendor-specific) ─── */}
      <SectionCard title="Alertes de sécurité" id="security-alerts">
        <div className="mt-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/30 px-4 py-3 backdrop-blur dark:bg-white/5">
            <Toggle
              checked={suspiciousAlert}
              onChange={handleToggleSuspiciousAlert}
              label="Alertes connexions suspectes"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Alertes lors de connexions suspectes</span>
            {updateSecurityAlertsMutation.isPending && <Loader2 className="h-3 w-3 animate-spin text-sugu-500" />}
          </div>
          <p className="mt-2 px-4 text-[10px] text-gray-400 dark:text-gray-500">
            Recevez un email si une connexion est détectée depuis un appareil ou une localisation inhabituelle.
          </p>
        </div>
      </SectionCard>

      {/* ─── Card 5: Historique de connexion (vendor-specific) ─── */}
      <SectionCard title="Historique de connexion" id="security-history">
        <div className="mt-4">
          {historyLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Chargement de l&apos;historique...</span>
            </div>
          ) : loginHistory && loginHistory.length > 0 ? (
            <div className="space-y-2">
              {loginHistory.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-white/30 px-4 py-2.5 backdrop-blur dark:bg-white/5">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    entry.success ? "bg-green-50 text-green-500 dark:bg-green-950/30" : "bg-red-50 text-red-500 dark:bg-red-950/30"
                  )}>
                    {entry.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                        {entry.device || entry.browser || "Appareil inconnu"}
                      </span>
                      <PillBadge variant={entry.success ? "green" : "red"}>
                        {entry.success ? "Succès" : "Échoué"}
                      </PillBadge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                      {entry.ip && <><Globe className="inline h-3 w-3" /> {entry.ip} • </>}
                      <MapPin className="inline h-3 w-3" /> {entry.location}
                      {entry.time && <> • <Clock className="inline h-3 w-3" /> {_formatTimeAgo(entry.time)}</>}
                    </p>
                  </div>
                </div>
              ))}
              {loginHistory.length > 10 && (
                <p className="pt-2 text-center text-xs text-gray-400">
                  {loginHistory.length - 10} connexions supplémentaires non affichées
                </p>
              )}
            </div>
          ) : (
            <div className="py-6 text-center">
              <Clock className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Aucun historique de connexion disponible pour le moment.
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                L&apos;historique s&apos;affichera après vos prochaines connexions.
              </p>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

/** Sanitize SVG string to prevent XSS — strips scripts, event handlers, and data URIs */
function _sanitizeSvg(svg: string): string {
  return svg
    // Remove script tags and their content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // Remove on* event handlers (onclick, onload, onerror, etc.)
    .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "")
    // Remove javascript: protocol URLs
    .replace(/javascript\s*:/gi, "blocked:")
    // Remove data: URIs except safe image types
    .replace(/data\s*:\s*(?!image\/(png|jpeg|gif|svg\+xml))/gi, "blocked:");
}

/** Format ISO time string to relative time */
function _formatTimeAgo(time: string): string {
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

