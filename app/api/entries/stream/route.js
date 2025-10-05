import {
  withAuth,
  getAuthenticatedUser,
} from "../../../../lib/auth-middleware.js";
import {
  addConnection,
  removeConnection,
} from "../../../../lib/sse-notifications.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (request) => {
  const user = getAuthenticatedUser(request);
  const groupId = user.current_group_id;

  if (!groupId) {
    return new Response("No group selected", { status: 403 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(encoder.encode(": connected\n\n"));

      addConnection(groupId, controller);

      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAliveInterval);
        removeConnection(groupId, controller);
        try {
          controller.close();
        } catch {}
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
});
