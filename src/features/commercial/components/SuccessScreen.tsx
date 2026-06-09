import { CheckCircle2, Store, Mail, ArrowRight } from "lucide-react";
import { SectionCard, PillButton } from "@/components/shared/settings-ui";

interface SuccessScreenProps {
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  onReset: () => void;
}

export default function SuccessScreen({
  storeName,
  ownerName,
  ownerEmail,
  onReset,
}: SuccessScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg animate-card-enter">
        <SectionCard title="" className="p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/20 text-green-500 mb-6">
            <CheckCircle2 className="h-12 w-12" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Boutique Créée !
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            La demande d'inscription a été enregistrée avec succès. Elle est désormais en attente de validation par l'administrateur.
          </p>

          <div className="bg-white/30 dark:bg-white/5 rounded-2xl p-5 border border-white/40 dark:border-white/5 text-left mb-8 space-y-4">
            <div className="flex items-start gap-3">
              <Store className="h-5 w-5 text-sugu-500 mt-0.5" />
              <div>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 uppercase font-semibold tracking-wider block">Boutique</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{storeName}</span>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-gray-100 dark:border-gray-800/40 pt-4">
              <Mail className="h-5 w-5 text-sugu-500 mt-0.5" />
              <div>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 uppercase font-semibold tracking-wider block">Propriétaire</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{ownerName}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">{ownerEmail}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-4 text-left text-xs text-amber-800 dark:text-amber-400 mb-8">
            💡 Un email de bienvenue contenant un lien de réinitialisation de mot de passe a été envoyé au propriétaire pour lui permettre d'accéder à son portail vendeur.
          </div>

          <div className="flex justify-center">
            <PillButton onClick={onReset} className="w-full sm:w-auto">
              Inscrire une nouvelle boutique
              <ArrowRight className="h-4 w-4 ml-1" />
            </PillButton>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
