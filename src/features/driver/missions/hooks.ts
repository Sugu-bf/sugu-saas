"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { once } from "@/features/agency/single-flight";
import { queryKeys } from "@/lib/query";
import {
  acceptMission,
  confirmCollection,
  fetchMission,
  fetchMissions,
  fetchOverview,
  markArrived,
  markDelivered,
  markFailed,
  refuseMission,
  signalDelay,
  startTransit,
  type FailureCode,
  type MissionListQuery,
} from "./api";

// ── Reads ───────────────────────────────────────────────────

const portal = () => [...queryKeys.driver.all, "portal"] as const;

export const missionKeys = {
  overview: () => [...portal(), "overview"] as const,
  list: (query: MissionListQuery) => [...portal(), "missions", query] as const,
  detail: (id: string) => [...portal(), "mission", id] as const,
};

export function useOverview(options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: missionKeys.overview(), queryFn: fetchOverview, staleTime: 30_000, enabled: options.enabled ?? true });
}

export function useMissions(query: MissionListQuery) {
  return useQuery({
    queryKey: missionKeys.list(query),
    queryFn: () => fetchMissions(query),
    staleTime: 15_000,
    // Another tab, page or search keeps the current cards visible while it loads.
    placeholderData: keepPreviousData,
  });
}

export function useMission(id: string) {
  return useQuery({ queryKey: missionKeys.detail(id), queryFn: () => fetchMission(id), enabled: Boolean(id), staleTime: 10_000 });
}

// ── Mutations ───────────────────────────────────────────────

/**
 * What the courier does to a mission. Nothing is assumed about the result:
 * every courier screen is read again once the server has answered, on success
 * as on refusal — a refusal often means the mission moved meanwhile (the
 * agency gave it to somebody else, the customer paid).
 */
export type MissionCommand =
  | { type: "accept"; id: string }
  | { type: "refuse"; id: string }
  | { type: "confirm_collection"; id: string; productId: string; pickupCode: string }
  | { type: "start_transit"; id: string }
  | { type: "mark_arrived"; id: string }
  | { type: "mark_delivered"; id: string; code: string }
  | { type: "signal_delay"; id: string; reason: string }
  | { type: "mark_failed"; id: string; code: FailureCode; reason: string };

function run(command: MissionCommand): Promise<unknown> {
  switch (command.type) {
    case "accept":
      return acceptMission(command.id);
    case "refuse":
      return refuseMission(command.id);
    case "confirm_collection":
      return confirmCollection(command.id, command.productId, command.pickupCode);
    case "start_transit":
      return startTransit(command.id);
    case "mark_arrived":
      return markArrived(command.id);
    case "mark_delivered":
      return markDelivered(command.id, command.code);
    case "signal_delay":
      return signalDelay(command.id, command.reason);
    case "mark_failed":
      return markFailed(command.id, command.code, command.reason);
  }
}

export function useMissionCommand() {
  const queryClient = useQueryClient();
  return useMutation({
    // The same change asked twice (a double tap) joins the request already sent.
    mutationFn: (command: MissionCommand) => once(["mission", command], () => run(command)),
    // The old screens of the space (earnings) read the same data under other keys.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.driver.all }),
  });
}
