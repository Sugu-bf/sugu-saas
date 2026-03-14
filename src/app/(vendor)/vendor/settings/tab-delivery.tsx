"use client";

import { useState, useEffect } from "react";
import { SectionCard, Toggle, PillInput, PillSelect, PillButton, Field } from "@/components/shared/settings-ui";
import { MapPin, Save, Loader2, CheckCircle2 } from "lucide-react";
import { useVendorSettings, useUpdateOperations } from "@/features/vendor/hooks";

// ────────────────────────────────────────────────────────────
// Onglet 3 — Livraison
// ────────────────────────────────────────────────────────────

export function TabDelivery() {
  const { data: settingsData } = useVendorSettings();
  const apiDelivery = settingsData?.operations?.delivery;
  const updateOperationsMutation = useUpdateOperations();

  const [prepDelay, setPrepDelay] = useState("24h");
  const [maxWeight, setMaxWeight] = useState("30");
  const [instructions, setInstructions] = useState("");
  const [pickupEnabled, setPickupEnabled] = useState(apiDelivery?.pickup ?? false);
  const [pickupAddress, setPickupAddress] = useState(
    settingsData ? `${settingsData.shop.fullAddress}, ${settingsData.shop.city}`.replace(/^, |, $/g, "") : ""
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state when API data arrives
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (settingsData) {
      setPickupEnabled(settingsData.operations?.delivery?.pickup ?? false);
      setPickupAddress(
        `${settingsData.shop.fullAddress}, ${settingsData.shop.city}`.replace(/^, |, $/g, "")
      );
    }
  }, [settingsData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSaveDelivery = async () => {
    try {
      await updateOperationsMutation.mutateAsync({
        delivery: {
          pickup: pickupEnabled,
          localDelivery: apiDelivery?.localDelivery ?? false,
          shipping: apiDelivery?.shipping ?? false,
          international: apiDelivery?.international ?? false,
        },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("[delivery] Save failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Card: Préférences ─── */}
      <SectionCard title="Préférences de livraison" id="delivery-prefs">
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Délai de préparation par défaut">
            <PillSelect
              value={prepDelay}
              onChange={setPrepDelay}
              options={[
                { value: "same_day", label: "Même jour" },
                { value: "24h", label: "24h" },
                { value: "48h", label: "48h" },
                { value: "3_5days", label: "3-5 jours" },
              ]}
            />
          </Field>
          <Field label="Poids maximum par colis (kg)">
            <PillInput value={maxWeight} onChange={setMaxWeight} suffix={<span className="text-xs text-gray-400">kg</span>} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Instructions de ramassage">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Instructions pour le livreur lors du ramassage..."
              className="w-full rounded-2xl border border-white/60 bg-white/50 px-4 py-2.5 text-sm text-gray-700 backdrop-blur placeholder:text-gray-400 transition-all focus:border-sugu-300 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200 resize-none"
            />
          </Field>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Toggle checked={pickupEnabled} onChange={() => setPickupEnabled(!pickupEnabled)} label="Retrait en boutique" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Autoriser le retrait en boutique</span>
          </div>
          {pickupEnabled && (
            <div className="ml-14">
              <Field label="Adresse de retrait">
                <PillInput value={pickupAddress} onChange={setPickupAddress} prefix={<MapPin className="h-3.5 w-3.5" />} />
              </Field>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ─── Save button ─── */}
      <div className="flex items-center gap-3">
        <PillButton
          variant="primary"
          onClick={handleSaveDelivery}
          disabled={updateOperationsMutation.isPending}
        >
          {updateOperationsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder la livraison
        </PillButton>
        {saveSuccess && (
          <span className="text-xs text-green-600"><CheckCircle2 className="inline h-3 w-3" /> Préférences sauvegardées</span>
        )}
      </div>
    </div>
  );
}
