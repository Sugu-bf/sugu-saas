import { z } from "zod";
import { asCents, type MoneyCents } from "@/design-system";
import { api } from "@/lib/http/client";

// ============================================================
// History of a courier — `GET courier/history`: the missions that
// are over, delivered or failed. Amounts are CENTIMES.
//
// A mission the courier refused is not here: refusing gives it back
// to the agency, and nothing of it is kept under the courier's name.
// ============================================================

export type HistoryStatus = "delivered" | "failed";

export interface HistoryQuery {
  status?: HistoryStatus;
  search?: string;
  /** Days, both included: `2026-10-12`. */
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export const HISTORY_PAGE_SIZES = [10, 25, 50] as const;

const text = z
  .string()
  .nullish()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : null));

const rowSchema = z.object({
  id: z.string(),
  reference: text,
  order_id: text,
  status: z.string(),
  finished_at: text,
  client_name: text,
  pickup_name: text,
  delivery_name: text,
  amount: z.coerce.number().catch(0),
  cash_collected: z.coerce.number().catch(0),
  fail_reason: text,
});

const pageSchema = z.object({
  status_counts: z.object({ all: z.coerce.number().catch(0), delivered: z.coerce.number().catch(0), failed: z.coerce.number().catch(0) }),
  rows: z.array(rowSchema),
  pagination: z.object({ current_page: z.coerce.number().catch(1), per_page: z.coerce.number().catch(10), total_items: z.coerce.number().catch(0) }),
});

export interface HistoryRow {
  id: string;
  reference: string | null;
  /** Raw `ShipmentStatus`: `delivered` or `delivery_failed`. */
  status: string;
  finishedAt: string | null;
  client: string | null;
  pickup: string | null;
  destination: string | null;
  /** What the delivery was paid to the agency. */
  fee: MoneyCents;
  /** Cash the courier took at the door for this order. */
  cashCollected: MoneyCents;
  failReason: string | null;
}

export interface HistoryPage {
  counts: { all: number; delivered: number; failed: number };
  rows: HistoryRow[];
  page: number;
  pageSize: number;
  total: number;
}

export function parseHistory(raw: unknown): HistoryPage {
  const data = pageSchema.parse(raw);
  return {
    counts: data.status_counts,
    rows: data.rows.map((row) => ({
      id: row.id,
      reference: row.reference ?? row.order_id?.replace(/^#/, "") ?? null,
      status: row.status,
      finishedAt: row.finished_at,
      client: row.client_name,
      pickup: row.pickup_name,
      destination: row.delivery_name,
      fee: asCents(row.amount),
      cashCollected: asCents(row.cash_collected),
      failReason: row.status === "delivery_failed" ? row.fail_reason : null,
    })),
    page: data.pagination.current_page,
    pageSize: data.pagination.per_page,
    total: data.pagination.total_items,
  };
}

export async function fetchHistory(query: HistoryQuery): Promise<HistoryPage> {
  const response = await api.get<{ data: unknown }>("courier/history", {
    params: {
      status: query.status,
      search: query.search?.trim() || undefined,
      from: query.from || undefined,
      to: query.to || undefined,
      page: query.page,
      per_page: query.pageSize,
    },
  });
  return parseHistory(response.data);
}
