import { getSessionFromRequest, validateSession } from "@/lib/session";
import { addUserConnection, removeUserConnection } from "@/lib/sse-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = validateSession(getSessionFromRequest(request));
  if (!session) return new Response("Authentication required", { status: 401 });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(": connected\n\n"));
      addUserConnection(session.id, controller);
      const keepAlive = setInterval(() => {
        try { controller.enqueue(encoder.encode(": keepalive\n\n")); }
        catch { clearInterval(keepAlive); removeUserConnection(session.id, controller); }
      }, 30000);
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        removeUserConnection(session.id, controller);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
