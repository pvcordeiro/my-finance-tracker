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
echo "   Admin credentials: configured (values hidden)"
echo "   Allow Registration: ${ALLOW_REGISTRATION:-false}"
echo "   Enable Balance History: ${ENABLE_BALANCE_HISTORY:-true}"
if [ "${ENABLE_SMTP:-true}" = "false" ]; then
  echo "   Email delivery: disabled (ENABLE_SMTP=false)"
else
  missing_smtp_variables=""
  for variable in APP_URL SMTP_HOST SMTP_USER SMTP_PASSWORD EMAIL_FROM; do
    eval "value=\${$variable:-}"
    if [ -z "$value" ]; then
      missing_smtp_variables="$missing_smtp_variables $variable"
    fi
  done

  if [ -z "$missing_smtp_variables" ]; then
    echo "   Email delivery: enabled (SMTP configuration present)"
  else
    echo "   Email delivery: enabled, but SMTP configuration is incomplete"
    echo "   Missing required variables:$missing_smtp_variables"
  fi
fi
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

echo "🌍 Checking country lookup data..."
if ! su-exec nextjs bun /app/scripts/update-ip-country.js --if-missing; then
  echo "⚠️  Country lookup data could not be initialized. Session locations will show IP addresses until it is imported."
fi

echo ""
echo "🚀 Starting application..."
echo "==========================================="
echo ""

exec su-exec nextjs bun server.js
