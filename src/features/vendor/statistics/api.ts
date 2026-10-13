import { api } from "@/lib/http/client";
import type { PeriodKey } from "@/features/insights/contract";
import { parseSalesReport } from "./contract";

/** A preset the server knows, or two days (`YYYY-MM-DD`, both included). */
export type ReportRange = { period: PeriodKey } | { from: string; to: string };

/** The server computes the period, the one before it, and every figure. */
export const fetchSalesReport = async (range: ReportRange) => parseSalesReport(await api.get<unknown>("sellers/statistics", { params: "period" in range ? { period: range.period } : { from: range.from, to: range.to } }));
