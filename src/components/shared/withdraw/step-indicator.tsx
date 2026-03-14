"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { WITHDRAW_STEPS } from "./types";

interface StepIndicatorProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  variant: "driver" | "vendor";
}

export function StepIndicator({
  currentStep,
  onStepClick,
  variant,
}: StepIndicatorProps) {
  const isDriver = variant === "driver";

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
                  "relative flex items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                  isDriver ? "h-8 w-8" : "h-9 w-9",
                  // Completed
                  isCompleted &&
                    (isDriver
                      ? "bg-sugu-500 text-white"
                      : "bg-green-500 text-white"),
                  // Active
                  isActive &&
                    (isDriver
                      ? "bg-sugu-500 text-white ring-4 ring-sugu-500/20"
                      : "bg-sugu-500 text-white"),
                  // Upcoming
                  isUpcoming &&
                    (isDriver
                      ? "bg-gray-200 text-gray-400 group-hover:bg-gray-300"
                      : "border-2 border-gray-300 bg-white text-gray-400 group-hover:border-sugu-200 dark:border-gray-600 dark:bg-gray-900"),
                )}
              >
                {isCompleted ? (
                  <Check
                    className={cn("h-4 w-4", isDriver && "text-white")}
                    strokeWidth={3}
                  />
                ) : (
                  step.id
                )}
              </div>

              <span
                className={cn(
                  "whitespace-nowrap text-[11px] font-semibold transition-colors sm:text-xs",
                  // Completed
                  isCompleted &&
                    (isDriver
                      ? "text-sugu-600"
                      : "text-green-600 dark:text-green-400"),
                  // Active
                  isActive &&
                    (isDriver
                      ? "text-sugu-600"
                      : "text-sugu-600 dark:text-sugu-400"),
                  // Upcoming
                  isUpcoming &&
                    (isDriver
                      ? "text-gray-400"
                      : "text-gray-400 dark:text-gray-500"),
                )}
              >
                {step.label}
              </span>

              {/* Vendor-only sub-labels */}
              {!isDriver && isCompleted && (
                <span className="hidden text-[8px] font-bold uppercase tracking-wider text-green-500 sm:block">
                  Completed
                </span>
              )}
              {!isDriver && isActive && (
                <span className="hidden text-[8px] font-bold uppercase tracking-wider text-sugu-500 sm:block">
                  Active
                </span>
              )}
            </button>

            {/* Connector line */}
            {index < WITHDRAW_STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-1.5 h-0.5 flex-1 sm:mx-3",
                  isDriver ? "mt-4" : "mt-[18px]",
                )}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isCompleted
                      ? isDriver
                        ? "bg-sugu-500"
                        : "bg-green-500"
                      : isDriver
                        ? "border-t-2 border-dashed border-gray-300"
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
