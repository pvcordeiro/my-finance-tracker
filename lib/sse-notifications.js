const activeConnections = new Map();

export function addConnection(groupId, controller) {
  if (!activeConnections.has(groupId)) {
    activeConnections.set(groupId, new Set());
  }
  activeConnections.get(groupId).add(controller);
}

export function removeConnection(groupId, controller) {
  const connections = activeConnections.get(groupId);
  if (connections) {
    connections.delete(controller);
    if (connections.size === 0) {
      activeConnections.delete(groupId);
    }
  }
}

export function notifyBankAmountChange(groupId, amount, operationType) {
  const connections = activeConnections.get(groupId);
  if (!connections || connections.size === 0) return;

  const encoder = new TextEncoder();
  const data = JSON.stringify({ amount, operationType });
  const message = `data: ${data}\n\n`;

  connections.forEach((controller) => {
    try {
      controller.enqueue(encoder.encode(message));
    } catch {
      connections.delete(controller);
    }
  });
}
