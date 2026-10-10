import { describe, it, expect } from "vitest";
import { reverbConnectSource } from "./reverb-csp";

describe("reverbConnectSource", () => {
  it("allows the production socket origin and nothing wider", () => {
    expect(
      reverbConnectSource({
        NEXT_PUBLIC_REVERB_HOST: "api.mysugu.com",
        NEXT_PUBLIC_REVERB_PORT: "443",
        NEXT_PUBLIC_REVERB_SCHEME: "https",
      }),
    ).toBe("wss://api.mysugu.com");
  });

  it("keeps a non-default port, as CSP matches ports exactly", () => {
    expect(
      reverbConnectSource({
        NEXT_PUBLIC_REVERB_HOST: "ws.mysugu.com",
        NEXT_PUBLIC_REVERB_PORT: 8080,
        NEXT_PUBLIC_REVERB_SCHEME: "https",
      }),
    ).toBe("wss://ws.mysugu.com:8080");
    expect(
      reverbConnectSource({
        NEXT_PUBLIC_REVERB_HOST: "localhost",
        NEXT_PUBLIC_REVERB_PORT: "8080",
        NEXT_PUBLIC_REVERB_SCHEME: "http",
      }),
    ).toBe("ws://localhost:8080");
  });

  it("returns nothing rather than a wildcard for a missing or unsafe host", () => {
    expect(reverbConnectSource({})).toBeNull();
    for (const host of ["*", "*.mysugu.com", "a.com; script-src *", "wss://a.com", "a.com/x"]) {
      expect(reverbConnectSource({ NEXT_PUBLIC_REVERB_HOST: host })).toBeNull();
    }
  });
});
