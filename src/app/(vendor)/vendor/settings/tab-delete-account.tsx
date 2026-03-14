"use client";

import { TabDeleteAccount as SharedTabDeleteAccount, type DeleteAccountConfig } from "@/components/shared/tab-delete-account";
import { useDeleteAccount } from "@/features/vendor/hooks";

// ────────────────────────────────────────────────────────────
// Onglet 10 — Supprimer le compte (Vendor wrapper)
// ────────────────────────────────────────────────────────────

const VENDOR_DELETE_CONFIG: DeleteAccountConfig = {
  confirmations: [
    "Je comprends que cette action est irréversible",
    "J'ai retiré tous mes fonds disponibles",
    "Je confirme vouloir supprimer mon compte et toutes mes données",
  ],
  description: (
    <>
      Toutes vos données, <strong>produits</strong>, historique de <strong>commandes</strong> et <strong>revenus</strong> en attente seront définitivement supprimés.
    </>
  ),
  useDeleteMutation: useDeleteAccount,
  // Redirect handled by the hook's onSuccess — no toast here
  animate: false,
};

export function TabDeleteAccount() {
  return <SharedTabDeleteAccount config={VENDOR_DELETE_CONFIG} />;
}
