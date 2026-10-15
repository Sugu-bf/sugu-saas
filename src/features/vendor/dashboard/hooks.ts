"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { ReportRange } from "@/features/vendor/statistics/api";
import { fetchDashboardBoard } from "./api";

// Under the vendor's dashboard key: the product and stock changes that refresh it already name it.
export const dashboardKeys = {
  all: () => queryKeys.vendor.dashboard(),
  board: (range: ReportRange) => [...queryKeys.vendor.dashboard(), "board", range] as const,
};

/** One request per period; the previous period's figures stay on screen while another one loads. */
export const useDashboardBoard = (range: ReportRange) =>
  useQuery({ queryKey: dashboardKeys.board(range), queryFn: () => fetchDashboardBoard(range), placeholderData: keepPreviousData, staleTime: 30_000 });
