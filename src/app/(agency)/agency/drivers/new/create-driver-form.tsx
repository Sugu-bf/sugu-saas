"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import { useRegisterCourier } from "@/features/agency/hooks";
import { DEFAULT_CREATE_COURIER } from "@/features/agency/schema";
import type { CreateCourierFormData } from "@/features/agency/schema";

import { SectionPersonal } from "./_components/section-personal";
import { SectionVehicle } from "./_components/section-vehicle";
import { SectionDocuments } from "./_components/section-documents";
import { CardPreview } from "./_components/card-preview";
import { CardAccess } from "./_components/card-access";
import { CardChecklist } from "./_components/card-checklist";

export function CreateDriverForm() {
  const [formData, setFormData] = useState<CreateCourierFormData>(DEFAULT_CREATE_COURIER);
  const router = useRouter();
  const registerMutation = useRegisterCourier();

  const updateField = useCallback(
    <K extends keyof CreateCourierFormData>(field: K, value: CreateCourierFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const validate = (): string | null => {
    if (!formData.firstName.trim()) return "Le prénom est requis";
    if (!formData.lastName.trim()) return "Le nom est requis";
    if (!formData.phone.trim()) return "Le téléphone est requis";
    if (!formData.quartier.trim()) return "Le quartier est requis";
    if (!formData.vehicleMake.trim()) return "Le modèle du véhicule est requis";
    if (!formData.vehiclePlate.trim()) return "Le numéro de plaque est requis";
    return null;
  };

  const handleSubmit = useCallback(() => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    registerMutation.mutate(
      {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email || undefined,
        phone: `${formData.phonePrefix}${formData.phone.replace(/\s/g, "")}`,
        date_of_birth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        quartier: formData.quartier,
        address: formData.address || undefined,
        vehicle_type: formData.vehicleType,
        vehicle_make: formData.vehicleMake,
        vehicle_plate: formData.vehiclePlate,
        vehicle_color: formData.vehicleColor || undefined,
        vehicle_year: formData.vehicleYear || undefined,
        auto_password: formData.autoPassword,
        send_sms: formData.sendSms,
        send_email: formData.sendEmail,
      },
      {
        onSuccess: (result) => {
          toast.success("Livreur enregistré avec succès !", {
            description: result.password
              ? `Mot de passe temporaire : ${result.password}`
              : "Les identifiants ont été envoyés par SMS.",
          });
          router.push("/agency/drivers");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, registerMutation, router]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <Link href="/agency/drivers" className="text-gray-500 hover:text-sugu-500">
          Livreurs
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
        <span className="font-medium text-gray-900">Nouveau livreur</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 lg:text-2xl">
            Ajouter un livreur
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 lg:text-sm">
            Inscrivez un nouveau coursier dans votre équipe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/agency/drivers"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/60 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-white hover:shadow-sm"
          >
            Annuler
          </Link>
          <button
            onClick={handleSubmit}
            disabled={registerMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sugu-500 to-sugu-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-sugu-500/25 transition-all hover:shadow-xl active:scale-[0.97] disabled:opacity-60"
          >
            {registerMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Enregistrer le livreur
          </button>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Column — Form Sections */}
        <div className="space-y-4 lg:col-span-7">
          <SectionPersonal data={formData} onChange={updateField} />
          <SectionVehicle data={formData} onChange={updateField} />
          <SectionDocuments data={formData} onChange={updateField} />
        </div>

        {/* Right Column — Preview + Settings + Checklist (sticky) */}
        <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-6 lg:self-start">
          <CardPreview data={formData} />
          <CardAccess data={formData} onChange={updateField} />
          <CardChecklist data={formData} />
        </div>
      </div>
    </div>
  );
}
