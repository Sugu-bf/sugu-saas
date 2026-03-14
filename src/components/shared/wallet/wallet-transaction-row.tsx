import { CheckCircle2, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type {
  WalletTransaction,
  EntryTypeConfigItem,
  StatusDisplayItem,
} from "@/features/shared/wallet.types";

interface WalletTransactionRowProps {
  entry: WalletTransaction;
  entryTypeConfig: Record<string, EntryTypeConfigItem>;
  statusDisplay: Record<string, StatusDisplayItem>;
  defaultCategory: string;
  getCategory: (entry: WalletTransaction) => string;
}

/** Single transaction row */
export function WalletTransactionRow({
  entry,
  entryTypeConfig,
  statusDisplay,
  defaultCategory,
  getCategory,
}: WalletTransactionRowProps) {
  const category = getCategory(entry);
  const config = entryTypeConfig[category] ?? entryTypeConfig[defaultCategory];
  const statusInfo = statusDisplay[entry.status] ?? statusDisplay.confirmed;

  return (
    <div className="flex flex-col gap-2 border-b border-gray-100/60 px-2 py-3.5 transition-colors active:bg-white/40 lg:flex-row lg:items-center lg:gap-4 lg:hover:bg-white/40">
      {/* Date */}
      <span className="hidden text-xs text-gray-500 lg:block lg:w-24">
        {entry.date}
      </span>

      {/* Description */}
      <div className="flex items-center justify-between lg:contents">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {entry.description}
          </p>
          <p className="text-xs text-gray-400 lg:hidden">{entry.date}</p>
        </div>
      </div>

      {/* Type pill (desktop) */}
      <div className="hidden lg:flex lg:w-20 lg:justify-center">
        <span
          className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.style}`}
        >
          {config.label}
        </span>
      </div>

      {/* Amount */}
      <div className="flex items-center justify-between lg:contents">
        {/* Mobile type pill */}
        <span
          className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold lg:hidden ${config.style}`}
        >
          {config.label}
        </span>

        <span
          className={`text-sm font-bold lg:w-28 lg:text-right ${config.color}`}
        >
          {config.prefix}
          {formatCurrency(entry.amount)} FCFA
        </span>
      </div>

      {/* Status — unified with React icons (CheckCircle2 / Clock) */}
      <span
        className={`hidden text-xs font-medium lg:flex lg:items-center lg:gap-1 lg:w-24 lg:justify-end ${statusInfo.color}`}
      >
        {entry.status === "pending" ? (
          <Clock className="h-3 w-3" />
        ) : (
          <CheckCircle2 className="h-3 w-3" />
        )}
        {statusInfo.label}
      </span>
    </div>
  );
}
