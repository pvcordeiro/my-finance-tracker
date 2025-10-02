import { getDatabase } from "../../../../lib/database.js";
import {
  withAuth,
  getAuthenticatedUser,
} from "../../../../lib/auth-middleware.js";

const activeConnections = new Map();

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

      if (!activeConnections.has(groupId)) {
        activeConnections.set(groupId, new Set());
      }
      activeConnections.get(groupId).add(controller);

      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch (error) {
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAliveInterval);
        const connections = activeConnections.get(groupId);
        if (connections) {
          connections.delete(controller);
          if (connections.size === 0) {
            activeConnections.delete(groupId);
          }
        }
        try {
          controller.close();
        } catch (e) {}
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

export function notifyBankAmountChange(groupId, amount, operationType) {
  const connections = activeConnections.get(groupId);
  if (!connections || connections.size === 0) return;

  const encoder = new TextEncoder();
  const data = JSON.stringify({ amount, operationType });
  const message = `data: ${data}\n\n`;

  connections.forEach((controller) => {
    try {
      controller.enqueue(encoder.encode(message));
    } catch (error) {
      connections.delete(controller);
    }
  });
}
