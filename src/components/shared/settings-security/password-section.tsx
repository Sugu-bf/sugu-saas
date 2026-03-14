"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SectionCard, PillInput, PillButton, Field } from "@/components/shared/settings-ui";
import { Eye, EyeOff, Lock, Loader2, CheckCircle2 } from "lucide-react";

// ────────────────────────────────────────────────────────────
// Shared Password Section for Settings Security Tab
// ────────────────────────────────────────────────────────────

type PasswordStrength = "weak" | "medium" | "strong";

export interface PasswordSectionProps {
  /** Callback to handle password update — parent injects the mutation */
  onSubmit: (currentPassword: string, newPassword: string, newPasswordConfirmation: string) => Promise<void>;
  /** Whether the mutation is in flight */
  isPending: boolean;
  /** Button variant (driver uses "primary", vendor uses "outline") */
  buttonVariant?: "primary" | "outline";
  /** Extra content after the submit button (e.g. requirements checklist or hint text) */
  extraContent?: React.ReactNode;
  /** Optional className for animation */
  className?: string;
  /** Optional style for animation delay */
  style?: React.CSSProperties;
  /** Whether to show the requirements checklist (driver: true, vendor: false) */
  showRequirements?: boolean;
}

const STRENGTH_COLORS = { weak: "bg-red-500", medium: "bg-amber-500", strong: "bg-green-500" };
const STRENGTH_LABELS = { weak: "Faible", medium: "Moyen", strong: "Fort" };
const STRENGTH_WIDTHS = { weak: "33%", medium: "66%", strong: "100%" };

function getStrength(pwd: string): PasswordStrength {
  if (pwd.length < 6) return "weak";
  if (pwd.length < 10 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return "medium";
  return "strong";
}

export function PasswordSection({
  onSubmit,
  isPending,
  buttonVariant = "primary",
  extraContent,
  className,
  style,
  showRequirements = false,
}: PasswordSectionProps) {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const strength = getStrength(newPwd);

  const requirements = [
    { label: "8 caractères minimum", met: newPwd.length >= 8 },
    { label: "Une majuscule", met: /[A-Z]/.test(newPwd) },
    { label: "Un chiffre", met: /[0-9]/.test(newPwd) },
    { label: "Un caractère spécial", met: /[^A-Za-z0-9]/.test(newPwd) },
  ];

  const handleUpdatePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPwd !== confirmPwd) {
      setPasswordError("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      await onSubmit(currentPwd, newPwd, confirmPwd);
      setPasswordSuccess(true);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch {
      setPasswordError("Le mot de passe actuel est incorrect ou la requête a échoué.");
    }
  };

  return (
    <SectionCard title="Mot de passe" id="security-password" className={className} style={style}>
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
                <div className={cn("h-full rounded-full transition-all duration-300", STRENGTH_COLORS[strength])} style={{ width: STRENGTH_WIDTHS[strength] }} />
              </div>
              <p className={cn("text-xs font-medium", strength === "strong" ? "text-green-600" : strength === "medium" ? "text-amber-600" : "text-red-600")}>
                {STRENGTH_LABELS[strength]}
              </p>
              {/* Requirements checklist (driver only) */}
              {showRequirements && (
                <div className="grid grid-cols-2 gap-1.5">
                  {requirements.map((req) => (
                    <div key={req.label} className="flex items-center gap-1.5 text-[11px]">
                      <CheckCircle2 className={cn("h-3 w-3", req.met ? "text-green-500" : "text-gray-300 dark:text-gray-600")} />
                      <span className={cn(req.met ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500")}>{req.label}</span>
                    </div>
                  ))}
                </div>
              )}
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
            variant={buttonVariant}
            onClick={handleUpdatePassword}
            disabled={isPending || !currentPwd || !newPwd || !confirmPwd}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Mettre à jour le mot de passe
          </PillButton>
          {extraContent}
        </div>
      </div>
    </SectionCard>
  );
}
