import { useState, useEffect } from "react";
import { Store, Image, Trash2, UploadCloud } from "lucide-react";
import { Field, PillInput } from "@/components/shared/settings-ui";
import type { CommercialFormData, CommercialCategory } from "../types/commercial.types";

interface StepStoreInfoProps {
  data: CommercialFormData;
  onChange: (field: keyof CommercialFormData, value: any) => void;
  categories: CommercialCategory[];
  errors: Record<string, string>;
}

export default function StepStoreInfo({ data, onChange, categories, errors }: StepStoreInfoProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Set initial previews from files if returning to step
  useEffect(() => {
    if (data.logo) {
      const url = URL.createObjectURL(data.logo);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLogoPreview(null);
    }
  }, [data.logo]);

  useEffect(() => {
    if (data.cover) {
      const url = URL.createObjectURL(data.cover);
      setCoverPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCoverPreview(null);
    }
  }, [data.cover]);

  const handleFileChange = (field: "logo" | "cover", file: File | null) => {
    onChange(field, file);
  };

  const handleCategoryToggle = (catId: string) => {
    let updated = [...data.category_ids];
    if (updated.includes(catId)) {
      updated = updated.filter((id) => id !== catId);
    } else {
      if (updated.length < 5) {
        updated.push(catId);
      }
    }
    onChange("category_ids", updated);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Informations de la Boutique</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Renseignez le nom, la description, les catégories et chargez les logos et couvertures.</p>
      </div>

      <Field label="Nom de la Boutique" required hint="Nom commercial unique de la boutique">
        <PillInput
          value={data.store_name}
          onChange={(v) => onChange("store_name", v)}
          placeholder="Ex: Sugu Superette"
          prefix={<Store className="h-4 w-4" />}
          className={errors.store_name ? "border-red-300 focus:border-red-500" : ""}
        />
        {errors.store_name && (
          <p className="mt-1 text-xs text-red-500">{errors.store_name}</p>
        )}
      </Field>

      <Field label="Description" hint="Brève présentation des articles vendus (max 1000 caractères)">
        <textarea
          value={data.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Ex: Produits frais, fruits locaux, légumes bio et épices fines..."
          rows={3}
          maxLength={1000}
          className="w-full rounded-2xl border border-white/60 bg-white/50 px-4 py-2.5 text-sm text-gray-700 backdrop-blur transition-all placeholder:text-gray-400 focus:border-sugu-300 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200 dark:focus:border-sugu-600"
        />
      </Field>

      <Field label="Catégories (Sélectionnez de 1 à 5)" required hint="Choisissez les catégories principales d'activités">
        <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto p-2 border border-gray-100 dark:border-gray-800/50 rounded-xl bg-white/30 dark:bg-white/5">
          {categories.map((cat) => (
            <label
              key={cat.id}
              className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-all ${
                data.category_ids.includes(cat.id)
                  ? "border-sugu-400 bg-sugu-50/40 dark:bg-sugu-950/20 text-sugu-600 dark:text-sugu-400 font-semibold"
                  : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/40 text-gray-600 dark:text-gray-400"
              }`}
            >
              <input
                type="checkbox"
                checked={data.category_ids.includes(cat.id)}
                onChange={() => handleCategoryToggle(cat.id)}
                className="rounded text-sugu-500 focus:ring-sugu-500 border-gray-300 h-3.5 w-3.5"
              />
              <span className="truncate">{cat.name}</span>
            </label>
          ))}
        </div>
        {errors.category_ids && (
          <p className="mt-1 text-xs text-red-500">{errors.category_ids}</p>
        )}
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Logo upload */}
        <Field label="Logo (Optionnel)" hint="Format carré, max 2Mo">
          {logoPreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800/50 aspect-square flex items-center justify-center bg-gray-50 dark:bg-gray-900/40 p-2">
              <img src={logoPreview} alt="Logo" className="max-h-full max-w-full object-contain rounded-lg" />
              <button
                type="button"
                onClick={() => handleFileChange("logo", null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-md active:scale-95 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="border border-dashed border-gray-300 dark:border-gray-700 hover:border-sugu-400 hover:bg-sugu-50/10 dark:hover:bg-sugu-950/10 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all aspect-square text-center">
              <UploadCloud className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Charger Logo</span>
              <span className="text-[10px] text-gray-400 mt-1">PNG, JPG, WEBP</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange("logo", e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          )}
        </Field>

        {/* Cover upload */}
        <Field label="Couverture (Optionnel)" hint="Format paysage, max 4Mo">
          {coverPreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800/50 aspect-square flex items-center justify-center bg-gray-50 dark:bg-gray-900/40 p-2">
              <img src={coverPreview} alt="Couverture" className="max-h-full max-w-full object-contain rounded-lg" />
              <button
                type="button"
                onClick={() => handleFileChange("cover", null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-md active:scale-95 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="border border-dashed border-gray-300 dark:border-gray-700 hover:border-sugu-400 hover:bg-sugu-50/10 dark:hover:bg-sugu-950/10 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all aspect-square text-center">
              <Image className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Charger Couverture</span>
              <span className="text-[10px] text-gray-400 mt-1">PNG, JPG, WEBP</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange("cover", e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          )}
        </Field>
      </div>
    </div>
  );
}
