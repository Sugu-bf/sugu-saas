import { Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { WalletPayoutInfo } from "@/features/shared/wallet.types";

interface WalletNextPayoutCardProps {
  payout: WalletPayoutInfo;
  /** text-[10px] for driver, text-xs for vendor — pass the class */
  methodLabelClass?: string;
}

/** Next Payout Card */
export function WalletNextPayoutCard({
  payout,
  methodLabelClass = "text-xs",
}: WalletNextPayoutCardProps) {
  return (
    <div className="glass-card rounded-2xl p-4 transition-all duration-300 lg:rounded-3xl lg:p-6 h-full flex flex-col">
      <h2 className="text-base font-semibold text-gray-900 lg:text-lg">
        Prochain versement
      </h2>

      {/* Amount */}
      <div className="mt-3 lg:mt-4">
        <span className="text-3xl font-black text-gray-900 lg:text-4xl">
          {formatCurrency(payout.amount)}
        </span>
        <span className="ml-1.5 text-sm font-semibold text-gray-500">FCFA</span>
      </div>

      {/* Scheduled date */}
      <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
        <Calendar className="h-3.5 w-3.5" />
        <span>
          Prévu le{" "}
          <strong className="text-gray-700">{payout.scheduledDate}</strong>
        </span>
      </div>

      {/* Payment method */}
      <div className="mt-4 flex-1">
        <p className={`${methodLabelClass} font-semibold text-gray-400 uppercase tracking-wider`}>
          Méthode de paiement
        </p>
        {payout.method ? (
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
              OM
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">
                {payout.method.providerLabel}
              </p>
              <p className="text-xs text-gray-500">
                {payout.method.accountMasked}
              </p>
            </div>
            <button className="text-xs font-semibold text-sugu-500 transition-colors hover:text-sugu-600">
              Modifier
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-400">Aucune méthode configurée</p>
        )}
      </div>

      {/* Min threshold */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100/60 pt-3">
        <span className="text-xs text-gray-500">Seuil minimum de retrait</span>
        <span className="text-sm font-bold text-gray-800">
          {formatCurrency(payout.minThreshold)} FCFA
        </span>
      </div>
    </div>
  );
}
