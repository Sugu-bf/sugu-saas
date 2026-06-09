"use client";

import React from "react";
import { useCommercialForm } from "../hooks/useCommercialForm";
import type { CommercialCategory, CommercialCountry } from "../types/commercial.types";
import StepAgentInfo from "./StepAgentInfo";
import StepStoreInfo from "./StepStoreInfo";
import StepOwnerInfo from "./StepOwnerInfo";
import StepLocation from "./StepLocation";
import StepReview from "./StepReview";
import SuccessScreen from "./SuccessScreen";
import { SectionCard, PillButton } from "@/components/shared/settings-ui";
import { ArrowLeft, ArrowRight, Save, ClipboardCheck, Store, MapPin, UserCheck, UserPlus } from "lucide-react";

interface CommercialFormProps {
  categories: CommercialCategory[];
  countries: CommercialCountry[];
}

export default function CommercialForm({ categories, countries }: CommercialFormProps) {
  const {
    currentStep,
    totalSteps,
    formData,
    errors,
    isSubmitting,
    submitError,
    submitSuccess,
    setField,
    nextStep,
    prevStep,
    goToStep,
    submit,
    reset,
  } = useCommercialForm();

  if (submitSuccess) {
    return (
      <SuccessScreen
        storeName={formData.store_name}
        ownerName={formData.owner_name}
        ownerEmail={formData.owner_email}
        onReset={reset}
      />
    );
  }

  const renderStepComponent = () => {
    switch (currentStep) {
      case 1:
        return <StepAgentInfo data={formData} onChange={setField} errors={errors} />;
      case 2:
        return (
          <StepStoreInfo
            data={formData}
            onChange={setField}
            categories={categories}
            errors={errors}
          />
        );
      case 3:
        return <StepOwnerInfo data={formData} onChange={setField} errors={errors} />;
      case 4:
        return (
          <StepLocation
            data={formData}
            onChange={setField}
            countries={countries}
            errors={errors}
          />
        );
      case 5:
        return (
          <StepReview
            data={formData}
            onChange={setField}
            categories={categories}
            countries={countries}
            errors={errors}
          />
        );
      default:
        return null;
    }
  };

  const stepsHeader = [
    { number: 1, label: "Agent", icon: <UserCheck className="h-4 w-4" /> },
    { number: 2, label: "Boutique", icon: <Store className="h-4 w-4" /> },
    { number: 3, label: "Proprio", icon: <UserPlus className="h-4 w-4" /> },
    { number: 4, label: "Adresse", icon: <MapPin className="h-4 w-4" /> },
    { number: 5, label: "Code", icon: <ClipboardCheck className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-card-enter">
        <SectionCard title="" className="p-6 sm:p-8">
          {/* Stepper horizontally */}
          <div className="mb-8 overflow-x-auto scrollbar-none pb-2 border-b border-gray-100 dark:border-gray-800/40">
            <div className="flex items-center justify-between min-w-[420px] px-2">
              {stepsHeader.map((step, idx) => (
                <React.Fragment key={step.number}>
                  {/* Step item */}
                  <button
                    type="button"
                    onClick={() => goToStep(step.number)}
                    className="flex flex-col items-center gap-1.5 focus:outline-none group"
                  >
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-xs border transition-all duration-300 font-semibold ${
                        currentStep === step.number
                          ? "bg-sugu-500 text-white border-sugu-500 shadow-md shadow-sugu-500/10 scale-105"
                          : currentStep > step.number
                          ? "bg-sugu-50 dark:bg-sugu-950/20 text-sugu-500 border-sugu-200 dark:border-sugu-900/40"
                          : "bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      {step.icon}
                    </div>
                    <span
                      className={`text-[10px] font-bold transition-all ${
                        currentStep === step.number
                          ? "text-sugu-600 dark:text-sugu-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                  
                  {/* Joiner line */}
                  {idx < stepsHeader.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded transition-all duration-300 ${
                        currentStep > step.number 
                          ? "bg-sugu-300 dark:bg-sugu-900" 
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (currentStep === totalSteps) {
                submit();
              } else {
                nextStep();
              }
            }}
            className="space-y-6"
          >
            {renderStepComponent()}

            {submitError && (
              <div className="bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-2xl p-4 text-sm text-red-600 dark:text-red-400">
                ⚠️ {submitError}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800/40 pt-6 mt-6">
              {currentStep > 1 ? (
                <PillButton
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Retour
                </PillButton>
              ) : (
                <div />
              )}

              {currentStep < totalSteps ? (
                <PillButton type="submit">
                  Suivant
                  <ArrowRight className="h-4 w-4 ml-1" />
                </PillButton>
              ) : (
                <PillButton
                  type="button"
                  onClick={submit}
                  disabled={isSubmitting}
                  className="bg-sugu-500 text-white shadow-lg shadow-sugu-500/10 hover:bg-sugu-600"
                >
                  {isSubmitting ? (
                    "Envoi en cours..."
                  ) : (
                    <>
                      Soumettre
                      <Save className="h-4 w-4 ml-1.5" />
                    </>
                  )}
                </PillButton>
              )}
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
