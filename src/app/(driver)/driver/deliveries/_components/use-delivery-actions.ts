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
  useStartTransit,
  useMarkArrived,
  useMarkDelivered,
  useSignalDelay,
  useMarkFailed,
} from "@/features/driver/hooks";
import { toast } from "sonner";

export function useDeliveryActions() {
  const acceptMutation = useAcceptDelivery();
  const refuseMutation = useRefuseDelivery();
  const startTransitMutation = useStartTransit();
  const markArrivedMutation = useMarkArrived();
  const markDeliveredMutation = useMarkDelivered();
  const signalDelayMutation = useSignalDelay();
  const markFailedMutation = useMarkFailed();

  const isMutating =
    acceptMutation.isPending ||
    refuseMutation.isPending ||
    startTransitMutation.isPending ||
    markArrivedMutation.isPending ||
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

  const handleStartTransit = useCallback(
    (id: string) => {
      startTransitMutation.mutate(id, {
        onSuccess: () => toast.success("Itinéraire commencé !"),
      });
    },
    [startTransitMutation],
  );

  const handleMarkArrived = useCallback(
    (id: string) => {
      markArrivedMutation.mutate(id, {
        onSuccess: () => toast.success("Arrivé à destination !"),
      });
    },
    [markArrivedMutation],
  );

  const handleMarkDelivered = useCallback(
    (id: string, code: string) => {
      if (!code) {
        toast.error("Code de sécurité requis");
        return;
      }
      markDeliveredMutation.mutate({ deliveryId: id, code }, {
        onSuccess: () => toast.success("Livraison marquée comme livrée"),
        onError: () => toast.error("Code de livraison invalide"),
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
    handleStartTransit,
    handleMarkArrived,
    handleMarkDelivered,
    handleSignalDelay,
    handleMarkFailed,
  };
}
