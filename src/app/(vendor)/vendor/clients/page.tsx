"use client";

import { useVendorClients } from "@/features/vendor/hooks";
import { ClientsContent } from "./clients-content";
import ClientsLoading from "./loading";
import { ErrorState } from "@/components/feedback";

export default function VendorClientsPage() {
  const { data, isLoading, isError, error, refetch } = useVendorClients();

  if (isLoading) return <ClientsLoading />;
  if (isError) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center py-24">
        <ErrorState
          title="Erreur de chargement"
          description={error?.message || "Impossible de charger les clients."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }
  if (!data) return null;

  return <ClientsContent initialData={data} />;
}
