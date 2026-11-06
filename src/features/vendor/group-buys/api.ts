import { api } from "@/lib/http/client";
import { parseGroupBuyPage, parseGroupBuySummary, parseGroupBuyingSettings, parseSettingsUpdate, settingsBody, type GroupBuyList, type StoreOptionChange } from "./contract";

// ============================================================
// Achat groupé — HTTP calls, all through the BFF. Laravel keeps
// each seller to the stores they own: another store's id is
// refused (422), another store's groups are never listed.
// ============================================================

const SETTINGS = "sellers/group-buying/settings";
const GROUPS = "sellers/group-buys";

export const fetchGroupBuyingSettings = async () => parseGroupBuyingSettings(await api.get<unknown>(SETTINGS));

/** Turns the option of one store on or off; the server answers the state it keeps, and a sentence. */
export const saveStoreGroupBuying = async (change: StoreOptionChange) => parseSettingsUpdate(await api.put<unknown>(SETTINGS, settingsBody(change)));

export async function fetchGroupBuys(list: GroupBuyList, page: number) {
  const payload = await api.get<unknown>(GROUPS, { params: { status: list, page } });
  // Read when the answer arrives: the countdowns are measured from the server's "now".
  return parseGroupBuyPage(payload, Date.now());
}

export const fetchGroupBuySummary = async () => parseGroupBuySummary(await api.get<unknown>(`${GROUPS}/summary`));
