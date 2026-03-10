"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// Types
import {
  type DeliveryFormData,
  type FormUpdater,
  STEPS,
  DEFAULT_FORM_DATA,
} from "./_components/types";

// Steps
import { StepIndicator } from "./_components/step-indicator";
import { StepCommande } from "./_components/step-commande";
import { StepAdresses } from "./_components/step-adresses";
import { StepLivreur } from "./_components/step-livreur";
import { StepRecapitulatif } from "./_components/step-recapitulatif";

// Hooks
import { useCreateDelivery, useAvailableCouriers } from "@/features/agency/hooks";
import { ApiError } from "@/lib/http/api-error";

export function CreateDeliveryForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DeliveryFormData>(DEFAULT_FORM_DATA);

  // ── Hooks ──
  const createDelivery = useCreateDelivery();
  const {
    data: availableDrivers = [],
    isLoading: isLoadingDrivers,
    error: driversQueryError,
    refetch: refetchDrivers,
  } = useAvailableCouriers();

  const driversError = driversQueryError
    ? "Impossible de charger les livreurs. Vérifiez votre connexion."
    : null;

  // Generic field updater
  const handleChange: FormUpdater = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Navigation
  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  // ── Step validation ──
  const validateCurrentStep = useCallback((): string | null => {
    if (currentStep === 1) {
      if (!formData.vendorName.trim()) return "Le nom du vendeur est obligatoire.";
      if (!formData.itemCount.trim() || parseInt(formData.itemCount) <= 0)
        return "Le nombre d'articles est obligatoire.";
      if (!formData.orderAmount.trim() || parseFloat(formData.orderAmount) <= 0)
        return "Le montant de la commande est obligatoire.";
    }
    if (currentStep === 2) {
      if (!formData.pickupAddress.trim()) return "L'adresse de ramassage est obligatoire.";
      if (!formData.deliveryAddress.trim()) return "L'adresse de livraison est obligatoire.";
      if (!formData.clientName.trim()) return "Le nom du client est obligatoire.";
      if (!formData.clientPhone.trim()) return "Le téléphone du client est obligatoire.";
    }
    return null;
  }, [currentStep, formData]);

  // Validated navigation
  const handleNext = useCallback(() => {
    const error = validateCurrentStep();
    if (error) {
      toast.error(error);
      return;
    }
    goNext();
  }, [validateCurrentStep, goNext]);

  // ── Map priority to backend int ──
  const priorityToInt = (p: "urgent" | "normal" | "low"): number => {
    if (p === "urgent") return 10;
    if (p === "normal") return 50;
    return 100;
  };

  // ── Submit handler ──
  const handleSubmit = useCallback(() => {
    createDelivery.mutate(
      {
        order_id: formData.orderId || undefined,
        vendor_name: formData.vendorName,
        items_count: parseInt(formData.itemCount) || 0,
        order_total: parseFloat(formData.orderAmount) || 0,
        payment_status: formData.paymentStatus,
        order_notes: formData.orderNotes || undefined,
        pickup_address: formData.pickupAddress,
        pickup_phone: formData.pickupPhone || undefined,
        delivery_address: formData.deliveryAddress,
        delivery_phone: formData.deliveryPhone || undefined,
        client_name: formData.clientName,
        client_phone: formData.clientPhone,
        client_email: formData.clientEmail || undefined,
        delivery_instructions: formData.deliveryInstructions || undefined,
        courier_id:
          formData.assignNow && formData.selectedDriverId
            ? formData.selectedDriverId
            : undefined,
        priority: priorityToInt(formData.priority),
        shipping_amount: parseFloat(formData.shippingFee) || 0,
        payment_method: formData.paymentMethod,
        delivery_date: formData.deliveryDate || undefined,
        time_slot_from: formData.timeSlotFrom || undefined,
        time_slot_to: formData.timeSlotTo || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Livraison créée avec succès !");
          router.push("/agency/deliveries");
        },
        onError: (err: Error) => {
          // 422 — show field-level validation errors
          if (err instanceof ApiError && err.isValidation) {
            const fieldErrors = Object.values(err.errors);
            const firstError = fieldErrors.flat()[0];
            toast.error(firstError ?? "Erreur de validation.");
            return;
          }
          // 403 — forbidden
          if (err instanceof ApiError && err.isForbidden) {
            toast.error("Accès refusé — vous n'êtes pas autorisé à créer des livraisons.");
            return;
          }
          toast.error(
            err.message || "Erreur lors de la création de la livraison.",
          );
        },
      },
    );
  }, [formData, createDelivery, router]);

  const isSubmitting = createDelivery.isPending;

  // ── Progress bar ──
  const progressPercent = (currentStep / STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* ════════════ Breadcrumb ════════════ */}
      <nav
        className="flex items-center justify-between"
        aria-label="breadcrumb"
      >
        <Link
          href="/agency/deliveries"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sugu-500 transition-colors hover:text-sugu-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour aux livraisons
        </Link>
        {currentStep === 1 && (
          <Link
            href="/agency/deliveries"
            className="rounded-xl border border-gray-200 bg-white/60 px-4 py-2 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900"
          >
            Annuler
          </Link>
        )}
      </nav>

      {/* ════════════ Stepper ════════════ */}
      <StepIndicator currentStep={currentStep} onStepClick={goToStep} />

      {/* ════════════ Progress bar ════════════ */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-200/60">
        <div
          className="h-full rounded-full bg-sugu-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ════════════ Step Content ════════════ */}
      <div className="min-h-[420px]">
        {currentStep === 1 && (
          <div className="animate-slide-in-right">
            <StepCommande data={formData} onChange={handleChange} />
          </div>
        )}
        {currentStep === 2 && (
          <div className="animate-slide-in-right">
            <StepAdresses data={formData} onChange={handleChange} />
          </div>
        )}
        {currentStep === 3 && (
          <div className="animate-slide-in-right">
            <StepLivreur
              data={formData}
              onChange={handleChange}
              drivers={availableDrivers}
              isLoadingDrivers={isLoadingDrivers}
              driversError={driversError}
              onRetryDrivers={() => refetchDrivers()}
            />
          </div>
        )}
        {currentStep === 4 && (
          <div className="animate-slide-in-right">
            <StepRecapitulatif
              data={formData}
              onChange={handleChange}
              onGoToStep={goToStep}
            />
          </div>
        )}
      </div>

      {/* ════════════ Navigation Buttons ════════════ */}
      <div className="flex items-center justify-between pt-2 pb-4">
        {/* Left button */}
        {currentStep === 1 ? (
          <div /> /* empty spacer on step 1 — Cancel is in breadcrumb */
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

        {/* Center – step indicator */}
        <span className="text-sm text-gray-400">
          Étape {currentStep} sur {STEPS.length}
        </span>

        {/* Right button */}
        {currentStep < STEPS.length ? (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sugu-600 hover:-translate-y-0.5"
          >
            Suivant
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
              <CheckCircle2 className="h-4 w-4" />
            )}
            Confirmer et créer
          </button>
        )}
      </div>
    </div>
  );
}
