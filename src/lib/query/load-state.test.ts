import { describe, it, expect } from "vitest";
import { loadStateOf } from "./load-state";

describe("loadStateOf", () => {
  it("reports an error even when stale data would make the list look empty", () => {
    expect(loadStateOf({ isError: true, isSuccess: false })).toBe("error");
    expect(loadStateOf({ isError: true, isSuccess: true })).toBe("error");
  });

  it("is ready only once the request has answered", () => {
    expect(loadStateOf({ isError: false, isSuccess: true })).toBe("ready");
  });

  it("stays loading while pending or disabled — never ready", () => {
    expect(loadStateOf({ isError: false, isSuccess: false })).toBe("loading");
  });
});
