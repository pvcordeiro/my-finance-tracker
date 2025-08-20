#!/bin/bash

# Finance Tracker Quick Update Script
# Run this script to update the application on your Raspberry Pi


APP_DIR="$HOME/finance-tracker"
APP_NAME="finance-tracker"

cd $APP_DIR

echo "🔄 Updating Finance Tracker..."

# Create backup before update
echo "📦 Creating backup..."
if [ -f "./scripts/backup.sh" ]; then
	./scripts/backup.sh
else
	echo "⚠️  Backup script not found at ./scripts/backup.sh. Skipping backup."
fi

# Detect package manager
if [ -f "pnpm-lock.yaml" ]; then
	PKG_MGR="pnpm"
elif [ -f "package-lock.json" ]; then
	PKG_MGR="npm"
else
	PKG_MGR="npm"
fi

# Install any new dependencies
echo "📥 Installing dependencies..."
if [ "$PKG_MGR" = "pnpm" ]; then
	pnpm install --prod --frozen-lockfile
else
	npm ci --production
fi

# Build the application
echo "🔨 Building application..."
if [ "$PKG_MGR" = "pnpm" ]; then
	pnpm run build
	# Clean up dev dependencies after build to save space
	pnpm prune --prod
else
	npm run build
	npm prune --production
fi

# Restart the application
echo "🔄 Restarting application..."
pm2 restart $APP_NAME

echo "✅ Update completed!"
echo ""
echo "📊 Application status:"
pm2 status

echo ""
echo "📝 Recent logs:"
pm2 logs $APP_NAME --lines 10
