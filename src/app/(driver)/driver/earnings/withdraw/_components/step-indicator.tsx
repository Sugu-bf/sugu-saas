"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { WITHDRAW_STEPS } from "./types";

interface StepIndicatorProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="mx-auto mb-8 flex max-w-md items-start justify-between px-2 sm:px-6">
      {WITHDRAW_STEPS.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        const isUpcoming = currentStep < step.id;

        return (
          <div key={step.id} className="flex flex-1 items-start">
            {/* Step circle + label */}
            <button
              type="button"
              onClick={() => onStepClick(step.id)}
              className="group flex flex-col items-center gap-1"
            >
              <div
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                  isCompleted &&
                    "bg-sugu-500 text-white",
                  isActive &&
                    "bg-sugu-500 text-white ring-4 ring-sugu-500/20",
                  isUpcoming &&
                    "bg-gray-200 text-gray-400 group-hover:bg-gray-300",
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 text-white" strokeWidth={3} />
                ) : (
                  step.id
                )}
              </div>

              <span
                className={cn(
                  "whitespace-nowrap text-[11px] font-semibold transition-colors sm:text-xs",
                  isCompleted && "text-sugu-600",
                  isActive && "text-sugu-600",
                  isUpcoming && "text-gray-400",
                )}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line */}
            {index < WITHDRAW_STEPS.length - 1 && (
              <div className="mx-1.5 mt-4 h-0.5 flex-1 sm:mx-3">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isCompleted
                      ? "bg-sugu-500"
                      : "border-t-2 border-dashed border-gray-300",
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
