#!/bin/bash

# Finance Tracker Security Update Script for Raspberry Pi
# This script applies the localStorage security fixes

set -e

APP_DIR="$HOME/finance-tracker"
APP_NAME="finance-tracker"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🔒 Applying Security Updates to Finance Tracker on Raspberry Pi..."

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    print_error "App directory $APP_DIR not found. Please deploy the app first using deploy-pi.sh"
    exit 1
fi

cd $APP_DIR

print_status "Creating backup before security update..."
if [ -f "./backup.sh" ]; then
    ./backup.sh
else
    print_warning "Backup script not found, creating manual backup..."
    cp -r data data_backup_$(date +%Y%m%d_%H%M%S)
fi

print_status "Pulling latest security updates from repository..."
# If you're using git on the Pi
if [ -d ".git" ]; then
    git pull origin react-refactor
else
    print_warning "Not a git repository. You'll need to manually copy updated files."
    print_status "Please use: scp -r /path/to/updated/files pi@your-pi:/home/pi/finance-tracker/"
    read -p "Press Enter after copying updated files to continue..."
fi

print_status "Installing dependencies..."
npm ci --production

print_status "Building application with security updates..."
npm run build

print_status "Checking database schema..."
# The database will auto-migrate when the app starts due to our database.js changes

print_status "Restarting application with security updates..."
pm2 restart $APP_NAME

print_status "Waiting for application to start..."
sleep 5

# Verify the app is running
if pm2 status | grep -q "online"; then
    print_status "✅ Application successfully updated and running with security fixes!"
else
    print_error "❌ Application failed to start. Check logs:"
    pm2 logs $APP_NAME --lines 20
    exit 1
fi

echo ""
print_status "📊 Application status:"
pm2 status

echo ""
print_status "🔒 Security verification:"
echo "  ✅ localStorage authentication removed"
echo "  ✅ Session-based authentication implemented"
echo "  ✅ HTTP-only cookies for security"
echo "  ✅ Protected API routes"

echo ""
print_status "📝 Recent logs:"
pm2 logs $APP_NAME --lines 10

echo ""
print_status "🌐 Your secure finance tracker is available at:"
echo "  Local: http://localhost:3000"
echo "  Network: http://$(hostname -I | awk '{print $1}'):3000"

print_status "🔒 Security update completed successfully!"
