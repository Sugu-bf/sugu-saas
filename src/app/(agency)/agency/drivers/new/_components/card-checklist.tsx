"use client";

import { ClipboardCheck, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateCourierFormData } from "@/features/agency/schema";

interface CardChecklistProps {
  data: CreateCourierFormData;
}

type ItemStatus = "done" | "partial" | "missing" | "optional";

const STATUS_ICON: Record<ItemStatus, React.ReactNode> = {
  done: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  partial: <Circle className="h-4 w-4 fill-sugu-500/20 text-sugu-500" />,
  missing: <Circle className="h-4 w-4 text-red-400" />,
  optional: <Circle className="h-4 w-4 text-gray-300" />,
};

export function CardChecklist({ data }: CardChecklistProps) {
  const items: { label: string; status: ItemStatus; required: boolean }[] = [
    {
      label: "Prénom et nom",
      status: data.firstName.trim() && data.lastName.trim() ? "done" : "missing",
      required: true,
    },
    {
      label: "Téléphone",
      status: data.phone.trim() ? "done" : "missing",
      required: true,
    },
    {
      label: "Véhicule configuré",
      status: data.vehicleMake.trim() && data.vehiclePlate.trim() ? "done" : "missing",
      required: true,
    },
    {
      label: `Documents KYC (${data.documents.length}/4)`,
      status:
        data.documents.length >= 2
          ? "done"
          : data.documents.length > 0
            ? "partial"
            : "missing",
      required: true,
    },
    {
      label: "Email (optionnel)",
      status: data.email.trim() ? "done" : "optional",
      required: false,
    },
    {
      label: "Photo du livreur",
      status: data.documents.some((d) => d.type === "photo") ? "done" : "optional",
      required: false,
    },
  ];

  const doneCount = items.filter((i) => i.status === "done").length;
  const requiredCount = items.filter((i) => i.required).length;
  const progress = Math.round((doneCount / items.length) * 100);

  // SVG ring dimensions
  const size = 40;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="glass-card animate-card-enter rounded-2xl p-4 lg:rounded-3xl lg:p-5"
      style={{ animationDelay: "120ms" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sugu-50 to-sugu-100">
          <ClipboardCheck className="h-4 w-4 text-sugu-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Éléments requis</h3>
        </div>
      </div>

      {/* Items list */}
      <div className="mt-3 space-y-0.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 py-1.5">
            {STATUS_ICON[item.status]}
            <span
              className={cn(
                "text-sm",
                item.status === "done"
                  ? "font-medium text-green-700"
                  : item.status === "partial"
                    ? "text-sugu-600"
                    : item.status === "missing"
                      ? "text-gray-700"
                      : "text-gray-400",
              )}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Footer: progress ring + label */}
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
        <span className="text-xs font-semibold text-gray-600">
          {doneCount}/{requiredCount} requis
        </span>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-sugu-500 transition-all duration-500"
          />
        </svg>
        <span className="text-lg font-bold text-gray-900">{progress}%</span>
      </div>
    </div>
  );
}
