"use client";

import { TabDeleteAccount as SharedTabDeleteAccount, type DeleteAccountConfig } from "@/components/shared/tab-delete-account";
import { useDeleteDriverAccount } from "@/features/driver/hooks";
import { toast } from "sonner";

// ────────────────────────────────────────────────────────────
// Onglet 6 — Supprimer le compte (Driver wrapper)
// ────────────────────────────────────────────────────────────

const DRIVER_DELETE_CONFIG: DeleteAccountConfig = {
  confirmations: [
    "Je comprends que cette action est irréversible",
    "J'ai retiré tous mes gains disponibles",
    "Je confirme vouloir supprimer mon compte et toutes mes données",
  ],
  description: (
    <>
      Toutes vos données, historique de <strong>livraisons</strong>, <strong>gains</strong>, et <strong>documents KYC</strong> seront définitivement supprimés.
    </>
  ),
  useDeleteMutation: useDeleteDriverAccount,
  onSuccess: () => {
    toast.success("Votre compte a été supprimé");
  },
  animate: true,
};

export function TabDeleteAccount() {
  return <SharedTabDeleteAccount config={DRIVER_DELETE_CONFIG} />;
}
