// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Route-level tests of the BFF: the session cookie, the relay and the channel
 * authorization, with the Laravel API replaced by a recorded `fetch`.
 */

const API = "https://api.example.test/api/v1";

interface Recorded {
  url: string;
  method: string;
  headers: Headers;
  body: string | null;
}

let calls: Recorded[] = [];
let respond: (call: Recorded) => Response | Promise<Response>;
let realFetch: typeof fetch;

async function bodyOf(body: unknown): Promise<string | null> {
  if (body == null) return null;
  if (typeof body === "string") return body;
  return new Response(body as BodyInit).text();
}

beforeEach(() => {
  process.env.API_BASE_URL = API;
  process.env.NEXT_PUBLIC_APP_URL = "https://pro.example.test";
  calls = [];
  respond = () => Response.json({ success: true });
  realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Recorded = {
      url: String(input),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: await bodyOf(init?.body),
    };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  vi.resetModules();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const SAME_ORIGIN = { "sec-fetch-site": "same-origin", host: "pro.example.test" };

function req(path: string, init: { method?: string; headers?: Record<string, string>; body?: BodyInit; cookie?: string } = {}) {
  const headers = new Headers({ ...SAME_ORIGIN, ...init.headers });
  if (init.cookie) headers.set("cookie", init.cookie);
  return new NextRequest(`https://pro.example.test${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body,
    ...(init.body ? { duplex: "half" } : {}),
  } as ConstructorParameters<typeof NextRequest>[1]);
}

const proxy = async (path: string, init?: Parameters<typeof req>[1]) => {
  const mod = await import("./proxy/[...path]/route");
  const method = (init?.method ?? "GET") as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  const segments = path.split("?")[0].split("/").filter(Boolean).map(decodeURIComponent);
  return mod[method](req(`/api/proxy/${path}`, init), { params: Promise.resolve({ path: segments }) });
};

const backendUser = (overrides: Record<string, unknown> = {}) => ({
  id: "u1",
  name: "Awa",
  email: "awa@example.test",
  user_type: "seller",
  email_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  store: { id: "st1", name: "Boutique" },
  ...overrides,
});

// ───────────────────────────────────────────────────────────
describe("login — the token never reaches the browser", () => {
  const login = async (data: Record<string, unknown>, status = 200) => {
    respond = () => Response.json({ success: status < 400, data, message: "x" }, { status });
    const { POST } = await import("./auth/login/route");
    return POST(
      req("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "awa@example.test", password: "irrelevant" }),
      }),
    );
  };

  it("stores the token in an httpOnly cookie and keeps it out of the JSON", async () => {
    const res = await login({ user: backendUser(), token: "SECRET-TOKEN", expires_at: "2099-01-01T00:00:00Z" });
    const text = await res.clone().text();
    expect(res.status).toBe(200);
    expect(text).not.toContain("SECRET-TOKEN");
    expect(JSON.parse(text).data.user.role).toBe("vendor");

    const cookies = res.headers.getSetCookie();
    const session = cookies.find((c) => c.startsWith("sugu_session="))!;
    expect(session).toContain("SECRET-TOKEN");
    expect(session.toLowerCase()).toContain("httponly");
    expect(session.toLowerCase()).toContain("samesite=lax");
    expect(session).toContain("Path=/");
    expect(session.toLowerCase()).not.toContain("domain=");
    // the pre-migration, script-readable cookie is removed
    expect(cookies.some((c) => c.startsWith("sugu_token=;"))).toBe(true);
  });

  it("refuses a profile that is not vendor / agency / courier, without a cookie", async () => {
    const res = await login({ user: backendUser({ user_type: "buyer", store: null, can_sell: false }), token: "T" });
    expect(res.status).toBe(422);
    expect(res.headers.getSetCookie().some((c) => c.startsWith("sugu_session=T"))).toBe(false);
  });

  it("passes the OTP challenge through without opening a session", async () => {
    const res = await login({ verification_required: true, identifier: "awa@example.test", expires_in: 300 });
    expect((await res.json()).data.verification_required).toBe(true);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("relays a bad-credentials answer untouched", async () => {
    const res = await login({}, 422);
    expect(res.status).toBe(422);
  });

  it("refuses a cross-site login attempt before calling the API", async () => {
    const { POST } = await import("./auth/login/route");
    const res = await POST(
      req("/api/auth/login", {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site", "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(403);
    expect(calls).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────
describe("/me and logout", () => {
  it("answers 401 without calling the API when there is no cookie", async () => {
    const { GET } = await import("./auth/me/route");
    expect((await GET(req("/api/auth/me"))).status).toBe(401);
    expect(calls).toEqual([]);
  });

  it("ignores the old script-readable cookie", async () => {
    const { GET } = await import("./auth/me/route");
    expect((await GET(req("/api/auth/me", { cookie: "sugu_token=OLD" }))).status).toBe(401);
    expect(calls).toEqual([]);
  });

  it("maps the profile and clears the cookie when the token is dead", async () => {
    const { GET } = await import("./auth/me/route");
    respond = () => Response.json({ success: true, data: { user: backendUser({ user_type: "courier", store: null, courier: { status: 4 } }) } });
    const ok = await GET(req("/api/auth/me", { cookie: "sugu_session=T1" }));
    expect((await ok.json()).data).toMatchObject({ role: "courier", courier_status: 4 });
    expect(calls[0].headers.get("authorization")).toBe("Bearer T1");

    respond = () => Response.json({ message: "Unauthenticated." }, { status: 401 });
    const dead = await GET(req("/api/auth/me", { cookie: "sugu_session=T1" }));
    expect(dead.status).toBe(401);
    expect(dead.headers.getSetCookie().some((c) => c.startsWith("sugu_session=;"))).toBe(true);
  });

  it("never maps an unknown profile to vendor", async () => {
    const { GET } = await import("./auth/me/route");
    respond = () => Response.json({ success: true, data: { user: backendUser({ user_type: "buyer", store: null, can_sell: false }) } });
    const res = await GET(req("/api/auth/me", { cookie: "sugu_session=T1" }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("UNSUPPORTED_PROFILE");
  });

  it("logout revokes the token upstream and clears the cookie, even if the API is down", async () => {
    const { POST } = await import("./auth/logout/route");
    const res = await POST(req("/api/auth/logout", { method: "POST", cookie: "sugu_session=T9" }));
    expect(calls[0].url).toBe(`${API}/web-auth/logout`);
    expect(calls[0].headers.get("authorization")).toBe("Bearer T9");
    expect(res.headers.getSetCookie().some((c) => c.startsWith("sugu_session=;"))).toBe(true);

    respond = () => Promise.reject(new Error("down"));
    const again = await POST(req("/api/auth/logout", { method: "POST", cookie: "sugu_session=T9" }));
    expect(again.headers.getSetCookie().some((c) => c.startsWith("sugu_session=;"))).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────
describe("/api/proxy — authenticated relay", () => {
  it("adds the token from the cookie and keeps the query string", async () => {
    respond = () => Response.json({ success: true, data: { data: [] } });
    const res = await proxy("sellers/orders?page=2&status=shipped", { cookie: "sugu_session=T1" });
    expect(res.status).toBe(200);
    expect(calls[0].url).toBe(`${API}/sellers/orders?page=2&status=shipped`);
    expect(calls[0].headers.get("authorization")).toBe("Bearer T1");
    expect(calls[0].headers.get("cookie")).toBeNull();
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("ignores an Authorization header sent by the browser", async () => {
    await proxy("sellers/orders", { cookie: "sugu_session=T1", headers: { authorization: "Bearer forged" } });
    expect(calls[0].headers.get("authorization")).toBe("Bearer T1");
    await proxy("agencies", { headers: { authorization: "Bearer forged" } });
    expect(calls[1].headers.get("authorization")).toBeNull();
  });

  it.each([401, 403, 404, 419, 422, 429, 500])("relays a %i from the API with its body", async (status) => {
    respond = () => Response.json({ message: `upstream ${status}`, errors: { f: ["e"] } }, { status });
    const res = await proxy("sellers/orders/x1/mark-delivered", { method: "POST", cookie: "sugu_session=T1" });
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ message: `upstream ${status}`, errors: { f: ["e"] } });
  });

  it("never relays Set-Cookie or a redirect from the API", async () => {
    respond = () => new Response("{}", { status: 200, headers: { "content-type": "application/json", "set-cookie": "laravel_session=abc" } });
    expect((await proxy("sellers/dashboard", { cookie: "sugu_session=T1" })).headers.getSetCookie()).toEqual([]);

    respond = () => new Response(null, { status: 302, headers: { location: "https://evil.test" } });
    const res = await proxy("sellers/dashboard", { cookie: "sugu_session=T1" });
    expect(res.status).toBe(502);
    expect(res.headers.get("location")).toBeNull();
  });

  it("refuses token-issuing endpoints, traversal and foreign hosts without calling the API", async () => {
    for (const path of ["web-auth/refresh-token", "auth/refresh", "admin/users", "sellers/../admin", "sellers/%2e%2e/x", "sellers/a%2Fb"]) {
      const res = await proxy(path, { method: "POST", cookie: "sugu_session=T1" });
      expect(res.status).toBe(404);
    }
    expect(calls).toEqual([]);
  });

  it("refuses a cross-site mutation (CSRF) without calling the API", async () => {
    const res = await proxy("sellers/orders/x1/cancel", {
      method: "POST",
      cookie: "sugu_session=T1",
      headers: { "sec-fetch-site": "cross-site", origin: "https://evil.test" },
    });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("CSRF_REJECTED");
    expect(calls).toEqual([]);
  });

  it("streams a multipart upload with its boundary intact", async () => {
    const form = new FormData();
    form.append("document_type", "id_card");
    form.append("file", new Blob(["PNGDATA"], { type: "image/png" }), "cni.png");
    const encoded = new Response(form);
    const contentType = encoded.headers.get("content-type")!;

    const res = await proxy("courier/settings/kyc/upload", {
      method: "POST",
      cookie: "sugu_session=T1",
      headers: { "content-type": contentType },
      body: await encoded.arrayBuffer(),
    });

    expect(res.status).toBe(200);
    expect(calls[0].headers.get("content-type")).toBe(contentType);
    expect(calls[0].body).toContain("PNGDATA");
    expect(calls[0].body).toContain('filename="cni.png"');
  });

  it("relays a binary download with its type and filename", async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0xff]);
    respond = () => new Response(pdf, { headers: { "content-type": "application/pdf", "content-disposition": 'inline; filename="bon.pdf"' } });
    const res = await proxy("sellers/orders/x1/delivery-slip", { cookie: "sugu_session=T1", headers: { accept: "application/pdf" } });
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("bon.pdf");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(pdf);
  });

  it("turns an unreachable API into a 502, not a hang or a 200", async () => {
    respond = () => Promise.reject(new Error("ECONNREFUSED"));
    const res = await proxy("sellers/dashboard", { cookie: "sugu_session=T1" });
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe("UPSTREAM_UNAVAILABLE");
  });

  it("serves concurrent requests independently", async () => {
    respond = async (call) => Response.json({ path: new URL(call.url).pathname });
    const paths = ["sellers/orders", "sellers/products", "wallets", "sellers/dashboard", "sellers/settings"];
    const bodies = await Promise.all(paths.map(async (p) => (await proxy(p, { cookie: "sugu_session=T1" })).json()));
    expect(bodies.map((b) => b.path)).toEqual(paths.map((p) => `/api/v1/${p}`));
  });
});

// ───────────────────────────────────────────────────────────
describe("/api/broadcasting/auth — private channels", () => {
  const authorize = async (body: unknown, init: { cookie?: string; headers?: Record<string, string> } = {}) => {
    const { POST } = await import("./broadcasting/auth/route");
    return POST(
      req("/api/broadcasting/auth", {
        method: "POST",
        headers: { "content-type": "application/json", ...init.headers },
        body: JSON.stringify(body),
        cookie: init.cookie,
      }),
    );
  };

  it("signs a channel through Laravel with the server-side token only", async () => {
    respond = () => Response.json({ auth: "key:signature", extra: "should-not-leak" });
    const res = await authorize({ socket_id: "123.456", channel_name: "private-conversation.01HX" }, { cookie: "sugu_session=T1" });
    expect(await res.json()).toEqual({ auth: "key:signature" });
    expect(calls[0].url).toBe("https://api.example.test/api/broadcasting/auth");
    expect(calls[0].headers.get("authorization")).toBe("Bearer T1");
    expect(JSON.parse(calls[0].body!)).toEqual({ socket_id: "123.456", channel_name: "private-conversation.01HX" });
  });

  it("relays Laravel's refusal of a channel the user may not join", async () => {
    respond = () => Response.json({ message: "Forbidden" }, { status: 403 });
    const res = await authorize({ socket_id: "1.2", channel_name: "private-conversation.other" }, { cookie: "sugu_session=T1" });
    expect(res.status).toBe(403);
    expect(await res.json()).not.toHaveProperty("auth");
  });

  it("needs a session, a well-formed request and a same-origin caller", async () => {
    expect((await authorize({ socket_id: "1.2", channel_name: "private-x" })).status).toBe(401);
    expect((await authorize({ socket_id: "1.2; drop", channel_name: "private-x" }, { cookie: "sugu_session=T1" })).status).toBe(422);
    expect((await authorize({ socket_id: "1.2", channel_name: "public-x" }, { cookie: "sugu_session=T1" })).status).toBe(422);
    expect(
      (await authorize({ socket_id: "1.2", channel_name: "private-x" }, { cookie: "sugu_session=T1", headers: { "sec-fetch-site": "cross-site" } })).status,
    ).toBe(403);
    expect(calls).toEqual([]);
  });
});
