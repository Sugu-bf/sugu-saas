import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test/api/v1";
});

import { api, apiFetch, apiUrl } from "./client";
import { ApiError } from "./api-error";

interface Seen {
  url: string;
  init: RequestInit;
}

let seen: Seen[] = [];
let respond: () => Response;
let realFetch: typeof fetch;

beforeEach(() => {
  seen = [];
  respond = () => Response.json({ success: true, data: [] });
  realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    seen.push({ url: String(input), init });
    return respond();
  }) as typeof fetch;
  // a token an attacker script could have planted or an old session left behind
  document.cookie = "sugu_token=LEGACY; path=/";
  document.cookie = "sugu_session=SHOULD-NOT-BE-READ; path=/";
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const headersOf = (index = 0) => new Headers(seen[index].init.headers);

describe("central HTTP client — browser side", () => {
  it("calls the same-origin BFF, never the API host", async () => {
    await api.get("sellers/orders", { params: { page: 2, status: "shipped", skip: undefined } });
    expect(seen[0].url).toBe("/api/proxy/sellers/orders?page=2&status=shipped");
    expect(apiUrl("/wallets")).toBe("/api/proxy/wallets");
  });

  it("sends no Authorization header and reads no cookie", async () => {
    await api.post("sellers/orders/x1/confirm");
    await api.put("sellers/settings/identity", { name: "B" });
    await api.delete("sellers/products/p1");
    for (let i = 0; i < seen.length; i++) {
      expect(headersOf(i).get("authorization")).toBeNull();
      expect(JSON.stringify(seen[i])).not.toContain("LEGACY");
      expect(JSON.stringify(seen[i])).not.toContain("SHOULD-NOT-BE-READ");
      expect(seen[i].init.credentials).toBe("same-origin");
    }
  });

  it("keeps the caller's headers and the multipart boundary", async () => {
    const form = new FormData();
    form.append("name", "Produit");
    await api.post("sellers/products", form, { headers: { "Idempotency-Key": "k-1" } });
    expect(headersOf().get("idempotency-key")).toBe("k-1");
    expect(headersOf().get("content-type")).toBeNull(); // the browser sets it with the boundary
    expect(seen[0].init.body).toBe(form);
  });

  it("apiFetch strips an Authorization header a caller might still pass", async () => {
    await apiFetch("sellers/orders/x1/delivery-slip", { headers: { Accept: "application/pdf", Authorization: "Bearer x" } });
    expect(seen[0].url).toBe("/api/proxy/sellers/orders/x1/delivery-slip");
    expect(headersOf().get("authorization")).toBeNull();
    expect(headersOf().get("accept")).toBe("application/pdf");
  });

  it.each([401, 403, 419, 422, 500])("surfaces a %i as an ApiError with its status", async (status) => {
    respond = () => Response.json({ message: "refus", errors: { f: ["e"] } }, { status });
    const error = (await api.post("sellers/orders/x1/cancel").catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(status);
    expect(error.message).toBe("refus");
  });
});
