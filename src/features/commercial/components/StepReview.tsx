import { useState } from "react";
import { ShieldAlert, Eye, EyeOff, CreditCard } from "lucide-react";
import { Field, PillInput, PillSelect } from "@/components/shared/settings-ui";
import type { CommercialFormData, CommercialCategory, CommercialCountry } from "../types/commercial.types";

interface StepReviewProps {
  data: CommercialFormData;
  onChange: (field: keyof CommercialFormData, value: any) => void;
  categories: CommercialCategory[];
  countries: CommercialCountry[];
  errors: Record<string, string>;
}

export default function StepReview({ data, onChange, categories, countries, errors }: StepReviewProps) {
  const [showCode, setShowCode] = useState(false);

  const getCategoryNames = () => {
    return data.category_ids
      .map((id) => categories.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const getCountryName = () => {
    const c = countries.find((country) => country.code === data.country);
    return c ? `${c.flag_emoji} ${c.name}` : data.country;
  };

  const paymentProviders = [
    { value: "", label: "Aucun mode (configurer plus tard)" },
    { value: "orange_money", label: "Orange Money (Burkina Faso)" },
    { value: "mobicash", label: "Mobicash (Burkina Faso)" },
    { value: "wave", label: "Wave" },
    { value: "moov_money", label: "Moov Money" },
    { value: "mtn_momo", label: "MTN Mobile Money" },
    { value: "bank", label: "Compte Bancaire (RIB)" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Récapitulatif & Validation</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Vérifiez toutes les informations saisies et entrez le code de sécurité pour valider.</p>
      </div>

      {/* Review summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Agent & Store Info */}
        <div className="bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/5 rounded-2xl p-4 space-y-2.5">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-800/40 pb-1.5">
            👨‍💼 Agent & Boutique
          </h3>
          <div>
            <span className="text-gray-400 dark:text-gray-500">Commercial:</span>{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">{data.agent_name} ({data.agent_phone})</span>
          </div>
          <div>
            <span className="text-gray-400 dark:text-gray-500">Boutique:</span>{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">{data.store_name}</span>
          </div>
          <div>
            <span className="text-gray-400 dark:text-gray-500">Catégories:</span>{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">{getCategoryNames() || "—"}</span>
          </div>
        </div>

        {/* Vendor & Location Info */}
        <div className="bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/5 rounded-2xl p-4 space-y-2.5">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-800/40 pb-1.5">
            📍 Propriétaire & Localisation
          </h3>
          <div>
            <span className="text-gray-400 dark:text-gray-500">Vendeur:</span>{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">{data.owner_name} ({data.owner_phone})</span>
          </div>
          <div>
            <span className="text-gray-400 dark:text-gray-500">Email:</span>{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">{data.owner_email}</span>
          </div>
          <div>
            <span className="text-gray-400 dark:text-gray-500">Localisation:</span>{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {getCountryName()}, {data.city}, {data.address} {data.neighborhood ? `(${data.neighborhood})` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Payment configs (Optional on terrain, premium UI card) */}
      <div className="bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          <CreditCard className="h-4 w-4 text-sugu-500" />
          Règlement Financier (Optionnel)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Opérateur / Banque">
            <PillSelect
              value={data.payment_provider}
              onChange={(v) => onChange("payment_provider", v)}
              options={paymentProviders}
            />
          </Field>

          {data.payment_provider && (
            <>
              <Field label="Téléphone de paiement" required={data.payment_provider !== "bank"}>
                <PillInput
                  value={data.payment_phone}
                  onChange={(v) => onChange("payment_phone", v)}
                  placeholder="Ex: +22676001122"
                  className={errors.payment_phone ? "border-red-300 focus:border-red-500" : ""}
                />
                {errors.payment_phone && (
                  <p className="mt-1 text-xs text-red-500">{errors.payment_phone}</p>
                )}
              </Field>

              <Field label="Nom sur le compte">
                <PillInput
                  value={data.payment_account_name}
                  onChange={(v) => onChange("payment_account_name", v)}
                  placeholder="Ex: Sawadogo Alassane"
                />
              </Field>
            </>
          )}
        </div>
      </div>

      {/* Mandatory security code validation block */}
      <div className="bg-sugu-50/30 dark:bg-sugu-950/10 border border-sugu-200/50 dark:border-sugu-900/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-sugu-500 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-white">Code de Sécurité Requis</h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Entrez le code de sécurité commun partagé par votre administrateur pour autoriser et valider la création de cette boutique.
            </p>
          </div>
        </div>

        <Field label="Code de Sécurité" required>
          <div className="relative">
            <PillInput
              value={data.security_code}
              onChange={(v) => onChange("security_code", v)}
              type={showCode ? "text" : "password"}
              placeholder="Saisissez le code secret"
              className={`pr-10 ${errors.security_code ? "border-red-300 focus:border-red-500" : ""}`}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-4 flex items-center"
              onClick={() => setShowCode(!showCode)}
            >
              {showCode ? (
                <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
              )}
            </button>
          </div>
          {errors.security_code && (
            <p className="mt-1 text-xs text-red-500">{errors.security_code}</p>
          )}
        </Field>
      </div>
    </div>
  );
}
