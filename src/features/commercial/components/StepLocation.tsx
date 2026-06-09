import { useState } from "react";
import { MapPin, Navigation, Compass } from "lucide-react";
import { Field, PillInput, PillSelect, PillButton } from "@/components/shared/settings-ui";
import type { CommercialFormData, CommercialCountry } from "../types/commercial.types";

interface StepLocationProps {
  data: CommercialFormData;
  onChange: (field: keyof CommercialFormData, value: string | number | File | number[] | string[] | null) => void;
  countries: CommercialCountry[];
  errors: Record<string, string>;
}

export default function StepLocation({ data, onChange, countries, errors }: StepLocationProps) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoMessage("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setGeoLoading(true);
    setGeoMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange("lat", position.coords.latitude);
        onChange("lng", position.coords.longitude);
        setGeoLoading(false);
        setGeoMessage("Coordonnées GPS capturées avec succès !");
      },
      (error) => {
        setGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoMessage("Veuillez autoriser l'accès GPS dans les paramètres.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoMessage("Position GPS indisponible.");
            break;
          case error.TIMEOUT:
            setGeoMessage("Délai d'attente dépassé.");
            break;
          default:
            setGeoMessage("Erreur lors de la capture de la position.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const countryOptions = countries.map((c) => ({
    value: c.code,
    label: `${c.flag_emoji} ${c.name} (${c.code})`
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Localisation de la Boutique</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{"Renseignez l'emplacement physique exact de la boutique terrain."}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Pays" required>
          <PillSelect
            value={data.country}
            onChange={(v) => onChange("country", v)}
            options={countryOptions.length > 0 ? countryOptions : [{ value: "BF", label: "🇧🇫 Burkina Faso" }]}
          />
        </Field>

        <Field label="Ville" required>
          <PillInput
            value={data.city}
            onChange={(v) => onChange("city", v)}
            placeholder="Ex: Ouagadougou"
            prefix={<MapPin className="h-4 w-4" />}
            className={errors.city ? "border-red-300 focus:border-red-500" : ""}
          />
          {errors.city && (
            <p className="mt-1 text-xs text-red-500">{errors.city}</p>
          )}
        </Field>
      </div>

      <Field label="Quartier" hint="Nom du quartier, secteur ou zone commerciale">
        <PillInput
          value={data.neighborhood}
          onChange={(v) => onChange("neighborhood", v)}
          placeholder="Ex: Koulouba"
          prefix={<Compass className="h-4 w-4" />}
        />
      </Field>

      <Field label="Adresse / Rue" required hint="Description de la rue ou repère précis">
        <PillInput
          value={data.address}
          onChange={(v) => onChange("address", v)}
          placeholder="Ex: Rue de la Nation, porte 302"
          prefix={<MapPin className="h-4 w-4" />}
          className={errors.address ? "border-red-300 focus:border-red-500" : ""}
        />
        {errors.address && (
          <p className="mt-1 text-xs text-red-500">{errors.address}</p>
        )}
      </Field>

      <div className="border border-white/60 dark:border-gray-800/40 bg-white/30 dark:bg-white/5 rounded-2xl p-4 mt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Navigation className="h-4 w-4 text-sugu-500" />
              Coordonnées GPS
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              {data.lat && data.lng 
                ? `Latitude: ${data.lat.toFixed(5)} | Longitude: ${data.lng.toFixed(5)}` 
                : "Non capturées (requis pour le calcul des frais de livraison)"
              }
            </p>
          </div>
          
          <PillButton
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetLocation}
            disabled={geoLoading}
            className="w-full sm:w-auto"
          >
            {geoLoading ? "Capture..." : "Ma position GPS"}
          </PillButton>
        </div>
        
        {geoMessage && (
          <p className={`mt-2 text-xs font-medium ${geoMessage.includes("succès") ? "text-green-500" : "text-amber-500"}`}>
            {geoMessage}
          </p>
        )}
      </div>
    </div>
  );
}
