"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { once } from "@/features/agency/single-flight";
import { queryKeys } from "@/lib/query";
import {
  acceptAssignment,
  acceptInvitation,
  createInvitation,
  createLead,
  declineAssignment,
  declineInvitation,
  endAssignment,
  fetchAssignments,
  fetchFollowedOrders,
  fetchInvitationPreview,
  fetchInvitations,
  fetchLeads,
  fetchMe,
  fetchOverview,
  fetchSellerLanaya,
  fetchSellers,
  revokeInvitation,
  saveApplication,
  startApplication,
  submitApplication,
  updateLead,
  uploadDocument,
  withdrawApplication,
  type ApplicationInput,
  type InvitationInput,
  type LeadFilters,
  type LeadInput,
} from "./contract";

const root = ["lanaya"] as const;
export const lanayaKeys = {
  all: root,
  me: () => [...root, "me"] as const,
  overview: () => [...root, "overview"] as const,
  leads: (filters: LeadFilters) => [...root, "leads", filters] as const,
  invitations: (status?: string) => [...root, "invitations", status ?? "all"] as const,
  sellers: () => [...root, "sellers"] as const,
  preview: (token: string) => [...root, "preview", token] as const,
  seller: () => [...root, "seller"] as const,
  assignments: () => [...root, "assignments"] as const,
  orders: (page: number) => [...root, "orders", page] as const,
};

/** After a change of state, the session profile (lanaya block) is read again too. */
function useRefresh() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: lanayaKeys.all }), queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })]);
}

export function useLanayaMe() {
  return useQuery({ queryKey: lanayaKeys.me(), queryFn: fetchMe, staleTime: 15_000 });
}

export function useLanayaOverview() {
  return useQuery({ queryKey: lanayaKeys.overview(), queryFn: fetchOverview, staleTime: 15_000 });
}

export function useLanayaLeads(filters: LeadFilters) {
  return useQuery({ queryKey: lanayaKeys.leads(filters), queryFn: () => fetchLeads(filters), placeholderData: (previous) => previous });
}

export function useLanayaInvitations(status?: string) {
  return useQuery({ queryKey: lanayaKeys.invitations(status), queryFn: () => fetchInvitations(status) });
}

export function useLanayaSellers() {
  return useQuery({ queryKey: lanayaKeys.sellers(), queryFn: fetchSellers });
}

/** An invitation opened from its link; nothing is asked of the server without a token. */
export function useInvitationPreview(token: string | null) {
  return useQuery({ queryKey: lanayaKeys.preview(token ?? ""), queryFn: () => fetchInvitationPreview(token ?? ""), enabled: Boolean(token), retry: false });
}

/** The shape of a token the server could have issued (64 hex characters today). */
export const isInvitationToken = (value: string | null | undefined): value is string => typeof value === "string" && /^[A-Za-z0-9]{16,128}$/.test(value);

export function useLanayaAssignments() {
  return useQuery({ queryKey: lanayaKeys.assignments(), queryFn: fetchAssignments });
}

export function useFollowedOrders(page = 1) {
  return useQuery({ queryKey: lanayaKeys.orders(page), queryFn: () => fetchFollowedOrders(page), placeholderData: (previous) => previous });
}

/** The seller's answers to SUGU's proposal, and the end of an assignment. */
export function useAssignmentAnswer() {
  const refresh = useRefresh();
  const accept = useMutation({ mutationFn: (id: string) => once(["lanaya assignment accept", id], () => acceptAssignment(id)), onSettled: refresh });
  const decline = useMutation({ mutationFn: (id: string) => once(["lanaya assignment decline", id], () => declineAssignment(id)), onSettled: refresh });
  const end = useMutation({ mutationFn: ({ id, reason }: { id: string; reason?: string | null }) => once(["lanaya assignment end", id], () => endAssignment(id, reason)), onSettled: refresh });
  return { accept, decline, end };
}

export function useSellerLanaya() {
  return useQuery({ queryKey: lanayaKeys.seller(), queryFn: fetchSellerLanaya });
}

export function useStartApplication() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (input: ApplicationInput) => once(["lanaya start"], () => startApplication(input)), onSettled: refresh });
}

export function useSaveApplication() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (input: ApplicationInput) => saveApplication(input), onSettled: refresh });
}

export function useSubmitApplication() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (consents: Record<string, boolean>) => once(["lanaya submit"], () => submitApplication(consents)), onSettled: refresh });
}

export function useWithdrawApplication() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: () => once(["lanaya withdraw"], withdrawApplication), onSettled: refresh });
}

export function useUploadLanayaDocument() {
  const refresh = useRefresh();
  return useMutation({
    // One request for one click: the same file sent twice in a row is sent once.
    mutationFn: ({ type, file }: { type: string; file: File }) => once(["lanaya upload", type, file], () => uploadDocument(type, file)),
    onSettled: refresh,
  });
}

export function useCreateLead() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (input: LeadInput) => once(["lanaya lead", input.phone], () => createLead(input)), onSettled: refresh });
}

export function useUpdateLead() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<LeadInput> & { status?: string } }) => updateLead(id, input), onSettled: refresh });
}

export function useCreateInvitation() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ input, key }: { input: InvitationInput; key: string }) => once(["lanaya invitation", key], () => createInvitation(input, key)),
    onSettled: refresh,
  });
}

export function useRevokeInvitation() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => once(["lanaya revoke", id], () => revokeInvitation(id)), onSettled: refresh });
}

export function useAnswerInvitation(token: string) {
  const refresh = useRefresh();
  const accept = useMutation({ mutationFn: (storeId: string) => once(["lanaya accept", token], () => acceptInvitation(token, storeId)), onSettled: refresh });
  const decline = useMutation({ mutationFn: () => once(["lanaya decline", token], () => declineInvitation(token)), onSettled: refresh });
  return { accept, decline };
}
