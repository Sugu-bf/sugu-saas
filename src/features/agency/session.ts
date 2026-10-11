"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/features/auth/hooks";
import { queryKeys } from "@/lib/query";

/**
 * The agency of the signed-in account. Every agency endpoint is addressed by
 * it (`agencies/{id}/…`); Laravel checks that the account belongs to it.
 *
 * A session opened before `delivery_partner_id` was part of `/me` does not
 * carry it: it is asked again, once.
 */
export function useAgencyId(): string | null {
  const queryClient = useQueryClient();
  const { data: user, isFetched } = useSession();
  const agencyId = user?.delivery_partner_id ?? null;

  useEffect(() => {
    if (isFetched && user && user.role === "agency" && !agencyId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    }
  }, [isFetched, user, agencyId, queryClient]);

  return agencyId;
}

/** The name of the agency, as the session carries it. */
export function useAgencyName(): string | null {
  const { data: user } = useSession();
  return user?.business_name ?? null;
}
