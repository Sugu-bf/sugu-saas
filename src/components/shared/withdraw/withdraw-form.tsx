"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  ArrowLeft,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";

import type {
  WithdrawConfig,
  WithdrawFormData,
  SharedPayoutSetting,
} from "./types";
import { WITHDRAW_STEPS, DEFAULT_WITHDRAW_DATA } from "./types";
import { StepIndicator } from "./step-indicator";
import { StepMontant } from "./step-montant";
import { StepMethode } from "./step-methode";
import { StepConfirmation } from "./step-confirmation";

// ── Mutation interface (compatible with TanStack useMutation) ──

interface SubmitMutation {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutate: (
    payload: any,
    options: {
      onSuccess: () => void;
      onError: (err: unknown) => void;
    },
  ) => void;
  isPending: boolean;
}

// ── Props ───────────────────────────────────────────────────

interface WithdrawFormProps {
  config: WithdrawConfig;
  balance: number;
  payoutSettings: SharedPayoutSetting[];
  submitMutation: SubmitMutation;
}

export function WithdrawForm({
  config,
  balance,
  payoutSettings,
  submitMutation,
}: WithdrawFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] =
    useState<WithdrawFormData>(DEFAULT_WITHDRAW_DATA);
  const isSubmittingRef = useRef(false); // Guard against double-submit

  // Selected payout method
  const selectedMethod = payoutSettings.find(
    (ps) => ps.id === formData.selectedPayoutSettingId,
  );

  // ── Generic field updater ──
  const handleChange = useCallback(
    (field: keyof WithdrawFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // ── Navigation ──
  const goNext = useCallback(() => {
    // Step 1: validate amount
    if (currentStep === 1) {
      const amount = parseInt(formData.amount, 10);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Montant invalide");
        return;
      }
      if (amount < config.minWithdrawalAmount) {
        toast.error(
          `Le montant minimum est de ${config.minWithdrawalAmount.toLocaleString()} FCFA`,
        );
        return;
      }
      if (amount > balance) {
        toast.error("Le montant dépasse votre solde disponible");
        return;
      }
    }

    // Step 2: validate method selection
    if (currentStep === 2) {
      if (!formData.selectedPayoutSettingId) {
        toast.error(
          "Veuillez sélectionner une méthode de versement",
        );
        return;
      }
      // SEC-05: Verify the ID exists in the user's own payout settings
      const isOwnMethod = payoutSettings.some(
        (ps) => ps.id === formData.selectedPayoutSettingId,
      );
      if (!isOwnMethod) {
        toast.error("Méthode de versement invalide");
        return;
      }
    }

    setCurrentStep((s) => Math.min(s + 1, WITHDRAW_STEPS.length));
  }, [currentStep, formData, balance, config.minWithdrawalAmount]);

  const goPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      if (step < currentStep) {
        setCurrentStep(step);
      }
    },
    [currentStep],
  );

  // ── Submit handler ──
  const handleSubmit = useCallback(() => {
    // SEC-02: Guard against double-submit race condition
    if (isSubmittingRef.current) return;

    // PIN validation (driver only)
    if (
      config.requiresPin &&
      (formData.pin ?? "").length < 4
    ) {
      toast.error(
        "Veuillez entrer votre code PIN à 4 chiffres",
      );
      return;
    }

    // SEC-04: Final amount re-validation before submit
    const finalAmount = parseInt(formData.amount, 10);
    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      toast.error("Montant invalide");
      return;
    }

    isSubmittingRef.current = true;
    const payload = config.submitPayload(formData);

    submitMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(
          "Demande de retrait envoyée avec succès !",
        );
        setFormData(DEFAULT_WITHDRAW_DATA); // Clear sensitive data
        router.push(config.backHref);
      },
      onError: (err) => {
        isSubmittingRef.current = false; // Reset on error to allow retry
        toast.error(
          err instanceof Error
            ? err.message
            : "Erreur lors de la demande de retrait.",
        );
      },
    });
  }, [formData, submitMutation, router, config]);

  const isSubmitting = submitMutation.isPending;

  return (
    <div className={`mx-auto ${config.maxWidth} space-y-5`}>
      {/* ════════════ Back Link ════════════ */}
      <Link
        href={config.backHref}
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-sugu-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {config.backLabel}
      </Link>

      {/* ════════════ Page Title ════════════ */}
      {config.titleStyle === "driver" ? (
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sugu-500 text-white">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 lg:text-2xl">
              Demander un retrait
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 lg:text-sm">
              {config.pageSubtitle}
            </p>
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-lg font-bold text-gray-900 lg:text-2xl">
            <span className="inline-block" aria-hidden="true">
              <Banknote className="h-5 w-5" />
            </span>{" "}
            Demander un retrait
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 lg:text-sm">
            {config.pageSubtitle}
          </p>
        </div>
      )}

      {/* ════════════ Stepper ════════════ */}
      <StepIndicator
        currentStep={currentStep}
        onStepClick={goToStep}
        variant={config.stepIndicatorVariant}
      />

      {/* ════════════ Step Content ════════════ */}
      <div className="min-h-[380px]">
        {currentStep === 1 && (
          <StepMontant
            data={formData}
            onChange={handleChange}
            availableBalance={balance}
            config={config}
          />
        )}
        {currentStep === 2 && (
          <StepMethode
            data={formData}
            onChange={handleChange}
            payoutSettings={payoutSettings}
            config={config}
          />
        )}
        {currentStep === 3 && (
          <StepConfirmation
            data={formData}
            onChange={handleChange}
            selectedMethod={selectedMethod}
            availableBalance={balance}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            config={config}
          />
        )}
      </div>

      {/* ════════════ Navigation Buttons ════════════ */}
      {config.showSubmitInNav ? (
        // Vendor: always show nav, submit button on last step
        <div className="flex items-center justify-between pt-2 pb-4">
          {/* Left button */}
          {currentStep === 1 ? (
            <Link
              href={config.backHref}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/60 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400 dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              {config.cancelLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={goPrev}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/60 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400 dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </button>
          )}

          {/* Right button */}
          {currentStep < WITHDRAW_STEPS.length ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-sugu-600"
            >
              Continuer
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-sugu-600 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isSubmitting
                ? "Traitement..."
                : "Confirmer le retrait"}
            </button>
          )}
        </div>
      ) : (
        // Driver: hide nav on step 3 (CTA is inside step-confirmation)
        currentStep < WITHDRAW_STEPS.length && (
          <div className="flex items-center justify-between pt-2 pb-4">
            {/* Left button */}
            {currentStep === 1 ? (
              <Link
                href={config.backHref}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/60 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900"
              >
                <ChevronLeft className="h-4 w-4" />
                {config.cancelLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={goPrev}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/60 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </button>
            )}

            {/* Right button */}
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-sugu-600"
            >
              Continuer
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )
      )}
    </div>
  );
}
