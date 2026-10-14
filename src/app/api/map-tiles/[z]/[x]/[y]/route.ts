import { type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-user";
import { MAP_TILE_ZOOMS } from "@/lib/map-tiles";

// ============================================================
// The tiles of the small maps of the portal (the last position
// of a courier), relayed from OpenStreetMap by the portal.
//
// The content security policy served in front of pro.sugu.pro
// lets images come from a closed list of hosts, and the tile
// server is not one of them: asked by the browser, every tile
// was refused and the map showed broken pictures. Asked here,
// the tiles come from the portal's own origin — and the tile
// server no longer learns, from the browser of who looks, where
// a courier is.
//
// Kept within the tile usage policy of OpenStreetMap
// (operations.osmfoundation.org/policies/tiles): an identified
// User-Agent, two downloads at a time at most, tiles kept a
// week. Two zoom levels (a position, a town and its communes), for
// who is signed in: this relays the fifteen tiles of a map, it is
// not a tile service.
// ============================================================

const TILE_SERVER = "https://tile.openstreetmap.org";
const USER_AGENT = "SuguPro/1.0 (+https://pro.sugu.pro)";
const WEEK = 7 * 24 * 60 * 60;
const TIMEOUT_MS = 10_000;
/** A tile is a few kilobytes: anything much larger is not one. */
const MAX_BYTES = 512 * 1024;
const MAX_DOWNLOADS = 2;

// ── Two downloads at a time ─────────────────────────────────

let downloading = 0;
const waiting: (() => void)[] = [];

async function inTurn<Result>(download: () => Promise<Result>): Promise<Result> {
  if (downloading >= MAX_DOWNLOADS) await new Promise<void>((next) => waiting.push(next));
  downloading += 1;
  try {
    return await download();
  } finally {
    downloading -= 1;
    waiting.shift()?.();
  }
}

// ── Route ───────────────────────────────────────────────────

const refused = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });

/** A whole number written with digits only, below `limit`; null for anything else. */
function coordinate(value: string, limit: number): number | null {
  if (!/^\d{1,6}$/.test(value)) return null;
  const number = Number(value);
  return number < limit ? number : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
  // The pages that draw a map are behind the session: so is what they draw it with.
  if (!request.cookies.get(SESSION_COOKIE)?.value) return refused(401);

  const { z, x, y } = await params;
  const zoom = MAP_TILE_ZOOMS.find((level) => String(level) === z);
  if (zoom === undefined) return refused(404);
  const limit = 2 ** zoom;
  const [column, row] = [coordinate(x, limit), coordinate(y, limit)];
  if (column === null || row === null) return refused(404);

  try {
    const tile = await inTurn(async () => {
      const upstream = await fetch(`${TILE_SERVER}/${zoom}/${column}/${row}.png`, {
        headers: { "User-Agent": USER_AGENT, Accept: "image/png" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        // Kept a week by the server too: the same tile is asked of the tile server once.
        next: { revalidate: WEEK },
      });
      if (!upstream.ok || !(upstream.headers.get("content-type") ?? "").startsWith("image/png")) return null;
      const body = await upstream.arrayBuffer();
      return body.byteLength > 0 && body.byteLength <= MAX_BYTES ? body : null;
    });
    if (!tile) return refused(502);

    return new Response(tile, {
      headers: {
        "Content-Type": "image/png",
        // The browser of who is signed in keeps it a week, as the policy of the tiles asks.
        "Cache-Control": `private, max-age=${WEEK}, immutable`,
      },
    });
  } catch {
    // Out of reach, or too slow: the map says it could not be loaded.
    return refused(502);
  }
}
