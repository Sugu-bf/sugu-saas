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
                  "relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                  isCompleted &&
                    "bg-green-500 text-white shadow-md shadow-green-500/25",
                  isActive &&
                    "bg-gradient-to-br from-sugu-400 to-sugu-600 text-white shadow-lg shadow-sugu-500/30",
                  isUpcoming &&
                    "border-2 border-gray-300 bg-white text-gray-400 group-hover:border-sugu-200 dark:border-gray-600 dark:bg-gray-900",
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  step.id
                )}
              </div>

              <span
                className={cn(
                  "whitespace-nowrap text-[11px] font-semibold transition-colors sm:text-xs",
                  isCompleted && "text-green-600 dark:text-green-400",
                  isActive && "text-sugu-600 dark:text-sugu-400",
                  isUpcoming && "text-gray-400 dark:text-gray-500",
                )}
              >
                {step.label}
              </span>

              {isCompleted && (
                <span className="hidden text-[8px] font-bold uppercase tracking-wider text-green-500 sm:block">
                  Completed
                </span>
              )}
              {isActive && (
                <span className="hidden text-[8px] font-bold uppercase tracking-wider text-sugu-500 sm:block">
                  Active
                </span>
              )}
            </button>

            {/* Connector line */}
            {index < WITHDRAW_STEPS.length - 1 && (
              <div className="mx-1.5 mt-[18px] h-0.5 flex-1 sm:mx-3">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isCompleted
                      ? "bg-green-500"
                      : "bg-gray-200 dark:bg-gray-700",
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
