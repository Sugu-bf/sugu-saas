"use client";

import { useState } from "react";
import { X, ChevronDown, ClipboardList } from "lucide-react";
import {
  type ProductFormData,
  type FormUpdater,
  CATEGORIES,
  ORIGINS,
  WEIGHT_UNITS,
  INPUT_CLASS,
  SELECT_CLASS,
  LABEL_CLASS,
} from "./types";
import { useProductCategories } from "@/features/vendor/hooks";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface StepInformationsProps {
  data: ProductFormData;
  onChange: FormUpdater;
}

export function StepInformations({ data, onChange }: StepInformationsProps) {
  const [newTag, setNewTag] = useState("");
  const { data: apiCategories } = useProductCategories();

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !data.tags.includes(tag)) {
      onChange("tags", [...data.tags, tag]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    onChange(
      "tags",
      data.tags.filter((t) => t !== tag),
    );
  };

  // Use API categories if available, otherwise fall back to hardcoded ones
  const categoryNames = apiCategories
    ? apiCategories.map((c) => c.name)
    : Object.keys(CATEGORIES);

  // For subcategories: if we have API categories (flat list), don't show subcategories
  // If using hardcoded categories, show nested subcategories
  const subCategories = apiCategories
    ? [] // API categories are flat, no subcategories
    : (CATEGORIES[data.mainCategory] ?? []);

  return (
    <section className="glass-card animate-slide-in-right rounded-3xl p-5 sm:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-gray-400" />
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Informations générales
          </h2>
          <p className="text-sm text-gray-400">Étape 1 sur 4</p>
        </div>
      </div>

      {/* ── Nom du produit ── */}
      <div className="mt-6">
        <label htmlFor="product-name" className={LABEL_CLASS}>
          Nom du produit <span className="text-red-400">*</span>
        </label>
        <input
          id="product-name"
          type="text"
          value={data.name}
          onChange={(e) => onChange("name", e.target.value)}
          className={INPUT_CLASS}
          placeholder="Ex: Huile de Palme Bio 1L"
        />
      </div>

      {/* ── Description ── */}
      <div className="mt-5">
        <label htmlFor="product-desc" className={LABEL_CLASS}>
          Description <span className="text-red-400">*</span>
        </label>
        <RichTextEditor
          id="product-desc"
          value={data.description}
          onChange={(html) => onChange("description", html)}
          placeholder="Décrivez votre produit en détail : composition, utilisation, avantages..."
          minHeight={180}
        />
      </div>

      {/* ── Catégorie + Sous-catégorie ── */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>
            Catégorie principale <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <select
              value={data.mainCategory}
              onChange={(e) => {
                onChange("mainCategory", e.target.value);
                if (!apiCategories) {
                  const subs = CATEGORIES[e.target.value];
                  if (subs?.length) onChange("subCategory", subs[0]);
                }
              }}
              className={SELECT_CLASS}
            >
              <option value="">Sélectionner une catégorie</option>
              {categoryNames.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        {subCategories.length > 0 && (
          <div>
            <label className={LABEL_CLASS}>
              Sous-catégorie <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                value={data.subCategory}
                onChange={(e) => onChange("subCategory", e.target.value)}
                className={SELECT_CLASS}
              >
                {subCategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        )}
      </div>

      {/* ── Tags ── */}
      <div className="mt-5">
        <label className={LABEL_CLASS}>Tags</label>
        <div className="flex flex-wrap items-center gap-2">
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full bg-sugu-100 px-3 py-1 text-xs font-semibold text-sugu-600 dark:bg-sugu-950/40 dark:text-sugu-400"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full p-0.5 text-sugu-400 transition-colors hover:text-sugu-600"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), addTag())
            }
            className="w-28 border-none bg-transparent text-xs text-gray-500 placeholder-gray-400 outline-none dark:text-gray-400"
            placeholder="+ Ajouter un tag"
          />
        </div>
      </div>

      {/* ── Origine ── */}
      <div className="mt-5">
        <label className={LABEL_CLASS}>Origine du produit</label>
        <div className="relative">
          <select
            value={data.origin}
            onChange={(e) => onChange("origin", e.target.value)}
            className={SELECT_CLASS}
          >
            {ORIGINS.map((o) => (
              <option key={o.label} value={o.label}>
                {o.label} {o.flag}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* ── Poids / Volume ── */}
      <div className="mt-5">
        <label className={LABEL_CLASS}>
          Poids / Volume
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            value={data.weightValue}
            onChange={(e) => onChange("weightValue", e.target.value)}
            className={INPUT_CLASS}
            placeholder="Optionnel"
          />
          <div className="relative">
            <select
              value={data.weightUnit}
              onChange={(e) => onChange("weightUnit", e.target.value)}
              className={SELECT_CLASS}
            >
              {WEIGHT_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Required note */}
      <p className="mt-6 text-xs italic text-gray-400">
        * Champs obligatoires
      </p>
    </section>
  );
}
