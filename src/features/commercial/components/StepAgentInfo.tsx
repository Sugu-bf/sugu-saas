import { User, Phone } from "lucide-react";
import { Field, PillInput } from "@/components/shared/settings-ui";
import type { CommercialFormData } from "../types/commercial.types";

interface StepAgentInfoProps {
  data: CommercialFormData;
  onChange: (field: keyof CommercialFormData, value: string | number | File | number[] | string[] | null) => void;
  errors: Record<string, string>;
}

export default function StepAgentInfo({ data, onChange, errors }: StepAgentInfoProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{"Identité de l'Agent Commercial"}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{"Renseignez vos informations professionnelles pour l'audit de cette soumission."}</p>
      </div>

      <Field label="Nom Complet du Commercial" required hint="Saisissez votre nom et prénom">
        <PillInput
          value={data.agent_name}
          onChange={(v) => onChange("agent_name", v)}
          placeholder="Ex: Watson Simpore"
          prefix={<User className="h-4 w-4" />}
          className={errors.agent_name ? "border-red-300 focus:border-red-500" : ""}
        />
        {errors.agent_name && (
          <p className="mt-1 text-xs text-red-500">{errors.agent_name}</p>
        )}
      </Field>

      <Field label="Numéro de Téléphone du Commercial" required hint="Format international (ex: +22670112233)">
        <PillInput
          value={data.agent_phone}
          onChange={(v) => onChange("agent_phone", v)}
          placeholder="Ex: +22670112233"
          prefix={<Phone className="h-4 w-4" />}
          className={errors.agent_phone ? "border-red-300 focus:border-red-500" : ""}
        />
        {errors.agent_phone && (
          <p className="mt-1 text-xs text-red-500">{errors.agent_phone}</p>
        )}
      </Field>
    </div>
  );
}
