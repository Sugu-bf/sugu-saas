"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { once } from "@/features/agency/single-flight";
import { queryKeys } from "@/lib/query";
import { fetchCourierFile, uploadDocument, type DocumentType } from "./contract";

const fileKey = () => [...queryKeys.driver.all, "portal", "file"] as const;

/** Profile, vehicle, documents and where the verification stands. */
export function useCourierFile() {
  return useQuery({ queryKey: fileKey(), queryFn: fetchCourierFile, staleTime: 30_000 });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    // One request for one click: the same file sent twice in a row is sent once.
    mutationFn: ({ type, file }: { type: DocumentType; file: File }) => once(["kyc upload", type, file], () => uploadDocument(type, file)),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.driver.all }),
        // A refused file sent again changes the status of the account.
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() }),
      ]),
  });
}
