import { describe, expect, it } from "vitest";
import { DEFAULT_LIST_STATE, readListState, writeListState } from "./list-state";

const read = (query: string) => readListState(new URLSearchParams(query));

describe("product list state in the URL", () => {
  it("defaults to the whole catalogue, newest first, page 1", () => {
    expect(read("")).toEqual(DEFAULT_LIST_STATE);
    expect(writeListState(DEFAULT_LIST_STATE).toString()).toBe("");
  });

  it("round-trips a full state, category included", () => {
    const state = {
      status: "submitted",
      category: "01HZX0CATBIJOUX0000000000A",
      stock: "low_stock" as const,
      search: "pagne tissé",
      sort: "price" as const,
      direction: "asc" as const,
      page: 3,
    };
    expect(readListState(writeListState(state))).toEqual(state);
  });

  it("drops what the server would refuse", () => {
    expect(read("status=published&stock=empty&sort=category&dir=up&page=-2")).toEqual(DEFAULT_LIST_STATE);
    expect(read("page=2.5").page).toBe(1);
  });

  it("keeps a category only when it has the shape of an id", () => {
    expect(read("category=42").category).toBe("42");
    expect(read("category=cat-textile").category).toBe("cat-textile");
    // Not an id: a name, markup, or something far too long.
    expect(read("category=Pagnes%20et%20tissus").category).toBe("");
    expect(read("category=%3Cscript%3E").category).toBe("");
    expect(read(`category=${"a".repeat(65)}`).category).toBe("");
  });
});
