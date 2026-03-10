"use client";

// ============================================================
// SearchBar — delivery search with clear button
// ============================================================

import { useRef } from "react";
import { Search, X } from "lucide-react";

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative mb-4">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher par ID, client, boutique…"
        aria-label="Rechercher des livraisons"
        className="w-full rounded-2xl border border-gray-200/80 bg-white/80 py-2.5 pl-10 pr-10 text-sm text-gray-700 backdrop-blur-sm placeholder:text-gray-400 focus:border-sugu-400 focus:outline-none focus:ring-2 focus:ring-sugu-500/15 transition-all dark:border-gray-700/60 dark:bg-gray-900/50 dark:text-gray-300 dark:placeholder:text-gray-500"
      />
      {value && (
        <button
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
