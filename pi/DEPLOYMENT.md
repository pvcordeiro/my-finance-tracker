# Another Personal Finance Tracker — Raspberry Pi Deployment Guide

This guide will help you deploy the latest version of Another Personal Finance Tracker (Next.js 15, React 19, admin panel, session-based authentication, registration toggle, and modern UI) to a Raspberry Pi or any Linux server for 24/7 access.

## Prerequisites

- Raspberry Pi (recommended: Pi 4) or any Linux server
- Node.js 18+ (Node 20+ recommended)
- SSH access
- Basic terminal knowledge

## Quick Start

1. **Copy files to your Raspberry Pi:**
   ```bash
   scp -r . pi@your-pi-ip:/home/pi/finance-tracker/
   ```
2. **SSH into your Pi:**
   ```bash
   ssh pi@your-pi-ip
   ```
3. **Install Node.js (if not already):**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node --version
   npm --version
   ```
4. **Install dependencies:**
   ```bash
   cd /home/pi/finance-tracker
   npm install --legacy-peer-deps # or pnpm install
   ```
5. **Start the app:**

   ```bash
   # Development
   npm run dev -- -H 0.0.0.0

   # Production
   npm run build
   npm start
   ```

   The SQLite database will be created at `data/finance.db` on first run.

## What the Script Does

### What the Script Does (if using `deploy-pi.sh`)

- Updates system packages
- Installs Node.js 20.x
- Installs PM2 for process management
- Installs and configures Nginx as reverse proxy
- Creates application directory at `/home/pi/finance-tracker`
- Installs dependencies and builds the app
- Sets up database directory with proper permissions
- Configures PM2 for 24/7 background service
- Sets up automatic restart on crashes and on boot
- Creates logs directory for monitoring
- Configures Nginx reverse proxy, gzip, security headers, and static file caching
- Sets up UFW firewall (optional)
- Creates automatic daily database backups
- Provides update script for future deployments
- Generates secure admin credentials

## Post-Deployment

### Access Your Application

- **Local**: `http://localhost:3000`
- **Network**: `http://your-pi-ip:3000`
- **Admin Panel**: `http://your-pi-ip:3000/admin`

### Important First Steps

1. **Save admin credentials** (displayed after deployment)
2. **Change admin password** if needed at the .env
3. **Test the application** by creating a user account (registration can be enabled/disabled in the admin panel)

### Management Commands

```bash
# Check application status
pm2 status

# View application logs
pm2 logs finance-tracker

# Restart application
pm2 restart finance-tracker

# Stop application
pm2 stop finance-tracker

# View detailed logs
pm2 logs finance-tracker --lines 100

# Monitor in real-time
pm2 monit
```

### Database Management

```bash
# Manual backup
/home/pi/finance-tracker/backup.sh

# View backup files
ls -la /home/pi/finance-tracker-backups/

# Check database size
du -h /home/pi/finance-tracker/data/finance.db
# Export data as JSON from the app UI (see Data Management section)
```

### Application Updates

```bash
# Quick update (if you make changes)
/home/pi/finance-tracker/update.sh
```

## Directory Structure

```
/home/pi/finance-tracker/
├── data/                # SQLite database
├── logs/                # Application logs
├── backup.sh            # Backup script
├── update.sh            # Update script
├── ecosystem.config.js  # PM2 configuration
├── .env                 # Environment variables
└── [application files]
```

## Monitoring & Logs

### Application Logs

```bash
# Real-time logs
pm2 logs finance-tracker --lines 0

# Error logs only
pm2 logs finance-tracker --err

# Output logs only
pm2 logs finance-tracker --out
```

### System Logs

```bash
# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx -f
```

### Performance Monitoring

```bash
# PM2 monitoring dashboard
pm2 monit

# System resources
htop

# Disk usage
df -h
```

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs finance-tracker

# Restart PM2
pm2 restart finance-tracker
```

### Database Issues

```bash
# Check database permissions
ls -la /home/pi/finance-tracker/data/

# Test database connection
sqlite3 /home/pi/finance-tracker/data/finance.db ".tables"
```

### Nginx Issues

```bash
# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx
```

### Network Issues

```bash
# Check if application is listening
netstat -tulpn | grep :3000

# Test local connection
curl http://localhost:3000

# Check firewall
sudo ufw status
```

## Backup & Recovery

### Automatic Backups

- Daily backups at 2 AM (configured in crontab)
- Keeps 7 days of backups
- Stored in `/home/pi/finance-tracker-backups/`

### Manual Backup

```bash
# Create immediate backup
/home/pi/finance-tracker/backup.sh

# Copy backup to external location
scp /home/pi/finance-tracker-backups/finance_backup_*.db user@backup-server:/path/
```

### Restore from Backup

```bash
# Stop application
pm2 stop finance-tracker

# Replace database
cp /home/pi/finance-tracker-backups/finance_backup_YYYYMMDD_HHMMSS.db /home/pi/finance-tracker/data/finance.db

# Start application
pm2 start finance-tracker
```

## SSL/HTTPS Setup (Recommended for external access)

Follow the deploy script prompts or do it manually:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate (replace with your actual domain)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (already configured)
sudo systemctl status certbot.timer
```

## Performance Optimization

### Raspberry Pi 4

- Default configuration should work well
- Monitor memory usage with `pm2 monit`

### Raspberry Pi 3 or older

- Reduce PM2 max memory restart to 250M
- Consider using PM2 cluster mode for better performance:
  ```bash
  pm2 delete finance-tracker
  pm2 start ecosystem.config.js --instances 2
  ```

## Updating the Application

1. **From your development machine:**

   ```bash
   # Copy updated files
   scp -r . pi@your-pi-ip:/home/pi/finance-tracker-temp/
   ```

2. **On your Raspberry Pi:**
   ```bash
   # Run update script
   cd /home/pi/finance-tracker-temp
   chmod +x deploy-pi.sh
   ./deploy-pi.sh
   ```

## Support & Maintenance

### Regular Maintenance Tasks

- Check logs weekly: `pm2 logs finance-tracker`
- Monitor disk space: `df -h`
- Update system monthly: `sudo apt update && sudo apt upgrade`
- Verify backups: `ls -la /home/pi/finance-tracker-backups/`
- Export data as JSON from the app for offsite backup

### Performance Monitoring

- Use `pm2 monit` for real-time monitoring
- Check memory usage with `htop`
- Monitor database size growth

---

The application will now run 24/7 in the background and automatically restart if the Pi reboots or if the application crashes!
