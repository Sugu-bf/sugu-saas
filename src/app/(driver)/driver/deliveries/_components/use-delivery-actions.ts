"use client";

// ============================================================
// useDeliveryActions — centralised mutation handlers
// Consolidates all delivery action mutations + toast messages
// into a single hook for clean consumption in the orchestrator.
// ============================================================

import { useCallback } from "react";
import {
  useAcceptDelivery,
  useRefuseDelivery,
  useMarkDelivered,
  useSignalDelay,
  useMarkFailed,
} from "@/features/driver/hooks";
import { toast } from "sonner";

export function useDeliveryActions() {
  const acceptMutation = useAcceptDelivery();
  const refuseMutation = useRefuseDelivery();
  const markDeliveredMutation = useMarkDelivered();
  const signalDelayMutation = useSignalDelay();
  const markFailedMutation = useMarkFailed();

  const isMutating =
    acceptMutation.isPending ||
    refuseMutation.isPending ||
    markDeliveredMutation.isPending ||
    signalDelayMutation.isPending ||
    markFailedMutation.isPending;

  const handleAccept = useCallback(
    (id: string) => {
      acceptMutation.mutate(id, {
        onSuccess: () => toast.success("Livraison acceptée !"),
      });
    },
    [acceptMutation],
  );

  const handleRefuse = useCallback(
    (id: string) => {
      refuseMutation.mutate(id, {
        onSuccess: () => toast.info("Livraison refusée"),
      });
    },
    [refuseMutation],
  );

  const handleMarkDelivered = useCallback(
    (id: string) => {
      markDeliveredMutation.mutate(id, {
        onSuccess: () => toast.success("Livraison marquée comme livrée"),
      });
    },
    [markDeliveredMutation],
  );

  const handleSignalDelay = useCallback(
    (id: string) => {
      signalDelayMutation.mutate(id, {
        onSuccess: () => toast.warning("Retard signalé à l'agence"),
      });
    },
    [signalDelayMutation],
  );

  const handleMarkFailed = useCallback(
    (id: string) => {
      markFailedMutation.mutate(id, {
        onSuccess: () => toast.error("Livraison marquée comme échouée"),
      });
    },
    [markFailedMutation],
  );

  return {
    isMutating,
    handleAccept,
    handleRefuse,
    handleMarkDelivered,
    handleSignalDelay,
    handleMarkFailed,
  };
}
