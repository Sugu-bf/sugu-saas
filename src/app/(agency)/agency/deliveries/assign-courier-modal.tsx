"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Search, UserCheck, Loader2, Bike } from "lucide-react";
import { useAvailableCouriers, useAssignCourier, useBulkAssign } from "@/features/agency/hooks";

interface AssignCourierModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentIds: string[];
}

export function AssignCourierModal({ isOpen, onClose, shipmentIds }: AssignCourierModalProps) {
  const [search, setSearch] = useState("");
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);

  const { data: couriers, isLoading } = useAvailableCouriers({ search });
  const assignCourier = useAssignCourier();
  const bulkAssign = useBulkAssign();

  const isMutating = assignCourier.isPending || bulkAssign.isPending;

  if (!isOpen) return null;

  const handleAssign = () => {
    if (!selectedCourierId || shipmentIds.length === 0) return;

    if (shipmentIds.length === 1) {
      assignCourier.mutate(
        { shipmentId: shipmentIds[0], courierId: selectedCourierId },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      bulkAssign.mutate(
        { shipmentIds, courierId: selectedCourierId },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal content */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-950 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Assigner un livreur
            </h2>
            {shipmentIds.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {shipmentIds.length} commande{shipmentIds.length > 1 ? "s" : ""} sélectionnée{shipmentIds.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un livreur (nom, véhicule)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm focus:border-sugu-500 focus:outline-none focus:ring-1 focus:ring-sugu-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          {/* List of couriers */}
          <div className="h-64 overflow-y-auto pr-2 space-y-2">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-sugu-500" />
              </div>
            ) : couriers?.length === 0 ? (
              <div className="flex justify-center items-center h-full flex-col text-center">
                  <UserCheck className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-2"/>
                  <span className="text-sm font-medium text-gray-500">Aucun livreur disponible</span>
              </div>
            ) : (
              couriers?.map((courier) => (
                <div
                  key={courier.id}
                  onClick={() => setSelectedCourierId(courier.id)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all hover:border-sugu-300",
                    selectedCourierId === courier.id
                      ? "border-sugu-500 bg-sugu-50 dark:bg-sugu-950/40"
                      : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold", courier.avatarColor)}>
                        {courier.initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{courier.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                            <Bike className="h-3 w-3" />
                            {courier.vehicle}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                            {courier.totalDeliveries} complétées
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <input 
                      type="radio" 
                      name="courier"
                      checked={selectedCourierId === courier.id} 
                      onChange={() => setSelectedCourierId(courier.id)}
                      className="h-4 w-4 accent-sugu-500"
                      onClick={(e) => e.stopPropagation()} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Annuler
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedCourierId || isMutating}
            className="flex items-center justify-center gap-2 rounded-xl bg-sugu-500 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-sugu-600 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
            Assigner
          </button>
        </div>
      </div>
    </div>
  );
}
