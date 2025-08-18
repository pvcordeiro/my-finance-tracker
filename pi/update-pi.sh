#!/bin/bash

# Finance Tracker Quick Update Script
# Run this script to update the application on your Raspberry Pi

APP_DIR="$HOME/finance-tracker"
APP_NAME="finance-tracker"

cd $APP_DIR

echo "🔄 Updating Finance Tracker..."

# Create backup before update
echo "📦 Creating backup..."
./backup.sh

# Install any new dependencies
echo "📥 Installing dependencies..."
npm ci --production

# Build the application
echo "🔨 Building application..."
npm run build

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
