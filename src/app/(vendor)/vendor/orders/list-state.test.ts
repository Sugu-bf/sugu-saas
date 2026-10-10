import { describe, expect, it } from "vitest";
import { DEFAULT_LIST_STATE, periodBounds, readListState, writeListState } from "./list-state";

const read = (query: string) => readListState(new URLSearchParams(query));

describe("list state in the URL", () => {
  it("defaults to every order, newest first, page 1", () => {
    expect(read("")).toEqual(DEFAULT_LIST_STATE);
    expect(writeListState(DEFAULT_LIST_STATE).toString()).toBe("");
  });

  it("round-trips a full state", () => {
    const state = {
      status: "canceled",
      search: "awa traoré",
      origin: "direct" as const,
      period: "7d" as const,
      sort: "amount" as const,
      direction: "asc" as const,
      page: 4,
    };
    expect(readListState(writeListState(state))).toEqual(state);
  });

  it("drops what the server would refuse", () => {
    expect(read("status=cancelled&origin=web&period=year&sort=client&dir=up&page=-2")).toEqual(DEFAULT_LIST_STATE);
    expect(read("page=abc").page).toBe(1);
    expect(read("page=2.5").page).toBe(1);
  });

  it("accepts every backend status, not only the main tabs", () => {
    for (const status of ["awaiting_payment", "packed", "returned", "failed"]) {
      expect(read(`status=${status}`).status).toBe(status);
    }
  });
});

describe("period bounds", () => {
  const now = new Date(2026, 9, 10, 15, 30); // 10 October 2026, local time

  it("has no bound without a period", () => {
    expect(periodBounds("", now)).toEqual({});
  });

  it.each([
    ["today", "2026-10-10"],
    ["7d", "2026-10-04"],
    ["30d", "2026-09-11"],
    ["month", "2026-10-01"],
  ] as const)("%s starts on %s and ends today", (period, from) => {
    expect(periodBounds(period, now)).toEqual({ dateFrom: from, dateTo: "2026-10-10" });
  });
});
