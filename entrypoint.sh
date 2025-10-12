#!/bin/sh
set -e

echo "==========================================="
echo "MyFinance Tracker"
echo "==========================================="
echo ""

if [ -z "$ADMIN_USERNAME" ] || [ "$ADMIN_USERNAME" = "admin" ]; then
  echo "⚠️  WARNING: Using default admin username. Please change it after first login!"
fi

if [ -z "$ADMIN_PASSWORD" ] || [ "$ADMIN_PASSWORD" = "changeme" ]; then
  echo "⚠️  WARNING: Using default admin password. Please change it after first login!"
fi

echo "📋 Configuration:"
echo "   Admin Username: ${ADMIN_USERNAME}"
echo "   Admin Password: ${ADMIN_PASSWORD}"
echo "   Allow Registration: ${ALLOW_REGISTRATION:-true}"
echo "   Enable Balance History: ${ENABLE_BALANCE_HISTORY:-true}"
echo ""

if [ ! -d "/app/data" ]; then
  echo "❌ Error: /app/data directory does not exist"
  exit 1
fi

if [ ! -w "/app/data" ]; then
  echo "❌ Error: /app/data directory is not writable"
  echo "   Please check volume permissions"
  exit 1
fi

if [ ! -f "/app/data/finance.db" ]; then
  echo "🆕 No existing database found, creating a new one"
else
  echo "✅ Existing database found"
fi

chown -R nextjs:nodejs /app/data

echo ""
echo "🚀 Starting application..."
echo "==========================================="
echo ""

exec su-exec nextjs bun server.js
