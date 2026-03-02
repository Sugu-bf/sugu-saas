"use client";

import {
  MapPin,
  Phone,
  User,
  Mail,
  Navigation,
  Clock,
  ArrowDown,
} from "lucide-react";
import {
  type DeliveryFormData,
  type FormUpdater,
  INPUT_CLASS,
  LABEL_CLASS,
} from "./types";

interface StepAdressesProps {
  data: DeliveryFormData;
  onChange: FormUpdater;
}

export function StepAdresses({ data, onChange }: StepAdressesProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* ═══════════════════════════════════════════
          CARD GAUCHE — Adresses
      ═══════════════════════════════════════════ */}
      <div className="glass-card rounded-2xl p-5 lg:p-6">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <span className="text-2xl">📍</span>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Adresses
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Définissez le trajet de ramassage et livraison
            </p>
          </div>
        </div>

        <div className="space-y-0">
          {/* ── Point A — Ramassage ── */}
          <div className="relative pl-6">
            {/* Blue dot */}
            <div className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-blue-500 bg-blue-100" />

            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Point A — Ramassage
              </h3>
              {data.vendorName && (
                <span className="inline-flex items-center gap-1 rounded-md bg-sugu-50 px-2 py-0.5 text-[10px] font-semibold text-sugu-600">
                  🏪 {data.vendorName}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className={LABEL_CLASS}>
                  Adresse de ramassage <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
                  <input
                    type="text"
                    className={`${INPUT_CLASS} pl-10`}
                    placeholder="ACI 2000, Rue 305"
                    value={data.pickupAddress}
                    onChange={(e) => onChange("pickupAddress", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLASS}>Téléphone vendeur</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      className={`${INPUT_CLASS} pl-10`}
                      placeholder="+223 XX XX XX XX"
                      value={data.pickupPhone}
                      onChange={(e) => onChange("pickupPhone", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Étage / Porte</label>
                  <input
                    type="text"
                    className={INPUT_CLASS}
                    placeholder="RDC, Bureau 3..."
                    value={data.pickupFloor}
                    onChange={(e) => onChange("pickupFloor", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Dashed connector ── */}
          <div className="relative my-2 flex items-center pl-6">
            <div className="absolute left-[5px] h-8 border-l-2 border-dashed border-gray-300 dark:border-gray-600" />
            <ArrowDown className="ml-[-21px] h-4 w-4 text-gray-300" />
          </div>

          {/* ── Point B — Livraison ── */}
          <div className="relative pl-6">
            {/* Orange dot */}
            <div className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-orange-500 bg-orange-100" />

            <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
              Point B — Livraison
            </h3>

            <div className="space-y-3">
              <div>
                <label className={LABEL_CLASS}>
                  Adresse de livraison <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500" />
                  <input
                    type="text"
                    className={`${INPUT_CLASS} pl-10`}
                    placeholder="Badalabougou, Rue 12"
                    value={data.deliveryAddress}
                    onChange={(e) => onChange("deliveryAddress", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLASS}>
                    Téléphone client <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      className={`${INPUT_CLASS} pl-10`}
                      placeholder="+223 76 45"
                      value={data.deliveryPhone}
                      onChange={(e) => onChange("deliveryPhone", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Étage / Porte</label>
                  <input
                    type="text"
                    className={INPUT_CLASS}
                    placeholder="Apt 4B..."
                    value={data.deliveryFloor}
                    onChange={(e) => onChange("deliveryFloor", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Distance/Duration info banner ── */}
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 dark:border-blue-900/30 dark:bg-blue-950/20">
          <Navigation className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
            Navigation
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Distance estimée: ~4.2 km
          </span>
          <span className="text-xs text-gray-400">·</span>
          <Clock className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Durée estimée: ~18 min
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          CARD DROITE — Client
      ═══════════════════════════════════════════ */}
      <div className="glass-card rounded-2xl p-5 lg:p-6">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <span className="text-2xl">👤</span>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Client
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Informations du destinataire
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Nom complet */}
          <div>
            <label className={LABEL_CLASS}>
              Nom complet du client <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className={`${INPUT_CLASS} pl-10`}
                placeholder="Aminata Diallo"
                value={data.clientName}
                onChange={(e) => onChange("clientName", e.target.value)}
              />
            </div>
          </div>

          {/* Téléphone + Email */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>
                Téléphone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  className={`${INPUT_CLASS} pl-10`}
                  placeholder="+223 76 45 23 18"
                  value={data.clientPhone}
                  onChange={(e) => onChange("clientPhone", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLASS}>
                Email{" "}
                <span className="text-gray-400">(optionnel)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  className={`${INPUT_CLASS} pl-10`}
                  placeholder="email@exemple.com"
                  value={data.clientEmail}
                  onChange={(e) => onChange("clientEmail", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Instructions de livraison */}
          <div>
            <label className={LABEL_CLASS}>Instructions de livraison</label>
            <textarea
              rows={3}
              className={INPUT_CLASS}
              placeholder="Appeler avant l'arrivée"
              value={data.deliveryInstructions}
              onChange={(e) =>
                onChange("deliveryInstructions", e.target.value)
              }
            />
          </div>

          {/* Hint banner */}
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-2.5 dark:border-amber-900/30 dark:bg-amber-950/20">
            <span className="mt-0.5 text-sm">💡</span>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Ces instructions seront visibles par le livreur
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
