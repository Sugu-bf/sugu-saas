import { type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-user";
import { checkSameOrigin, forbiddenOrigin } from "@/lib/bff/same-origin";
import { broadcastingAuthUrl } from "@/lib/bff/upstream";

// ============================================================
// POST /api/broadcasting/auth — private channel authorization.
//
// Echo asks here whether the user may join a private channel. The
// Sanctum token is added server-side from the session cookie and the
// answer (a signature for that socket + channel only) is relayed.
// Laravel's channels.php decides; this route authorizes nothing.
// ============================================================

export const dynamic = "force-dynamic";

const SOCKET_ID = /^\d+\.\d+$/;
const CHANNEL = /^(private|presence)-[A-Za-z0-9_.=@,;-]{1,150}$/;

const noStore = { "cache-control": "private, no-store" };

export async function POST(request: NextRequest) {
  if (!checkSameOrigin(request.method, request.headers).ok) return forbiddenOrigin();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return Response.json({ message: "Non authentifié" }, { status: 401, headers: noStore });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const socketId = typeof body?.socket_id === "string" ? body.socket_id : "";
  const channelName = typeof body?.channel_name === "string" ? body.channel_name : "";

  if (!SOCKET_ID.test(socketId) || !CHANNEL.test(channelName)) {
    return Response.json({ message: "Demande invalide." }, { status: 422, headers: noStore });
  }

  try {
    const upstream = await fetch(broadcastingAuthUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ socket_id: socketId, channel_name: channelName }),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });

    const payload = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return Response.json(
        { message: (payload as { message?: string }).message ?? "Canal refusé." },
        { status: upstream.status, headers: noStore },
      );
    }

    // Only the two fields Pusher's protocol defines — nothing else leaks.
    const { auth, channel_data } = payload as { auth?: string; channel_data?: string };
    return Response.json({ auth, ...(channel_data ? { channel_data } : {}) }, { headers: noStore });
  } catch {
    return Response.json({ message: "Service temps réel indisponible." }, { status: 502, headers: noStore });
  }
}
