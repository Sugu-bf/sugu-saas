"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Check, X, ChevronDown } from "lucide-react";
import type { ProductCategory } from "@/features/vendor/schema";

interface CategoryPickerProps {
  categories: ProductCategory[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}

export function CategoryPicker({ categories, selectedIds, onChange, error }: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCategory = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedCategories = categories.filter((cat) => selectedIds.includes(cat.id));

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button / Input Area */}
      <div
        onClick={() => setOpen(!open)}
        className={`flex w-full min-h-[46px] cursor-pointer flex-wrap items-center gap-1.5 rounded-xl border bg-gray-50/50 px-3 py-2 text-sm transition-all focus-within:border-sugu-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 ${
          open ? "border-sugu-400 bg-white ring-2 ring-sugu-500/20" : "border-gray-200/80"
        } ${error ? "border-red-300 dark:border-red-700" : ""}`}
      >
        {selectedCategories.length === 0 ? (
          <span className="text-gray-400">Sélectionner des catégories...</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selectedCategories.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1 rounded-md bg-sugu-100 px-2 py-0.5 text-xs font-semibold text-sugu-600 dark:bg-sugu-950/40 dark:text-sugu-400"
              >
                {cat.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategory(cat.id);
                  }}
                  className="rounded-full p-0.5 text-sugu-400 hover:bg-sugu-200/50 dark:hover:bg-sugu-900/50 hover:text-sugu-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
      </div>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 animate-fade-in">
          {/* Search Input */}
          <div className="relative border-b border-gray-100 p-2 dark:border-gray-800">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une catégorie..."
              className="w-full rounded-lg bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-900 placeholder-gray-400 outline-none focus:bg-white focus:ring-1 focus:ring-sugu-500/20 dark:bg-gray-800/50 dark:text-white"
            />
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto p-1.5">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => {
                const isSelected = selectedIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      isSelected ? "bg-sugu-50/50 text-sugu-600 dark:bg-sugu-950/20 dark:text-sugu-400 font-semibold" : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {cat.name}
                    {isSelected && <Check className="h-3.5 w-3.5 text-sugu-500" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                Aucune catégorie trouvée
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
