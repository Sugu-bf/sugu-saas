import { ShieldAlert } from "lucide-react";
import { SectionCard } from "@/components/shared/settings-ui";

interface FormDisabledProps {
  message?: string;
}

export default function FormDisabled({ message }: FormDisabledProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <SectionCard title="" className="text-center p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sugu-50 dark:bg-sugu-950/20 text-sugu-500 mb-6">
            <ShieldAlert className="h-8 w-8" />
          </div>
          
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Inscription Suspendue
          </h1>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {message || "Le formulaire d'inscription commerciale terrain est actuellement désactivé."}
          </p>

          <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800/40 pt-4">
            Veuillez contacter votre superviseur ou administrateur de la plateforme pour plus d'informations.
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
