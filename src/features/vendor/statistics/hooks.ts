"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchSalesReport, type ReportRange } from "./api";

export const statisticsKeys = {
  report: (range: ReportRange) => ["vendor-statistics", "report", range] as const,
};

/** One request per period: choosing another one asks the server again, the figures of the previous one staying on screen meanwhile. */
export const useSalesReport = (range: ReportRange) => useQuery({ queryKey: statisticsKeys.report(range), queryFn: () => fetchSalesReport(range), placeholderData: keepPreviousData, staleTime: 60_000 });
