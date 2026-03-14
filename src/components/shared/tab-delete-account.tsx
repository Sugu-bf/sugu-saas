"use client";

import { useState } from "react";
import { SectionCard, PillInput, PillButton, Field } from "@/components/shared/settings-ui";
import { AlertTriangle, Loader2, Lock } from "lucide-react";

// ────────────────────────────────────────────────────────────
// Shared Delete Account Tab — parameterized by config
// ────────────────────────────────────────────────────────────

export interface DeleteAccountConfig {
  /** Role-specific confirmation texts */
  confirmations: string[];
  /** Role-specific description explaining what will be deleted */
  description: React.ReactNode;
  /** Hook function that returns a mutation — called once at render */
  useDeleteMutation: () => {
    mutateAsync: (args: { password: string; confirmText: string }) => Promise<unknown>;
    isPending: boolean;
  };
  /** Optional callback on success (e.g. toast or redirect) */
  onSuccess?: () => void;
  /** Whether to add animate-card-enter class */
  animate?: boolean;
  /** Whether the backend requires a password for deletion (default: true) */
  requirePassword?: boolean;
}

export function TabDeleteAccount({ config }: { config: DeleteAccountConfig }) {
  const [checks, setChecks] = useState(() => config.confirmations.map(() => false));
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const requirePassword = config.requirePassword !== false;

  const deleteAccountMutation = config.useDeleteMutation();

  const toggleCheck = (idx: number) =>
    setChecks((c) => c.map((v, i) => (i === idx ? !v : v)));

  const allChecked = checks.every(Boolean);
  const textMatches = confirmText.trim().toUpperCase() === "SUPPRIMER";
  const passwordOk = !requirePassword || password.length > 0;
  const canDelete = allChecked && textMatches && passwordOk;

  const isDeleting = deleteAccountMutation.isPending;

  const resetForm = () => {
    setChecks(config.confirmations.map(() => false));
    setConfirmText("");
    setPassword("");
    setError(null);
  };

  const handleDeleteAccount = async () => {
    setError(null);
    try {
      await deleteAccountMutation.mutateAsync({
        password: password,
        confirmText: confirmText.trim(),
      });
      config.onSuccess?.();
    } catch (err) {
      setError("Échec de la suppression du compte. Veuillez réessayer.");
      console.error("[delete-account] Delete failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Supprimer mon compte"
        id="delete-account"
        variant="danger"
        className={config.animate ? "animate-card-enter" : undefined}
      >
        <div className="mt-4 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-red-600 dark:text-red-400">
            Supprimer mon compte
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600 dark:text-gray-400">
            Cette action est <span className="font-semibold text-red-600 dark:text-red-400">irréversible</span>.{" "}
            {config.description}
          </p>
        </div>

        {/* Checklist */}
        <div className="mx-auto mt-6 max-w-lg space-y-3">
          {config.confirmations.map((text, idx) => (
            <label
              key={idx}
              className="flex cursor-pointer items-start gap-3 rounded-xl bg-red-50/50 px-4 py-3 transition-colors hover:bg-red-50 dark:bg-red-950/10 dark:hover:bg-red-950/20"
            >
              <input
                type="checkbox"
                checked={checks[idx]}
                onChange={() => toggleCheck(idx)}
                className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
            </label>
          ))}
        </div>

        {/* Password field — security: require password re-entry for destructive actions */}
        {requirePassword && (
          <div className="mx-auto mt-6 max-w-lg">
            <Field label="Mot de passe actuel" required>
              <PillInput
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Entrez votre mot de passe"
                prefix={<Lock className="h-3.5 w-3.5 text-red-400" />}
                className="!border-red-200 focus:!border-red-400 focus:!ring-red-500/20 dark:!border-red-900"
              />
            </Field>
          </div>
        )}

        {/* Confirmation input */}
        <div className="mx-auto mt-4 max-w-lg">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Tapez <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs font-bold text-red-600 dark:bg-red-950/50 dark:text-red-400">SUPPRIMER</span> pour confirmer
          </p>
          <PillInput
            value={confirmText}
            onChange={setConfirmText}
            placeholder="SUPPRIMER"
            className="!border-red-200 focus:!border-red-400 focus:!ring-red-500/20 dark:!border-red-900"
          />
        </div>

        {error && (
          <p className="mx-auto mt-4 max-w-lg text-center text-xs text-red-500">{error}</p>
        )}

        {/* Actions */}
        <div className="mx-auto mt-6 flex max-w-lg flex-col items-center gap-3">
          <PillButton
            variant="danger"
            disabled={!canDelete || isDeleting}
            className="w-full"
            onClick={handleDeleteAccount}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Supprimer définitivement mon compte
          </PillButton>
          <button
            className="text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            onClick={resetForm}
          >
            Annuler
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
