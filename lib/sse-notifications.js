const activeConnections = new Map();
const userConnections = new Map();

export function addUserConnection(userId, controller) {
  if (!userConnections.has(userId)) userConnections.set(userId, new Set());
  userConnections.get(userId).add(controller);
}

export function removeUserConnection(userId, controller) {
  const connections = userConnections.get(userId);
  if (!connections) return;
  connections.delete(controller);
  if (connections.size === 0) userConnections.delete(userId);
}

export function notifyUserAccountChange(userId, payload) {
  const connections = userConnections.get(userId);
  if (!connections) return;
  const encoder = new TextEncoder();
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const controller of connections) {
    try { controller.enqueue(encoder.encode(message)); }
    catch { connections.delete(controller); }
  }
  if (!connections.size) userConnections.delete(userId);
}

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

export function notifyEntryChange(groupId, changeType, entryData) {
  const connections = activeConnections.get(groupId);
  if (!connections || connections.size === 0) return;

  const encoder = new TextEncoder();
  const data = JSON.stringify({ changeType, entryData });
  const message = `data: ${data}\n\n`;

  connections.forEach((controller) => {
    try {
      controller.enqueue(encoder.encode(message));
    } catch {
      connections.delete(controller);
    }
  });
}
