import { User, Mail, Phone } from "lucide-react";
import { Field, PillInput } from "@/components/shared/settings-ui";
import type { CommercialFormData } from "../types/commercial.types";

interface StepOwnerInfoProps {
  data: CommercialFormData;
  onChange: (field: keyof CommercialFormData, value: string | number | File | number[] | string[] | null) => void;
  errors: Record<string, string>;
}

export default function StepOwnerInfo({ data, onChange, errors }: StepOwnerInfoProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Propriétaire de la Boutique</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Renseignez les coordonnées personnelles du vendeur. Il recevra ses accès par email.</p>
      </div>

      <Field label="Nom Complet du Vendeur" required hint="Nom et prénom du propriétaire">
        <PillInput
          value={data.owner_name}
          onChange={(v) => onChange("owner_name", v)}
          placeholder="Ex: Alassane Sawadogo"
          prefix={<User className="h-4 w-4" />}
          className={errors.owner_name ? "border-red-300 focus:border-red-500" : ""}
        />
        {errors.owner_name && (
          <p className="mt-1 text-xs text-red-500">{errors.owner_name}</p>
        )}
      </Field>

      <Field label="Adresse Email du Vendeur" required hint="Sert d'identifiant de connexion pour le vendeur">
        <PillInput
          value={data.owner_email}
          onChange={(v) => onChange("owner_email", v)}
          type="email"
          placeholder="Ex: alassane@example.com"
          prefix={<Mail className="h-4 w-4" />}
          className={errors.owner_email ? "border-red-300 focus:border-red-500" : ""}
        />
        {errors.owner_email && (
          <p className="mt-1 text-xs text-red-500">{errors.owner_email}</p>
        )}
      </Field>

      <Field label="Numéro de Téléphone du Vendeur" required hint="Format international (ex: +22670998877)">
        <PillInput
          value={data.owner_phone}
          onChange={(v) => onChange("owner_phone", v)}
          placeholder="Ex: +22670998877"
          prefix={<Phone className="h-4 w-4" />}
          className={errors.owner_phone ? "border-red-300 focus:border-red-500" : ""}
        />
        {errors.owner_phone && (
          <p className="mt-1 text-xs text-red-500">{errors.owner_phone}</p>
        )}
      </Field>
    </div>
  );
}
