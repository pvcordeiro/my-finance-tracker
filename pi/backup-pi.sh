#!/bin/bash

# Finance Tracker Backup Script
BACKUP_DIR="$HOME/finance-tracker-backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="$HOME/finance-tracker"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
if [ -f "$APP_DIR/data/finance.db" ]; then
    cp $APP_DIR/data/finance.db $BACKUP_DIR/finance_backup_$DATE.db
    echo "✅ Database backup created: finance_backup_$DATE.db"
else
    echo "❌ Database file not found: $APP_DIR/data/finance.db"
    exit 1
fi

# Backup environment file
if [ -f "$APP_DIR/.env" ]; then
    cp $APP_DIR/.env $BACKUP_DIR/env_backup_$DATE.txt
    echo "✅ Environment backup created: env_backup_$DATE.txt"
fi

# Keep only last 7 days of backups
find $BACKUP_DIR -name "finance_backup_*.db" -mtime +7 -delete
find $BACKUP_DIR -name "env_backup_*.txt" -mtime +7 -delete

echo "📊 Backup statistics:"
echo "  Total backups: $(ls -1 $BACKUP_DIR/finance_backup_*.db 2>/dev/null | wc -l)"
echo "  Backup directory size: $(du -h $BACKUP_DIR | cut -f1)"
echo "  Database size: $(du -h $APP_DIR/data/finance.db | cut -f1)"

echo "✅ Backup completed successfully!"
