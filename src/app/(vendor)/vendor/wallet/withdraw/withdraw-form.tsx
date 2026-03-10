"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Check, Loader2, ArrowLeft, Banknote } from "lucide-react";
import { toast } from "sonner";

import { useVendorWallet, usePayoutSettings, useSubmitWithdrawal } from "@/features/vendor/hooks";
import {
  WITHDRAW_STEPS,
  DEFAULT_WITHDRAW_DATA,
  MIN_WITHDRAWAL_AMOUNT,
} from "./_components/types";
import type { WithdrawFormData } from "./_components/types";
import { StepIndicator } from "./_components/step-indicator";
import { StepMontant } from "./_components/step-montant";
import { StepMethode } from "./_components/step-methode";
import { StepConfirmation } from "./_components/step-confirmation";

export function WithdrawForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WithdrawFormData>(DEFAULT_WITHDRAW_DATA);

  // ── Data hooks ──
  const { data: walletData } = useVendorWallet();
  const { data: payoutSettings = [] } = usePayoutSettings();
  const submitWithdrawal = useSubmitWithdrawal();

  // Parse available balance from KPI data
  const availableBalance = (() => {
    const balanceKpi = walletData?.kpis.find((k) => k.id === "available-balance");
    if (!balanceKpi) return 0;
    return parseInt(balanceKpi.value.replace(/[^\d]/g, ""), 10) || 0;
  })();

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
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount < MIN_WITHDRAWAL_AMOUNT) {
        toast.error(
          `Le montant minimum est de ${MIN_WITHDRAWAL_AMOUNT.toLocaleString()} FCFA`,
        );
        return;
      }
      if (amount > availableBalance) {
        toast.error("Le montant dépasse votre solde disponible");
        return;
      }
    }

    // Step 2: validate method selection
    if (currentStep === 2) {
      if (!formData.selectedPayoutSettingId) {
        toast.error("Veuillez sélectionner une méthode de versement");
        return;
      }
    }

    setCurrentStep((s) => Math.min(s + 1, WITHDRAW_STEPS.length));
  }, [currentStep, formData, availableBalance]);

  const goPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      // Only allow going back or to completed steps
      if (step < currentStep) {
        setCurrentStep(step);
      }
    },
    [currentStep],
  );

  // ── Submit handler ──
  const handleSubmit = useCallback(() => {
    const amount = parseFloat(formData.amount);

    submitWithdrawal.mutate(
      {
        amount,
        payoutSettingId: formData.selectedPayoutSettingId,
      },
      {
        onSuccess: () => {
          toast.success("Demande de retrait envoyée avec succès !");
          router.push("/vendor/wallet");
        },
        onError: (err) => {
          toast.error(
            err instanceof Error
              ? err.message
              : "Erreur lors de la demande de retrait.",
          );
        },
      },
    );
  }, [formData, submitWithdrawal, router]);

  const isSubmitting = submitWithdrawal.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* ════════════ Back Link ════════════ */}
      <Link
        href="/vendor/wallet"
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-sugu-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour au portefeuille
      </Link>

      {/* ════════════ Page Title ════════════ */}
      <div>
        <h1 className="text-lg font-bold text-gray-900 lg:text-2xl">
          <span className="inline-block" aria-hidden="true">
            <Banknote className="h-5 w-5" />
          </span>{" "}
          Demander un retrait
        </h1>
        <p className="mt-0.5 text-xs text-gray-500 lg:text-sm">
          Transférez vos fonds vers votre compte mobile ou bancaire
        </p>
      </div>

      {/* ════════════ Stepper ════════════ */}
      <StepIndicator currentStep={currentStep} onStepClick={goToStep} />

      {/* ════════════ Step Content ════════════ */}
      <div className="min-h-[380px]">
        {currentStep === 1 && (
          <StepMontant
            data={formData}
            onChange={handleChange}
            availableBalance={availableBalance}
          />
        )}
        {currentStep === 2 && (
          <StepMethode
            data={formData}
            onChange={handleChange}
            payoutSettings={payoutSettings}
          />
        )}
        {currentStep === 3 && (
          <StepConfirmation
            data={formData}
            selectedMethod={selectedMethod}
            availableBalance={availableBalance}
            isSubmitting={isSubmitting}
          />
        )}
      </div>

      {/* ════════════ Navigation Buttons ════════════ */}
      <div className="flex items-center justify-between pt-2 pb-4">
        {/* Left button */}
        {currentStep === 1 ? (
          <Link
            href="/vendor/wallet"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/60 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
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
            className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sugu-600 hover:-translate-y-0.5"
          >
            Continuer
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sugu-600 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isSubmitting ? "Traitement..." : "Confirmer le retrait"}
          </button>
        )}
      </div>
    </div>
  );
}
