import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { once, useOneAtATime } from "../single-flight";

// Found on the real backend (V3.1): two clicks on « Créer la course » landed
// before the button was drawn disabled, and two deliveries were created.

/** A request whose answer the test gives when it chooses to. */
function pending<Result>() {
  let settle!: { resolve: (value: Result) => void; reject: (error: unknown) => void };
  const promise = new Promise<Result>((resolve, reject) => {
    settle = { resolve, reject };
  });
  return { promise, ...settle };
}

describe("once", () => {
  it("sends the same change once while it is in flight, and gives its answer to who asked again", async () => {
    const request = pending<string>();
    const send = vi.fn(() => request.promise);
    const change = ["new delivery", "agency-1", { client_name: "Awa Ndiaye", order_total: 6000 }];

    const first = once(change, send);
    // The same content, built again by a second click: another object, the same change.
    const second = once(["new delivery", "agency-1", { client_name: "Awa Ndiaye", order_total: 6000 }], send);
    expect(send).toHaveBeenCalledTimes(1);

    request.resolve("AG-0001");
    expect(await Promise.all([first, second])).toEqual(["AG-0001", "AG-0001"]);
  });

  it("sends a change again once the first has been answered: a second delivery to the same customer is one", async () => {
    const send = vi.fn(async () => "created");
    await once(["note", "shipment-1", "Portail fermé"], send);
    await once(["note", "shipment-1", "Portail fermé"], send);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("does not hold back a different change, nor the same one for another agency or another delivery", () => {
    const send = vi.fn(() => pending<void>().promise);
    void once(["delivery", "agency-1", { type: "accept", id: "a" }], send);
    void once(["delivery", "agency-1", { type: "accept", id: "b" }], send);
    void once(["delivery", "agency-2", { type: "accept", id: "a" }], send);
    void once(["delivery", "agency-1", { type: "refuse", id: "a", reason: "Zone non desservie" }], send);
    expect(send).toHaveBeenCalledTimes(4);
  });

  it("gives a refusal to everyone who waited for it, then lets the change be tried again", async () => {
    const request = pending<void>();
    const send = vi.fn(() => request.promise);
    const first = once(["courier", "agency-1", { type: "suspend", id: "c1" }], send);
    const second = once(["courier", "agency-1", { type: "suspend", id: "c1" }], send);
    request.reject(new Error("refused"));
    await expect(first).rejects.toThrow("refused");
    await expect(second).rejects.toThrow("refused");

    const again = vi.fn(async () => undefined);
    await once(["courier", "agency-1", { type: "suspend", id: "c1" }], again);
    expect(again).toHaveBeenCalledTimes(1);
  });

  it("tells two files apart by their name and their size, which JSON alone would not", () => {
    const send = vi.fn(() => pending<void>().promise);
    const document = (name: string, content: string) => ({ type: "document", id: "c1", file: new File([content], name, { type: "application/pdf", lastModified: 1 }) });
    void once(["courier", "a", document("cnib.pdf", "recto")], send);
    void once(["courier", "a", document("permis.pdf", "recto")], send);
    void once(["courier", "a", document("cnib.pdf", "recto et verso")], send);
    // The very same file sent twice is the double click.
    void once(["courier", "a", document("cnib.pdf", "recto")], send);
    expect(send).toHaveBeenCalledTimes(3);
  });
});

describe("useOneAtATime", () => {
  it("runs a handler once for two calls, and what follows it once too", async () => {
    const request = pending<void>();
    const done = vi.fn();
    const { result } = renderHook(() =>
      useOneAtATime(async (name: string) => {
        await request.promise;
        done(name);
        return name;
      }),
    );

    const first = result.current("Créer la course");
    const second = result.current("Créer la course");
    expect(second).toBe(first);
    request.resolve();
    expect(await first).toBe("Créer la course");
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("runs again once the first call is over, whether it succeeded or failed", async () => {
    const handler = vi.fn(async (fail: boolean) => {
      if (fail) throw new Error("refused");
    });
    const { result } = renderHook(() => useOneAtATime(handler));

    await expect(result.current(true)).rejects.toThrow("refused");
    await result.current(false);
    await result.current(false);
    expect(handler).toHaveBeenCalledTimes(3);
  });
});
