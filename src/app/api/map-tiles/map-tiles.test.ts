// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * The route that relays the tiles of the small maps, with the tile server
 * replaced by a recorded `fetch`. Found on staging (V3.1): the content
 * security policy in front of the portal refuses an image from another site,
 * so the tiles are asked of the portal itself.
 */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const tile = () => new Response(PNG, { headers: { "content-type": "image/png" } });

let calls: { url: string; headers: Headers }[] = [];
let respond: (url: string) => Response | Promise<Response>;
let realFetch: typeof fetch;

beforeEach(() => {
  calls = [];
  respond = () => tile();
  realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), headers: new Headers(init?.headers) });
    return respond(String(input));
  }) as typeof fetch;
  vi.resetModules();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

async function ask(path: string, { signedIn = true }: { signedIn?: boolean } = {}) {
  const { GET } = await import("./[z]/[x]/[y]/route");
  const [z, x, y] = path.split("/");
  const request = new NextRequest(`https://pro.example.test/api/map-tiles/${path}`, { headers: signedIn ? { cookie: "sugu_session=token" } : {} });
  return GET(request, { params: Promise.resolve({ z, x, y }) });
}

describe("map tiles", () => {
  it("relays a tile of the map from the tile server, under its own name, and lets the browser keep it a week", async () => {
    const answer = await ask("15/16245/15249");

    expect(answer.status).toBe(200);
    expect(answer.headers.get("content-type")).toBe("image/png");
    expect(answer.headers.get("cache-control")).toBe("private, max-age=604800, immutable");
    expect(new Uint8Array(await answer.arrayBuffer())).toEqual(PNG);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://tile.openstreetmap.org/15/16245/15249.png");
    // An identified application, as the usage policy of the tiles asks.
    expect(calls[0].headers.get("user-agent")).toMatch(/^SuguPro\//);
    // Nothing of who looks goes to the tile server.
    expect(calls[0].headers.get("cookie")).toBeNull();
    expect(calls[0].headers.get("authorization")).toBeNull();
  });

  it("serves nothing without a session, and asks nothing of the tile server", async () => {
    const answer = await ask("15/16245/15249", { signedIn: false });

    expect(answer.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("relays the one zoom the portal draws, and whole coordinates within it only", async () => {
    for (const path of ["14/8122/7624", "16/32490/30498", "15/abc/15249", "15/16245/-1", "15/16245/1.5", "15/32768/15249", "15/16245/99999999", "15/..%2F/15249"]) {
      expect((await ask(path)).status, path).toBe(404);
    }
    expect(calls).toHaveLength(0);
  });

  it("answers a failure of the tile server as one, never as a picture", async () => {
    respond = () => new Response("down", { status: 503 });
    expect((await ask("15/1/1")).status).toBe(502);

    // A page of text in place of a tile: an error page of the tile server, or of a proxy on the way.
    respond = () => new Response("<html>blocked</html>", { status: 200, headers: { "content-type": "text/html" } });
    const page = await ask("15/1/2");
    expect(page.status).toBe(502);
    expect(await page.text()).toBe("");
    expect(page.headers.get("cache-control")).toBe("no-store");

    respond = () => {
      throw new TypeError("fetch failed");
    };
    expect((await ask("15/1/3")).status).toBe(502);

    // Far too large to be a tile.
    respond = () => new Response(new Uint8Array(600 * 1024), { headers: { "content-type": "image/png" } });
    expect((await ask("15/1/4")).status).toBe(502);
  });

  it("downloads two tiles at a time at most, whatever the map asks at once", async () => {
    let downloading = 0;
    let most = 0;
    const release: (() => void)[] = [];
    respond = () =>
      new Promise<Response>((resolve) => {
        downloading += 1;
        most = Math.max(most, downloading);
        release.push(() => {
          downloading -= 1;
          resolve(tile());
        });
      });

    const { GET } = await import("./[z]/[x]/[y]/route");
    const answers = Array.from({ length: 6 }, (_, index) =>
      GET(new NextRequest(`https://pro.example.test/api/map-tiles/15/100/${index}`, { headers: { cookie: "sugu_session=token" } }), {
        params: Promise.resolve({ z: "15", x: "100", y: String(index) }),
      }),
    );

    // The tile server is answered two at a time until the six are served.
    for (let served = 0; served < 6; served += 1) {
      await vi.waitFor(() => expect(release.length).toBeGreaterThan(0));
      expect(downloading).toBeLessThanOrEqual(2);
      release.shift()!();
    }

    expect((await Promise.all(answers)).map((answer) => answer.status)).toEqual([200, 200, 200, 200, 200, 200]);
    expect(most).toBe(2);
    expect(calls).toHaveLength(6);
  });
});
