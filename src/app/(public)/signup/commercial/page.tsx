import { commercialApi } from "@/features/commercial/api/commercial.api";
import CommercialForm from "@/features/commercial/components/CommercialForm";
import FormDisabled from "@/features/commercial/components/FormDisabled";

export const dynamic = "force-dynamic";

export default async function CommercialSignupPage() {
  let config = null;
  let hasError = false;

  try {
    config = await commercialApi.getConfig();
  } catch (error) {
    console.error("Failed to load commercial configuration:", error);
    hasError = true;
  }

  if (hasError || !config) {
    return (
      <FormDisabled message="La configuration de l'inscription n'a pas pu être récupérée. Veuillez réessayer plus tard." />
    );
  }

  if (!config.enabled) {
    return <FormDisabled message={config.disabled_message} />;
  }

  return (
    <div className="py-10">
      <CommercialForm 
        categories={config.categories || []} 
        countries={config.countries || []} 
      />
    </div>
  );
}
