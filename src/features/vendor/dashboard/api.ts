import { api } from "@/lib/http/client";
import type { ReportRange } from "@/features/vendor/statistics/api";
import { parseDashboardBoard } from "./contract";

/** The server computes the period, the one before it, and every figure. */
export const fetchDashboardBoard = async (range: ReportRange) =>
  parseDashboardBoard(
    await api.get<unknown>("sellers/dashboard", {
      params: "period" in range ? { view: "board", period: range.period } : { view: "board", from: range.from, to: range.to },
    }),
  );
