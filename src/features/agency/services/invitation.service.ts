import { api } from "@/lib/http/client";

// The code a courier types at sign-up to join the agency, and the sign-up
// link that carries it.

export interface InvitationCodeResponse {
  code: string;
  link: string;
}

/**
 * Get or regenerate the agency invitation code for drivers.
 *
 * GET /partners/drivers/referral-code[?refresh=true]
 */
export async function getInvitationCode(refresh = false): Promise<InvitationCodeResponse> {
  const params: Record<string, string | undefined> = {};
  if (refresh) params.refresh = "true";
  return api.get<InvitationCodeResponse>("partners/drivers/referral-code", { params });
}
