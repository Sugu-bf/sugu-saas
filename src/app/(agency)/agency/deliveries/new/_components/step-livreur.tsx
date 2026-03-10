"use client";

import { useState, useMemo } from "react";
import {
  Search,
  CheckCircle2,
  Star,
  Calendar,
  Clock,
  AlertTriangle,
  Truck,
  Bike,
  Car,
  ChevronDown,
  RefreshCw,
  Zap,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type DeliveryFormData,
  type FormUpdater,
  type AvailableDriver,
  INPUT_CLASS,
  SELECT_CLASS,
  LABEL_CLASS,
  PAYMENT_METHODS,
} from "./types";

interface StepLivreurProps {
  data: DeliveryFormData;
  onChange: FormUpdater;
  /** Real drivers from API (or mock fallback) */
  drivers: AvailableDriver[];
  /** Whether drivers are currently loading */
  isLoadingDrivers: boolean;
  /** Error message if driver fetch failed */
  driversError: string | null;
  /** Retry fetching drivers */
  onRetryDrivers?: () => void;
}

export function StepLivreur({
  data,
  onChange,
  drivers,
  isLoadingDrivers,
  driversError,
  onRetryDrivers,
}: StepLivreurProps) {
  const [driverSearch, setDriverSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");

  // Filter drivers (client-side filtering of the fetched dataset)
  const filteredDrivers = useMemo(() => {
    let filtered = drivers;

    // Name search
    if (driverSearch.trim()) {
      const q = driverSearch.toLowerCase();
      filtered = filtered.filter((d) => d.name.toLowerCase().includes(q));
    }

    // Vehicle filter
    if (vehicleFilter === "online") {
      filtered = filtered.filter((d) => d.online);
    } else if (vehicleFilter === "moto") {
      filtered = filtered.filter((d) => d.vehicle.toLowerCase().includes("moto"));
    } else if (vehicleFilter === "voiture") {
      filtered = filtered.filter((d) =>
        d.vehicle.toLowerCase().includes("voiture"),
      );
    }

    return filtered;
  }, [drivers, driverSearch, vehicleFilter]);

  const filterPills = [
    { key: "all", label: "Tous", icon: null },
    { key: "online", label: "En ligne", icon: null },
    { key: "moto", label: "Moto", icon: Bike },
    { key: "voiture", label: "Voiture", icon: Car },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* ═══════════════════════════════════════════
          CARD 1 — Assigner un livreur (col-span-2)
      ═══════════════════════════════════════════ */}
      <div className="glass-card rounded-2xl p-5 lg:col-span-2 lg:p-6">
        <div className="mb-4 flex items-center gap-3">
          <Bike className="h-6 w-6 text-gray-400" />
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Assigner un livreur
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choisissez le livreur pour cette mission
            </p>
          </div>
        </div>

        {/* ── Assign now / later radio cards ── */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange("assignNow", true)}
            className={cn(
              "rounded-xl border p-3 text-left text-sm font-semibold transition-all",
              data.assignNow
                ? "border-sugu-300 bg-sugu-50 text-sugu-700 shadow-sm ring-2 ring-sugu-500/20"
                : "border-gray-200 bg-white/60 text-gray-500 hover:bg-gray-50",
            )}
          >
            <div className="flex items-center gap-2">
              {data.assignNow && (
                <div className="h-2.5 w-2.5 rounded-full bg-sugu-500" />
              )}
              Assigner maintenant
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              onChange("assignNow", false);
              onChange("selectedDriverId", null);
            }}
            className={cn(
              "rounded-xl border p-3 text-left text-sm font-semibold transition-all",
              !data.assignNow
                ? "border-sugu-300 bg-sugu-50 text-sugu-700 shadow-sm ring-2 ring-sugu-500/20"
                : "border-gray-200 bg-white/60 text-gray-500 hover:bg-gray-50",
            )}
          >
            Assigner plus tard
          </button>
        </div>

        {/* ── Driver selection (only when assignNow) ── */}
        {data.assignNow && (
          <>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className={`${INPUT_CLASS} pl-10`}
                placeholder="Rechercher un livreur par nom..."
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
              />
            </div>

            {/* Filter pills */}
            <div className="mb-4 flex flex-wrap gap-2">
              {filterPills.map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setVehicleFilter(pill.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    vehicleFilter === pill.key
                      ? "bg-sugu-500 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400",
                  )}
                >
                  {pill.icon && <pill.icon className="h-3 w-3" />}
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Driver list */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {/* Loading skeleton */}
              {isLoadingDrivers && (
                <>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 animate-pulse"
                    >
                      <div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-gray-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
                      </div>
                      <div className="h-4 w-16 rounded bg-gray-100 dark:bg-gray-800" />
                    </div>
                  ))}
                </>
              )}

              {/* Error state */}
              {!isLoadingDrivers && driversError && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                  <p className="text-sm text-gray-500 text-center">{driversError}</p>
                  {onRetryDrivers && (
                    <button
                      type="button"
                      onClick={onRetryDrivers}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sugu-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-sugu-600"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Réessayer
                    </button>
                  )}
                </div>
              )}

              {/* Driver cards */}
              {!isLoadingDrivers && !driversError && (
                <>
                  {filteredDrivers.map((driver) => (
                    <DriverCard
                      key={driver.id}
                      driver={driver}
                      isSelected={data.selectedDriverId === driver.id}
                      onSelect={() => {
                        if (driver.available) {
                          onChange("selectedDriverId", driver.id);
                        }
                      }}
                    />
                  ))}
                  {filteredDrivers.length === 0 && (
                    <p className="py-8 text-center text-sm text-gray-400">
                      Aucun livreur trouvé
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          RIGHT COLUMN — Priorité + Frais + Planification
      ═══════════════════════════════════════════ */}
      <div className="space-y-4">
        {/* ── Priorité ── */}
        <div className="glass-card rounded-2xl p-5 lg:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Priorité
            </h3>
          </div>
          <p className="mb-3 text-xs text-gray-500">Priorité de livraison</p>

          <div className="space-y-2">
            {(
              [
                {
                  value: "urgent" as const,
                  label: "Urgent",
                  emoji: "",
                  desc: "Livraison immédiate, priorité maximale",
                  border: "border-red-200",
                  bg: "bg-red-50",
                  text: "text-red-600",
                  activeBorder: "border-red-400",
                  activeRing: "ring-red-500/20",
                },
                {
                  value: "normal" as const,
                  label: "Normal",
                  emoji: "",
                  desc: "Livraison dans le créneau standard",
                  border: "border-amber-200",
                  bg: "bg-amber-50",
                  text: "text-amber-700",
                  activeBorder: "border-amber-400",
                  activeRing: "ring-amber-500/20",
                },
                {
                  value: "low" as const,
                  label: "Bas",
                  emoji: "",
                  desc: "Livraison sans urgence, flexible",
                  border: "border-green-200",
                  bg: "bg-green-50",
                  text: "text-green-600",
                  activeBorder: "border-green-400",
                  activeRing: "ring-green-500/20",
                },
              ] as const
            ).map((p) => {
              const isSelected = data.priority === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onChange("priority", p.value)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-all",
                    isSelected
                      ? `${p.activeBorder} ${p.bg} ring-2 ${p.activeRing}`
                      : `${p.border} bg-white/60 hover:${p.bg}`,
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{p.emoji}</span>
                    <span
                      className={cn(
                        "text-sm font-bold",
                        isSelected ? p.text : "text-gray-700",
                      )}
                    >
                      {p.label}
                    </span>
                    {isSelected && (
                      <div
                        className={cn(
                          "ml-auto h-2 w-2 rounded-full",
                          p.value === "urgent"
                            ? "bg-red-500"
                            : p.value === "normal"
                              ? "bg-amber-500"
                              : "bg-green-500",
                        )}
                      />
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Frais & Paiement ── */}
        <div className="glass-card rounded-2xl p-5 lg:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Banknote className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Frais & Paiement
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className={LABEL_CLASS}>Frais de livraison (FCFA)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  className={`${INPUT_CLASS} pr-16`}
                  placeholder="2 500"
                  value={data.shippingFee}
                  onChange={(e) => onChange("shippingFee", e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800">
                  FCFA
                </span>
              </div>
            </div>

            <div>
              <label className={LABEL_CLASS}>
                Mode de paiement livraison
              </label>
              <div className="relative">
                <select
                  className={SELECT_CLASS}
                  value={data.paymentMethod}
                  onChange={(e) => onChange("paymentMethod", e.target.value)}
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.value} value={pm.value}>
                      {pm.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Planification ── */}
        <div className="glass-card rounded-2xl p-5 lg:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Planification
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className={LABEL_CLASS}>Date de livraison</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  className={`${INPUT_CLASS} pl-10`}
                  value={data.deliveryDate}
                  onChange={(e) => onChange("deliveryDate", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={LABEL_CLASS}>Créneau horaire</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="time"
                    className={`${INPUT_CLASS} pl-10`}
                    value={data.timeSlotFrom}
                    onChange={(e) => onChange("timeSlotFrom", e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="time"
                    className={`${INPUT_CLASS} pl-10`}
                    value={data.timeSlotTo}
                    onChange={(e) => onChange("timeSlotTo", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Driver Card sub-component
──────────────────────────────────────────────────────────── */
function DriverCard({
  driver,
  isSelected,
  onSelect,
}: {
  driver: AvailableDriver;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!driver.available}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
        isSelected
          ? "border-2 border-sugu-500 bg-sugu-50/50 shadow-sm"
          : driver.available
            ? "border-gray-200 bg-white/60 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30"
            : "cursor-not-allowed border-gray-100 bg-gray-50/30 opacity-60",
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold",
            driver.avatarColor,
          )}
        >
          {driver.initials}
        </div>
        {/* Online indicator */}
        {driver.online && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {driver.name}
          </span>
          <div className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium text-gray-500">
              {driver.rating}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            · {driver.totalDeliveries} livraisons
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Truck className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-400">{driver.vehicle}</span>
        </div>
      </div>

      {/* Right side */}
      <div className="shrink-0 text-right">
        {isSelected ? (
          <CheckCircle2 className="h-5 w-5 text-sugu-500" />
        ) : driver.available ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Disponible
          </span>
        ) : (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{driver.currentLoad ?? "Indisponible"}</span>
          </div>
        )}
      </div>
    </button>
  );
}
