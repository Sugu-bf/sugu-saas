"use client";

import type { CreateCourierFormData } from "@/features/agency/schema";

interface CardPreviewProps {
  data: CreateCourierFormData;
}

export function CardPreview({ data }: CardPreviewProps) {
  // Initials
  const initials =
    [data.firstName, data.lastName]
      .map((n) => n.charAt(0).toUpperCase())
      .filter(Boolean)
      .join("") || "?";

  // Display name
  const displayName =
    [data.firstName, data.lastName].filter(Boolean).join(" ") || "Nouveau livreur";

  // Vehicle badge
  const vehicleLabel = data.vehicleMake
    ? `${data.vehicleType.charAt(0).toUpperCase() + data.vehicleType.slice(1)} \u2022 ${data.vehicleMake}`
    : data.vehicleType.charAt(0).toUpperCase() + data.vehicleType.slice(1);

  // KYC progress
  const docCount = data.documents.length;
  const docTotal = 4;
  const docPercent = Math.round((docCount / docTotal) * 100);

  return (
    <div className="glass-card animate-card-enter rounded-2xl p-4 lg:rounded-3xl lg:p-5">
      {/* Header */}
      <h3 className="text-sm font-semibold text-gray-900">Aperçu du profil</h3>

      {/* Avatar + Name */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-sugu-400 to-sugu-600 text-2xl font-bold text-white shadow-lg shadow-sugu-500/25">
          {initials}
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{displayName}</p>
          <p className="text-xs text-gray-400">Nouveau livreur</p>
        </div>

        {/* Vehicle badge */}
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          {vehicleLabel}
        </span>
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-gray-100" />

      {/* Status */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Statut</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          En attente de validation
        </span>
      </div>

      {/* KYC Progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">KYC</span>
          <span className="font-medium text-gray-700">
            {docCount}/{docTotal} documents
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200/60">
          <div
            className="h-full rounded-full bg-sugu-500 transition-all duration-500"
            style={{ width: `${docPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
