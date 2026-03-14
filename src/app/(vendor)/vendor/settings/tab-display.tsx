"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SectionCard, Toggle, PillSelect, PillBadge } from "@/components/shared/settings-ui";
import { Sun, Moon, Monitor } from "lucide-react";
import { useVendorSettings } from "@/features/vendor/hooks";

// ────────────────────────────────────────────────────────────
// Onglet 7 — Préférences d'affichage
// ────────────────────────────────────────────────────────────

type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
type ThousandSep = "dot" | "comma" | "space";
type Density = "comfortable" | "compact";
type Theme = "light" | "dark" | "system";

export function TabDisplay() {
  const { data: settingsData } = useVendorSettings();
  const apiPrefs = settingsData?.operations?.preferences;

  const [dateFormat, setDateFormat] = useState<DateFormat>("DD/MM/YYYY");
  const [thousandSep, setThousandSep] = useState<ThousandSep>("dot");
  const [language, setLanguage] = useState(apiPrefs?.language ?? "fr");
  const [theme, setTheme] = useState<Theme>("light");
  const [density, setDensity] = useState<Density>("comfortable");
  const [animations, setAnimations] = useState(true);

  return (
    <div className="space-y-6">
      {/* ─── Card 1: Général ─── */}
      <SectionCard title="Général" id="display-general">
        <div className="mt-5 space-y-5">
          {/* Devise */}
          <div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Devise</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded-full border border-white/60 bg-white/50 px-4 py-2.5 text-sm text-gray-600 backdrop-blur dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
                {apiPrefs?.currency ?? "XOF"} — Franc CFA ({apiPrefs?.currency ?? "XOF"})
              </span>
              <span className="text-[10px] text-gray-400">Non modifiable pour l&apos;instant</span>
            </div>
          </div>

          {/* Date format */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">Format de date</p>
            <div className="flex flex-wrap gap-2">
              {(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setDateFormat(f)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all",
                    dateFormat === f
                      ? "bg-sugu-500 text-white"
                      : "border border-gray-300 bg-white/50 text-gray-600 backdrop-blur hover:border-sugu-300 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Separator */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">Séparateur de milliers</p>
            <div className="flex flex-wrap gap-2">
              {([{ k: "dot" as const, l: "1.000" }, { k: "comma" as const, l: "1,000" }, { k: "space" as const, l: "1 000" }]).map(({ k, l }) => (
                <button
                  key={k}
                  onClick={() => setThousandSep(k)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all",
                    thousandSep === k
                      ? "bg-sugu-500 text-white"
                      : "border border-gray-300 bg-white/50 text-gray-600 backdrop-blur hover:border-sugu-300 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">Langue du dashboard</p>
            <PillSelect
              value={language}
              onChange={setLanguage}
              options={[{ value: "fr", label: "Français (FR)" }, { value: "en", label: "English (EN)" }]}
              className="max-w-[250px]"
            />
          </div>
        </div>
      </SectionCard>

      {/* ─── Card 2: Apparence ─── */}
      <SectionCard title="Apparence" id="display-appearance">
        <div className="mt-5 space-y-5">
          {/* Theme */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">Thème</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([
                { key: "light" as const, icon: <Sun className="h-5 w-5 text-amber-500" />, label: "Clair" },
                { key: "dark" as const, icon: <Moon className="h-5 w-5 text-indigo-400" />, label: "Sombre", soon: true },
                { key: "system" as const, icon: <Monitor className="h-5 w-5 text-gray-500" />, label: "Système", soon: true },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => !t.soon && setTheme(t.key)}
                  className={cn(
                    "relative rounded-2xl border p-4 text-left transition-all",
                    theme === t.key
                      ? "border-sugu-300 bg-sugu-50/30 dark:border-sugu-700 dark:bg-sugu-950/10"
                      : "border-white/60 bg-white/30 backdrop-blur hover:border-gray-300 dark:border-gray-700/50 dark:bg-gray-800/20",
                    t.soon && "opacity-60 cursor-not-allowed",
                  )}
                >
                  {/* Mini theme preview */}
                  <div className={cn(
                    "mb-3 h-16 w-full overflow-hidden rounded-xl border",
                    t.key === "light" ? "border-gray-200 bg-orange-50" :
                    t.key === "dark" ? "border-gray-700 bg-gray-800" :
                    "border-gray-300 bg-gray-100 dark:bg-gray-800",
                  )}>
                    <div className="flex h-full items-center justify-center">
                      <div className={cn("h-3 w-16 rounded-full", t.key === "dark" ? "bg-gray-600" : "bg-gray-200")} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t.label}</span>
                  </div>
                  {t.soon && (
                    <span className="absolute right-2 top-2">
                      <PillBadge variant="amber">Bientôt</PillBadge>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">Densité d&apos;affichage</p>
            <div className="flex gap-2">
              {(["comfortable", "compact"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDensity(d)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all",
                    density === d
                      ? "bg-sugu-500 text-white"
                      : "border border-gray-300 bg-white/50 text-gray-600 backdrop-blur hover:border-sugu-300 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300",
                  )}
                >
                  {d === "comfortable" ? "Confortable" : "Compact"}
                </button>
              ))}
            </div>
          </div>

          {/* Animations */}
          <div className="flex items-center gap-3">
            <Toggle checked={animations} onChange={() => setAnimations(!animations)} label="Animations" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Activer les animations et transitions</span>
          </div>
        </div>
      </SectionCard>

    </div>
  );
}
